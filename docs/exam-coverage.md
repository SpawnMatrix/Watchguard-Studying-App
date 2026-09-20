# Exam coverage audit — 1.16.0

Audited 2026-09-19 against main 031a843. Reproduce: `npx tsx scripts/audit-exam-coverage.ts`.

## Evidence and scope

- **Local:** supplied WatchGuard *Network Security Essentials for Locally-Managed Fireboxes*, March 2023 / Fireware 12.9.2, printed pp. 336–338. Every assessment knowledge-area bullet is represented below. Row identifiers after the category number are audit identifiers, not vendor numbering. The source PDF is deliberately not redistributed. This verifies the repository's historical baseline, not a claim that the current live exam is unchanged.
- **Network+:** [CompTIA's N10-009 objectives, document v6.0](https://lecbyo.files.cmp.optimizely.com/download/35a7403ab73211ef9dcda6f347fbf652), pp. 3–14, accessed 2026-09-19. All 25 numbered objectives are mapped. The older v4.0 link in the repository is not evidence of current completeness. Weights remain 23/20/19/14/24. CompTIA publishes domain weights, not objective weights.
- **Cloud:** the official [study-guide portal](https://www.watchguard.com/wgrd-training/exam-study-guides) returned 401. The [WatchGuard-authored June 2022 guide, mirrored on StudyLib](https://studylib.net/doc/28453724/watchguard-network-security-essentials-study-guide-cloud-...), pp. 174–175, supplies a **provisional historical checklist**, not independently authenticated current exam criteria. Its category weights are 18/12/25/30/15. All its knowledge-area bullets appear below. Current behavior for new Cloud scenarios is sourced to individual WatchGuard Help pages on each question. No Cloud blueprint or pass-readiness claim is introduced from this unverified-current outline.

## Counting and depth

Each authored question is one item; each template is one concept, irrespective of generated variants. Existing same-fact twins remain in bank counts; the actual mock sampler handles their suppression. Every catalog item has exactly one reviewed **primary** objective or an explicit supplementary classification in `scripts/coverage-map.ts`. This prevents broad section metadata from claiming several objectives per question. A second skill mentioned in a distractor does not count as coverage. The ID ledger below makes each classification reviewable.

**A** = applied: interpreting evidence, calculation, or a decision under stated constraints. **R** = recall, including a definition dressed as a scenario or a memorized UI location. These are editorial judgments, independent of the existing section-wide `difficulty: applied` labels. One scenario does not establish mastery or cover every example under an objective. In particular, Network+ performance-based skill coverage cannot be inferred from multiple-choice counts. Labs are not counted as questions or mock draws; the 20 existing lab walkthroughs do not fill a missing quiz objective merely by existing.

**Before → after** separates this PR from the baseline. Draw percentages are measured from the real `createMockExam` function: 2,000 deterministic seeds (0–1999), 50 questions each, whole track, all topics/formats, mixed authored/generated. They include twin suppression, integer quotas, and template reuse. They are empirical shares, not a promise about each seed. Filtered sessions can fall back to uniform sampling. Vendors do not publish per-objective percentages, so no equal-split objective target is invented.

## Findings that change how to use the bank

- The main gaps before this change were Network+ **1.2 appliances/functions** and **3.5 management/access**, and Local **content actions/domain rules**. This PR adds 7 Network+, 5 Local, and 16 Cloud scenarios (28 total). All three previously empty Local/Network+ rows now have applied questions.
- Cloud had **33 concepts (32 authored + 1 template)** versus Local's **485 (436 + 49)**: only 6.8% as many concepts. It now has 49, versus Local's 490. Sixteen original Cloud items are adjacent products, local-device visibility, or generic administration and are deliberately not credited as cloud-managed configuration coverage. Adding cloud-management words to a prompt does not close a networking or VPN objective.
- Cloud's sole generated template, **10029**, asks where configuration is managed. At baseline the sampler repeats it **21 times in a 50-question mock (42%)** after twin suppression leaves 29 authored items. After these additions it still repeats five times (10%). These are the same skill, not twenty-one distinct scenarios. Cloud mocks remain unsuitable as evidence of full exam readiness.
- **Overweight:** Cloud setup/monitoring receives 66% of baseline draws against the historical 12% weight (5.5 times the target), falling to 34% after additions (still 2.8 times). Local authentication/VPN has 19.39% of bank items against 15%; quotas limit its mock share. Network+ concepts occupy 27.07% of the audited bank against 23%, with an actual 25.62% draw. No vendor objective-level weights are published, so heavy objectives such as IPv4 subnetting or local subscription services cannot honestly be called over their individual exam weight. Their exact counts and draws are shown below.
- Local and Network+ have fixed **engine-category** quotas (Local 5/5/7/13/13/7; Network+ 12/10/9/7/12). Balanced quota totals conceal large differences inside categories. Cloud has no quota enforcement. The category tables below compare semantic coverage with published weights, including supplementary draw share instead of silently assigning it to an objective.
- Some existing engine placements disagree with the primary skill: Network+ 1327–1329 are ports/protocols but drawn from Operations; 1348 is a PoE fault but drawn from Implementation. Local 1069 is a status-tool question drawn from Networking; 1133 is logging drawn from Policies; 1105 is VPN NAT drawn from Networking. This audit reports their **actual** draw; it does not relabel them to make the figures look balanced or change the production sampling algorithm.
- The Network+ numbered objectives all have at least one item after this PR, but example-level holes remain: SAN/NAS/CDN, several media/connector types, VXLAN/SASE and IPv6 transition design are not adequately exercised. Local WINS has no dedicated scenario even though the combined WINS/DNS row has DNS questions. Cloud IPv6 is not taught by the new IPv4 item. These are incomplete subskills, not proof that a broad objective is complete.


## network-plus

174 → 181 concepts. 12 templates after the change.

| Category | Published weight | Concepts after | Bank share | Actual draw before → after |
|---|---:|---:|---:|---:|
| 1. Networking Concepts | 23% | 49 | 27.07% | 25.70% → 25.62% |
| 2. Network Implementation | 20% | 34 | 18.78% | 19.39% → 19.38% |
| 3. Network Operations | 19% | 31 | 17.13% | 16.30% → 16.38% |
| 4. Network Security | 14% | 25 | 13.81% | 14.00% → 14.00% |
| 5. Network Troubleshooting | 24% | 42 | 23.20% | 24.61% → 24.62% |

| Objective | Questions before → after | A / R after | Actual draw before → after | Depth / gaps | Question IDs (after) |
|---|---:|---:|---:|---|---|
| 1.1 OSI model | 1 → 2 | 1 / 1 | 0.57% → 1.09% | Only one applied item | 1391, 2100 |
| 1.2 Appliances and functions | 0 → 2 | 2 / 0 | 0.00% → 1.07% | Some applied coverage | 2101, 2102 |
| 1.3 Cloud connectivity | 4 → 4 | 2 / 2 | 2.33% → 2.01% | Some applied coverage | 1770, 1771, 1772, 1773 |
| 1.4 Ports, protocols, traffic | 9 → 9 | 2 / 7 | 5.16% → 4.76% | Some applied coverage | 5, 112, 123, 1327, 1328, 1329, 1330, 1390, 10026 |
| 1.5 Media and transceivers | 2 → 2 | 1 / 1 | 1.18% → 0.98% | Only one applied item | 1774, 1775 |
| 1.6 Network architectures | 1 → 2 | 1 / 1 | 0.59% → 1.06% | Only one applied item | 1776, 2103 |
| 1.7 IPv4 addressing | 22 → 22 | 14 / 8 | 12.90% → 11.54% | Some applied coverage | 1, 110, 119, 124, 1300, 1301, 1302, 1303, 1304, 1305, 1306, 1307, 1308, 1610, 1615, 10001, 10002, 10003, 10004, 10005, 10006, 10051 |
| 1.8 Modern environments | 5 → 6 | 2 / 4 | 2.96% → 3.10% | Some applied coverage | 1310, 1311, 1312, 1777, 1778, 2104 |
| 2.1 Routing | 8 → 8 | 6 / 2 | 4.13% → 4.15% | Some applied coverage | 114, 1750, 1751, 1752, 1753, 1754, 1612, 10053 |
| 2.2 Switching | 17 → 17 | 9 / 8 | 10.01% → 9.96% | Some applied coverage | 108, 115, 122, 1340, 1341, 1342, 1343, 1344, 1345, 1346, 1347, 1760, 1761, 1762, 1763, 1611, 10052 |
| 2.3 Wireless configuration | 7 → 7 | 3 / 4 | 4.09% → 4.10% | Some applied coverage | 1349, 1350, 1351, 1764, 1765, 1766, 1767 |
| 2.4 Physical installation | 2 → 2 | 1 / 1 | 1.16% → 1.17% | Only one applied item | 1768, 1769 |
| 3.1 Processes and documentation | 8 → 8 | 3 / 5 | 4.75% → 4.37% | Some applied coverage | 1380, 1381, 1392, 1443, 1445, 1447, 1448, 1450 |
| 3.2 Monitoring | 7 → 7 | 2 / 5 | 4.02% → 3.85% | Some applied coverage | 1331, 1387, 1440, 1441, 1444, 1446, 1449 |
| 3.3 Disaster recovery | 4 → 4 | 3 / 1 | 1.75% → 1.66% | Some applied coverage | 1382, 1383, 1384, 1442 |
| 3.4 Network services | 10 → 10 | 3 / 7 | 5.78% → 5.47% | Some applied coverage | 125, 1320, 1321, 1322, 1323, 1324, 1325, 1326, 1613, 10008 |
| 3.5 Access and management | 0 → 2 | 2 / 0 | 0.00% → 1.03% | Some applied coverage | 2110, 2111 |
| 4.1 Security concepts | 12 → 12 | 4 / 8 | 6.77% → 6.77% | Some applied coverage | 1385, 1386, 1389, 1700, 1705, 1706, 1708, 1709, 1713, 1714, 1716, 1717 |
| 4.2 Attacks | 5 → 5 | 5 / 0 | 2.80% → 2.80% | Some applied coverage | 1702, 1703, 1710, 1711, 1715 |
| 4.3 Security controls | 8 → 8 | 5 / 3 | 4.43% → 4.43% | Some applied coverage | 117, 121, 1388, 1451, 1701, 1704, 1707, 1712 |
| 5.1 Troubleshooting method | 5 → 5 | 2 / 3 | 2.95% → 2.95% | Some applied coverage | 1360, 1361, 1369, 1370, 1371 |
| 5.2 Physical faults | 9 → 9 | 9 / 0 | 5.25% → 5.26% | Some applied coverage | 1348, 1352, 1365, 1366, 1720, 1721, 1722, 1723, 1742 |
| 5.3 Service faults | 11 → 11 | 11 / 0 | 6.50% → 6.50% | Some applied coverage | 1309, 1332, 1367, 1372, 1724, 1725, 1726, 1727, 1728, 1614, 10017 |
| 5.4 Performance faults | 4 → 4 | 4 / 0 | 2.32% → 2.32% | Some applied coverage | 1730, 1731, 1732, 1733 |
| 5.5 Diagnostic tools | 13 → 13 | 11 / 2 | 7.58% → 7.58% | Some applied coverage | 1362, 1363, 1364, 1368, 1729, 1734, 1735, 1736, 1737, 1738, 1739, 1740, 1741 |

**Still empty:** None at this objective granularity.

**Recall only:** None.

Engine-category bank counts after: 1: 46, 2: 35, 3: 34, 4: 25, 5: 41.


## local

485 → 490 concepts. 49 templates after the change.

| Category | Published weight | Concepts after | Bank share | Actual draw before → after |
|---|---:|---:|---:|---:|
| 1. Network and Network Security Basics | 10% | 40 | 8.16% | 10.00% → 10.00% |
| 2. Administration and Setup | 10% | 46 | 9.39% | 7.45% → 7.40% |
| 3. Monitoring, Logging, and Reporting | 15% | 71 | 14.49% | 14.54% → 14.54% |
| 4. Networking and NAT | 25% | 103 | 21.02% | 24.36% → 24.32% |
| 5. Policies, Proxies, and Security Services | 25% | 108 | 22.04% | 24.20% → 24.20% |
| 6. Authentication and VPNs | 15% | 95 | 19.39% | 14.49% → 14.54% |

| Objective | Questions before → after | A / R after | Actual draw before → after | Depth / gaps | Question IDs (after) |
|---|---:|---:|---:|---|---|
| 1.1 IPv4 and routing basics | 16 → 16 | 11 / 5 | 4.40% → 4.05% | Some applied coverage | 1800, 1801, 1802, 1803, 1804, 1805, 1806, 1807, 1808, 1809, 1810, 1811, 1812, 1813, 1814, 1815 |
| 1.2 NAT fundamentals | 2 → 3 | 1 / 2 | 0.60% → 0.72% | Only one applied item | 1844, 1845, 2010 |
| 1.3 Packet headers | 6 → 7 | 1 / 6 | 1.58% → 1.82% | Only one applied item | 109, 1833, 1834, 1841, 1842, 1846, 2011 |
| 1.4 MAC addressing | 4 → 5 | 1 / 4 | 1.10% → 1.25% | Only one applied item | 1830, 1831, 1832, 1849, 2012 |
| 1.5 Services and protocols | 9 → 9 | 0 / 9 | 2.31% → 2.16% | **RECALL ONLY** | 1835, 1836, 1837, 1838, 1839, 1840, 1843, 1847, 1848 |
| 2.1 Default policies and networks | 11 → 11 | 4 / 7 | 1.67% → 1.65% | Some applied coverage | 12, 15, 40, 49, 70, 94, 95, 1004, 1014, 1520, 1600 |
| 2.2 Web setup wizard | 4 → 4 | 0 / 4 | 0.34% → 0.32% | **RECALL ONLY** | 11, 13, 67, 126 |
| 2.3 Feature keys | 4 → 4 | 1 / 3 | 0.72% → 0.76% | Only one applied item | 85, 1011, 1012, 1539 |
| 2.4 Backup and restore | 9 → 9 | 6 / 3 | 1.64% → 1.63% | Some applied coverage | 14, 59, 76, 1003, 1008, 1009, 1513, 1538, 10023 |
| 2.5 Configuration migration | 2 → 2 | 1 / 1 | 0.39% → 0.39% | Only one applied item | 1010, 1013 |
| 2.6 Default threat protection | 16 → 16 | 8 / 8 | 2.70% → 2.66% | Some applied coverage | 17, 18, 204, 1021, 1022, 1023, 1024, 1025, 1026, 1027, 1028, 1029, 1030, 1546, 1547, 10030 |
| 3.1 Status tools | 16 → 16 | 2 / 14 | 3.11% → 3.17% | Some applied coverage | 37, 58, 66, 93, 1046, 1047, 1053, 1054, 1069, 1866, 1867, 1870, 1873, 1874, 1875, 1514 |
| 3.2 Diagnostics | 10 → 10 | 4 / 6 | 2.18% → 2.13% | Some applied coverage | 48, 127, 310, 1050, 1051, 1868, 1869, 1511, 1516, 1519 |
| 3.3 Logging destinations | 9 → 9 | 4 / 5 | 1.74% → 1.76% | Some applied coverage | 75, 84, 1041, 1042, 1043, 1044, 1865, 1871, 1537 |
| 3.4 Log interpretation | 29 → 29 | 24 / 5 | 5.89% → 5.87% | Some applied coverage | 16, 307, 1045, 1049, 1860, 1861, 1872, 1508, 1536, 1545, 1609, 10018, 10020, 10101, 10102, 10103, 10104, 10105, 10106, 10107, 10108, 10109, 10110, 10111, 10112, 10113, 10114, 10115, 10116 |
| 3.5 Logging configuration | 7 → 7 | 4 / 3 | 1.62% → 1.61% | Some applied coverage | 1040, 1048, 1052, 1133, 1862, 1863, 1864 |
| 4.1 Interfaces and zones | 13 → 13 | 5 / 8 | 3.12% → 3.11% | Some applied coverage | 62, 105, 1064, 1071, 1113, 1134, 1880, 1881, 1882, 1883, 1892, 1606, 10056 |
| 4.2 WINS and DNS | 2 → 2 | 1 / 1 | 0.50% → 0.51% | Only one applied item | 1887, 1888 |
| 4.3 Routing configuration | 12 → 12 | 9 / 3 | 2.80% → 2.71% | Some applied coverage | 8, 201, 306, 1061, 1062, 1063, 1068, 1070, 1542, 10007, 10015, 10054 |
| 4.4 NAT configuration | 39 → 39 | 25 / 14 | 8.86% → 8.92% | Some applied coverage | 4, 6, 38, 41, 51, 60, 69, 78, 87, 96, 205, 208, 1100, 1101, 1102, 1103, 1104, 1106, 1107, 1108, 1109, 1110, 1111, 1112, 1114, 1900, 1901, 1902, 1903, 1504, 1522, 1523, 1601, 1602, 10009, 10010, 10011, 10012, 10055 |
| 4.5 DHCP | 5 → 5 | 4 / 1 | 1.25% → 1.28% | Some applied coverage | 111, 1072, 1073, 1074, 10021 |
| 4.6 VLANs | 10 → 10 | 7 / 3 | 2.28% → 2.24% | Some applied coverage | 1060, 1065, 1066, 1067, 1884, 1885, 1886, 1510, 1541, 10016 |
| 4.7 WAN and SD-WAN | 22 → 22 | 15 / 7 | 5.55% → 5.54% | Some applied coverage | 28, 29, 42, 52, 79, 88, 97, 1080, 1081, 1082, 1083, 1084, 1085, 1086, 1087, 1088, 1889, 1890, 1891, 1509, 1605, 10022 |
| 5.1 Filters and proxies | 22 → 22 | 9 / 13 | 4.77% → 4.65% | Some applied coverage | 9, 19, 20, 22, 80, 86, 98, 207, 1120, 1121, 1124, 1125, 1126, 1127, 1129, 1130, 1131, 1132, 1161, 1173, 1517, 1524 |
| 5.2 Policy precedence | 19 → 19 | 18 / 1 | 4.66% → 4.55% | Some applied coverage | 53, 77, 103, 1122, 1123, 1515, 1521, 10013, 10014, 10201, 10202, 10203, 10204, 10205, 10206, 10207, 10208, 10209, 10210 |
| 5.3 HTTP proxy | 4 → 4 | 0 / 4 | 0.84% → 0.79% | **RECALL ONLY** | 26, 71, 1160, 1174 |
| 5.4 HTTPS inspection | 11 → 11 | 11 / 0 | 1.96% → 2.00% | Some applied coverage | 24, 30, 50, 61, 305, 1143, 1507, 1525, 1526, 1608, 10025 |
| 5.5 Content actions and domain rules | 0 → 2 | 2 / 0 | 0.00% → 0.51% | Some applied coverage | 2000, 2001 |
| 5.6 Subscription services | 50 → 50 | 13 / 37 | 11.97% → 11.70% | Some applied coverage | 23, 31, 34, 35, 43, 45, 54, 55, 63, 72, 81, 89, 90, 99, 102, 104, 107, 116, 120, 206, 304, 1140, 1141, 1142, 1144, 1145, 1146, 1147, 1148, 1149, 1150, 1151, 1152, 1153, 1154, 1162, 1163, 1164, 1165, 1166, 1167, 1168, 1169, 1170, 1171, 1172, 1518, 1527, 1528, 1529 |
| 6.1 Authentication servers | 18 → 18 | 2 / 16 | 2.81% → 2.77% | Some applied coverage | 10, 21, 39, 56, 106, 118, 303, 1182, 1183, 1184, 1185, 1186, 1188, 1190, 1191, 1192, 1194, 1534 |
| 6.2 Policy users and groups | 6 → 6 | 6 / 0 | 0.93% → 0.95% | Some applied coverage | 3, 68, 1180, 1181, 1189, 1512 |
| 6.3 Authentication portal | 4 → 4 | 1 / 3 | 0.69% → 0.70% | Only one applied item | 2, 302, 1187, 1193 |
| 6.4 Mobile VPN | 29 → 29 | 15 / 14 | 4.11% → 4.13% | Some applied coverage | 25, 32, 46, 64, 73, 82, 91, 113, 308, 1200, 1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208, 1209, 1210, 1211, 1212, 1213, 1214, 1506, 1533, 1535, 1607, 10027 |
| 6.5 BOVPN gateways and routes | 32 → 32 | 15 / 17 | 4.97% → 5.01% | Some applied coverage | 7, 27, 36, 47, 57, 65, 74, 83, 101, 202, 203, 309, 1128, 1223, 1224, 1225, 1226, 1227, 1228, 1229, 1230, 1231, 1232, 1233, 1234, 1505, 1530, 1532, 1603, 1604, 10019, 10028 |
| 6.6 BOVPN NAT | 1 → 1 | 1 / 0 | 0.24% → 0.28% | Only one applied item | 1105 |
| 6.7 BOVPN virtual interfaces | 5 → 5 | 0 / 5 | 0.74% → 0.72% | **RECALL ONLY** | 92, 1220, 1221, 1222, 1531 |
| extra Supplementary administration / HA / QoS | 27 → 27 | 11 / 16 | 4.96% → 5.00% | Some applied coverage | 33, 44, 100, 301, 1000, 1001, 1002, 1005, 1006, 1007, 1020, 1031, 1032, 1033, 1034, 1089, 1090, 1091, 1092, 1093, 1094, 1500, 1501, 1502, 1503, 1540, 10024 |

**Still empty:** None at this objective granularity.

**Recall only:** 1.5 Services and protocols; 2.2 Web setup wizard; 5.3 HTTP proxy; 6.7 BOVPN virtual interfaces.

Engine-category bank counts after: 1: 40, 2: 63, 3: 69, 4: 110, 5: 115, 6: 93.


## cloud

33 → 49 concepts. 1 templates after the change.

| Category | Published weight | Concepts after | Bank share | Actual draw before → after |
|---|---:|---:|---:|---:|
| 1. Basics | 18% | 5 | 10.20% | 0.00% → 10.00% |
| 2. Setup and monitoring | 12% | 14 | 28.57% | 66.00% → 34.00% |
| 3. Networking | 25% | 5 | 10.20% | 0.00% → 10.00% |
| 4. Policies and services | 30% | 5 | 10.20% | 4.99% → 9.01% |
| 5. Authentication and VPN | 15% | 4 | 8.16% | 0.00% → 8.00% |

| Objective | Questions before → after | A / R after | Actual draw before → after | Depth / gaps | Question IDs (after) |
|---|---:|---:|---:|---|---|
| 1.1 IP addressing and routing | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2200 |
| 1.2 NAT basics | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2201 |
| 1.3 Headers | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2202 |
| 1.4 MACs | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2203 |
| 1.5 Services and ports | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2204 |
| 2.1 Initial settings | 8 → 8 | 2 / 6 | 54.00% → 22.00% | Some applied coverage | 1401, 1402, 1404, 1413, 1422, 1427, 1543, 10029 |
| 2.2 Licensing | 1 → 1 | 1 / 0 | 2.00% → 2.00% | Only one applied item | 1430 |
| 2.3 Migration | 1 → 1 | 1 / 0 | 2.00% → 2.00% | Only one applied item | 1433 |
| 2.4 Threat protection | 0 → 0 | 0 / 0 | 0.00% → 0.00% | **NO COVERAGE** | — |
| 2.5 Status tools | 0 → 0 | 0 / 0 | 0.00% → 0.00% | **NO COVERAGE** | — |
| 2.6 Diagnostics | 0 → 0 | 0 / 0 | 0.00% → 0.00% | **NO COVERAGE** | — |
| 2.7 Log destinations | 0 → 0 | 0 / 0 | 0.00% → 0.00% | **NO COVERAGE** | — |
| 2.8 Log interpretation | 0 → 0 | 0 / 0 | 0.00% → 0.00% | **NO COVERAGE** | — |
| 2.9 Log queries | 0 → 0 | 0 / 0 | 0.00% → 0.00% | **NO COVERAGE** | — |
| 2.10 Reports | 4 → 4 | 1 / 3 | 8.00% → 8.00% | Only one applied item | 1407, 1410, 1411, 1425 |
| 3.1 Interfaces and zones | 0 → 0 | 0 / 0 | 0.00% → 0.00% | **NO COVERAGE** | — |
| 3.2 Name services | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2212 |
| 3.3 Static routes | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2210 |
| 3.4 NAT configuration | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2211 |
| 3.5 DHCP | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2214 |
| 3.6 VLANs | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2213 |
| 3.7 WAN selection | 0 → 0 | 0 / 0 | 0.00% → 0.00% | **NO COVERAGE** | — |
| 4.1 Policies and templates | 3 → 3 | 1 / 2 | 4.99% → 5.01% | Only one applied item | 1403, 1431, 1544 |
| 4.2 Precedence | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2221 |
| 4.3 TLS inspection | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2220 |
| 4.4 Security services | 0 → 0 | 0 / 0 | 0.00% → 0.00% | **NO COVERAGE** | — |
| 5.1 Authentication servers | 0 → 0 | 0 / 0 | 0.00% → 0.00% | **NO COVERAGE** | — |
| 5.2 Authentication domains | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2230 |
| 5.3 Group policies | 0 → 0 | 0 / 0 | 0.00% → 0.00% | **NO COVERAGE** | — |
| 5.4 Login portal | 0 → 0 | 0 / 0 | 0.00% → 0.00% | **NO COVERAGE** | — |
| 5.5 Mobile VPN | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2231 |
| 5.6 Site VPN routes | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2232 |
| 5.7 VPN NAT | 0 → 1 | 1 / 0 | 0.00% → 2.00% | Only one applied item | 2233 |
| 5.8 Virtual interfaces | 0 → 0 | 0 / 0 | 0.00% → 0.00% | **NO COVERAGE** | — |
| extra Adjacent products / local visibility / generic administration | 16 → 16 | 3 / 13 | 29.01% → 28.99% | Some applied coverage | 1400, 1405, 1406, 1408, 1409, 1412, 1414, 1420, 1421, 1423, 1424, 1426, 1428, 1429, 1432, 1434 |

**Still empty:** 2.4 Threat protection; 2.5 Status tools; 2.6 Diagnostics; 2.7 Log destinations; 2.8 Log interpretation; 2.9 Log queries; 3.1 Interfaces and zones; 3.7 WAN selection; 4.4 Security services; 5.1 Authentication servers; 5.3 Group policies; 5.4 Login portal; 5.8 Virtual interfaces.

**Recall only:** None.


## New-question length measurement

28 four-option, single-answer questions. Correct answer strictly longest: **7/28 (25.00%)**; tied for longest: 0; more than four characters longer than every distractor: **0**. This uses string length, the same metric as `answerLength.test.ts`. Maximum positive gap: 3 characters. It measures only new questions, so the old bank cannot dilute a bias.

The protected answer-length, lab-checkpoint, engine and phase2 guards are unchanged. New scenarios include a reason each distractor fails under the stated constraints.
