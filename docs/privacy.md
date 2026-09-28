# What this portal records about people

This is an inventory, not a policy. It lists every place the running app
writes, stores or transmits something about a learner, with the file and line
that does it, so a claim in the README can be checked against the code rather
than believed.

The rule it is measured against:

1. **Log essentially nothing about people.** The only per-user state worth
   keeping is study state — where a learner is in the material.
2. **Nothing leaks.** No endpoint hands one learner another's data, and no
   learner's content leaves the server unless that learner turned it on.
3. **Administrators can do almost nothing.** Helping someone back into their
   account is the goal; an administrator acting alone should not be able to
   take one over.

Line references are against v1.19.0. Sections marked **Open** are things this
inventory found and did not change; each says why.

---

## 1. Logs

The whole app writes seven log lines, and none of them can name a person.

Every call goes through [`server/log.ts`](../server/log.ts), which formats
only values it built itself. `server/logging.test.ts` reads the source of
`server.ts`, `server/*.ts` and `src/services/aiService.ts` and fails the build
if any of them calls `console.*` directly, or passes a request, an address, a
username, a PIN, a prompt, an answer, a token or an error `.message` into a log
call. It strips comments and literal prose first, so what a warning *says* is
free and what it *interpolates* is checked.

| Where | Line says | Can it contain a person? |
| --- | --- | --- |
| `server.ts:332` | the port the server bound | No. `PORT` is configuration. |
| `server.ts:134` | that `TRUSTED_PROXY_HOPS` disagrees with the traffic | No. Two fixed strings, chosen by a boolean. Once per process. |
| `server/adminRoutes.ts:40` | that `ADMIN_PASSWORD` is unset | No. Fixed string, once at startup. |
| `server.ts:188, 227, 246, 270` | `[chat\|quiz\|lab\|analysis] failed: Class(code)` | No. See below. |
| `src/services/aiService.ts:132, 195, 259, 316` | `[ai-*] failed: Class(code)` | No. Same. |
| `server.ts:80` | `[retention] failed: …` if a sweep throws | No. Same. |

### Why an error object was the risk

The previous code was `console.error("Chat API failed:", error)`. Node prints a
thrown object with its stack and its enumerable properties, and the call site
cannot see what those are: an HTTP client may attach the request it sent, a
parser may quote the text it choked on, and a stack frame may close over a
prompt. `logServerError` therefore reduces any thrown value to
`Class` or `Class(status|code)` (`server/log.ts:49`), filtered through a
character allow-list so that even a constructor name or a system code an
attacker could influence cannot become a sentence. Messages are dropped
deliberately.

The cost is real and worth stating: a failure that could once be diagnosed
from the log line now has to be reproduced. The class and the HTTP status are
kept precisely because they are what usually distinguishes "the key is wrong"
from "the network is down".

### What is not logged anywhere

No request log, no access log, no IP in any log line, no per-request
identifier, no telemetry, no error-reporting SDK. `src/utils/errorHandler.ts`
is the browser-side handler and writes to the browser console only; nothing is
sent anywhere. Express is not given a logger. There is no analytics script in
`index.html`.

**Open:** the app does not log addresses, but whatever sits in front of it
might. A reverse proxy, a container runtime's log driver and a systemd journal
all keep their own access records, and this repo cannot turn those off. An
operator who wants the property this document describes has to check the proxy
too. `docs/deployment-data.md` covers the deployment; this is the one gap in
the promise that lives outside the code.

---

## 2. Stored data

One SQLite database, at `DATA_DIR/study.sqlite`
([`server.ts:67`](../server.ts)). Schema in
[`server/accounts.ts:122-171`](../server/accounts.ts).

| Table | Holds | Kept for |
| --- | --- | --- |
| `accounts` | username, PIN hash + salt + KDF label, recovery-code hash + salt + KDF label, admin flag, creation timestamp | Until the account is deleted. There is no delete route — see **Open** below. |
| `sessions` | SHA-256 of the session token, account id, created / last-seen / expiry timestamps | 30 days absolute, 7 days idle, at most 10 per account. |
| `progress` | the current study snapshot, a revision counter, a timestamp | Until replaced. One row per account. |
| `progress_backups` | the previous 20 snapshots | Until 20 newer revisions exist (`accounts.ts:502`). |
| `auth_failures` | throttle counters keyed by username, **by IP address**, and globally | 15 minutes, now enforced — see below. |
| `admin_sessions` | SHA-256 of the admin token, account id, timestamps | 8 hours absolute, 30 minutes idle. |
| `settings` | the global AI toggle | Indefinitely. Not per-user. |

No secret is stored in a form that can be read back: the PIN and the recovery
code are scrypt-derived, and session tokens are stored only as digests
(`accounts.test.ts:16-24` asserts all three).

### The one place an IP address is stored

`auth_failures` rows with `scope='ip'` hold a raw address as the bucket key.
This is not optional: rate limiting has to count something per source, and
counting per source means holding the source for the length of the window.

What changed in v1.17.0 is how long. `throttle()` prunes the buckets it
touches, but only when somebody tries to sign in, so an address from a burst
of traffic sat in the table until the next sign-in attempt — which on a quiet
portal could be weeks. `pruneExpiredRecords()` (`accounts.ts:248`) now runs at
startup and every five minutes (`server.ts:78`), so:

> **An IP address exists in this database for at most its own 15-minute window
> plus five minutes, whether or not anybody signs in.**

The same sweep retires sessions and admin sessions once they expire or go
idle, instead of leaving the row until the next sign-in. Sessions written
before `last_seen` existed (`last_seen = 0`) are left to their absolute
expiry, matching `identify()`, so an upgrade does not sign anybody out.

### The table that was dropped

`auth_attempts` was the pre-hardening throttle table, replaced by
`auth_failures` several releases ago. Nothing has written to it since, but rows
from that era still name accounts that failed to sign in, and no code path ever
expired them. The migration drops it (`accounts.ts:170`), and
`scripts/verify-backup.mjs` no longer expects it. Rolling back recreates it
empty.

### What the study snapshot actually contains

This is the honest part of rule 1. "Study state" is not only a position in the
material. `src/account/schema.ts:4` syncs seven keys, and two of them are
records of what a learner did:

- `watchguard-study-progress-v1` carries `quizStats.history`: for each attempt,
  the question id, **the answers that learner selected**, whether it was right,
  the topic and the explanation text (`schema.ts:9`).
- `watchguard-quiz-session-v2` carries the in-flight quiz, including the full
  text of queued questions and the current selection.

So the server does hold a record of what someone answered, it holds the
previous 20 revisions of it, and it holds it until the learner replaces it.

**Open, and deliberately so.** Weakness review and the spaced-repetition deck
are built from exactly this history; deleting it would delete the feature.
What is worth saying plainly is that this is the largest per-user record the
app keeps, that `progress_backups` multiplies it by up to 20, and that the
reasonable lever — should anyone want one — is trimming the backup depth or
ageing history out of the snapshot, not the logging or the throttle tables.
Anything a learner can see about themselves under "Download my progress"
(`AccountGate.tsx:169`) is the same data.

**Open:** there is no "delete my account" route. A learner can sign out and
stop, but the row, the snapshot and the 20 backups stay. That is a gap against
rule 1 and it is not fixed here, because deletion needs a design decision about
what an admin may trigger — which belongs with the admin change, not with this
one.

### Client-side storage

`localStorage` only, never read by the server except as an uploaded snapshot:
`watchguard-study-progress-v1`, `weakness_deck`,
`watchguard_mastered_flashcards`, `watchguard-quiz-session-v2`,
`watchguard-study-profile-name-v1`, `watchguard-srs-v1`,
`watchguard-lab-progress-v1`, plus device-local extras
(`watchguard-study-owner`, `watchguard-account-cache:<user>`,
`watchguard-portal-theme`, `watchguard-learning-track:<user>`,
`watchguard_custom_gemini_api_key`).

The custom Gemini key is the one to watch: it is stored in the browser
(`AdminConsole.tsx:77`) and sent as an `X-Gemini-API-Key` request header on
tutor calls. It is never persisted server-side, never logged, and the learner
can clear it from the same panel. `schema.ts:3` deliberately keeps it out of
the synced snapshot.

---

## 3. Responses that carry user data

| Route | Returns | Whose? |
| --- | --- | --- |
| `GET /api/account/me` | username, admin flag, own snapshot + revision | Caller's own, keyed by the session cookie (`accountRoutes.ts:43`). |
| `POST /api/account/{register,login,recover}` | username, admin flag, own snapshot; recovery code on register/recover | Caller's own. The session token is stripped from the body and set as a cookie (`accountRoutes.ts:38`). |
| `PUT /api/account/progress` | new revision, and on a 409 the stored snapshot | Caller's own; the route refuses when the body's username is not the session's (`accountRoutes.ts:66`). |
| `GET /api/admin/me` | whether an admin session exists, the caller's username, whether break-glass is configured, the number of administrators, the number of completed recoveries | Caller's own, plus two counts. |
| `GET /api/admin/users` | **Removed in v1.19.0.** Answers 410 with no data. | Nobody's. |
| `POST /api/admin/recovery/approve` | whether the code was live | Nobody's: it names no account. |
| `GET /api/session` | whether a proxy forwarded an identity | Caller's own; the identity itself stays server-side (`server.ts:142`). |
| `GET /api/stats`, `GET /api/questions`, `GET /api/version`, `/healthz` | catalogue counts and build metadata | Nobody's. |

Every response is now scoped to the caller's own session or to an aggregate
count. Until v1.19.0 `GET /api/admin/users` returned the entire population to
any administrator on every console load; see section 7.

### Account enumeration

Every route was checked for one account learning about another, including
through an error message and through response time.

- **`login()`** answers `Username or PIN did not match.` either way and derives
  a key against a stand-in salt when the account does not exist, so the work it
  does is the same either way (`accounts.ts:352`).
- **`recover()`** used to derive a key *only* when the account existed. An
  invented username came back in about a millisecond; a real one cost a full
  scrypt. That is an unlimited account-existence oracle for anyone willing to
  time the response, and it did not need a valid recovery code to work. Fixed
  in v1.18.0: every path now pays one current-scheme derivation, including the
  legacy unsalted records, which verify instantly and would otherwise have been
  the same oracle in reverse (`accounts.ts:378`). `server/leaks.test.ts`
  compares medians and fails if the two diverge.
- **Registration** still distinguishes a taken username from a free one with a
  409. That is unavoidable for a username picker, and it is throttled on purpose
  (`accounts.ts:337`).
- **Progress** refuses rather than serves when the body names another account,
  and the snapshot returned on a 409 is the caller's own
  (`accountRoutes.ts:66`).
- **Administration** answers a signed-in non-administrator with a flat 403 and
  no detail.

- **Assisted recovery** returns a request code whether or not the username
  exists, so it cannot be asked which accounts are real either
  (`accounts.ts`, `openRecoveryRequest`).

---

## 4. What leaves the server

Exactly one destination: Google's Gemini API, from
[`src/services/aiService.ts`](../src/services/aiService.ts), and only when AI
features are enabled. They are off unless **all** of `ENABLE_AI_FEATURES` is not
`"false"`, `GEMINI_API_KEY` is set, and an administrator has turned the global
toggle on (`aiService.ts:20-31`) — or the learner supplied their own key, in
which case the call is billed to them.

| Feature | Sent upstream | Source |
| --- | --- | --- |
| Tutor chat | the learner's typed question and up to 10 previous turns of that conversation, prefixed with the learning track | `aiService.ts:93-101`, `GeneralChat.tsx:99` |
| Quiz explanation | question text, options, the selected answer and the correct answer — **only for a question the server could not explain from the catalogue** | `aiService.ts:166-171`, `server.ts:211` |
| Lab diagnostic | lab name, step title, step instruction, and the issue the learner typed | `aiService.ts:226-231`, `LabWalkthrough.tsx:163` |
| Readiness report | the caller's quiz history, score, topic weaknesses and completed labs | `aiService.ts:306`, `PerformanceDashboard.tsx:60` |

No username, account id, session token, IP or cookie is attached to any of
these: the client for Gemini is constructed with an API key and a fixed
`User-Agent` and nothing else (`aiService.ts:44-63`). The upstream call carries
content, never identity.

Most of the quiz path never leaves at all. `server.ts:200-219` grades against
the server's own catalogue and returns the stored explanation; the model is
only consulted for a catalogue question that has no explanation written for it.

**Open:** rule 2 says content should not leave "unless the person turned that
on themselves", and today an *administrator* turns it on for everybody at once.
A learner who types a question into the tutor has no per-person switch and no
notice at the point of typing. Making the upstream call conditional on a
consent the learner gave is a real change to four call sites and a UI, and it
is called out here rather than folded into a logging change.

### Bounding what can be forwarded

`server/tutorInput.ts` caps every field that can reach the model. The caps are
roughly four times the largest real content in the repo — the longest lab
instruction is 255 characters, the longest question 327 — so an abuser is
bounded and a learner never reaches one. `server/leaks.test.ts` runs every lab
step and all 692 catalogue questions through them to keep that true.

`/api/lab/diagnostic` previously had no validation at all, so the 1mb body
limit was its only ceiling. The `/api/quiz/evaluate` branch that forwards a
question the catalogue does not contain had the same gap, and that branch is
the whole of the tutor abuse surface: no ordinary client produces it.

All three tutor routes now also carry `requireSameSiteWrite`
(`server.ts:117`), the guard every account and admin route already had. A
request must be JSON, carry `X-Study-Request: 1` and not come from a
cross-site context, so a page on another origin cannot drive this deployment's
upstream budget with a form post. `POST /api/admin/toggle-ai` and
`POST /api/admin/analyze` are mounted outside the admin router and were missing
the same guard; they have it now.

**Open:** this does not make the tutor routes *authenticated*. Anyone who can
reach the port and send the header can still spend the deployment's Gemini
budget, 40 requests per 5 minutes per address. Requiring a session would close
it, and would also take the tutor away from anyone using "Study on this device
only" (`AccountGate.tsx:183`), which the app offers deliberately. That is a
product decision, not a fix, so it is recorded here rather than made quietly.

---

## 5. Transport

These are pinned by `server/leaks.test.ts`, which asserts the full header set
and the cookie flags against a real production-mode response, so a README
sentence and the server cannot drift apart silently.

`server/security.ts` sets, on every response: `Content-Security-Policy`
(`default-src 'self'`, no inline script in production), `X-Content-Type-Options`,
`X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`,
`Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`,
`Permissions-Policy` denying geolocation, microphone, camera and payment, and
`Strict-Transport-Security` in production with secure cookies. `X-Powered-By`
is removed.

`Referrer-Policy: no-referrer` matters for this document: without it, a link
out of the app would tell the destination which page the learner was on.

Both cookies (`wg_study_session`, `wg_admin_session`) are `HttpOnly`,
`SameSite=Strict`, `Path=/`, and `Secure` in production unless
`COOKIE_SECURE=false` is set deliberately (`security.ts:67`). Account and admin
routes send `Cache-Control: private, no-store` so a shared proxy cannot retain
a response.

---

## 6. What an administrator can do

As of v1.19.0.

**Can:**

- Approve one recovery request by the code a learner reads out. They are not
  told whose account it is, and approving does not reset anything: the new PIN
  is set back on the device that opened the request.
- Grant or revoke the administrator role on a username they type.
- Turn the global AI tutor on or off.
- Run the readiness analysis on data their own browser supplies.
- See two counts: how many administrators exist, and how many assisted
  recoveries have ever completed.

**Cannot:**

- List accounts. The route is gone and so is `AccountStore.listAccounts()`;
  nothing on the server can produce a roster.
- See anyone's username, creation time, progress revision or last activity.
- Sign another learner out of their devices.
- Read, export or alter anyone's study progress.
- Reset a PIN on their own. Approval is half of a reset; the other half needs
  the learner's device.

### Why recovery is split, and what the split does not do

The learner opens a request on their own device, which returns an
eight-character code and sets a short-lived credential in that browser. They
read the code to an administrator, who approves that one code. The reset is
then completed back on the device that asked.

This means an approval is not a reset. An administrator who holds a code — or
who intercepts one — cannot use it, because completing needs a credential only
the requesting browser has. A recovery also cannot be done remotely to somebody
without their knowledge: their device has to be the one that starts and
finishes it.

**What it does not prevent** is an administrator willing to impersonate a
learner outright: open a request for that username on their own machine,
approve it with their own session, finish it there. The split stops an approval
being useful to a *third* party; it does not stop one person playing both
parts. `server/recovery.test.ts` states that as a test rather than only as
prose, so nobody later reads the flow as a guarantee it does not make.

Preventing it would mean binding recovery to something only the real owner
holds. There are two candidates and neither is free:

- the self-service recovery code, which is already the no-administrator path
  and is exactly what this flow is for people who have lost;
- a durable per-device identifier stored against the account, which is the kind
  of per-person record rule 1 says not to keep.

Requiring two administrators to approve would also work, and would stop working
entirely on the many deployments that have one. That trade is available if the
threat is judged to be worth it.

What the design does leave is evidence. A completed recovery destroys every
session on the account, rotates the recovery code, and moves the counter shown
in the console — so a learner finds out, and an operator can see recoveries
happening more often than they remember helping with.

### Reducing how often it is needed

`POST /api/account/pin` changes a PIN from inside a signed-in session, with no
administrator at all. Most people who ask for help are still signed in on a
device and have simply forgotten what they chose; that case no longer touches
anybody else.

---

## 7. Summary

After v1.19.0, in plain language:

- The server logs the port it started on, up to two configuration warnings,
  and a class name when a request fails. Nothing else.
- It stores a username, two password-equivalent hashes, session digests and a
  study snapshot. It holds an IP address for at most twenty minutes, only for
  rate limiting, and only while someone is failing to sign in.
- It sends a learner's typed questions and quiz history to Google when — and
  only when — AI features have been switched on, within fixed size ceilings,
  with no identity attached.
- Recovery takes the same time whether or not the username is real, so the
  portal cannot be asked which of a list of names has an account.
- It has no telemetry, no analytics, no error reporting and no request log.
- An administrator can approve a recovery code and change a role. They cannot
  list accounts, read progress, or reset a PIN without the learner's device.

**Open:** `src/index.css:1` imports web fonts from `fonts.googleapis.com`. The
production CSP (`style-src 'self' 'unsafe-inline'`) blocks it, so today no
request reaches Google and the portal renders in system fonts — but the intent
in the source is to fetch from Google on every page load, which would hand
Google every visitor's address and referer, and relaxing `style-src` later
would switch that on silently. The fix is to self-host the fonts or drop the
import. It is not done here because `src/index.css` is the file the theming
work is in.
