import type { Lab } from './labs';
import type { LabCheckpoint } from './labCheckpoints';

/** Companion walkthroughs, not emulated hardware. Internal IDs do not renumber the older course. */
export const trainingLabs: Lab[] = [
  {
    id: 21, name: 'Lab 21: Configuration Migration', category: 'Setup & Management', requiresExtraKit: true,
    objectives: 'Adapt an existing configuration for a replacement Firebox, validate licensing and interfaces, and verify access after saving.',
    prerequisites: 'Walkthrough with checkpoints; the simulator does not perform device migration. For a physical exercise, use an isolated lab, a source configuration file, a target Firebox or FireboxV with its own feature key, and compatible WSM. Based on 2026 Lab Book exercise 1, pp. 7-9; Fireware 12.10.4+ lab baseline.',
    steps: [
      { stepNumber: 1, title: 'Choose the Migration Artifact', instruction: 'Save the source configuration file and a separate recovery backup for the source appliance. Open a copy of the configuration in Policy Manager. A device-specific backup image is for recovery on its originating Firebox; it is not the migration artifact for a different appliance.' },
      { stepNumber: 2, title: 'Adapt the Target Configuration', instruction: 'Review the target model and supported Fireware version. Update the device name and time zone, import the target appliance\'s own feature key, and inspect every interface and any policies or routes that reference interfaces the target lacks. Do not reuse the source appliance\'s feature key.' },
      { stepNumber: 3, title: 'Check Management and Addressing', instruction: 'Before saving, confirm the management interface address, non-overlapping networks, DHCP pool, default gateway, DNS settings, and management-policy sources. Plan how the management computer will reach the target after the save; keep console access available in the physical lab.' },
      { stepNumber: 4, title: 'Save and Verify the Target', instruction: 'Save the adapted configuration to the intended lab Firebox. Reconnect to its management address and test DNS, outbound access, and required internal services. Compare interface state and Traffic Monitor evidence with the intended configuration; save a fresh target-specific backup after validation.' },
    ],
  },
  {
    id: 22, name: 'Lab 22: NAT Verification', category: 'Networking & Routing', requiresExtraKit: false,
    objectives: 'Separate inbound static NAT from outbound dynamic NAT, allow internal loopback deliberately, and verify the translated address in logs.',
    prerequisites: 'Walkthrough with checkpoints; NAT changes here are not performed by the simulator. Physical practice requires an isolated Firebox lab, a test web server, and addresses routed to your lab. Documentation addresses below are examples. Based on 2026 Lab Book exercise 4, pp. 14-16.',
    steps: [
      { stepNumber: 1, title: 'Define the Inbound Mapping', instruction: 'Plan a web server at 10.0.1.20 and a lab public address represented by 203.0.113.11. Add the secondary address to the appropriate external interface when needed, create the static NAT action mapping it to the server, and put the SNAT action in the web policy\'s To list. Limit sources and ports to the test requirement.' },
      { stepNumber: 2, title: 'Test Internal Loopback', instruction: 'If trusted clients must use the same public address, include those authorized internal sources in the publishing policy\'s From list. Test the public address from both external and trusted clients. An external-only source list does not authorize internal loopback merely because the SNAT action exists.' },
      { stepNumber: 3, title: 'Set the Outbound Source Address', instruction: 'For new connections initiated by 10.0.1.20, add a network dynamic NAT rule that selects the intended external interface and sets source IP to 203.0.113.11. Put this specific match before general dynamic NAT rules. Check policy-level NAT overrides separately; inbound SNAT does not automatically select the source for independent outbound sessions.' },
      { stepNumber: 4, title: 'Verify a Fresh Connection in Logs', instruction: 'Enable connection logging on the outbound test policy, save, and generate a new connection from the server. Inspect the policy, interfaces, source address, and src_ip_nat field in Traffic Monitor. Confirm src_ip_nat="203.0.113.11"; if it differs, inspect NAT rule order and policy overrides before changing the inbound mapping.' },
    ],
  },
  {
    id: 23, name: 'Lab 23: Diagnostic Evidence', category: 'Logging & Reporting', requiresExtraKit: false,
    objectives: 'Gather runtime state, run a probe through a specified interface, capture the matching traffic, and assemble evidence for an outage.',
    prerequisites: 'Walkthrough with checkpoints; no live packet capture is performed by the simulator. Physical practice needs a lab Firebox reachable with FSM and a permitted test destination. Based on 2026 Lab Book exercise 14, pp. 39-41.',
    steps: [
      { stepNumber: 1, title: 'Inspect Runtime State', instruction: 'Open the FSM Status Report. Find the process list, physical interface state, DHCP leases, ARP table, and IPv4 routes. Note the time and affected client/destination. Distinguish the installed route from the route you intended to configure; save a support snapshot for later comparison.' },
      { stepNumber: 2, title: 'Choose a Source Interface', instruction: 'Open Tools > Diagnostic Tasks and choose Ping IPv4 with Advanced Options. For an approved test host, specify the source interface explicitly, for example -I eth0 9.9.9.9 -c3. Record which path you tested; a successful probe from another interface does not prove the affected WAN path works.' },
      { stepNumber: 3, title: 'Capture the Same Test', instruction: 'In a second Diagnostic Tasks window, select TCP Dump and Stream Data to File. Use a narrow filter for the test, for example -nei eth0 host 9.9.9.9 and icmp. Start the capture, repeat the probe, stop the capture, and save the PCAP. Both the source interface and filter must match the generated traffic.' },
      { stepNumber: 4, title: 'Interpret and Record the Evidence', instruction: 'Compare request and reply packets with route, interface, and Traffic Monitor evidence. If the capture is empty, check its interface, filter, and timing before diagnosing the remote host. Record the result and collect the support snapshot, relevant logs, and PCAP; do not claim an empty capture alone identifies the cause.' },
    ],
  },
];

function checkpoint(question: string, answer: string, wrong: [string, string, string], why: string): LabCheckpoint {
  return { question, answer, options: [answer, ...wrong], why };
}
export const trainingCheckpoints: Record<string, LabCheckpoint> = {
  '21.1': checkpoint('Which artifact should you adapt for a different appliance?', 'A copy of the source configuration file', ['The source appliance\'s encrypted backup image', 'A saved Traffic Monitor text log from the source', 'The original appliance\'s subscription feature key'], 'Use a configuration copy for migration. A backup image is tied to its originating device, logs do not restore configuration, and the new appliance needs its own feature key.'),
  '21.2': checkpoint('Which feature key belongs on the replacement Firebox?', 'The key issued for the replacement device', ['The key issued for the original device of any model', 'The same key used by any appliance with a live license', 'A key made by renaming the old appliance\'s key file'], 'The feature key identifies one appliance by serial number. A model match or a renamed file does not transfer that entitlement to another device.'),
  '21.3': checkpoint('What should you confirm before saving an interface-address change?', 'How the management PC will reconnect', ['Whether the browser has cleared all download history', 'Whether every traffic log has been permanently deleted', 'Whether both appliances share the same administrator name'], 'A valid management path after the save prevents an avoidable lockout. Check addressing and policy access, not browser history or account-name coincidence.'),
  '21.4': checkpoint('What demonstrates that the migrated configuration meets its purpose?', 'Successful service tests supported by logs', ['A success message from saving the local configuration file', 'The old appliance\'s model number in the device name', 'An unchanged size for both the old and new XML files'], 'Saving proves only that a save occurred. Verify actual management access and required traffic, then record a recovery point for the target appliance.'),
  '22.1': checkpoint('Where does the inbound publishing policy use the SNAT action?', 'In its To list', ['In the DHCP lease-duration field', 'In the DNS search-domain field', 'In the log-server authentication key'], 'SNAT is the destination action for the published server. DHCP, DNS, and logging settings cannot create that inbound destination mapping.'),
  '22.2': checkpoint('What authorizes trusted clients to use the server\'s public address?', 'Their source is allowed by the publishing policy', ['The public address appears in any unrelated DNS record', 'The server belongs to the same administrative user account', 'Every external interface has a successful Link Monitor probe'], 'The internal source must match the policy as well as the public SNAT destination. DNS resolution or WAN health alone does not authorize loopback traffic.'),
  '22.3': checkpoint('Where should the server-specific dynamic NAT rule sit?', 'Before a broader rule that also matches', ['After every broader rule that could match the connection', 'Only in the incoming policy\'s SNAT action member list', 'Inside the server\'s trusted certificate authority store'], 'Put the specific network dynamic NAT match first. The inbound SNAT action changes destinations, and certificates do not choose outbound source addresses.'),
  '22.4': checkpoint('Which log field confirms the translated source address?', 'src_ip_nat', ['The URL category assigned by WebBlocker', 'The SMTP envelope recipient domain', 'The current administrator account name'], 'src_ip_nat records the translated source for the observed connection. Inspect a new matching connection because an older session can retain its existing translation.'),
  '23.1': checkpoint('Where can you inspect processes, ARP entries, and installed routes together?', 'FSM Status Report', ['The subscription renewal notification', 'The Application Control policy selector', 'The browser\'s trusted certificate store'], 'The Status Report contains runtime state. Licensing notices and configuration selectors do not show the combined operational evidence needed here.'),
  '23.2': checkpoint('What does -I eth0 specify for this diagnostic ping?', 'The source interface for the probe', ['The number of packets to send in the probe sequence', 'The name of the output packet-capture file', 'The destination TCP port of the application request'], 'The interface argument selects the source path. The -c argument sets the count; ICMP ping does not target an application TCP port.'),
  '23.3': checkpoint('Which capture setup matches the example ping to 9.9.9.9?', 'Capture eth0 with a host and ICMP filter', ['Capture eth3 with an SMTP destination-port filter', 'Capture only after the three probe packets have finished', 'Capture DNS queries while generating only ICMP traffic'], 'Start a capture on the tested interface before the probe and filter for the expected host and protocol. Otherwise absence of packets may be a measurement mistake.'),
  '23.4': checkpoint('What should you check before interpreting an empty capture as remote failure?', 'The interface, filter, and capture timing', ['The wording of the scheduled report email subject', 'The display name of the support technician\'s account', 'The sequence of subscription services on the license page'], 'An empty capture has several causes. Confirm that the observation could see the test before concluding that the remote destination did not respond.'),
};

/** Every 2026 exercise is mapped to existing or supplemental study content, without renumbering it. */
export const labBook2026Crosswalk = [
  { exercise: 1, pages: '7-9', labIds: [1, 3, 21], questionIds: [1010, 1011, 2402] },
  { exercise: 2, pages: '10-11', labIds: [6, 7], questionIds: [1510, 1541, 1542] },
  { exercise: 3, pages: '12-13', labIds: [8], questionIds: [1082, 1083, 1084] },
  { exercise: 4, pages: '14-16', labIds: [22], questionIds: [1101, 1111, 2418] },
  { exercise: 5, pages: '17-18', labIds: [4, 5, 18, 19], questionIds: [1042, 1044, 2406] },
  { exercise: 6, pages: '19-20', labIds: [12], questionIds: [17, 1021, 1022, 1029] },
  { exercise: 7, pages: '21-23', labIds: [10], questionIds: [19, 1121, 1125] },
  { exercise: 8, pages: '24-25', labIds: [12], questionIds: [1140, 1142, 2400] },
  { exercise: 9, pages: '26-28', labIds: [11, 20], questionIds: [23, 71, 2419] },
  { exercise: 10, pages: '29-30', labIds: [11], questionIds: [50, 1507, 2421] },
  { exercise: 11, pages: '31-33', labIds: [14], questionIds: [68, 2411, 2412, 2420] },
  { exercise: 12, pages: '34-35', labIds: [15], questionIds: [56, 2422] },
  { exercise: 13, pages: '36-38', labIds: [16], questionIds: [92, 1532, 2417] },
  { exercise: 14, pages: '39-41', labIds: [2, 17, 20, 23], questionIds: [1868, 2407, 2413, 2416] },
];
