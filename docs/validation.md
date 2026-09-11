# Validation record

Local validation on September 11, 2026:

- Baseline: 21 tests passed, TypeScript passed, production build passed.
- Upgrade: 38 tests across 7 files passed, TypeScript passed, production build passed on Node 24.19.
- Generated content: 30,000 variants structurally validated, deterministic replay checked, exact answer-set grading checked, IPv4 arithmetic compared with an independent BigInt implementation.
- Production HTTP smoke: page/assets, session/features/question metadata, chat fallback, lab diagnostics, canonical generated grading, registration and authenticated progress save passed.
- Account integration tests: restart persistence, isolation, recovery rotation, revoked sessions, account/IP write protections, optimistic conflicts, malformed snapshots, PIN throttling, and retained revisions passed.
- Browser: registration, PIN onboarding, server save indicator, generated feedback, exact question/options after reload, all 50 mock-exam steps and completion, flashcard keyboard reveal/mastery, five-step lab completion and dashboard update, local report rendering, and simulator auto-generator/injection controls exercised.
- Responsive visual check: 390px light theme and normal viewport dark theme; no page horizontal overflow at 390px.

The local machine has no Docker executable. The PR includes Node 22/24 CI and a production Docker smoke job that recreates the container against the same named volume. Review those checks before merging. Optional live Gemini calls were not made; existing AI fallback/configuration tests remain passing.

Known limits: Vite reports a bundle-size warning (approximately 726 kB uncompressed / 217 kB gzip). Existing 145 questions and simulator rules were preserved except targeted factual corrections; this is not a claim of complete independent factual re-audit of every legacy item. Practice scores are not official exam pass predictions.
