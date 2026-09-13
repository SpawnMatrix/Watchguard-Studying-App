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
  /**
   * The specific connection this entry describes, quoted back in the
   * question stem. It anchors the question to the log line in front of the
   * learner instead of asking about "this traffic" in the abstract.
   */
  subject: string;
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
      subject: `${n.trusted} to ${n.server} on TCP ${port}`,
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
      subject: `${n.trusted} to ${n.internet} on TCP 443`,
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
      subject: `${n.trusted} to downloads.example.net on TCP 80`,
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
      subject: `${n.trusted} to ${n.internet} on TCP 443`,
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
      subject: `${n.trusted} to ${n.optional} on TCP 445`,
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
      subject: `${n.internet} to ${n.fbx} on TCP 443`,
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
      subject: `${n.trusted} to ${n.internet} on TCP 80`,
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
      subject: `${n.trusted} to ${n.optional} on TCP 3389`,
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
  // 9. Gateway AntiVirus matched a signature in a download.
  //
  // Note on the log lines from here down: msg_id values are deliberately omitted rather than
  // invented. The disposition, proxy name and reason text are the parts a learner has to read, and
  // guessing at numeric identifiers would teach values that may not match a real appliance.
  r => {
    const n = net(r), file = pick(r, ['invoice.zip', 'update.exe', 'statement.doc', 'shipping.pdf']);
    const virus = pick(r, ['EICAR-Test-File', 'Trojan.Generic', 'W32.Downloader', 'JS.Obfus']);
    return {
      title: 'Gateway AntiVirus drops an infected download',
      subject: `${n.trusted} downloading ${file} from ${n.internet}`,
      topic: 'Security Services',
      cause: 'Gateway AntiVirus matched a virus signature and the proxy dropped the download.',
      distractors: [
        'The file exceeded the configured scan size limit and was therefore passed through unscanned.',
        'WebBlocker denied the destination because of the content category it falls in.',
        'No policy matched the download at all, so the implicit final deny applied.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox http-proxy[1234]: ProxyDrop: HTTP Virus found (HTTP-proxy-00) ${n.trusted} ${n.internet} ${n.sport} 80 tcp virus="${virus}" file_name="${file}" proxy_act="HTTP-Client.Standard" in_ifname="Trusted" out_ifname="External"`,
      explanation:
        `The disposition is ProxyDrop rather than Deny, which already tells you a proxy policy matched and inspected the content before rejecting it. ` +
        `The virus field names the signature that fired, so Gateway AntiVirus made the decision inside the HTTP-proxy action. ` +
        `Note the contrast with the scan-size limit: a file that is too large is not scanned at all, and what happens to it then is whatever you configured for unscannable content, which may well be Allow.`,
      webUi: 'Subscription Services → Gateway AntiVirus, and the HTTP-proxy action that uses it',
      section: 'Gateway AntiVirus and Proxy Actions',
    };
  },

  // 10. WebBlocker category denial.
  r => {
    const n = net(r), cat = pick(r, ['Gambling', 'Streaming Media', 'Peer-to-Peer File Sharing', 'Social Networking']);
    return {
      title: 'WebBlocker denies a category',
      subject: `${n.trusted} browsing to ${n.internet}`,
      topic: 'Security Services',
      cause: 'WebBlocker denied the request because the destination is in a denied category.',
      distractors: [
        'Gateway AntiVirus found malware in the response body and dropped the session.',
        'Application Control recognised the application and blocked it by its signature.',
        'The destination was already on the Blocked Sites list from an earlier auto-block.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox http-proxy[1234]: ProxyDrop: HTTP Web Blocker (HTTP-proxy-00) ${n.trusted} ${n.internet} ${n.sport} 80 tcp cats="${cat}" proxy_act="HTTP-Client.Standard" in_ifname="Trusted" out_ifname="External"`,
      explanation:
        `The "Web Blocker" reason and the cats field name the category that triggered the denial, so this is a URL-categorisation decision rather than a content-scanning one. ` +
        `If the site is genuinely needed, a WebBlocker exception for that URL is the narrow fix; it is evaluated ahead of the category filters, so it restores one site without reopening the whole "${cat}" category. ` +
        `Blocked Sites would appear as a Deny from the firewall rather than a ProxyDrop from the proxy.`,
      webUi: 'Subscription Services → WebBlocker → Categories, and WebBlocker Exceptions',
      section: 'WebBlocker Categories and Exceptions',
    };
  },

  // 11. IPS signature match.
  r => {
    const n = net(r), sev = pick(r, ['High', 'Critical', 'Medium']);
    return {
      title: 'Intrusion Prevention drops an exploit attempt',
      subject: `${n.internet} to the published server ${n.fbx} on TCP 443`,
      topic: 'Security Services',
      cause: 'Intrusion Prevention matched a signature for a known exploit and dropped the connection.',
      distractors: [
        'Gateway AntiVirus matched a virus signature inside the request payload.',
        'The traffic reached the end of the policy list without matching anything at all.',
        'Default packet handling treated the request rate as a flood attack instead.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox ips: Deny ${n.internet} ${n.fbx} ${n.sport} 443 tcp (IPS) signature_name="HTTP Directory Traversal" severity="${sev}" action="drop" in_ifname="External" out_ifname="Optional"`,
      explanation:
        `IPS inspects traffic a policy has already permitted, which is why the drop is attributed to the service rather than to a policy name. ` +
        `The signature field identifies the specific vulnerability pattern that fired, so the first step in a suspected false positive is to look that signature up rather than to disable the service. ` +
        `Gateway AntiVirus is the other signature-based scanner, but it matches malware inside files a proxy has extracted, not exploit patterns in the request itself.`,
      webUi: 'Subscription Services → Intrusion Prevention Service',
      section: 'Intrusion Prevention Service',
    };
  },

  // 12. Application Control.
  r => {
    const n = net(r), app = pick(r, ['BitTorrent', 'TeamViewer', 'Tor', 'Ultrasurf']);
    const port = pick(r, [443, 80, 8080, 9001]);
    return {
      title: 'Application Control blocks an application on a common port',
      subject: `${n.trusted} to ${n.internet} on TCP ${port}`,
      topic: 'Security Services',
      cause: 'Application Control recognised the application by its signature and blocked it.',
      distractors: [
        'WebBlocker denied the destination URL because of the category it belongs to.',
        `No policy permitted TCP ${port} at all, so the connection hit the implicit final deny.`,
        'The proxy dropped the session after inspecting the type of the response body.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox firewall: Deny ${n.trusted} ${n.internet} ${n.sport} ${port} tcp (Application Control) app_name="${app}" app_beh="access" action="drop" in_ifname="Trusted" out_ifname="External"`,
      explanation:
        `Application Control identifies ${app} from how the traffic behaves, not from the port it uses, which is the whole reason it exists: the connection here is riding TCP ${port} precisely because that port is normally open. ` +
        `That is also why moving the application to another port does not evade it, and why a port-based packet filter could never have made this decision. ` +
        `WebBlocker, by contrast, would have had to recognise a URL, which an application tunnelling over TLS does not helpfully provide.`,
      webUi: 'Subscription Services → Application Control',
      section: 'Application Control',
    };
  },

  // 13. Botnet Detection.
  r => {
    const n = net(r);
    return {
      title: 'Botnet Detection blocks a command-and-control address',
      subject: `${n.trusted} reaching out to ${n.internet}`,
      topic: 'Security Services',
      cause: 'The destination matched the known botnet command-and-control list.',
      distractors: [
        'Geolocation blocked the destination because of the country that it maps to.',
        'WebBlocker denied the destination because of the URL category it falls in.',
        'An administrator had manually added the address to the Blocked Sites list.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox firewall: Deny ${n.trusted} ${n.internet} ${n.sport} 8443 tcp (Botnet Detection) reason="known botnet site" geo_dst="RUS" in_ifname="Trusted" out_ifname="External"`,
      explanation:
        `This is an outbound connection from an internal host to a listed command-and-control address, so the interesting question is not why it was blocked but why ${n.trusted} tried at all. ` +
        `Treat the block as a symptom and investigate the host. Botnet Detection matches the address against a maintained reputation list wherever it is in the world, which is what separates it from Geolocation: ` +
        `the geo_dst field here is informational, and blocking that country would not have caught a C2 server hosted anywhere else.`,
      webUi: 'Subscription Services → Botnet Detection, and Firewall → Blocked Sites',
      section: 'Botnet Detection and Reputation Enabled Defense',
    };
  },

  // 14. Geolocation.
  r => {
    const n = net(r), country = pick(r, ['CHN', 'RUS', 'PRK', 'IRN']);
    return {
      title: 'Geolocation blocks an inbound country',
      subject: `${n.internet} to the published service on ${n.fbx}`,
      topic: 'Security Services',
      cause: 'Geolocation denied the connection because the source maps to a blocked country.',
      distractors: [
        'Botnet Detection matched the source against its command-and-control list.',
        'Anti-spoofing rejected the source because it arrived on the wrong interface entirely.',
        'No inbound policy matched the connection, so the implicit final deny applied.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox firewall: Deny ${n.internet} ${n.fbx} ${n.sport} 443 tcp (Geolocation) geo_src="${country}" action="drop" in_ifname="External" out_ifname="Firebox"`,
      explanation:
        `The geo_src field is the whole decision: the source address resolves to ${country}, and that country is configured to be denied. ` +
        `Worth being clear about the limit of this control. It blocks by where an address is registered, so an attacker who rents infrastructure in a country you allow is unaffected, ` +
        `and a legitimate user travelling or behind a VPN in ${country} is blocked. It reduces background noise; it is not a defence against a targeted attacker.`,
      webUi: 'Subscription Services → Geolocation',
      section: 'Geolocation',
    };
  },

  // 15. Flood threshold.
  r => {
    const n = net(r), kind = pick(r, ['IPSec', 'ICMP', 'SYN', 'UDP']);
    return {
      title: 'A flood threshold drops the excess',
      subject: `${n.internet} sending ${kind} traffic to ${n.fbx}`,
      topic: 'Security Services',
      cause: 'The source crossed a configured flood threshold and the excess was dropped.',
      distractors: [
        'An explicit Deny policy matched the connection and blocked it outright.',
        'Intrusion Prevention matched a denial-of-service exploit signature instead.',
        'The connection was dropped because no route existed towards the destination.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox kernel: Deny ${n.internet} ${n.fbx} ${n.sport} 0 ${kind === 'ICMP' ? 'icmp' : 'tcp'} (${kind} flood attack) threshold="exceeded" in_ifname="External" out_ifname="Firebox"`,
      explanation:
        `Flood protection is part of default packet handling, so it runs before policy evaluation and no policy name appears in the entry. ` +
        `The important judgement is whether the threshold matches real demand: a busy but legitimate service can trip a default value, and the fix then is to measure the workload and tune the threshold rather than to switch the protection off. ` +
        `An explicit Deny policy would have named itself in the log, and IPS would have named a signature.`,
      webUi: 'Firewall → Default Packet Handling → Flood Attacks',
      section: 'Default Threat Protection',
    };
  },

  // 16. HTTPS content inspection rejects the server certificate.
  r => {
    const n = net(r), reason = pick(r, ['certificate expired', 'unknown certificate authority', 'name mismatch']);
    return {
      title: 'Content inspection rejects a server certificate',
      subject: `${n.trusted} to ${n.internet} on TCP 443`,
      topic: 'Proxies',
      cause: 'Certificate validation rejected the server certificate during content inspection.',
      distractors: [
        'The client does not trust the Firebox Proxy Authority certificate it was shown.',
        'Gateway AntiVirus found malware hidden inside the encrypted payload.',
        'WebBlocker denied the destination because of the category assigned to it.',
      ],
      log: `SIMULATED TRAFFIC MONITOR
${ts(r)} firebox https-proxy[1234]: ProxyDrop: HTTPS Certificate validation failed (HTTPS-proxy-00) ${n.trusted} ${n.internet} ${n.sport} 443 tcp reason="${reason}" proxy_act="HTTPS-Client.Standard" in_ifname="Trusted" out_ifname="External"`,
      explanation:
        `Content inspection makes the Firebox a TLS client to the destination, so it validates that server's certificate and rejects the session here when validation fails. ` +
        `The strongest distractor is the client trust problem, and the difference is which leg of the connection fails: an untrusted Proxy Authority certificate produces a browser warning on the client side with the session still established to the Firebox, ` +
        `whereas this entry shows the Firebox refusing the far side before any content moved. Decide deliberately what an invalid certificate should do rather than inheriting it.`,
      webUi: 'Firewall → Proxy Actions → HTTPS-Client → Content Inspection',
      section: 'HTTPS Proxy and Content Inspection',
    };
  },
];
