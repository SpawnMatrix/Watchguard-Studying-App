/**
 * Interactive policy-ordering scenarios.
 *
 * Fireware evaluates a manually ordered policy list top to bottom and stops
 * at the first match. Almost every "why is this blocked" ticket an L1 sees
 * comes down to that single rule, so the exercise is to arrange five
 * policies so each one can actually be reached.
 *
 * The ordering principle is specificity: a narrower policy must sit above
 * any broader policy that would otherwise swallow its traffic. The answer
 * is therefore checkable without being arbitrary — each case below has one
 * correct sequence, and the explanation names the conflict each step avoids.
 */
import type { Question } from '../data/questions';
import type { Random } from './random';
import { integer, pick } from './random';

/**
 * Scenario details are randomised per seed — addresses, ports and the
 * department in the brief — so a learner re-reads the policy set rather
 * than recognising a fixed puzzle and recalling the answer.
 */
const host = (r: Random, third: number) => `10.0.${third}.${integer(r, 10, 250)}`;
const publicHost = (r: Random) => `203.0.113.${integer(r, 2, 250)}`;
const hostileNet = (r: Random) => `198.51.100.${integer(r, 0, 3) * 64}/26`;


export interface PolicyCard {
  /** Short policy name as it would appear in the policy list. */
  label: string;
  /** What the policy matches, shown under the name. */
  detail: string;
}

export interface OrderingScenario {
  title: string;
  topic: Question['topic'];
  brief: string;
  /** Correct top-to-bottom order. */
  order: PolicyCard[];
  explanation: string;
  webUi: string;
  section: string;
}

export const orderingScenarios: ((r: Random) => OrderingScenario)[] = [
  r => {
    const kiosk = host(r, 10), finance = host(r, 20), vendor = publicHost(r);
    return {
    title: 'Deny one host inside a permitted subnet',
    topic: 'Policies',
    brief: `A kiosk at ${kiosk} must be blocked from the internet while the rest of the trusted network browses normally, and the finance server at ${finance} reaches its vendor at ${vendor} over HTTPS only.`,
    order: [
      { label: 'Block-Kiosk-00', detail: `Deny · From: ${kiosk} · To: Any-External · Any service` },
      { label: 'Finance-Vendor-HTTPS-00', detail: `Allow · From: ${finance} · To: ${vendor} · HTTPS` },
      { label: 'HTTPS-proxy-00', detail: 'Allow · From: Trusted · To: Any-External · HTTPS (proxy action applied)' },
      { label: 'HTTP-proxy-00', detail: 'Allow · From: Trusted · To: Any-External · HTTP (proxy action applied)' },
      { label: 'Outgoing-00', detail: 'Allow · From: Any-Trusted, Any-Optional · To: Any-External · TCP and UDP' },
    ],
    explanation:
      'Single hosts first, then host-to-host exceptions, then proxied services, then the broad catch-all. ' +
      'Outgoing-00 matches essentially all outbound TCP and UDP, so anything below it is unreachable — including both proxies, which is the most common reason proxy inspection silently stops working. ' +
      'Block-Kiosk-00 must sit above every permitting policy or the kiosk simply matches one of them first.',
    webUi: 'Firewall → Firewall Policies → Manual Order',
    section: 'Policy Precedence and Ordering',
    };
  },

  r => {
    const scanner = host(r, 30);
    return {
    title: 'Keep proxy inspection reachable',
    topic: 'Proxies',
    brief: `Web traffic must be inspected by the proxies, the vulnerability scanner at ${scanner} needs unrestricted outbound access, and everything else may use the general outbound rule.`,
    order: [
      { label: 'Scanner-Unrestricted-00', detail: `Allow · From: ${scanner} · To: Any-External · Any service` },
      { label: 'HTTPS-proxy-Inspect-00', detail: 'Allow · From: Any-Trusted · To: Any-External · HTTPS (TLS inspection on)' },
      { label: 'HTTP-proxy-Inspect-00', detail: 'Allow · From: Any-Trusted · To: Any-External · HTTP' },
      { label: 'DNS-proxy-00', detail: 'Allow · From: Any-Trusted · To: Any-External · DNS' },
      { label: 'Outgoing-00', detail: 'Allow · From: Any-Trusted, Any-Optional · To: Any-External · TCP and UDP' },
    ],
    explanation:
      'The scanner exception is the narrowest rule, so it goes first. The three proxies must all precede Outgoing-00: that policy matches TCP and UDP to any external destination, which covers 80, 443 and 53, so any proxy placed below it never sees a packet. ' +
      'A proxy policy that appears configured correctly but logs nothing is almost always sitting underneath Outgoing.',
    webUi: 'Firewall → Firewall Policies → Manual Order',
    section: 'About Proxy Policies and Actions',
    };
  },

  r => {
    const web = host(r, 50), jump = publicHost(r), hostile = hostileNet(r);
    return {
    title: 'Published server with a management exception',
    topic: 'NAT',
    brief: `A public web server at ${web} is published with SNAT, administrators reach it over RDP from the jump host ${jump} only, and the known bad network ${hostile} must be denied outright.`,
    order: [
      { label: 'Block-Hostile-Net-00', detail: `Deny · From: ${hostile} · To: Any · Any service` },
      { label: 'Admin-RDP-Jump-00', detail: `Allow · From: ${jump} · To: SNAT ${web} · RDP` },
      { label: 'Web-Server-HTTPS-00', detail: `Allow · From: Any-External · To: SNAT ${web} · HTTPS` },
      { label: 'Web-Server-HTTP-00', detail: `Allow · From: Any-External · To: SNAT ${web} · HTTP` },
      { label: 'Outgoing-00', detail: 'Allow · From: Any-Trusted, Any-Optional · To: Any-External · TCP and UDP' },
    ],
    explanation:
      'The deny for the hostile network must be first, or that network matches one of the published server policies and is allowed in. ' +
      'The RDP exception is restricted to a single external source, so it is narrower than the two Any-External publishing rules and belongs above them. ' +
      'Outgoing-00 concerns outbound traffic and stays at the bottom, where it cannot shadow the inbound rules.',
    webUi: 'Firewall → Firewall Policies, and Firewall → SNAT for the published address',
    section: 'Static NAT and Policy Order',
    };
  },

  r => {
    const printer = host(r, 40), room = pick(r, ['conference room', 'training room', 'reception', 'break room']);
    return {
    title: 'Guest network with a captive exception',
    topic: 'Policies',
    brief: `Guests may browse the web but must not reach internal networks, while the ${room} printer at ${printer} stays reachable from the guest VLAN.`,
    order: [
      { label: 'Guest-Printer-00', detail: `Allow · From: Guest-VLAN · To: ${printer} · IPP, Raw printing` },
      { label: 'Guest-Deny-Internal-00', detail: 'Deny · From: Guest-VLAN · To: Any-Trusted · Any service' },
      { label: 'Guest-Web-00', detail: 'Allow · From: Guest-VLAN · To: Any-External · HTTP, HTTPS' },
      { label: 'Trusted-Outbound-00', detail: 'Allow · From: Any-Trusted · To: Any-External · TCP and UDP' },
      { label: 'Outgoing-00', detail: 'Allow · From: Any-Trusted, Any-Optional · To: Any-External · TCP and UDP' },
    ],
    explanation:
      `The printer at ${printer} sits on a trusted subnet, so Guest-Deny-Internal-00 would block it. In manual order Fireware stops at the first matching policy and does not look further, ` +
      'so an exception placed below the rule it is an exception to is dead configuration. Guest-Printer-00 therefore has to sit above the deny. ' +
      'Once the deny has run, the remaining guest and trusted policies are ordered narrowest to broadest as usual, with Outgoing-00 last. ' +
      'The general lesson: an exception is only an exception if the traffic reaches it first.',
    webUi: 'Firewall → Firewall Policies → Manual Order',
    section: 'Policy Precedence and Ordering',
    };
  },
  r => {
    const branch = `10.${integer(r, 20, 90)}.0.0/24`, hq = `10.${integer(r, 100, 180)}.0.0/24`;
    return {
    title: 'Keep branch traffic inside the BOVPN',
    topic: 'BOVPN',
    brief: `Traffic from the trusted network to the branch ${branch} must cross the BOVPN tunnel, the backup replication host reaches ${hq} without inspection, and ordinary browsing still uses the general outbound rule.`,
    order: [
      { label: 'Backup-Replication-00', detail: `Allow · From: Backup-Server · To: ${hq} · TCP 445, 3260 · no proxy` },
      { label: 'BOVPN-To-Branch-00', detail: `Allow · From: Any-Trusted · To: ${branch} · Any service · via BOVPN tunnel` },
      { label: 'HTTPS-proxy-00', detail: 'Allow · From: Any-Trusted · To: Any-External · HTTPS (proxy action applied)' },
      { label: 'HTTP-proxy-00', detail: 'Allow · From: Any-Trusted · To: Any-External · HTTP (proxy action applied)' },
      { label: 'Outgoing-00', detail: 'Allow · From: Any-Trusted, Any-Optional · To: Any-External · TCP and UDP' },
    ],
    explanation:
      `The two tunnel-bound rules are the narrowest, because each names a specific remote network, and they have to sit above the general rules or the branch traffic matches an outbound policy and leaves over the Internet in cleartext instead of entering the tunnel. ` +
      'That failure is quiet: the tunnel shows as up, and the traffic simply never uses it. ' +
      'Below them the usual shape applies, with the proxies above Outgoing-00 so inspection still happens, and Outgoing-00 last because it matches almost everything.',
    webUi: 'Firewall → Firewall Policies → Manual Order, and VPN → Branch Office VPN for the tunnel routes',
    section: 'Branch Office VPN and Policy Order',
    };
  },

  r => {
    const finance = pick(r, ['Finance', 'Payroll', 'Legal', 'HR']);
    return {
    title: 'Group-based access above a broad allow',
    topic: 'Policies',
    brief: `Only members of the ${finance} group may reach the accounting application, contractors are denied it outright, and everyone else keeps ordinary internet access.`,
    order: [
      { label: 'Deny-Contractors-Acct-00', detail: 'Deny · From: Contractors (auth group) · To: Accounting-App · Any service' },
      { label: `${finance}-Accounting-00`, detail: `Allow · From: ${finance} (auth group) · To: Accounting-App · HTTPS` },
      { label: 'Trusted-Deny-Accounting-00', detail: 'Deny · From: Any-Trusted · To: Accounting-App · Any service' },
      { label: 'HTTPS-proxy-00', detail: 'Allow · From: Any-Trusted · To: Any-External · HTTPS (proxy action applied)' },
      { label: 'Outgoing-00', detail: 'Allow · From: Any-Trusted, Any-Optional · To: Any-External · TCP and UDP' },
    ],
    explanation:
      `The contractor deny goes first because a contractor could also be a member of ${finance}, and whichever policy is reached first decides. ` +
      `The ${finance} allow then has to sit above the blanket deny to the application, or every authenticated user including ${finance} is refused. ` +
      'The blanket deny is what makes the allow meaningful: without it, anyone who missed both identity rules would fall through to the general policies. ' +
      'A user-based policy matches only once the user has authenticated, so a failure here is worth separating into an authentication problem and an authorisation problem before changing the order.',
    webUi: 'Firewall → Firewall Policies → Manual Order, with Authentication → Servers for the group source',
    section: 'User and Group Based Policies',
    };
  },

  r => {
    const mgmt = host(r, 250), branchAdmin = publicHost(r);
    return {
    title: 'Narrow the management path without locking yourself out',
    topic: 'Initial Setup',
    brief: `Device management must be limited to the admin subnet around ${mgmt} and to the branch engineer at ${branchAdmin}, with every other source denied before it reaches any management policy.`,
    order: [
      { label: 'Allow-Mgmt-Branch-Admin-00', detail: `Allow · From: ${branchAdmin} · To: Firebox · WatchGuard, WatchGuard Web UI` },
      { label: 'Allow-Mgmt-Admin-Subnet-00', detail: `Allow · From: ${mgmt}/24 · To: Firebox · WatchGuard, WatchGuard Web UI` },
      { label: 'Deny-Mgmt-Everyone-Else-00', detail: 'Deny · From: Any · To: Firebox · WatchGuard, WatchGuard Web UI, SSH' },
      { label: 'Ping-Firebox-00', detail: 'Allow · From: Any-Trusted · To: Firebox · Ping' },
      { label: 'Outgoing-00', detail: 'Allow · From: Any-Trusted, Any-Optional · To: Any-External · TCP and UDP' },
    ],
    explanation:
      'Both permitted sources must be above the catch-all management deny, otherwise the deny matches first and the device becomes unreachable from every address including your own. ' +
      'Order the two allows narrowest first out of habit, even though they do not overlap here, because a later edit that widens one of them will then fail safely rather than silently swallowing the other. ' +
      'This is the change most worth testing from a second session that is already connected: if the order is wrong you will find out while you still have a way back in.',
    webUi: 'Firewall → Firewall Policies → Manual Order, and System → Managed Access',
    section: 'Device Management Access',
    };
  },

  r => {
    const pbx = host(r, 60), provider = publicHost(r);
    return {
    title: 'Voice traffic that must not be proxied',
    topic: 'Policies',
    brief: `The PBX at ${pbx} registers with the SIP provider at ${provider} and must not be handled by the general outbound rule, while desk phones reach the PBX and everyone else browses normally.`,
    order: [
      { label: 'PBX-To-Provider-00', detail: `Allow · From: ${pbx} · To: ${provider} · SIP, RTP` },
      { label: 'Phones-To-PBX-00', detail: `Allow · From: Voice-VLAN · To: ${pbx} · SIP, RTP` },
      { label: 'SIP-ALG-00', detail: 'Allow · From: Any-Trusted · To: Any-External · SIP (proxy action applied)' },
      { label: 'HTTPS-proxy-00', detail: 'Allow · From: Any-Trusted · To: Any-External · HTTPS (proxy action applied)' },
      { label: 'Outgoing-00', detail: 'Allow · From: Any-Trusted, Any-Optional · To: Any-External · TCP and UDP' },
    ],
    explanation:
      `The PBX-to-provider rule is the narrowest, naming both endpoints, so it goes first and the provider registration is handled the way you intended rather than by whatever matches next. ` +
      'The internal phone rule follows, then the SIP proxy for anything else, then the remaining general policies. ' +
      'Outgoing-00 stays last for the usual reason, and it matters more than usual here: SIP and RTP are ordinary UDP, so if Outgoing sits above these rules it swallows the voice traffic and the call setup problems that follow look like a provider fault rather than a policy ordering mistake.',
    webUi: 'Firewall → Firewall Policies → Manual Order',
    section: 'Policy Precedence and Ordering',
    };
  },

  r => {
    const vpnNet = `192.168.${integer(r, 100, 200)}.0/24`, fileSrv = host(r, 70);
    return {
    title: 'Mobile VPN users with a management exclusion',
    topic: 'Mobile VPN',
    brief: `Mobile VPN clients from the pool ${vpnNet} need the file server ${fileSrv} and internal web applications, must never reach device management, and should not be granted anything broader.`,
    order: [
      { label: 'VPN-Deny-Management-00', detail: `Deny · From: ${vpnNet} · To: Firebox · WatchGuard, WatchGuard Web UI, SSH` },
      { label: 'VPN-File-Server-00', detail: `Allow · From: SSLVPN-Users · To: ${fileSrv} · SMB` },
      { label: 'VPN-Internal-Web-00', detail: 'Allow · From: SSLVPN-Users · To: Internal-Web-Servers · HTTPS' },
      { label: 'VPN-Deny-Rest-00', detail: `Deny · From: ${vpnNet} · To: Any-Trusted · Any service` },
      { label: 'Outgoing-00', detail: 'Allow · From: Any-Trusted, Any-Optional · To: Any-External · TCP and UDP' },
    ],
    explanation:
      'The management deny is first because it is the one rule that must hold no matter what follows, and a remote client that can reach the management interface is a materially worse outcome than one that cannot reach a file share. ' +
      'The two resource allows come next, then the catch-all deny that stops the VPN pool reaching anything else on the trusted network. ' +
      'Putting that catch-all deny above the allows is the classic mistake: the tunnel establishes, the client gets an address, and every resource is refused, which reads like a VPN fault rather than an ordering one.',
    webUi: 'Firewall → Firewall Policies → Manual Order, and VPN → Mobile VPN for the pool and group',
    section: 'Mobile VPN Access Control',
    };
  },

  r => {
    const dmz = host(r, 80), partner = publicHost(r), hostile = hostileNet(r);
    return {
    title: 'A published API with a partner exception',
    topic: 'NAT',
    brief: `A partner at ${partner} calls the published API on ${dmz} and must not be rate limited, the known bad network ${hostile} is denied outright, and the API is otherwise open to the Internet over HTTPS.`,
    order: [
      { label: 'Block-Hostile-Net-00', detail: `Deny · From: ${hostile} · To: Any · Any service` },
      { label: 'Partner-API-00', detail: `Allow · From: ${partner} · To: SNAT ${dmz} · HTTPS · no traffic management` },
      { label: 'Public-API-HTTPS-00', detail: `Allow · From: Any-External · To: SNAT ${dmz} · HTTPS · traffic management applied` },
      { label: 'DMZ-Outbound-Updates-00', detail: `Allow · From: ${dmz} · To: Any-External · HTTPS` },
      { label: 'Outgoing-00', detail: 'Allow · From: Any-Trusted, Any-Optional · To: Any-External · TCP and UDP' },
    ],
    explanation:
      `The hostile-network deny is first so that network cannot match either publishing rule. The partner rule names a single external source and so is narrower than the Any-External rule that follows; ` +
      'below it, the partner would match the public rule first and inherit the rate limit the exception exists to avoid. ' +
      'The DMZ outbound rule is separate from the inbound ones and sits above Outgoing-00 only because it is more specific, not because the direction matters to the ordering.',
    webUi: 'Firewall → Firewall Policies → Manual Order, and Firewall → SNAT for the published address',
    section: 'Static NAT and Policy Order',
    };
  },
];
