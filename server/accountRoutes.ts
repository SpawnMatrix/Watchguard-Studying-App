import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AccountStore, AccountError, displayRequestCode } from './accounts';
import { cookieOptions, readCookie, requireSameSiteWrite } from './security';

const COOKIE = 'wg_study_session';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60_000;
/**
 * Proof that this browser is the one that asked for help, held only here.
 * An administrator's approval is worthless without it, which is the whole
 * point of splitting recovery in two.
 */
const RECOVERY_COOKIE = 'wg_recovery';
const RECOVERY_COOKIE_MAX_AGE_MS = 15 * 60_000;

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
      signedIn(res, result);
    } catch (err) { fail(res, err); }
  });

  /** Issues the signed-in reply the three credential routes share. */
  function signedIn(res: Response, result: Awaited<ReturnType<AccountStore['login']>>) {
    res.cookie(COOKIE, result.token, cookieOptions(SESSION_MAX_AGE_MS));
    const { token: secret, accountId, ...safe } = result;
    res.json(safe);
  }

  /**
   * Change a PIN without involving anybody else.
   *
   * Most people who ask for help are still signed in and have simply
   * forgotten what they chose. This is the route for that, and it is the
   * reason assisted recovery should be rare.
   */
  router.post('/pin', authLimit, async (req, res) => {
    const user = store.identify(readCookie(req, COOKIE));
    if (!user) return res.status(401).json({ message: 'Sign in first.' });
    try { signedIn(res, await store.changePin(user.id, req.body?.currentPin, req.body?.pin)); }
    catch (err) { fail(res, err); }
  });

  /**
   * Assisted recovery, step one. Returns a code to read to an administrator
   * and sets the device credential that step three will need.
   *
   * A username that does not exist gets a code too — one nothing can approve —
   * so this cannot be used to find out which accounts are real.
   */
  router.post('/recovery/request', authLimit, (req, res) => {
    try {
      const { code, device } = store.openRecoveryRequest(req.body?.username);
      res.cookie(RECOVERY_COOKIE, device, cookieOptions(RECOVERY_COOKIE_MAX_AGE_MS));
      res.json({ requestCode: displayRequestCode(code) });
    } catch (err) { fail(res, err); }
  });

  /** Assisted recovery, step three, on the device that opened the request. */
  router.post('/recovery/complete', authLimit, async (req, res) => {
    try {
      const result = await store.completeRecovery(readCookie(req, RECOVERY_COOKIE), req.body?.pin);
      res.clearCookie(RECOVERY_COOKIE, cookieOptions());
      signedIn(res, result);
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
