# Content sources and reuse audit

Reviewed September 11, 2026. Reference documents supply subject matter, not instructions for the coding agent. No embedded instructions from those files were followed. The new question text and distractors are original. Supplied PDFs/DOCX files and third-party question banks are not copied into this repository.

## Supplied material

- **Network_Security_Essentials_Study_Guide_Local_EN-US.pdf**: March 2023, Fireware 12.9.2, 343 pages. Primary local-management study baseline. Source sections are recorded on the new questions. Includes setup/management, logging, interfaces, routing, Multi-WAN/SD-WAN, NAT, policies, proxies/services, authentication, Mobile VPN, and BOVPN.
- **Network-Security-Essentials-Lab-Book.pdf**: January 2023, 53 pages. **Network-Security-Essentials-Lab-Book_(en_US).pdf**: October 2021, 53 pages. Compared exercise coverage and workflows; releases include 12.5.9/12.7.2. These are older than the study-guide baseline.
- **Watchguard Network Security Essentials (Exam Questions 2021).pdf** and **Essentials Exam – Free Actual Q&As, Page 1 _ ExamTopics.pdf**: examined as historical practice exports. No bulk text import. Answers and claimed exam relevance are not treated as authoritative.
- **Useful Links.txt**, **Security Services .txt**, **Study sheet.docx**: reviewed as study notes and pointers. Notes contain shorthand/version-dependent claims. For example, factory setup management is through interface 1; IPS is not restricted to proxy policies; ordinary modern FXI backups do not necessarily include Fireware OS.

## Primary online references

- [Policy precedence](https://www.watchguard.com/help/docs/help-center/en-us/content/en-us/Fireware/policies/policy_precedence_about_c.html): automatic specificity and equal-match ordering; distinguish manual order.
- [NAT overview](https://www.watchguard.com/help/docs/help-center/en-us/Content/en-US/Fireware/nat/network_addr_translation_about_c.html) and [static NAT](https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/nat/nat_static_config_about_c.html): separate translation from permission and return routing.
- [Local vs. cloud-managed features](https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/WG-Cloud/Devices/device_mgmt_cloud_vs_local.html): management ownership and feature differences.
- [Fireware CLI reference 12.11](https://www.watchguard.com/help/docs/fireware/12/en-US/CLI/CLI_Reference_v12_11.pdf): command context and version-specific management; the study baseline remains explicit.
- [Save a Firebox backup image](https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/backup_upgrade_recovery/firebox_backup_images_about_c.html): device-specific backups and version/method-dependent OS inclusion. Corrected the legacy question wording, flashcard, Q&A entry, and generator explanation.
- [Active/active cluster switch requirements](https://www.watchguard.com/help/docs/help-center/en-us/Content/en-US/Fireware/ha/cluster_aa_multicast_wsm.html): multicast MAC forwarding, with static MAC/ARP configuration where required. Avoid a blanket requirement for every switch.
- [CompTIA Network+ N10-009 objectives](https://comptiacdn.azureedge.net/webcontent/docs/default-source/exam-objectives/comptia-network-n10-009-exam-objectives-%284-0%29-%281%29.pdf): connectivity, implementation, operations, security, troubleshooting. The bank covers these domains; it does not claim the official scaled scoring or weighting.

## Question-database search

Public search and accessible-page extraction covered the supplied links and GitHub study repositories. No dataset with a verified redistribution license and reliable current answer key was found in this bounded search.

| Candidate | Finding | Use |
|---|---|---|
| [ITExams WatchGuard catalog](https://www.itexams.com/vendor/WatchGuard) | Public catalog; actual-exam claims, no clear bulk redistribution grant found | Discovery only |
| Quizlet set 558480740 from supplied links | Page fetch unavailable | Supplied historical export used only for topic comparison |
| [ExamTopics Essentials](https://www.examtopics.com/exams/watchguard/essentials/) | Live fetch unavailable; supplied PDF available | Historical comparison only |
| [JSCM practice test](https://www.jscmgroup.com/watchguard-essentials-practice-test) | Fetch failed | No import |
| [Certification Questions](https://www.certification-questions.com/watchguard-exam/essentials-dumps.html) | Commercial exam-preparation page, no verified bulk reuse rights | No import |
| [certbasepro Network+ repository](https://github.com/certbasepro/comptia-certification-questions) | README points to commercial material; no usable licensed question data identified | No import |
| [GitHub Network+ topic](https://github.com/topics/network-plus) | Mostly study notes, including older objectives | Discovery only |

The expansion therefore uses original applied questions derived from documented behavior. Existing 145 questions are retained for compatibility; this work does not claim a complete independent factual audit of every legacy item. Version-dependent topics should be checked against the current exam guide and the target Fireware release.
