import type { Question } from './questions';
import type { SourceReference } from '../engine/types';

/** Original questions for gaps found in the supplied deck; never a raw Anki import.
 * Stable IDs are explicit. See docs/content-review-2026.md and its note-level ledger. */
export const TRAINING_REVIEW_DATE = '2026-10-23';
export const lab2026 = (section: string): SourceReference => ({
  title: 'Network Security Essentials for Locally-Managed Fireboxes Lab Book · August 2026 cover',
  section,
});
const help = (title: string, path: string): SourceReference => ({
  title: `WatchGuard: ${title}`, url: `https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/${path}`,
});
export const TRAINING_SOURCES = {
  appControl: help('Global Application Control Action', 'Fireware/services/app_control/app_control_global_action_c.html'),
  smtp: help('SMTP-Proxy: Mail From/Rcpt To', 'Fireware/proxies/smtp/proxy_smtp_mail_from_to_c.html'),
  spam: help('About spamBlocker Exceptions', 'Fireware/services/spamblocker/spam_except_about_c.html'),
  logServers: help('Add a Dimension or WSM Log Server', 'Fireware/logging/ls_add_firebox_wsm.html'),
  groups: help('View Groups', 'Fireware/dimension/groups_view_d.html'),
  audit: help('Audit Trail Report', 'WG-Cloud/Devices/reports/report_audit_trail_wgc.html'),
  keySync: help('Enable Feature Key Synchronization and Alarm Notification', 'Fireware/basicadmin/feature_key_sync_c.html'),
  aggregation: help('About Link Aggregation', 'Fireware/networksetup/link_aggregation_about_c.html'),
  configReport: help('Manage the Firebox Configuration File', 'Fireware/basicadmin/config_report_download_web.html'),
  backup: help('Save a Firebox Backup Image', 'Fireware/backup_upgrade_recovery/firebox_backup_images_about_c.html'),
  secondary: help('Add a Secondary Network IP Address', 'Fireware/networksetup/second_net_config_c.html'),
};

function question(id: number, topic: Question['topic'], objective: string, source: SourceReference,
  prompt: string, options: [string, string, string, string], explanation: string): Question {
  return { id, topic, objective, question: prompt, options, correctAnswer: options[0], correctAnswers: [options[0]],
    correctAnswersCount: 1, isMultiSelect: false, track: 'local', difficulty: 'applied', explanation,
    sources: [source], firewareVersion: source.title.startsWith('Network Security')
      ? '12.10.4+ lab baseline; verify model and release support' : `Documentation reviewed ${TRAINING_REVIEW_DATE}` };
}

export const trainingQuestions: Question[] = [
  question(2424, 'IP Addressing', 'Recognize IPv4 multicast on Ethernet',
    { title: 'RFC 1112: Host Extensions for IP Multicasting, section 6.4', url: 'https://www.rfc-editor.org/rfc/rfc1112' },
    'Which Ethernet destination is in the address range used to map IPv4 multicast groups?',
    ['01:00:5E:00:00:01', 'FF:FF:FF:FF:FF:FF', '00:11:22:33:44:55', '02:11:22:33:44:55'],
    'IPv4 multicast maps the low 23 bits of the group address into the Ethernet range beginning 01:00:5E, with the next high-order bit zero. The all-ones address is broadcast; the two other options have the individual/group bit clear and are unicast addresses. Multicast and broadcast are different link-layer delivery categories.'),
  question(2425, 'Logging & Monitoring', 'Inspect authenticated user sessions', lab2026('Exercise 11, p. 33: Authentication List'),
    'A test user must be logged out before you validate a different group\'s access from the same workstation. Which FSM tab lets an authorized administrator inspect and end the authenticated session?',
    ['Authentication List', 'Subscription Services signature status', 'Bandwidth Meter interface graph', 'Traffic Management action editor'],
    'The Authentication List shows authenticated sessions and supports logging users out. Signature status, bandwidth graphs, and traffic-management configuration do not end that session. Log out the first identity before testing the next so cached authentication does not make a policy test misleading.'),
  question(2400, 'Security Services', 'Apply an Application Control action', TRAINING_SOURCES.appControl,
    'An administrator configures the Global Application Control action to drop an application, but the matching policy has Application Control disabled. What must change?',
    ['Enable Application Control on that policy', 'Rename the Global action to match the policy name', 'Move the Global action above all firewall policies', 'Enable logging for allowed traffic on that policy'],
    'An action defines what to do only when a policy uses it. Enable Application Control and select the appropriate action on the matching policy. Renaming does not assign an action; actions do not occupy positions in the firewall policy list; logging records traffic without applying application restrictions.'),
  question(2401, 'Routing', 'Stage an interface subnet migration', TRAINING_SOURCES.secondary,
    'A trusted interface must move to a new primary subnet. Existing clients still use the old gateway address. Which staged change keeps that gateway reachable while clients are migrated?',
    ['Keep the old gateway as a secondary address', 'Add the old gateway to the permanent blocked list', 'Change only the subnet mask on the DHCP clients', 'Point a static route for the old subnet at the ISP'],
    'A secondary network lets the interface retain its old gateway address while the new subnet is introduced. Also review DHCP pools, policies, NAT, and client addressing before removing the old network. A route toward the ISP cannot preserve a local gateway, changing only masks misconfigures clients, and blocking the address defeats the migration.'),
  question(2402, 'Routing', 'Diagnose DHCP pool exhaustion', lab2026('Exercise 1, pp. 7-9: DHCP address pool'),
    'Fifty DHCP clients have working leases. A newly connected client gets 169.254.8.6, and the Firebox shows all 50 pool addresses leased with no offers to that client. What should you investigate first?',
    ['Exhaustion of the configured DHCP pool', 'Expiration of the WebBlocker subscription', 'A Phase 2 proposal mismatch on a BOVPN tunnel', 'The source NAT address on the outbound policy'],
    'The exhausted pool and missing DHCP offers explain the new client\'s link-local address. Review legitimate leases and expand or redesign the pool within the subnet if appropriate. A 50-address pool is not a universal 50-Internet-connection limit: statically addressed hosts are a separate case. WebBlocker, BOVPN proposals, and source NAT do not allocate DHCP leases.'),
  question(2403, 'Security Services', 'Limit a spamBlocker exception', TRAINING_SOURCES.spam,
    'A legitimate newsletter is misclassified by spamBlocker. Its display From address differs from the SMTP envelope sender. Which exception most precisely addresses the problem?',
    ['Allow the actual envelope sender address', 'Allow every sender whose display name is familiar', 'Allow all senders with the wildcard pattern *', 'Disable spamBlocker on every incoming mail policy'],
    'Use the actual MAIL FROM address, available in X-WatchGuard-Mail-From, for a narrow sender exception. The displayed From field can differ. A wildcard or disabling the service bypasses checks for unrelated senders. An exception is not proof that a sender is authentic, so avoid overly broad patterns.'),
  question(2404, 'Proxies', 'Distinguish SMTP sender and recipient rules', TRAINING_SOURCES.smtp,
    'An outbound SMTP action allows *@example.com in Mail From and denies unmatched senders. No Rewrite As value is configured. What does this rule enforce?',
    ['A restriction on the envelope sender', 'A restriction on the recipient domain only', 'A rewrite of every message\'s visible Subject', 'A change to the destination mail server address'],
    'Mail From evaluates the SMTP envelope sender; Rcpt To evaluates recipients. Allowing a sender pattern and denying unmatched senders does not rewrite addresses or change the destination server. This explicitly stated scenario replaces an ambiguous annotated screenshot; the action name alone never determines what the selected ruleset filters.'),
  question(2405, 'Logging & Monitoring', 'Aggregate Dimension reports', TRAINING_SOURCES.groups,
    'Two branch Fireboxes already send logs to Dimension. A manager wants one report combining their activity. What should you use?',
    ['An aggregated report for a device group', 'A combined feature key imported into both devices', 'A shared administrator password on both devices', 'A BOVPN tunnel named after the reporting period'],
    'Create or select a Dimension group containing the Fireboxes and view its aggregated report for the required time range. The report depends on logs actually received from those devices. Feature keys license appliances, shared passwords undermine attribution, and tunnel names do not aggregate reports.'),
  question(2406, 'Logging & Monitoring', 'Send parallel log streams', TRAINING_SOURCES.logServers,
    'Two Dimension servers must receive the same Firebox logs concurrently. Both are currently listed on Log Servers 1, where the second is a backup. What change provides parallel delivery?',
    ['Put the second destination on Log Servers 2', 'Move the backup above the primary on Log Servers 1', 'Give both servers the same address on the network', 'Disable logging for reports on all allowed policies'],
    'The Firebox can send to two sets of log servers concurrently. Each tab has a primary and can have backups; another entry within the first tab is failover, not a parallel destination. Reordering changes the primary, duplicate addresses create a conflict, and disabling report logging removes data.'),
  question(2407, 'Logging & Monitoring', 'Attribute configuration changes', TRAINING_SOURCES.audit,
    'Several engineers use individual Device Administrator accounts. Dimension receives traffic logs, but the Audit Trail report is empty after a policy edit. Which logging setting should you check?',
    ['Log messages when the configuration changes', 'Send a log message for every permitted DNS query', 'Increase diagnostic logging for IPS signatures', 'Record only external interface bandwidth statistics'],
    'The Audit Trail report needs configuration-change log messages and the correct reporting time range. Individual administrator accounts make the recorded username meaningful. Traffic, IPS diagnostics, and bandwidth statistics answer different questions and do not substitute for configuration-change logging.'),
  question(2408, 'Network Services', 'Recognize dynamic port ranges',
    { title: 'IANA: Service Name and Transport Protocol Port Number Registry', url: 'https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml' },
    'A packet capture shows a client source port of 55000. Which IANA port range contains it?',
    ['Dynamic/private: 49152-65535', 'System/well-known: 0-1023', 'User/registered: 1024-49151', 'Reserved for HTTPS clients: 50000-60000'],
    'IANA defines 49152-65535 as dynamic/private ports. System ports occupy 0-1023 and user ports 1024-49151. There is no HTTPS-only range of 50000-60000. Operating systems can choose different ephemeral allocation ranges, so this question identifies the IANA classification rather than claiming every client allocates ports identically.'),
  question(2409, 'IP Addressing', 'Recognize Ethernet broadcast delivery',
    { title: 'RFC 894: A Standard for the Transmission of IP Datagrams over Ethernet Networks', url: 'https://www.rfc-editor.org/rfc/rfc894' },
    'An Ethernet frame has destination FF:FF:FF:FF:FF:FF. How should you classify that destination?',
    ['Broadcast within the local broadcast domain', 'Unicast to the router with the lowest IP address', 'Multicast to one specifically subscribed group', 'A routable Internet-wide broadcast destination'],
    'The all-ones Ethernet destination is a link-layer broadcast. It is not a unique router address or a selected multicast group, and routers do not forward the Ethernet broadcast frame across the Internet. VLAN boundaries constrain the broadcast domain.'),
  question(2410, 'Initial Setup', 'Understand feature-key synchronization', TRAINING_SOURCES.keySync,
    'Automatic feature-key synchronization is enabled. A licensed feature expires in five days. Which periodic behavior does the Firebox use to obtain a renewed key?',
    ['Check and attempt download every 12 hours', 'Download a new key after every allowed connection', 'Wait until an administrator replaces the appliance', 'Copy a key from any other Firebox of the same model'],
    'With synchronization enabled, expiration dates are checked immediately and every 12 hours. A feature expired or due to expire within seven days triggers periodic download attempts. Traffic does not trigger a download per connection, replacement is unnecessary, and a key belongs to its appliance serial number. Logs can explain failed synchronization attempts.'),
  question(2411, 'Policies', 'Distinguish portal and inspection certificates', help('User Authentication Steps', 'Fireware/authentication/authentication_user_process_c.html'),
    'Users trust the HTTPS inspection CA, but https://firebox.example.com:4100 still presents a web server certificate for the wrong hostname. What resolves this portal warning?',
    ['Install and select a trusted, matching server certificate', 'Install the same inspection CA again on every workstation', 'Enable more WebBlocker categories on the HTTPS action', 'Tell each user to disable all browser certificate checks'],
    'The Authentication Portal presents the Firebox web server certificate. It must be trusted, valid, and match the hostname used by clients. The Proxy Authority CA serves a different purpose: trusting certificates re-signed during HTTPS inspection. Reinstalling that CA cannot repair a hostname mismatch, and category changes do not change certificate identity.'),
  question(2412, 'Policies', 'Enforce authentication through matching policies', lab2026('Exercise 11, pp. 31-33: Authentication'),
    'Authentication redirect is enabled and group-specific HTTP policies exist, but unauthenticated users still browse through a broad Outgoing policy. What should be corrected?',
    ['Remove the broad unauthenticated web access', 'Rename the groups to match the browser product', 'Increase the authentication session timeout limit', 'Enable a second copy of the authentication portal'],
    'Redirect is not a substitute for access policy. Inspect the matching policy and remove or narrow any path that permits unauthenticated web traffic, while retaining explicitly required services. Group names, longer sessions, or another portal cannot make a broad allow policy require authentication.'),
  question(2413, 'Logging & Monitoring', 'Choose status evidence', lab2026('Exercise 14, pp. 39-41: Status Report'),
    'Support asks for the running process list, ARP entries, and current IPv4 routes from a Firebox. Which FSM view is the best starting point?',
    ['Status Report', 'Application Control action editor', 'Feature Key synchronization settings', 'Scheduled Reports delivery settings'],
    'The Status Report contains runtime evidence such as processes, ARP, DHCP leases, and routing information. The action editor is configuration, the feature key is licensing, and delivery settings schedule reports. Retrieve a support snapshot as well when a support case needs a broader diagnostic bundle.'),
  question(2414, 'Routing', 'Distinguish aggregation from bridging', TRAINING_SOURCES.aggregation,
    'A supported Firebox and switch combine several physical links into one logical connection. What is the purpose of link aggregation?',
    ['More aggregate capacity and link redundancy', 'A guaranteed multiplied speed for every TCP stream', 'Automatic encryption of all frames crossing the links', 'A new independent default gateway for each cable'],
    'Link aggregation combines physical interfaces into one logical interface for cumulative throughput and redundancy. Both ends must be configured compatibly. It does not guarantee that one flow uses all member links, provide encryption, or turn each cable into a separate gateway. A bridge joins segments; aggregation bundles links.'),
  question(2415, 'Proxies', 'Separate SMTP content and address controls',
    help('About the SMTP-Proxy', 'Fireware/proxies/smtp/proxy_smtp_about_c.html'),
    'A company wants to reject selected attachment types while continuing to receive other mail from the same sender. Which control matches that requirement?',
    ['SMTP proxy content-type or filename rules', 'A permanent blocked-site entry for the mail server', 'A deny policy covering every TCP 25 connection', 'A route that redirects the sender to a dead gateway'],
    'SMTP proxy rules can inspect attachment MIME types and filename patterns. Blocking the upstream mail server or its entire SMTP connection affects unrelated messages; changing a route is not a content decision. Mail From and Rcpt To address rules are useful for sender and recipient restrictions, not identifying attachment types.'),
  question(2416, 'Logging & Monitoring', 'Capture the tested interface', lab2026('Exercise 14, p. 39: Diagnostic Tasks'),
    'You run a diagnostic ping with -I eth0 9.9.9.9 -c3, but capture only eth3 and see nothing. What is the best next diagnostic change?',
    ['Capture ICMP to that host on eth0', 'Conclude that the DNS server must be offline', 'Change the BOVPN Phase 2 encryption proposal', 'Disable the firewall before repeating the capture'],
    'The ping is explicitly sourced through eth0. Capture the tested interface with a host and ICMP filter, start the capture before the probe, and stop it afterward. An empty capture on another interface does not prove remote failure. BOVPN proposals are unrelated to this direct test, and disabling the firewall destroys useful test conditions.'),
  question(2417, 'BOVPN', 'Withdraw failed virtual-interface routes', lab2026('Exercise 13, pp. 36-38: BOVPN and backup routing'),
    'A route through a BOVPN virtual interface has distance 1; a route to the same prefix over MPLS has distance 2. The VPN is down, but its route remains installed. Which VPN setting enables the backup route to take over?',
    ['Remove VPN routes when the tunnel is down', 'Raise the MPLS route distance from 2 to 200', 'Rename the backup route to sort before the VPN', 'Change the Phase 2 lifetime to one minute'],
    'For the same destination prefix, the lower-distance route is preferred. Removing the unavailable BOVPN virtual-interface route lets the remaining MPLS route be selected. Increasing the backup distance does not withdraw the failed route, names do not select routes, and rekey timing does not implement route withdrawal. Verify the installed routes and actual traffic path.'),
  question(2418, 'NAT', 'Verify source NAT rule precedence', lab2026('Exercise 4, pp. 14-16: Dynamic NAT network rules'),
    'A server-specific dynamic NAT rule should use 203.0.113.11, but a broader matching rule above it uses 203.0.113.10. New outbound connections still show src_ip_nat="203.0.113.10". There is no policy NAT override. What should you change?',
    ['Move the server-specific rule above the broad rule', 'Change only the inbound static NAT destination host', 'Add the translated public IP to the DHCP address pool', 'Replace the server\'s subnet mask with a public prefix'],
    'Dynamic NAT network rules are evaluated in order, so the specific rule must precede the general match. Confirm new connections and the src_ip_nat field after saving. Inbound SNAT maps a destination and does not choose the source address of independent outbound connections. DHCP and an incorrect host mask cannot fix rule precedence.'),
  question(2419, 'Proxies', 'Order rules within a proxy action', lab2026('Exercise 9, pp. 26-28: HTTP proxy content rules'),
    'A new MIME-type deny rule for macro-enabled documents sits below an All Application Types rule that already matches those responses. What should you review first?',
    ['Place the specific deny rule before the broad match', 'Rename the firewall policy without changing its action', 'Add the MIME type as an IP address in the To list', 'Move the entire HTTP policy below a broad allow policy'],
    'Within this proxy ruleset, the specific MIME deny must be evaluated before the broader application-type match. This is ordering inside the proxy action, not the firewall policy list. Renaming does not change evaluation, MIME types are not destination IP addresses, and moving the firewall policy does not fix its internal rule order.'),
  question(2420, 'Proxies', 'Keep group proxy actions independent', lab2026('Exercise 11, pp. 31-33: Separate group policies'),
    'Students and teachers have separate HTTPS policies but share the same HTTP inspection action. Only teachers need WebSockets allowed. How do you keep the change scoped?',
    ['Clone the HTTP action for the teachers\' inspection path', 'Edit the shared action and rename only the teacher policy', 'Disable HTTPS inspection on all student and teacher policies', 'Add all students to the teacher authentication group'],
    'A shared action is shared configuration: editing it changes every policy that uses it. Clone the relevant action, enable WebSockets there, and ensure the teachers\' HTTPS inspection path uses that clone. A different policy name does not isolate the action, disabling inspection removes protection, and changing group membership changes authorization.'),
  question(2421, 'Proxies', 'Recognize intentional inspection bypass', lab2026('Exercise 10, pp. 29-30: Content inspection exceptions'),
    'A site excluded from HTTPS content inspection presents its original public CA certificate. An inspected test site presents a certificate signed by the Firebox Proxy Authority. What does this difference suggest?',
    ['The sites are following different inspection paths', 'The bypassed site has proven that every download is safe', 'The Proxy Authority certificate must be expired everywhere', 'The HTTP inspection action is scanning both encrypted bodies'],
    'An inspection bypass leaves the original TLS certificate visible; inspection normally substitutes a certificate signed by the trusted Proxy Authority. Confirm this against the configured exceptions and logs. Bypass does not establish safety or allow the HTTP proxy to inspect encrypted content, and one site\'s original certificate does not prove a CA expiration.'),
  question(2422, 'Mobile VPN', 'Limit authenticated IKEv2 users', lab2026('Exercise 12, pp. 34-35: IKEv2 policy restrictions'),
    'IKEv2 users authenticate successfully but should reach only a support server plus approved DNS and NTP services. The default Allow IKEv2-Users policy still permits broad access. What implements the requirement?',
    ['Replace broad access with scoped VPN-group policies', 'Change only the VPN profile display name on the client', 'Give every VPN user a Device Administrator account', 'Change the VPN pool while leaving all policies unchanged'],
    'Authentication establishes identity; policies decide what that identity can reach. Disable the broad default policy and allow only the required destinations and services from the VPN group, checking for other broad matches. Profile names are cosmetic, administrator roles grant device management access, and a different pool alone does not restrict policy authorization.'),
  question(2423, 'Initial Setup', 'Choose a configuration report', TRAINING_SOURCES.configReport,
    'A reviewer needs a printable overview of a locally managed Firebox\'s policies, interfaces, and VPN settings. Which Fireware Web UI feature provides it?',
    ['Firebox Configuration Report', 'A packet capture from Diagnostic Tasks', 'The live Traffic Monitor connection log', 'A subscription expiration notification'],
    'System > Configuration File provides the Firebox Configuration Report, a readable configuration summary that can be printed. A packet capture and Traffic Monitor describe observed traffic; expiration notifications describe licensing. The report is useful for review but is not a restorable configuration backup.'),
];

/** Apply narrow corrections in place: saved IDs and authored flashcard identities remain stable. */
export function applyTrainingRevisions(questions: Question[]): void {
  for (const q of questions) {
    if (q.id === 29) {
      q.question = 'A Link Monitor target is configured as a Ping probe. Which protocol does that probe use?';
      q.options = ['ICMP echo request/reply', 'TCP SYN to a selected port', 'UDP queries to a DNS server', 'HTTPS requests to a web server'];
      q.correctAnswer = q.options[0]; q.correctAnswers = [q.options[0]];
      q.explanation = 'A Ping probe uses ICMP. Link Monitor also supports separately configured TCP and DNS probes; do not confuse the probe types. A failed DNS probe can mark an otherwise linked interface unavailable, so review the configured target and response rather than assuming every failure is a cable fault.';
      q.sources = [lab2026('Exercise 3, pp. 12-13: Link Monitor DNS probes')];
    }
    if (q.id === 40) q.question = 'On a factory-default Firebox T40, which physical interface is the default Trusted interface?';
    if (q.id === 49) {
      q.question = 'Which default policy permits outbound TCP and UDP connections from trusted and optional networks to external networks?';
      q.explanation = 'The default Outgoing policy permits TCP and UDP traffic from Any-Trusted and Any-Optional to Any-External. It is not an all-protocol policy: ICMP and other protocols require their own matching policies. Review traffic before replacing this broad TCP/UDP access with specific policies.';
      q.sources = [lab2026('Exercise 7, pp. 21-23: Review and disable the Outgoing policy')];
    }
    if (q.id === 51) {
      q.question = 'What does Fireware dynamic NAT do for a private host\'s outbound Internet connection?';
      q.explanation = 'Dynamic NAT translates the source address of outbound traffic and tracks the connection for replies. In WatchGuard terminology, SNAT means static NAT, commonly used for inbound destination mapping; do not expand that label as source NAT or confuse dynamic NAT with destination NAT.';
      q.sources = [lab2026('Exercise 4, pp. 14-16: Static and dynamic NAT')];
    }
    if (q.id === 68) {
      q.question = 'No other policy allows FTP. You want authenticated Marketing-Group users to reach external FTP servers while other groups remain denied. Which policy source implements that restriction?';
      q.options = ['Marketing-Group as the source', 'Any-Trusted as the policy source', 'Any-Optional as the policy source', 'Any-External as the policy source'];
      q.correctAnswer = q.options[0]; q.correctAnswers = [q.options[0]];
      q.explanation = 'Use the authenticated group in the From list and the required external destinations in To. The stated absence of another allow policy matters: a broad Outgoing policy could otherwise permit the excluded users. Merely placing a group-specific allow above Outgoing does not create a deny for everyone else.';
      q.sources = [lab2026('Exercise 11, pp. 31-33: Group policies and broad-policy bypass')];
    }
    if (q.id === 71) {
      q.question = 'Which HTTP-proxy category recognizes a downloaded file from its body signature rather than trusting its filename extension?';
      q.explanation = 'HTTP Response > Body Content Types matches the beginning of the file body. It is distinct from Content Types, which examines the MIME label, and from filename matching in protocols such as FTP. A renamed executable can still have an executable body signature.';
      q.sources = [lab2026('Exercise 9, pp. 26-28: MIME types and body signatures')];
    }
    if (q.id === 77) q.question = 'In Manual-Order mode, an enabled deny policy for HTTP from 10.0.1.25 to Any-External is above an enabled allow for HTTP from Any-Trusted to Any-External. Which applies to a new matching connection from 10.0.1.25?';
    if (q.id === 1011) {
      q.explanation += ' Automatic feature-key synchronization checks expiration every 12 hours and attempts to download an updated key when a feature is expired or within seven days of expiration. Review synchronization errors instead of assuming renewal was already applied.';
      q.sources = [...(q.sources ?? []), TRAINING_SOURCES.keySync];
    }
    if (q.id === 1083) {
      q.question = 'Both WAN interfaces rely on one Link Monitor target. Why should you avoid making that one target your only reachability test?';
      q.explanation = 'A target outage can make both working links appear unavailable. Use suitable redundant targets and review the configured failure criteria. The 2026 lab uses a shared set of multiple DNS targets; the important distinction is avoiding one shared point of failure, not claiming that interfaces can never share a target.';
      q.sources = [lab2026('Exercise 3, pp. 12-13: Redundant DNS targets')];
    }
    if (q.id === 1105) {
      q.explanation += ' With tunnel-route 1-to-1 NAT, the peer must use the translated network as its remote selector. Reading only the local pre-translation subnet from a screenshot can produce the wrong remote route.';
    }
    if (q.id === 1147) {
      q.explanation += ' Creating or editing the Global action alone does not enable Application Control on policies. Each matching policy must enable the service and use the intended action.';
      q.sources = [...(q.sources ?? []), TRAINING_SOURCES.appControl];
    }
  }
}
