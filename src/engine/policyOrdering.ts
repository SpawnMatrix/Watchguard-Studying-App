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
  () => ({
    title: 'Deny one host inside a permitted subnet',
    topic: 'Policies',
    brief: 'A kiosk must be blocked from the internet while the rest of the trusted network browses normally, and the finance server reaches its vendor over HTTPS only.',
    order: [
      { label: 'Block-Kiosk-00', detail: 'Deny · From: 10.0.10.55 · To: Any-External · Any service' },
      { label: 'Finance-Vendor-HTTPS-00', detail: 'Allow · From: 10.0.20.8 · To: 198.51.100.40 · HTTPS' },
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
  }),

  () => ({
    title: 'Keep proxy inspection reachable',
    topic: 'Proxies',
    brief: 'Web traffic must be inspected by the proxies, an internal scanner needs unrestricted outbound access, and everything else may use the general outbound rule.',
    order: [
      { label: 'Scanner-Unrestricted-00', detail: 'Allow · From: 10.0.30.12 · To: Any-External · Any service' },
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
  }),

  () => ({
    title: 'Published server with a management exception',
    topic: 'NAT',
    brief: 'A public web server is published with SNAT, administrators reach it over RDP from one jump host only, and a known bad network must be denied outright.',
    order: [
      { label: 'Block-Hostile-Net-00', detail: 'Deny · From: 198.51.100.0/24 · To: Any · Any service' },
      { label: 'Admin-RDP-Jump-00', detail: 'Allow · From: 203.0.113.77 · To: SNAT 10.0.50.20 · RDP' },
      { label: 'Web-Server-HTTPS-00', detail: 'Allow · From: Any-External · To: SNAT 10.0.50.20 · HTTPS' },
      { label: 'Web-Server-HTTP-00', detail: 'Allow · From: Any-External · To: SNAT 10.0.50.20 · HTTP' },
      { label: 'Outgoing-00', detail: 'Allow · From: Any-Trusted, Any-Optional · To: Any-External · TCP and UDP' },
    ],
    explanation:
      'The deny for the hostile network must be first, or that network matches one of the published server policies and is allowed in. ' +
      'The RDP exception is restricted to a single external source, so it is narrower than the two Any-External publishing rules and belongs above them. ' +
      'Outgoing-00 concerns outbound traffic and stays at the bottom, where it cannot shadow the inbound rules.',
    webUi: 'Firewall → Firewall Policies, and Firewall → SNAT for the published address',
    section: 'Static NAT and Policy Order',
  }),

  () => ({
    title: 'Guest network with a captive exception',
    topic: 'Policies',
    brief: 'Guests may browse the web but must not reach internal networks, while the conference room printer is reachable from the guest VLAN.',
    order: [
      { label: 'Guest-Printer-00', detail: 'Allow · From: Guest-VLAN · To: 10.0.40.9 · IPP, Raw printing' },
      { label: 'Guest-Deny-Internal-00', detail: 'Deny · From: Guest-VLAN · To: Any-Trusted · Any service' },
      { label: 'Guest-Web-00', detail: 'Allow · From: Guest-VLAN · To: Any-External · HTTP, HTTPS' },
      { label: 'Trusted-Outbound-00', detail: 'Allow · From: Any-Trusted · To: Any-External · TCP and UDP' },
      { label: 'Outgoing-00', detail: 'Allow · From: Any-Trusted, Any-Optional · To: Any-External · TCP and UDP' },
    ],
    explanation:
      'The printer at 10.0.40.9 sits on a trusted subnet, so Guest-Deny-Internal-00 would block it. In manual order Fireware stops at the first matching policy and does not look further, ' +
      'so an exception placed below the rule it is an exception to is dead configuration. Guest-Printer-00 therefore has to sit above the deny. ' +
      'Once the deny has run, the remaining guest and trusted policies are ordered narrowest to broadest as usual, with Outgoing-00 last. ' +
      'The general lesson: an exception is only an exception if the traffic reaches it first.',
    webUi: 'Firewall → Firewall Policies → Manual Order',
    section: 'Policy Precedence and Ordering',
  }),
];
