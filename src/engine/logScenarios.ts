/**
 * Traffic Monitor log-analysis scenarios.
 *
 * The skill being trained is the one an L1 actually needs on a ticket: read
 * a Firebox log line, name the reason the packet was dropped, and know
 * which part of the configuration to open.
 *
 * Every line here follows the shape Fireware writes to Traffic Monitor —
 * disposition, source, destination, ports, protocol, then the key/value
 * tail with `msg_id`, `policy`/`disp`, and the interface pair. The values
 * are randomised per seed so the learner reads the log rather than
 * memorising the answer.
 *
 * Marked SIMULATED so nobody mistakes generated training data for a capture
 * from a real device.
 */
import type { Question } from '../data/questions';
import type { Random } from './random';
import { integer, pick } from './random';

export interface LogScenarioSpec {
  /** Short label used in the template catalogue. */
  title: string;
  topic: Question['topic'];
  /** The correct diagnosis. */
  cause: string;
  /** Plausible diagnoses that a learner who misreads the line would choose. */
  distractors: string[];
  log: string;
  explanation: string;
  /** Where in Fireware Web UI the fix lives. */
  webUi: string;
  section: string;
}

const ts = (r: Random) => {
  const month = pick(r, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${month} ${pad(integer(r, 1, 28))} ${pad(integer(r, 0, 23))}:${pad(integer(r, 0, 59))}:${pad(integer(r, 0, 59))}`;
};

const net = (r: Random) => {
  const octet = integer(r, 10, 240);
  return {
    trusted: `10.0.${integer(r, 1, 40)}.${integer(r, 20, 200)}`,
    optional: `172.16.${integer(r, 1, 40)}.${integer(r, 20, 200)}`,
    external: `203.0.113.${integer(r, 2, 250)}`,
    internet: `198.51.100.${octet}`,
    server: `10.0.${integer(r, 50, 90)}.${integer(r, 10, 60)}`,
    sport: integer(r, 49152, 65535),
    fbx: `203.0.113.${integer(r, 2, 250)}`,
  };
};

/**
 * The scenario builders. Each returns a complete, self-consistent case:
 * the log line, the real cause, and wrong answers that are wrong for a
 * specific, teachable reason rather than being obviously absurd.
 */
export const logScenarioBuilders: ((r: Random) => LogScenarioSpec)[] = [
  // 1. Unhandled packet — no policy matched at all.
  r => {
    const n = net(r), port = pick(r, [8080, 3389, 1433, 5060, 8443, 9100]);
    return {
      title: 'Unhandled internal packet',
      topic: 'Policies',
      cause: 'No policy matched the traffic, so the Firebox dropped it under the implicit final deny.',
      distractors: [
        'A proxy action denied the content after inspecting it.',
        'The source address failed the default spoofing check.',
        'The connection matched a policy whose action was set to Deny.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox kernel: Deny ${n.trusted} ${n.server} ${n.sport} ${port} tcp 20 127 (Unhandled Internal Packet-00) proc_id="firewall" rc="101" msg_id="3000-0148" src_ip_nat="0.0.0.0" geo_dst="USA" in_ifname="Trusted" out_ifname="Optional"`,
      explanation:
        `"Unhandled Internal Packet-00" is not a policy you configured — it is what the Firebox logs when traffic from a trusted or optional interface reaches the bottom of the policy list without matching anything. ` +
        `Nothing inspected the payload and nothing explicitly denied it; there was simply no rule for TCP ${port} from that source to that destination. ` +
        `The fix is to add a policy that permits the service, not to change an existing one.`,
      webUi: 'Firewall → Firewall Policies → Add Policy',
      section: 'About Policies and Firewall Rules',
    };
  },

  // 2. Spoofing — default packet handling / anti-spoof.
  r => {
    const n = net(r);
    return {
      title: 'Default packet handling drops a spoofed source',
      topic: 'Troubleshooting',
      cause: 'The source address arrived on an interface that does not own that network, so anti-spoofing dropped it.',
      distractors: [
        'No policy matched the traffic and the implicit deny applied.',
        'The HTTPS proxy denied the request after content inspection.',
        'The destination was unreachable because no route existed.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox kernel: Deny ${n.trusted} ${n.internet} ${n.sport} 443 tcp 20 118 (spoofing attack) proc_id="firewall" rc="101" msg_id="3000-0150" in_ifname="External" out_ifname="Firebox"`,
      explanation:
        `The packet claims a source of ${n.trusted}, which belongs to the trusted network, but it arrived on the External interface. ` +
        `A legitimate packet from that subnet would never enter from outside. Default Packet Handling drops this before any policy is evaluated, ` +
        `which is why no policy name appears in the log. Check for an asymmetric route or a misconfigured interface before disabling the check.`,
      webUi: 'Firewall → Default Packet Handling → Drop Spoofing Attacks',
      section: 'Default Packet Handling',
    };
  },

  // 3. Proxy content deny — a policy matched, inspection rejected it.
  r => {
    const n = net(r), type = pick(r, ['application/x-msdownload', 'application/x-dosexec', 'application/zip']);
    return {
      title: 'HTTP proxy denies content by body type',
      topic: 'Proxies',
      cause: 'A proxy policy matched and allowed the connection, then the proxy action denied the content itself.',
      distractors: [
        'No policy matched, so the implicit deny dropped the packet.',
        'The packet was dropped by the default spoofing check.',
        'A packet filter policy denied the connection before any inspection.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox http-proxy[2100]: ProxyDrop: HTTP Body Content Type match (HTTP-proxy-00) ${n.trusted} ${n.internet} ${n.sport} 80 msg_id="1AFF-0021" proxy_act="Default-HTTP-Client" content_type="${type}" op="GET" dstname="downloads.example.net"`,
      explanation:
        `This is a ProxyDrop, not a firewall Deny — the distinction matters. The HTTP-proxy policy did match, and the connection was permitted at the policy layer. ` +
        `The drop happened one layer up, when the proxy action "Default-HTTP-Client" inspected the response body, found content type ${type}, and applied its deny rule. ` +
        `Adding another policy will not help; the rule to change lives inside the proxy action.`,
      webUi: 'Firewall → Proxy Actions → Default-HTTP-Client → Body Content Types',
      section: 'About Proxy Policies and Actions',
    };
  },

  // 4. Explicit deny policy — ordering matters.
  r => {
    const n = net(r);
    return {
      title: 'An explicit Deny policy matched first',
      topic: 'Policies',
      cause: 'A policy with a Deny action sat above the permitting policy, and the first match wins.',
      distractors: [
        'No policy matched and the traffic hit the implicit deny.',
        'The proxy action rejected the content after inspection.',
        'The Firebox had no route to the destination network.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox kernel: Deny ${n.trusted} ${n.internet} ${n.sport} 443 tcp 20 63 (Block-Social-00) proc_id="firewall" rc="101" msg_id="3000-0149" in_ifname="Trusted" out_ifname="External" policy_order="manual"`,
      explanation:
        `The log names a real policy, "Block-Social-00", so this was a deliberate deny rather than an unhandled packet. ` +
        `In manual-order mode the Firebox evaluates policies top to bottom and stops at the first match, so a permitting HTTPS policy further down the list never gets consulted. ` +
        `Either move the permitting policy above the deny, or narrow the deny policy's source and destination.`,
      webUi: 'Firewall → Firewall Policies (set Manual Order, then drag to reorder)',
      section: 'Policy Precedence and Ordering',
    };
  },

  // 5. No route to destination.
  r => {
    const n = net(r);
    return {
      title: 'Traffic denied for want of a route',
      topic: 'Routing',
      cause: 'The Firebox had no route to the destination network, so it could not forward the packet.',
      distractors: [
        'The implicit deny dropped it because no policy matched.',
        'Anti-spoofing rejected the source address.',
        'A proxy action denied the request payload.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox kernel: Deny ${n.trusted} ${n.optional} ${n.sport} 445 tcp 20 127 (no route to host) proc_id="firewall" rc="102" msg_id="3000-0173" in_ifname="Trusted" out_ifname=""`,
      explanation:
        `The empty out_ifname is the clue: the Firebox never selected an egress interface, because its routing table has no entry covering ${n.optional}. ` +
        `A policy permitting the traffic would still produce this result — routing is evaluated independently of policy. ` +
        `Confirm the destination network has a connected interface, a static route, or a dynamic route before touching the policy list.`,
      webUi: 'Network → Routes (and System Status → Routes to confirm what is active)',
      section: 'Static Routing and Routing Decisions',
    };
  },

  // 6. Blocked Sites list.
  r => {
    const n = net(r);
    return {
      title: 'Source is on the Blocked Sites list',
      topic: 'Security Services',
      cause: 'The source address was on the Blocked Sites list, which is enforced ahead of the policy list.',
      distractors: [
        'The traffic matched a Deny policy in the firewall rule set.',
        'No policy matched, so the implicit deny applied.',
        'The Firebox dropped the packet as a spoofing attempt.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox kernel: Deny ${n.internet} ${n.fbx} ${n.sport} 443 tcp 20 118 (blocked sites) proc_id="firewall" rc="101" msg_id="3000-0155" in_ifname="External" out_ifname="Firebox" blocked_reason="auto"`,
      explanation:
        `"blocked sites" means the address was already on the Blocked Sites list when the packet arrived, so evaluation stopped before any policy was considered. ` +
        `blocked_reason="auto" says the Firebox added it itself — usually after an earlier IPS or Botnet Detection event — rather than an operator adding it permanently. ` +
        `Temporary entries age out on their own; check the list before assuming a policy change is needed.`,
      webUi: 'Firewall → Blocked Sites → Blocked Sites (and Temporary Blocked Sites)',
      section: 'About Blocked Sites',
    };
  },

  // 7. Denied by policy schedule / inactive policy.
  r => {
    const n = net(r);
    return {
      title: 'Policy matched but was outside its schedule',
      topic: 'Policies',
      cause: 'The matching policy was inactive at that time of day because a schedule was applied to it.',
      distractors: [
        'The policy was deleted, so the implicit deny applied.',
        'The proxy denied the content after inspection.',
        'The source address failed authentication.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox kernel: Deny ${n.trusted} ${n.internet} ${n.sport} 80 tcp 20 63 (Guest-Web-00) proc_id="firewall" rc="101" msg_id="3000-0149" in_ifname="Trusted" out_ifname="External" schedule="Business-Hours" sched_state="inactive"`,
      explanation:
        `The policy "Guest-Web-00" did match, but sched_state="inactive" shows the operating schedule "Business-Hours" was not in effect when the packet arrived. ` +
        `An inactive policy behaves as though it is not there, so the traffic falls through and is denied. ` +
        `Verify the Firebox clock and time zone as well as the schedule itself — a wrong system time produces exactly this log.`,
      webUi: 'Firewall → Firewall Policies → (policy) → Advanced → Schedule',
      section: 'Policy Schedules',
    };
  },

  // 8. BOVPN traffic that never entered the tunnel.
  r => {
    const n = net(r);
    return {
      title: 'Branch traffic missed the BOVPN tunnel route',
      topic: 'BOVPN',
      cause: 'The traffic did not match the tunnel route, so it was sent to the default gateway and denied instead of being encrypted.',
      distractors: [
        'Phase 1 failed, so the tunnel never came up.',
        'The proxy denied the payload after inspection.',
        'A spoofing check dropped the packet.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox kernel: Deny ${n.trusted} ${n.optional} ${n.sport} 3389 tcp 20 127 (Unhandled Internal Packet-00) proc_id="firewall" rc="101" msg_id="3000-0148" in_ifname="Trusted" out_ifname="External" tunnel=""`,
      explanation:
        `out_ifname="External" with an empty tunnel field means the packet was routed toward the internet rather than into the BOVPN. ` +
        `A branch office tunnel only carries traffic that matches its tunnel route — the local/remote network pair configured on the gateway. ` +
        `If ${n.optional} is not covered by that pair, the traffic never becomes tunnel traffic, regardless of whether Phase 1 and Phase 2 are up.`,
      webUi: 'VPN → Branch Office VPN → (tunnel) → Addresses',
      section: 'Branch Office VPN Tunnel Routes',
    };
  },
];
