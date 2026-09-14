/**
 * Questions that test the same fact in different words.
 *
 * The bank grew in passes, and some facts were written more than once: the default Web UI address,
 * the default Trusted address, what NAT loopback is for. Asked in practice, a second wording is
 * useful reinforcement. Asked twice in one mock exam, the first copy gives the second away and the
 * exam measures less than it appears to, so a mock takes at most one question from each group.
 *
 * Every group stays inside one track, because a mock is drawn from one track. Groups are curated by
 * reading the questions, not by text similarity: two questions can share most of their words and still
 * test different things, and two can share none and test the same one.
 */
export const QUESTION_TWINS: readonly (readonly number[])[] = [
  // Local Firebox
  [10, 1534], // authentication servers supported by every Mobile VPN type
  [60, 96, 205, 1523], // NAT loopback for internal clients using the public address
  [26, 71], // HTTP Response > Body Content Types blocks file types
  [17, 1546], // ways a host is added to the blocked sites list
  [18, 1547], // threats default packet handling addresses
  [20, 1524], // what a proxy policy adds over a packet filter
  [19, 207], // DNS, HTTP and HTTPS policies once Outgoing is removed
  [13, 70, 94], // factory-default Trusted address and subnet
  [11, 40], // Interface 1 is the default Trusted interface
  [67, 126], // default Web UI URL and port
  [25, 1840], // IKE on UDP 500 and 4500
  [82, 113], // SSL VPN pool must not overlap other networks
  [64, 1506, 1533], // mobile VPN connects but reaches nothing: policy or pool overlap
  [116, 1528], // Gateway AntiVirus leaves encrypted or oversized archives unscanned
  [120, 1529], // ThreatSync automatic endpoint actions
  [36, 1532], // BOVPN failover
  [53, 1521], // auto-order versus manual order
  [49, 95], // the Outgoing policy's sources and destination
  [15, 62], // Optional networks are in the default Outgoing policy
  [78, 1601], // 1-to-1 NAT outbound source address
  [81, 104], // Application Control blocks applications regardless of URL
  [50, 1507, 1608], // clients must trust the Proxy Authority certificate
  [37, 48], // Firebox System Manager live status and diagnostics
  [33, 1000], // Policy Manager edits configuration offline
  [58, 93], // Traffic Monitor shows log messages in real time
  [84, 1537], // historical reports need retained logs
  [9, 80], // the TCP-UDP proxy
  [24, 35, 1526], // DLP needs Gateway AntiVirus and, for HTTPS, content inspection
  [1505, 1530], // Phase 1 up, Phase 2 fails
  [1508, 1536, 1609], // an Allow entry does not prove the application worked
  [1510, 1541], // VLAN tagging mismatch with the link up
  [1021, 1515], // Default Threat Protection overrides an allow policy
  [1131, 1517], // keeping management access narrow without locking yourself out
  [1144, 1518], // an IPS signature exception for a suspected false positive
  [1005, 1501, 1540], // the Fireware CLI over SSH on TCP 4118
  // Network+
  [114, 1612], // OSPF chooses by cost
  [1383, 1442], // recovery point objective
  // WatchGuard Cloud
  [1400, 1428], // Cloud visibility leaves a locally managed device's configuration local
  [1420, 1544], // Service Provider and subscriber accounts
  [1404, 1543], // a cloud-managed change must be deployed to take effect
];

const groupOf = new Map<number, number>();
QUESTION_TWINS.forEach((group, index) => group.forEach(id => groupOf.set(id, index)));

/** The same-fact group a question belongs to, if any. */
export function twinGroup(id: number): number | undefined {
  return groupOf.get(id);
}
