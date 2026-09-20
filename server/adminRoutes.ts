import { Router, type Request, type Response, type NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { AccountStore, AccountError, deriveSecret } from './accounts';
import { cookieOptions, readCookie, requireSameSiteWrite } from './security';
import { logServerWarning } from './log';

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
    logServerWarning('security', 'ADMIN_PASSWORD is not set. Break-glass admin access is disabled; ' +
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
  // A request code is the one administrative input worth guessing, so it gets
  // a budget of its own rather than sharing the general one.
  const recoveryLimit = rateLimit({
    windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: 'Too many approval attempts. Try again later.' },
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
      // A count, never a list. It is here so an operator can notice assisted
      // recoveries happening more often than they remember helping with.
      recoveriesCompleted: store.recoveryCount(),
      globalAIEnabled: store.getSetting(AI_SETTING_KEY) === 'true',
    });
  });

  router.post('/logout', (req, res) => {
    const token = readCookie(req, ADMIN_COOKIE);
    if (token) store.endAdminSession(token);
    res.clearCookie(ADMIN_COOKIE, cookieOptions());
    res.json({ success: true });
  });

  /**
   * Approve one recovery request, by the code the learner reads out.
   *
   * This is the whole of what an administrator can do about somebody else's
   * account. They do not learn whose account it is, and approving is not the
   * same as resetting: the new PIN is set back on the device that opened the
   * request, which this administrator does not have. See docs/privacy.md for
   * what that does and does not prevent.
   *
   * Its own limiter, tighter than ordinary administration, because a code is
   * the one administrative input worth guessing.
   */
  router.post('/recovery/approve', gate, recoveryLimit, (req, res) => {
    try {
      store.approveRecoveryRequest(req.body?.code);
      res.json({ success: true });
    } catch (err) {
      const known = err instanceof AccountError;
      res.status(known ? err.status : 500).json({ success: false, message: known ? err.message : 'Could not approve that code.' });
    }
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

  /**
   * `GET /users` and `POST /users/sign-out` used to live here.
   *
   * The first returned every account with its creation time, progress revision
   * and last activity, to any administrator, on every console load — the whole
   * roster of a deployment, none of which helping one person back into their
   * account requires. The second signed a named learner out of every device
   * without their involvement, which is not help, and which a reset the
   * learner asked for already does.
   *
   * The capability is gone, not reduced: `AccountStore.listAccounts()` was
   * deleted with it, so nothing on this server can produce a roster.
   *
   * The paths stay, answering 410. Merging to main deploys within minutes, so
   * there will be browser tabs still running the previous console asking for
   * `/users` on load; "this was removed" is a better answer for them, and for
   * anyone scripting against the API, than a bare 404 that reads like a bug.
   * They stay behind the same gate, so an unauthenticated caller still learns
   * only that they are not an administrator.
   */
  for (const path of ['/users', '/users/sign-out']) {
    router.all(path, gate, actionLimit, (_req, res) => res.status(410).json({
      success: false,
      message: 'This console no longer lists learner accounts.',
    }));
  }

  return router;
}
