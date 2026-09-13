/**
 * CompTIA Network+ N10-009 exam blueprint, and where each Network+ question sits in it.
 *
 * A practice bank that drills 30% on a domain worth 19% of the exam and 6% on one worth 14% leaves
 * a learner feeling ready while under-preparing them for exactly the questions they will see least
 * practice on. The objective strings attached to questions could not measure this: they are written
 * per section and routinely span several domains ("1.4 Protocols; 3.4 Network services"), so any
 * count derived from them collapses onto the first digit and reports nonsense.
 *
 * This classifies every Network+ question individually by what it actually tests, against the
 * published sub-objectives. Two placements are worth knowing because they surprise people:
 *
 *  - DHCP, DNS and NTP are 3.4 (Network Operations), not Networking Concepts.
 *  - Ports and protocols are 1.4 (Concepts), even when the question is framed around a service.
 *
 * A question added to the Network+ track must be classified here, or networkPlusBlueprint.test.ts fails. That
 * is intended: an unclassified question is one whose contribution to exam readiness nobody checked.
 */

export type NetworkPlusDomain = 1 | 2 | 3 | 4 | 5;

/** Published N10-009 domain weightings, as a percentage of the exam. */
export const N10_009_WEIGHTS: Record<NetworkPlusDomain, { name: string; weight: number }> = {
  1: { name: 'Networking Concepts', weight: 23 },
  2: { name: 'Network Implementation', weight: 20 },
  3: { name: 'Network Operations', weight: 19 },
  4: { name: 'Network Security', weight: 14 },
  5: { name: 'Network Troubleshooting', weight: 24 },
};

/**
 * Question id -> domain. Generated templates are listed by template id; each is one concept even
 * though it produces many variants.
 */
export const NETWORK_PLUS_DOMAIN: Record<number, NetworkPlusDomain> = {
  // 1.0 Networking Concepts -- OSI (1.1), ports and protocols (1.4), IPv4 addressing (1.7), IPv6 (1.8)
  1: 1, 5: 1, 110: 1, 112: 1, 119: 1, 123: 1, 124: 1,
  1300: 1, 1301: 1, 1302: 1, 1303: 1, 1304: 1, 1305: 1, 1306: 1, 1307: 1, 1308: 1,
  1310: 1, 1311: 1, 1312: 1, 1330: 1, 1390: 1, 1391: 1, 1610: 1, 1615: 1,
  10001: 1, 10002: 1, 10003: 1, 10004: 1, 10005: 1, 10006: 1, 10026: 1, 10051: 1,
  // cloud (1.3), media and transceivers (1.5), topologies (1.6), modern environments (1.8)
  1770: 1, 1771: 1, 1772: 1, 1773: 1, 1774: 1, 1775: 1, 1776: 1, 1777: 1, 1778: 1,

  // 2.0 Network Implementation -- routing (2.1), switching (2.2), wireless (2.3), physical (2.4)
  108: 2, 114: 2, 115: 2, 122: 2,
  1340: 2, 1341: 2, 1342: 2, 1343: 2, 1344: 2, 1345: 2, 1346: 2, 1347: 2, 1348: 2, 1349: 2, 1350: 2, 1351: 2,
  1611: 2, 1612: 2, 10052: 2, 10053: 2,
  1750: 2, 1751: 2, 1752: 2, 1753: 2, 1754: 2,
  1760: 2, 1761: 2, 1762: 2, 1763: 2, 1764: 2, 1765: 2, 1766: 2, 1767: 2, 1768: 2, 1769: 2,

  // 3.0 Network Operations -- processes (3.1), monitoring (3.2), DR (3.3), services (3.4), access (3.5)
  125: 3, 1320: 3, 1321: 3, 1322: 3, 1323: 3, 1324: 3, 1325: 3, 1326: 3, 1327: 3, 1328: 3, 1329: 3, 1331: 3,
  1380: 3, 1381: 3, 1382: 3, 1383: 3, 1384: 3, 1387: 3, 1392: 3,
  1440: 3, 1441: 3, 1442: 3, 1443: 3, 1444: 3, 1445: 3, 1446: 3, 1447: 3, 1448: 3, 1449: 3, 1450: 3,
  1613: 3, 10008: 3,

  // 4.0 Network Security -- concepts (4.1), attacks (4.2), defences (4.3)
  117: 4, 121: 4, 1385: 4, 1386: 4, 1388: 4, 1389: 4, 1451: 4,
  1700: 4, 1701: 4, 1702: 4, 1703: 4, 1704: 4, 1705: 4, 1706: 4, 1707: 4, 1708: 4,
  1709: 4, 1710: 4, 1711: 4, 1712: 4, 1713: 4, 1714: 4, 1715: 4, 1716: 4, 1717: 4,

  // 5.0 Network Troubleshooting -- method (5.1), cabling (5.2), services (5.3), performance (5.4), tools (5.5)
  1309: 5, 1332: 5, 1352: 5,
  1360: 5, 1361: 5, 1362: 5, 1363: 5, 1364: 5, 1365: 5, 1366: 5, 1367: 5, 1368: 5, 1369: 5, 1370: 5, 1371: 5, 1372: 5,
  1614: 5, 10017: 5,
  1720: 5, 1721: 5, 1722: 5, 1723: 5, 1724: 5, 1725: 5, 1726: 5, 1727: 5, 1728: 5, 1729: 5, 1730: 5, 1731: 5,
  1732: 5, 1733: 5, 1734: 5, 1735: 5, 1736: 5, 1737: 5, 1738: 5, 1739: 5, 1740: 5, 1741: 5, 1742: 5,
};

export interface DomainCoverage {
  domain: NetworkPlusDomain;
  name: string;
  weight: number;
  count: number;
  share: number;
  gap: number;
}

/** Share of classified questions per domain, alongside the exam weighting it should approach. */
export function blueprintCoverage(ids: readonly number[]): DomainCoverage[] {
  const counts: Record<NetworkPlusDomain, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let classified = 0;
  for (const id of ids) {
    const domain = NETWORK_PLUS_DOMAIN[id];
    if (domain) { counts[domain]++; classified++; }
  }
  return ([1, 2, 3, 4, 5] as NetworkPlusDomain[]).map(domain => {
    const share = classified ? Math.round((counts[domain] / classified) * 100) : 0;
    return { domain, ...N10_009_WEIGHTS[domain], count: counts[domain], share, gap: share - N10_009_WEIGHTS[domain].weight };
  });
}
