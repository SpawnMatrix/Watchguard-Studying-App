import { Router, type Request, type Response, type NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { AccountStore, AccountError, deriveSecret } from './accounts';
import { cookieOptions, readCookie, requireSameSiteWrite } from './security';

export const ADMIN_COOKIE = 'wg_admin_session';
const STUDY_COOKIE = 'wg_study_session';
const ADMIN_SESSION_MAX_AGE_MS = 8 * 60 * 60_000;
export const AI_SETTING_KEY = 'globalAIEnabled';

/**
 * The break-glass password is compared as a derived key rather than as raw
 * text, under a per-process salt. Both sides are the same length whatever
 * the input, so the comparison cannot leak the expected length.
 */
const PROCESS_SALT = randomBytes(16).toString('hex');
let expectedAdminKey: Promise<string> | null = null;

function adminPasswordConfigured(): boolean {
  const value = process.env.ADMIN_PASSWORD;
  return typeof value === 'string' && value.length > 0;
}

async function adminPasswordMatches(provided: unknown): Promise<boolean> {
  if (!adminPasswordConfigured() || typeof provided !== 'string' || provided.length === 0 || provided.length > 512) return false;
  expectedAdminKey ??= deriveSecret(process.env.ADMIN_PASSWORD!, PROCESS_SALT);
  const [expected, actual] = await Promise.all([expectedAdminKey, deriveSecret(provided, PROCESS_SALT)]);
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
}

/**
 * Startup validation. A portal reachable from the internet must never run
 * with the password that ships in `.env.example`.
 */
export function assertAdminPasswordSafe() {
  const value = process.env.ADMIN_PASSWORD;
  if (!value) {
    console.warn('[security] ADMIN_PASSWORD is not set. Break-glass admin access is disabled; ' +
      'use ADMIN_BOOTSTRAP_USER to grant the first administrator.');
    return;
  }
  const banned = new Set(['admin123', 'admin', 'password', 'changeme', 'watchguard']);
  if (banned.has(value.toLowerCase()) || value.length < 12) {
    throw new Error('[security] ADMIN_PASSWORD is a known default or shorter than 12 characters. ' +
      'Set a strong value before starting the portal.');
  }
}

export function adminIdentity(store: AccountStore, req: Request) {
  return store.identifyAdmin(readCookie(req, ADMIN_COOKIE));
}

/** Single gate for every administrative route, including AI analysis. */
export function requireAdmin(store: AccountStore) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!adminIdentity(store, req)) {
      return res.status(403).json({ success: false, message: 'Administrator sign-in required.' });
    }
    next();
  };
}

export function adminRoutes(store: AccountStore) {
  const router = Router();

  router.use((req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  });
  router.use(requireSameSiteWrite);

  // Elevation is the brute-forceable step, so it carries the tight limit.
  // Ordinary administration below is limited separately and far less strictly,
  // so an admin toggling a feature can never exhaust their own login budget.
  const elevateLimit = rateLimit({
    windowMs: 15 * 60_000, limit: 5, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: 'Too many attempts, please try again later.' },
  });
  const actionLimit = rateLimit({
    windowMs: 15 * 60_000, limit: 120, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: 'Too many administrative requests. Slow down.' },
  });

  const gate = requireAdmin(store);

  /**
   * Establish an admin session.
   *
   * Preferred path: the caller is signed in to an account carrying the admin
   * role, and no password is involved at all. Fallback path: the shared
   * break-glass password, which also promotes the signed-in account so the
   * password is needed exactly once per administrator.
   */
  const establishSession = async (req: Request, res: Response) => {
    const user = store.identify(readCookie(req, STUDY_COOKIE));
    let accountId: number | null = null;

    if (user?.isAdmin) {
      accountId = user.id;
    } else if (await adminPasswordMatches(req.body?.password)) {
      if (user) {
        store.setAdmin(user.username, true);
        accountId = user.id;
      }
    } else {
      return res.status(403).json({ success: false, message: 'Invalid admin authentication' });
    }

    const token = store.createAdminSession(accountId);
    res.cookie(ADMIN_COOKIE, token, cookieOptions(ADMIN_SESSION_MAX_AGE_MS));
    res.json({
      success: true,
      username: user?.username ?? null,
      promoted: Boolean(user && !user.isAdmin),
      globalAIEnabled: store.getSetting(AI_SETTING_KEY) === 'true',
    });
  };

  router.post('/session', elevateLimit, establishSession);
  /** Backwards-compatible alias for the previous password-only endpoint. */
  router.post('/login', elevateLimit, establishSession);

  router.get('/me', (req, res) => {
    const admin = adminIdentity(store, req);
    const user = store.identify(readCookie(req, STUDY_COOKIE));
    res.json({
      isAdmin: Boolean(admin),
      username: admin?.username ?? user?.username ?? null,
      accountIsAdmin: Boolean(user?.isAdmin),
      breakGlassAvailable: adminPasswordConfigured(),
      adminCount: store.adminCount(),
      globalAIEnabled: store.getSetting(AI_SETTING_KEY) === 'true',
    });
  });

  router.post('/logout', (req, res) => {
    const token = readCookie(req, ADMIN_COOKIE);
    if (token) store.endAdminSession(token);
    res.clearCookie(ADMIN_COOKIE, cookieOptions());
    res.json({ success: true });
  });

  router.get('/users', gate, actionLimit, (_req, res) => {
    res.json({
      success: true,
      users: store.listAccounts().map(row => ({
        username: row.username,
        isAdmin: !!row.is_admin,
        createdAt: row.created_at,
        revision: row.revision ?? 0,
        updatedAt: row.updated_at ?? 0,
      })),
    });
  });

  router.post('/users/role', gate, actionLimit, (req, res) => {
    try {
      const result = store.setAdmin(req.body?.username, Boolean(req.body?.isAdmin));
      res.json({ success: true, username: result.username, isAdmin: result.isAdmin });
    } catch (err) {
      const known = err instanceof AccountError;
      res.status(known ? err.status : 500).json({ success: false, message: known ? err.message : 'Could not change that role.' });
    }
  });

  router.post('/users/sign-out', gate, actionLimit, (req, res) => {
    const target = store.listAccounts().find(row => row.username === String(req.body?.username ?? '').trim().toLowerCase());
    if (!target) return res.status(404).json({ success: false, message: 'No account with that username.' });
    store.logoutEverywhere(target.id);
    res.json({ success: true });
  });

  return router;
}
