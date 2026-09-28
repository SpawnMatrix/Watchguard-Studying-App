import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AccountStore, AccountError } from './accounts';
import { SuggestionStore, MAX_CLAIMS_PER_REQUEST } from './suggestions';
import { readCookie, requireSameSiteWrite } from './security';

const STUDY_COOKIE = 'wg_study_session';

/**
 * Learner-facing routes for the suggestion board.
 *
 * Posting needs a signed-in learner; the post does not record which one. That
 * is deliberate rather than sloppy: the session is a spam control, checked and
 * then discarded, so the board cannot be flooded from the open internet and
 * still cannot say who wrote anything.
 */
export function suggestionRoutes(accounts: AccountStore, suggestions: SuggestionStore) {
  const router = Router();

  router.use((_req, res, next) => {
    // The board is the same for everyone, but a reply is not, so no shared
    // cache should ever hold one of these responses.
    res.set('Cache-Control', 'private, no-store');
    next();
  });
  router.use(requireSameSiteWrite);

  const postLimit = rateLimit({
    windowMs: 60 * 60_000, limit: 10, standardHeaders: true, legacyHeaders: false,
    message: { message: 'That is a lot of ideas at once. Try again later.' },
  });
  const readLimit = rateLimit({
    windowMs: 5 * 60_000, limit: 120, standardHeaders: true, legacyHeaders: false,
    message: { message: 'Too many requests. Please wait a moment.' },
  });

  function fail(res: Response, err: unknown) {
    const known = err instanceof AccountError;
    res.status(known ? err.status : 500).json({ message: known ? err.message : 'That could not be saved. Please try again.' });
  }

  /** The public board, which is also the roadmap. No session needed to read. */
  router.get('/', readLimit, (_req, res) => {
    res.json({ suggestions: suggestions.published() });
  });

  /**
   * Post an idea.
   *
   * `showName` is the only say the request has in attribution, and even then
   * the name comes from the session rather than the body, so nobody can sign a
   * post as somebody else.
   */
  router.post('/', postLimit, (req, res) => {
    const user = accounts.identify(readCookie(req, STUDY_COOKIE));
    if (!user) return res.status(401).json({ message: 'Sign in to post an idea.' });
    try {
      const displayName = req.body?.showName === true ? user.username : null;
      const { id, claim } = suggestions.create(req.body?.body, displayName);
      // The claim is returned once. Nothing else can produce it again.
      res.json({ id, claim, status: 'pending' });
    } catch (err) { fail(res, err); }
  });

  /**
   * The posts behind the claims this browser holds.
   *
   * A POST because the claims travel in the body: putting them in a query
   * string would write them into every proxy log between here and the
   * learner, which is precisely the trail this design avoids.
   */
  router.post('/mine', readLimit, (req, res) => {
    const claims = req.body?.claims;
    if (Array.isArray(claims) && claims.length > MAX_CLAIMS_PER_REQUEST) {
      return res.status(400).json({ message: 'Too many at once.' });
    }
    res.json({ suggestions: suggestions.byClaims(claims) });
  });

  /** Withdraw a post. Only the browser holding the claim can do this. */
  router.post('/withdraw', postLimit, (req, res) => {
    const removed = suggestions.withdraw(req.body?.claim);
    if (!removed) return res.status(404).json({ message: 'That idea is no longer there.' });
    res.json({ success: true });
  });

  return router;
}
