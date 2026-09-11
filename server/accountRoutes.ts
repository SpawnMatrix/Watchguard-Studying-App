import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AccountStore, AccountError } from './accounts';
import { cookieOptions, readCookie, requireSameSiteWrite } from './security';

const COOKIE = 'wg_study_session';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60_000;

export function accountRoutes(store: AccountStore) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  });
  // SameSite cookies + JSON/custom-header requirement prevent cross-site form writes.
  router.use(requireSameSiteWrite);

  // Per-IP ceiling. The durable per-user / per-IP / global buckets inside
  // AccountStore are the real protection: they survive a restart and they
  // still apply when this in-memory limiter is reset or circumvented.
  const authLimit = rateLimit({
    windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false,
    message: { message: 'Too many sign-in attempts. Try again in 15 minutes.' },
  });

  function fail(res: Response, err: unknown) {
    const known = err instanceof AccountError;
    res.status(known ? err.status : 500).json({ message: known ? err.message : 'Your account could not be saved. Please try again.' });
  }

  for (const action of ['register', 'login', 'recover'] as const) router.post('/' + action, authLimit, async (req, res) => {
    try {
      const ip = req.ip;
      const result = action === 'register' ? await store.register(req.body.username, req.body.pin, ip)
        : action === 'recover' ? await store.recover(req.body.username, req.body.recoveryCode, req.body.pin, ip)
          : await store.login(req.body.username, req.body.pin, ip);
      res.cookie(COOKIE, result.token, cookieOptions(SESSION_MAX_AGE_MS));
      const { token: secret, accountId, ...safe } = result;
      res.json(safe);
    } catch (err) { fail(res, err); }
  });

  router.get('/me', (req, res) => {
    const user = store.identify(readCookie(req, COOKIE));
    res.json(user ? { username: user.username, isAdmin: user.isAdmin, ...store.progress(user.id) } : { username: null, isAdmin: false });
  });

  router.post('/logout', (req, res) => {
    const session = readCookie(req, COOKIE);
    if (session) store.logout(session);
    res.clearCookie(COOKIE, cookieOptions());
    res.json({ success: true });
  });

  /** Retires every session for the account, on this device and any other. */
  router.post('/logout-everywhere', (req, res) => {
    const user = store.identify(readCookie(req, COOKIE));
    if (!user) return res.status(401).json({ message: 'Sign in first.' });
    store.logoutEverywhere(user.id);
    res.clearCookie(COOKIE, cookieOptions());
    res.json({ success: true });
  });

  router.put('/progress', (req, res) => {
    const user = store.identify(readCookie(req, COOKIE));
    if (!user || req.body.username !== user.username) return res.status(401).json({ message: 'Sign in to save your progress.' });
    try { res.json(store.save(user.id, req.body.revision, req.body.snapshot)); }
    catch (err) {
      if (err instanceof AccountError && err.status === 409) return res.status(409).json({ message: err.message, ...store.progress(user.id) });
      fail(res, err);
    }
  });
  return router;
}
