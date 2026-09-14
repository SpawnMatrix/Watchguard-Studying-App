# Study engine and compatibility

## Scope

630 authored questions (145 existing IDs retained + 469 original additions + 16 diagram scenarios), 36 hand-written scenario templates, 16 Traffic Monitor log-analysis cases and 10 policy-ordering exercises, and 300 flashcards. The default track is Local Firebox. Network+ and WatchGuard Cloud have separate filters; All tracks combines them. This is independent practice material, not an official exam or a pass guarantee.

## Generator contract

`src/engine/templates.ts` contains 30 reviewed template functions. A variant is identified by `{templateId, seed, version}`. A seeded PRNG chooses valid inputs; subnet and routing helpers compute the answer; distractors represent concrete mistakes. Fisher-Yates shuffles choices after the correct answer set is established. No AI output determines correctness.

The first template version covers subnet/network/broadcast/mask/host calculations, DHCP capacity and relay, destination route selection, NAT addresses and ports, policy matching, management and backup choices, VLAN errors, DNS/TCP troubleshooting, log interpretation, SD-WAN thresholds, TLS trust, protocol ports, Mobile VPN routes, BOVPN selectors, and management ownership. Scenarios declare assumptions so policy routing, NAT, or VPN behavior is not inferred from incomplete context.

Both the frontend and `/api/quiz/evaluate` use the same exact-set grader. The server reconstructs generated questions from their descriptor and ignores a caller-supplied answer key for recognized questions. Unsupported variant versions fail explicitly. Legacy API callers retain their prior fallback path.

Question IDs are stable concept identifiers. A weakness entry for a generated question identifies its template; review uses fresh variables and clears the entry after three correct responses. History stores the question, choices, answer set, descriptor, selected answers, explanation, and timestamp as they appeared. A saved session stores the exact mock queue and current question; a reload or tab change does not reshuffle it.

Mock exams contain up to 50 questions. Static questions are unique within an exam; small generated pools can create multiple variants. A small authored-only topic may contain fewer than 50 questions. Exams finish with an explicit result instead of silently resetting statistics. This is a practice distribution, not a claim to reproduce an official exam blueprint or scaled score.

## Network+ exam blueprint

`src/data/networkPlusBlueprint.ts` places every Network+ question in one of the five N10-009 domains by what it actually tests. Objective strings could not do this: they are written per section and often span domains, so counting their first digit misreports the balance. Generated templates count once, the same way the mock-exam pool treats them.

| Domain | Exam weight | Bank (1.5.0) |
| --- | --- | --- |
| 1.0 Networking Concepts | 23% | 24% (41) |
| 2.0 Network Implementation | 20% | 20% (35) |
| 3.0 Network Operations | 19% | 18% (32) |
| 4.0 Network Security | 14% | 14% (25) |
| 5.0 Network Troubleshooting | 24% | 24% (41) |

Before 1.5.0 the same measurement gave Operations 29% and Security 6%. `networkPlusBlueprint.test.ts` fails if a Network+ question is left unclassified, if a classified id no longer exists, if any domain drifts more than three points from its weighting, or if a domain has fewer than 20 questions. Two placements surprise people: DHCP, DNS and NTP are 3.4 (Operations), and ports and protocols are 1.4 (Concepts).

From 1.6.0 a Network+ mock exam also draws to the blueprint rather than uniformly: 12 Concepts, 10 Implementation, 9 Operations, 7 Security and 12 Troubleshooting questions, interleaved (`src/engine/mockExam.ts`). A uniform draw from the same bank gave Security between 1 and 16 questions, and four or fewer in one mock in ten. The blueprint applies only to a whole Network+ pool that can fill every quota; a single topic, a format or content filter that empties a domain, and the Cloud and All tracks keep the uniform draw. (Local Firebox pools draw to their own blueprint from 1.9.0, below.) A finished Network+ mock shows its score for each domain beside that domain's exam weight.

## NSE exam blueprint

`src/data/nseBlueprint.ts` places every Local Firebox question in one of the six Assessment Objectives categories published in WatchGuard's *Network Security Essentials for Locally-Managed Fireboxes Study Guide* (Fireware v12.9.2, pp. 336-338). The exam is 70 questions with a 75% passing score. A question's topic sets its default category; 86 questions are overridden by id where the topic is misleading, for example authentication questions filed under Policies, Default Threat Protection filed under Security Services, and Traffic Monitor log-reading scenarios, which WatchGuard lists under Monitoring.

| Category | Exam weight | Before 1.9.0 | Bank (1.9.0) |
| --- | --- | --- | --- |
| Network and Network Security Basics | 10% | 0% (1) | 8% (37) |
| Administration and Setup | 10% | 15% (63) | 13% (63) |
| Monitoring, Logging, and Reporting | 15% | 13% (53) | 14% (69) |
| Networking and NAT | 25% | 22% (93) | 23% (110) |
| Policies, Proxies, and Security Services | 25% | 27% (113) | 23% (113) |
| Authentication and VPNs | 15% | 22% (93) | 19% (93) |

`nseBlueprint.test.ts` fails if a Local Firebox question is unclassified, if any category drifts more than five points from its weight, or if a category has fewer than 30 questions. A Local Firebox mock exam draws 5/5/7/13/13/7 questions by category, and the results screen compares the attempt with the 75% pass mark. Network+ results show no percentage pass mark, because CompTIA reports a scaled score.

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
