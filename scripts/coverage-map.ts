/** Reviewed primary skills, not keyword matches or section-level difficulty labels.
 * Ranges are inclusive. One primary objective per concept keeps draw shares additive.
 * 'extra' means supplementary content, not evidence for an explicit objective bullet.
 */
export const objectiveRows: Record<string, [string, string][]> = {
  'network-plus': [
    ['1.1 OSI model', '1391'],
    ['1.2 Appliances and functions', ''],
    ['1.3 Cloud connectivity', '1770-1773'],
    ['1.4 Ports, protocols, traffic', '5 112 123 1327-1329 1330 1390 10026'],
    ['1.5 Media and transceivers', '1774-1775'],
    ['1.6 Network architectures', '1776'],
    ['1.7 IPv4 addressing', '1 110 119 124 1300-1308 1610 1615 10001-10006 10051'],
    ['1.8 Modern environments', '1310-1312 1777-1778'],
    ['2.1 Routing', '114 1750-1754 1612 10053'],
    ['2.2 Switching', '108 115 122 1340-1347 1760-1763 1611 10052'],
    ['2.3 Wireless configuration', '1349-1351 1764-1767'],
    ['2.4 Physical installation', '1768-1769'],
    ['3.1 Processes and documentation', '1380-1381 1392 1443 1445 1447-1448 1450'],
    ['3.2 Monitoring', '1331 1387 1440-1441 1444 1446 1449'],
    ['3.3 Disaster recovery', '1382-1384 1442'],
    ['3.4 Network services', '125 1320-1326 1613 10008'],
    ['3.5 Access and management', ''],
    ['4.1 Security concepts', '1385 1386 1389 1700 1705-1706 1708-1709 1713-1714 1716-1717'],
    ['4.2 Attacks', '1702-1703 1710-1711 1715'],
    ['4.3 Security controls', '117 121 1388 1451 1701 1704 1707 1712'],
    ['5.1 Troubleshooting method', '1360-1361 1369-1371'],
    ['5.2 Physical faults', '1348 1352 1365-1366 1720-1723 1742'],
    ['5.3 Service faults', '1309 1332 1367 1372 1724-1728 1614 10017'],
    ['5.4 Performance faults', '1730-1733'],
    ['5.5 Diagnostic tools', '1362-1364 1368 1729 1734-1741'],
  ],
  local: [
    ['1.1 IPv4 and routing basics', '1800-1815'],
    ['1.2 NAT fundamentals', '1844-1845'],
    ['1.3 Packet headers', '109 1833-1834 1841-1842 1846'],
    ['1.4 MAC addressing', '1830-1832 1849'],
    ['1.5 Services and protocols', '1835-1840 1843 1847-1848'],
    ['2.1 Default policies and networks', '12 15 40 49 70 94-95 1004 1014 1520 1600'],
    ['2.2 Web setup wizard', '11 13 67 126'],
    ['2.3 Feature keys', '85 1011-1012 1539'],
    ['2.4 Backup and restore', '14 59 76 1003 1008-1009 1513 1538 10023'],
    ['2.5 Configuration migration', '1010 1013'],
    ['2.6 Default threat protection', '17-18 204 1021-1030 1546-1547 10030'],
    ['3.1 Status tools', '37 58 66 93 1046-1047 1053-1054 1069 1514 1866-1867 1870 1873-1875'],
    ['3.2 Diagnostics', '48 127 310 1050-1051 1511 1516 1519 1868-1869'],
    ['3.3 Logging destinations', '75 84 1041-1044 1537 1865 1871'],
    ['3.4 Log interpretation', '16 307 1045 1049 1508 1536 1545 1609 1860-1861 1872 10018 10020 10101-10116'],
    ['3.5 Logging configuration', '1040 1048 1052 1133 1862-1864'],
    ['4.1 Interfaces and zones', '62 105 1064 1071 1113 1134 1606 1880-1883 1892 10056'],
    ['4.2 WINS and DNS', '1887-1888'],
    ['4.3 Routing configuration', '8 201 306 1061-1063 1068 1070 1542 10007 10015 10054'],
    ['4.4 NAT configuration', '4 6 38 41 51 60 69 78 87 96 205 208 1100-1104 1106-1112 1114 1504 1522-1523 1601-1602 1900-1903 10009-10012 10055'],
    ['4.5 DHCP', '111 1072-1074 10021'],
    ['4.6 VLANs', '1060 1065-1067 1510 1541 1884-1886 10016'],
    ['4.7 WAN and SD-WAN', '28-29 42 52 79 88 97 1080-1088 1509 1605 1889-1891 10022'],
    ['5.1 Filters and proxies', '9 19-20 22 80 86 98 207 1120-1121 1124-1127 1129-1132 1161 1173 1517 1524'],
    ['5.2 Policy precedence', '53 77 103 1122-1123 1515 1521 10013-10014 10201-10210'],
    ['5.3 HTTP proxy', '26 71 1160 1174'],
    ['5.4 HTTPS inspection', '24 30 50 61 305 1143 1507 1525-1526 1608 10025'],
    ['5.5 Content actions and domain rules', ''],
    ['5.6 Subscription services', '23 31 34-35 43 45 54-55 63 72 81 89-90 99 102 104 107 116 120 206 304 1140-1142 1144-1154 1162-1172 1518 1527-1529'],
    ['6.1 Authentication servers', '10 21 39 56 106 118 303 1182-1186 1188 1190-1192 1194 1534'],
    ['6.2 Policy users and groups', '3 68 1180-1181 1189 1512'],
    ['6.3 Authentication portal', '2 302 1187 1193'],
    ['6.4 Mobile VPN', '25 32 46 64 73 82 91 113 308 1200-1214 1506 1533 1535 1607 10027'],
    ['6.5 BOVPN gateways and routes', '7 27 36 47 57 65 74 83 101 202-203 309 1128 1223-1234 1505 1530 1532 1603-1604 10019 10028'],
    ['6.6 BOVPN NAT', '1105'],
    ['6.7 BOVPN virtual interfaces', '92 1220-1222 1531'],
    ['extra Supplementary administration / HA / QoS', '33 44 100 301 1000-1002 1005-1007 1020 1031-1034 1089-1094 1500-1503 1540 10024'],
  ],
  cloud: [
    ['1.1 IP addressing and routing', ''], ['1.2 NAT basics', ''], ['1.3 Headers', ''], ['1.4 MACs', ''], ['1.5 Services and ports', ''],
    ['2.1 Initial settings', '1401-1402 1404 1413 1422 1427 1543 10029'], ['2.2 Licensing', '1430'],
    ['2.3 Migration', '1433'], ['2.4 Threat protection', ''], ['2.5 Status tools', ''], ['2.6 Diagnostics', ''],
    ['2.7 Log destinations', ''], ['2.8 Log interpretation', ''], ['2.9 Log queries', ''], ['2.10 Reports', '1407 1410-1411 1425'],
    ['3.1 Interfaces and zones', ''], ['3.2 Name services', ''], ['3.3 Static routes', ''], ['3.4 NAT configuration', ''],
    ['3.5 DHCP', ''], ['3.6 VLANs', ''], ['3.7 WAN selection', ''],
    ['4.1 Policies and templates', '1403 1431 1544'], ['4.2 Precedence', ''], ['4.3 TLS inspection', ''], ['4.4 Security services', ''],
    ['5.1 Authentication servers', ''], ['5.2 Authentication domains', ''], ['5.3 Group policies', ''], ['5.4 Login portal', ''],
    ['5.5 Mobile VPN', ''], ['5.6 Site VPN routes', ''], ['5.7 VPN NAT', ''], ['5.8 Virtual interfaces', ''],
    ['extra Adjacent products / local visibility / generic administration', '1400 1405-1406 1408-1409 1412 1414 1420-1421 1423-1424 1426 1428-1429 1432 1434'],
  ],
};

/** Applied means the learner must interpret evidence, compute, or choose under constraints.
 * Recall includes dressed-up definitions and memorized UI locations; metadata says 'applied'
 * for entire authored sections, so deliberately is not used here. */
export const appliedIds = `
3 6-8 16 19 22 24 30 38 42-43 50 53 58-61 64 68-69 74 76-79 81-82 98 102 105 111 113 116
201-205 207-208 305 307 309
1000-1004 1006-1007 1010-1011 1014 1020-1024 1027-1028 1040 1042 1048 1051-1052
1060 1063-1064 1067-1068 1070 1072-1073 1080 1082-1085 1087-1089
1101 1103 1105-1108 1110-1112 1121-1123 1127 1131-1132 1143-1144 1150 1152-1153
1163-1164 1167 1180-1182 1189-1190 1193 1200 1202-1203 1206 1208 1213-1214 1226 1230 1234
1300 1302 1304 1306-1309 1312 1326-1327 1330 1332 1341 1344-1345 1347-1348 1350 1352
1362-1368 1370-1372 1383-1384 1388 1407 1413 1420 1426-1427 1430-1431 1433-1434
1442-1444 1447-1449 1451 1500-1519 1520-1523 1525-1526 1528 1530 1532-1533 1535-1538 1541-1542 1545
1600-1615 1701-1703 1707-1708 1710-1713 1715-1717 1720-1728 1730-1739 1741-1742 1750-1752 1754
1761-1763 1766-1768 1772-1773 1775
1800-1802 1804 1806-1807 1809-1810 1813-1815 1864-1865 1871 1882 1884-1885 1887 1889-1891
10001-10003 10005-10023 10025 10027-10028 10030 10051-10056 10101-10116 10201-10210
`;

export function expand(spec: string): number[] {
  return spec.trim().split(/\s+/).filter(Boolean).flatMap(part => {
    const [start, end = start] = part.split('-').map(Number);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });
}
