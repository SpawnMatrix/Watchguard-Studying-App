# October 2026 source review

This update uses the supplied locally-managed Firebox lab book and Anki deck to improve coverage without importing a second copy of the existing bank. All new scored questions are original scenarios. Source documents were treated as evidence, not instructions to execute. No source PDF, Anki package, screenshot, extracted card text, or training configuration is distributed in the repository.

## Sources and limits

- **lab-book 1.pdf**: 41 pages, 14 exercises; August 2026 on the cover, March 2026 in the internal revision statement. The discrepancy is retained in the source record. The stated lab requirement is Fireware 12.10.4 or later. This is a companion lab curriculum, not an independently verified current exam blueprint.
- **Watchguard Locally Managed 1.apkg**: 276 notes producing 276 cards; 18 notes reference images and three have image-only prompt text. All 18 image-bearing notes were reviewed locally, including the annotated SMTP images. Several cards contain older screenshots, author doubts, conflicting answers, or overly broad claims.
- Official WatchGuard Help Center, IANA, and RFC references were consulted for the new concepts and corrections. Per-question references are in `training2026.ts`; lab page references are in `trainingLabs2026.ts`. Existing questions retain their older source/version labels unless specifically revised; this release does not claim a fresh factual audit of all 669 previous questions.
- Input SHA-256 hashes, original Anki note IDs, review dispositions, and destination question IDs are recorded in [source-review-2026.json](source-review-2026.json). The source-index field is one-based in extraction order; note ID is the stable source identity.

## Disposition of every Anki note

| Disposition | Source notes | Treatment |
| --- | ---: | --- |
| Reuse an existing concept | 214 | Link to existing questions; no new scored copy |
| Use an original new scenario | 31 | Map to the new bank, often several notes to one question |
| Repeated normalized prompt | 5 | Link to the retained concept and first source note |
| Hold or retain coverage outside the quiz | 26 | State the individual reason; do not guess an answer |
| Total | 276 | Every source note appears exactly once |

The 31 source notes do not imply 31 new questions. Together with lab-derived gaps, the release adds **26** questions, IDs **2400-2425**, and their **26** automatically derived flashcards. Separate question IDs are not allocated for repeated source wording. Similarity matching was used to locate candidate overlaps; final destinations and held reasons were reviewed explicitly. A reuse row is a concept mapping, not endorsement of every sentence or answer in the original card.

Held entries include an uncertain IPSec multiple-choice answer, unspecified log-storage formats, a universal Cloud minimum-version claim, an ambiguous Policy Checker question, TLS-handshake simplifications, and universal VPN-client installation claims. Two ThreatSync notes and a local-user-database note are already addressed by Q&A/lab material. The ledger distinguishes these reasons instead of silently discarding them.

## Corrections and conflict resolution

- Keep question **14**: it already correctly scopes standard on-device backups to Fireware 12.2.1+. One source card incorrectly includes the OS without version context. [WatchGuard backup contents](https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/backup_upgrade_recovery/firebox_backup_images_about_c.html).
- Clarify **29**: distinguish an ICMP Ping probe from separately configured TCP and DNS probes.
- Narrow **40** to a T40 instead of asserting Eth1 is the default trusted interface on every model.
- Correct **49**: default Outgoing permits TCP/UDP, not every IP protocol.
- Clarify **51**: dynamic NAT translates the outbound source; WatchGuard SNAT means static NAT, not source NAT.
- Correct **68**: a group-specific allow above a broad Outgoing rule does not deny other groups. State that no other policy permits FTP.
- Clarify **71**: Body Content Types examines file signatures rather than filename extensions; distinguish MIME labels and filename rules.
- Scope **77** to Manual-Order mode so list position is a sufficient reason for precedence.
- Enrich **1011** with verified feature-key synchronization behavior and **1147** with the need to enable Application Control on policies.
- Correct **1083**: one shared probe target is a single point of failure; a shared redundant target set is not categorically forbidden. This reconciles the older question with the newer lab's DNS probes.
- Enrich **1105** with the translated network's role in the remote VPN selector.
- Replace uncertain SMTP screenshot interpretation with explicit conditions in **2404**. Mail From filters envelope senders, Rcpt To filters recipients, and rewriting requires a configured rewrite action. Do not infer a rule from an action's name or contradictory annotations.

The lab itself also needs interpretation: page 8 has conflicting compatibility values; pages 36-37 name inconsistent interface numbers; NAT loopback is mentioned in prose but its internal source is omitted in numbered steps; page 19 uses different blocked-domain examples in heading and steps; page 32 describes no WebBlocker action but then clones one with a category exception. Original scenarios use explicit, internally consistent conditions. Exercise choices such as IPS Fast Scan or inspection exemptions are treated as that lab's requirements, not universal production recommendations.

## Lab coverage

`labBook2026Crosswalk` maps all **14** exercises to question IDs and app labs. It preserves the existing **20** lab IDs, names, and step counts. New walkthroughs append:

- **21: Configuration Migration** — configuration versus backup, target-specific feature key, management reachability, and service verification.
- **22: NAT Verification** — inbound SNAT, permitted loopback sources, outbound source NAT, and evidence from new connection logs.
- **23: Diagnostic Evidence** — runtime state, interface-specific probes, matching packet captures, and justified conclusions.

Each adds four checkpoints, for **93** total. These are clearly labeled walkthroughs; the simulator does not pretend to perform migration, NAT packet processing, or PCAP capture. The nine existing simulated labs and their task solutions are unchanged. NAT weakness recommendations now lead to the NAT lab, and troubleshooting includes the evidence walkthrough.

## Regression safeguards

- The prior 669 question IDs are pinned by a sorted-ID digest. All remain in the bank, and the original 20 lab names and step counts are pinned in the ledger.
- New questions have unique IDs, no exact normalized prompt duplicate, valid references, defined NSE categories, working grading, and exactly one derived flashcard each.
- Every source note and all 14 lab crosswalk rows must resolve to existing catalog destinations, or carry an explicit held reason.
- Existing answer-length, mock-exam, generator, topology, checkpoint, sandbox-solution, persistence, and chunk-loading checks remain in force.

Validation results and delivery state are recorded in the release notes and PR. Automated tests establish structural and behavioral correctness; they cannot certify every answer's factual accuracy or the state of a physical Firebox.
