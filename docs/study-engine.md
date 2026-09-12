# Study engine and compatibility

## Scope

441 authored questions (145 existing IDs retained + 280 original additions + 16 diagram scenarios), 36 deterministic scenario templates, and 300 flashcards. The default track is Local Firebox. Network+ and WatchGuard Cloud have separate filters; All tracks combines them. This is independent practice material, not an official exam or a pass guarantee.

## Generator contract

`src/engine/templates.ts` contains 30 reviewed template functions. A variant is identified by `{templateId, seed, version}`. A seeded PRNG chooses valid inputs; subnet and routing helpers compute the answer; distractors represent concrete mistakes. Fisher-Yates shuffles choices after the correct answer set is established. No AI output determines correctness.

The first template version covers subnet/network/broadcast/mask/host calculations, DHCP capacity and relay, destination route selection, NAT addresses and ports, policy matching, management and backup choices, VLAN errors, DNS/TCP troubleshooting, log interpretation, SD-WAN thresholds, TLS trust, protocol ports, Mobile VPN routes, BOVPN selectors, and management ownership. Scenarios declare assumptions so policy routing, NAT, or VPN behavior is not inferred from incomplete context.

Both the frontend and `/api/quiz/evaluate` use the same exact-set grader. The server reconstructs generated questions from their descriptor and ignores a caller-supplied answer key for recognized questions. Unsupported variant versions fail explicitly. Legacy API callers retain their prior fallback path.

Question IDs are stable concept identifiers. A weakness entry for a generated question identifies its template; review uses fresh variables and clears the entry after three correct responses. History stores the question, choices, answer set, descriptor, selected answers, explanation, and timestamp as they appeared. A saved session stores the exact mock queue and current question; a reload or tab change does not reshuffle it.

Mock exams contain up to 50 questions. Static questions are unique within an exam; small generated pools can create multiple variants. A small authored-only topic may contain fewer than 50 questions. Exams finish with an explicit result instead of silently resetting statistics. This is a practice distribution, not a claim to reproduce an official exam blueprint or scaled score.

## Compatibility

The six sections remain: Q&A, quiz, labs, flashcards, sandbox, progress/admin. Existing question and flashcard identifiers, local progress keys, lab completion callbacks, theme preferences, and optional personal/server AI keys remain supported. Quiz feedback is always available locally for new authored/generated material. Older items retain the existing optional tutor/fallback path.

`watchguard-quiz-session-v2` is additive. The existing `watchguard-study-progress-v1`, `weakness_deck`, and `watchguard_mastered_flashcards` keys remain readable. Original flashcards keep IDs 1–20; new cards use 20000 + authored question ID.

## Learner accounts

Username + six-digit PIN, suggested callsigns, optional existing-browser progress import, and one-time recovery codes. SQLite uses Node's built-in driver (Node >=22.13). PINs use salted scrypt, recovery/session tokens are stored as hashes, sessions use HttpOnly SameSite cookies, and account/IP limits bound guessing. Recovery rotates the code and revokes prior sessions. Administrative AI controls still use ADMIN_PASSWORD independently.

Only whitelisted study fields synchronize. API keys, PINs, theme, and raw session tokens are excluded. Writes validate shape and carry the expected account username and revision. A stale revision returns a conflict with a choice of which copy to retain; both copies are backed up. The server retains the prior 20 revisions. The browser caches pending account-specific changes and retries saves. Sign-out preserves the scoped offline copy while clearing the visible study keys.

A loaded app can continue grading when the save server is unavailable; browser-only progress needs that browser's storage. There is no service worker guaranteeing a fresh page loads without network access. Server sync requires connectivity. Export progress from the account panel and keep the recovery code privately.

## Validation

- Existing tests plus structural/content, exact-set grading, 30,000 reproducible variants, and independent BigInt subnet-oracle checks.
- Account tests cover salted secrets, restart durability, account isolation, concurrent guessing limits, recovery rotation, session invalidation, malformed input, stale revisions, and HTTP cookie/write protections.
- `npm run lint`, `npm test`, `npm run build`.
- `scripts/smoke.mjs` validates production assets, legacy APIs, generated grading, and authenticated saves. CI replaces a Docker container using the same volume and verifies progress remains.
- CI runs tests/builds on Node 22 and 24 before the container smoke job. The image publish workflow also runs lint/tests before publishing.

Version changes to template algorithms must increment their version and retain an explicit migration or replay strategy. New static questions need permanent IDs, explanations, sources, unique options, and a validated answer set.
