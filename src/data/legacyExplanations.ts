import type { Question } from './questions';
import type { Track } from '../engine/types';

/**
 * The original question bank (ids 1-127 and the Phase 2 additions 201-310) shipped without
 * explanations, and a number of its questions were filed under a topic or a track that did not
 * match what they actually test. Every entry below supplies the missing explanation and, where the
 * original tagging was wrong, the corrected topic or track.
 *
 * Explanations state why the keyed answer is right and, wherever an option was genuinely tempting,
 * why the strongest distractor is wrong. That second half is the point: a learner who picked the
 * distractor needs to know what distinguishes it, not a restatement of the answer.
 *
 * Track matters for study filtering. Legacy questions carried no track at all, so every one of them
 * defaulted to the Local Firebox track - including the general networking questions (subnetting,
 * OSPF, VLANs, DHCP, 802.1X) that belong in the Network+ track.
 */
export interface LegacyRevision {
  explanation: string;
  topic?: Question['topic'];
  track?: Track;
}

export const legacyRevisions: Record<number, LegacyRevision> = {
  1: {
    topic: 'IP Addressing', track: 'network-plus',
    explanation: 'Classful addressing gave Class B networks a 16-bit network portion, so the default mask is /16 (255.255.0.0). /8 is the Class A default and /24 is the Class C default. Classful defaults matter only for exam vocabulary; real designs use CIDR and subnet to whatever prefix the host count requires.',
  },
  2: {
    explanation: 'The WatchGuard Authentication policy allows user connections to the Firebox Authentication Portal on TCP 4100, where network users log in to satisfy user- or group-based policies. The tempting distractor is management access to Fireware Web UI - that runs over the WatchGuard Web UI policy on TCP 8080, and management accounts are a separate concept from network-user authentication.',
  },
  3: {
    explanation: 'The default Outgoing policy is a packet filter that allows all TCP and UDP traffic from Any-Trusted and Any-Optional to Any-External, so HTTPS from the trusted network is permitted regardless of which group the user belongs to. The distractors assume a group restriction that the default configuration does not contain: no default policy is scoped to Sales or Accounting.',
  },
  4: {
    explanation: 'False. Dynamic NAT translates the source address of outbound connections; it has no mechanism to direct inbound connections to a particular internal host. Publishing two internal FTP servers to the Internet requires static NAT (SNAT), which rewrites the destination address and can map different public addresses or ports to different internal servers.',
  },
  5: {
    topic: 'Network Services', track: 'network-plus',
    explanation: 'Ordinary DNS queries and responses use UDP port 53. DNS also uses TCP 53 for zone transfers and for responses too large for a single datagram, so a policy that must cover every DNS case allows both; UDP 53 is the one to know for standard resolution. UDP 67 is DHCP and TCP 25 is SMTP.',
  },
  6: {
    explanation: 'Static NAT publishes an internal server: external clients connect to the public address 203.0.113.80, and the Firebox rewrites the destination to 10.0.20.80 before delivering the packet. The key word is "public" - external clients never use, and cannot route to, the private address, which is what the two distractors that mention the private IP get wrong.',
  },
  7: {
    explanation: 'Perfect Forward Secrecy is a Phase 2 setting, and the log message names phase two explicitly, so the fix belongs in the BOVPN Tunnel settings where Phase 2 proposals live. BOVPN Gateway settings hold the Phase 1 configuration - pre-shared key, Phase 1 encryption and authentication, and DH group - and changing them will not resolve a Phase 2 PFS mismatch.',
  },
  8: {
    explanation: 'Both valid routes point at 192.168.10.5, which is the next hop the Firebox can actually reach on its directly connected 192.168.10.0/24 network. You can write the route as the whole remote network (10.0.20.0/24) or as a host route to the single server (10.0.20.80/32); longest-prefix matching means the host route wins if both exist. The gateway 10.0.2.1 is not reachable on any connected interface, and routing to 192.168.10.5 via 192.168.10.1 points away from the router that owns the path.',
  },
  9: {
    explanation: 'True. The TCP-UDP proxy detects HTTP, HTTPS, FTP and SIP traffic on non-standard ports and hands the connection to the matching protocol proxy, which is exactly why it exists. It is the answer whenever a service has been moved off its well-known port but you still want application-layer inspection.',
  },
  10: {
    explanation: 'Firebox-DB and RADIUS are the two authentication server types every Mobile VPN type can use, which is why they are the safe answer when the question says "every type". Active Directory and LDAP are supported by most Mobile VPN types - and are perfectly valid choices in a real deployment - but not by all of them, so they fail the "every type" test the stem sets.',
  },
  11: {
    explanation: 'A factory-default Firebox serves DHCP on Interface 1, the Trusted interface, at 10.0.1.1/24, so that is where the management computer connects for the Quick Setup Wizard. Interface 0 is External and is configured to obtain an address rather than hand one out; the console port gives serial CLI access, not the browser-based wizard.',
  },
  12: {
    explanation: 'The WatchGuard policy allows WatchGuard System Manager management traffic (including TCP 4117 and the CLI on 4118), and the WatchGuard Web UI policy allows browser management on TCP 8080. Those two govern who can manage the device. Ping and FTP are ordinary service policies, and Outgoing governs user traffic leaving the network, not administration of the Firebox.',
  },
  13: {
    explanation: 'The factory-default Trusted interface is 10.0.1.1/24, so the management computer must hold an address on 10.0.1.0/24 - normally obtained automatically from the Firebox DHCP server. If the laptop shows a 169.254.x.x link-local address it never got a lease, and the wizard will not be reachable.',
  },
  14: {
    explanation: 'A backup image is the full recovery artifact: configuration, certificates, passwords and feature keys travel with it. What it does not include is the Fireware OS image itself when saved to the Firebox in 12.2.1 and later, which is why restoring onto a device running a different Fireware version needs care - and why log files, which live on a log server rather than in device configuration, are also absent.',
  },
  15: {
    explanation: 'False. The default Outgoing policy allows TCP and UDP from Any-Trusted AND Any-Optional to Any-External, so optional-interface hosts do reach the Internet out of the box. What optional interfaces do not get by default is any inbound policy from External, and traffic between Optional and Trusted is not automatically permitted either.',
  },
  16: {
    explanation: '"Unhandled Internal Packet" means no configured policy matched the connection, so the Firebox applied its implicit final deny. That is a different cause from a Blocked Sites hit or an IPS signature match, both of which name the feature that blocked them in the log. The fix is to identify the source, destination, protocol, port and interface from the log entry and decide whether a narrowly scoped policy should allow it.',
  },
  17: {
    explanation: 'Three paths add a blocked site: auto-blocking on a deny policy (which adds the source when it trips the rule), an on-demand add from the Firebox System Manager Blocked Sites tab, and a configured entry under Default Threat Protection > Blocked Sites. The Blocked Sites Exceptions list does the opposite - it protects an address from ever being blocked - and a WebBlocker deny stops a web request without adding the host to the blocked sites list.',
  },
  18: {
    explanation: 'Default packet handling is baseline firewall protection that needs no subscription: it handles denial-of-service and flood attacks, port scans, and IP spoofing (a packet whose source does not belong to the network it arrived on). Blocking inappropriate websites is WebBlocker and blocking malware in downloads is Gateway AntiVirus, and both of those are licensed subscription services rather than default packet handling.',
  },
  19: {
    explanation: 'Browsing needs name resolution as well as transport, so you need DNS on port 53 alongside HTTP on 80 and HTTPS on 443. DNS is the one people forget, and without it every site fails even though the web policies are correct. FTP is not required for ordinary browsing, and NAT is a configuration setting rather than a policy you add.',
  },
  20: {
    explanation: 'A proxy parses the application protocol, so it can strip one offending attachment or block one URL while letting the rest of the session continue - a packet filter can only permit or deny the whole connection. Both policy types evaluate the IP and transport headers, which is why the options claiming that only a proxy examines IP headers or ports are wrong; and either type can be applied to a non-standard port.',
  },
  21: {
    explanation: 'Active Directory and LDAP are directory services, so the Firebox needs a search base (and a search string) telling it where in the directory tree to look for user objects. RADIUS and SecurID are not directory protocols - they take a username and credential and return accept or reject - so there is no tree to search and no search base to configure.',
  },
  22: {
    explanation: 'An FQDN of *.example.com matches every subdomain regardless of which CDN address it resolves to at the moment, which is exactly the problem a dynamic update service creates. A single host name covers only update.example.com, and any list of IP addresses will be wrong the next time the CDN changes, so it needs constant maintenance.',
  },
  23: {
    explanation: 'A WebBlocker exception is evaluated before the category filters, so an exception wins over a category match in either direction: an allow exception lets a URL through even though its category is denied, and a deny exception blocks a URL inside an allowed category. That ordering is what makes exceptions the right tool for a single miscategorized site.',
  },
  24: {
    explanation: 'Two settings are needed and both are indispensable. Content inspection decrypts the TLS session, without which the Firebox sees only ciphertext; Data Loss Prevention is the engine that recognises credit card patterns in the decrypted content. Gateway AntiVirus and Application Control also run inside the proxy but neither matches sensitive-data patterns, and WebBlocker filters by URL category rather than by content.',
  },
  25: {
    explanation: 'IKEv2 negotiates over UDP 500 and moves to UDP 4500 when NAT traversal is detected, so both must be open end to end. TCP 443 is Mobile VPN with SSL, UDP 1194 is the OpenVPN default port, and TCP 1723 with GRE is legacy PPTP.',
  },
  26: {
    explanation: 'Executables arrive in the server response, so the control is HTTP Response > Body Content Types, which matches on content type and file signature rather than on the visible file name. Request Methods governs verbs like GET and POST, and WebBlocker categorises destinations rather than inspecting what is being downloaded.',
  },
  27: {
    explanation: 'Phase 1 authenticates the peers and builds the IKE SA, so a mismatched pre-shared key or mismatched Phase 1 encryption proposals both break it. The two distractors are real misconfigurations but they are Phase 2 concerns - PFS and tunnel route (selector) subnets are negotiated after Phase 1 has already succeeded, so neither can be the cause of a Phase 1 failure.',
  },
  28: {
    explanation: 'Spillover sends all traffic over the primary interface until it crosses a configured bandwidth threshold, and only then starts using the next interface - so it is the method keyed to utilisation. Round-robin distributes new connections across interfaces continuously (optionally by weight) without reference to how loaded a link is, and failover uses a backup interface only when the primary goes down.',
  },
  29: {
    explanation: 'Link Monitor probes a target with ICMP ping or a TCP port probe, and marks the interface down when the probe stops responding. Choosing a target that is genuinely representative matters: a probe to the ISP gateway can keep succeeding while the path beyond it is broken. RIP and BGP are routing protocols, not link tests.',
  },
  30: {
    topic: 'Proxies',
    explanation: 'When certificate validation rejects the server certificate, the Firebox does not complete the inspected session; it blocks the connection and returns a certificate warning page so the user sees why. The behaviour is configurable per proxy action, so treat the exact disposition as something to verify in your own configuration rather than assume - what is stable is that a rejected certificate stops the connection instead of silently passing it.',
  },
  31: {
    explanation: 'The WebBlocker configuration includes a server connection error action that decides what happens when the cloud lookup is unavailable - allow or deny - so the result depends on how that action is set. That is the point of the question: neither fail-open nor fail-closed is universal, and an administrator who has not set that action deliberately does not know which one their users will get.',
  },
  32: {
    explanation: 'Mobile VPN with SSL ships with the virtual IP pool 192.168.113.0/24. Knowing the default matters mostly so you can change it: if a remote user is sitting on a home network that also uses 192.168.113.0/24, their traffic never reaches the tunnel, which is the classic cause of a connected client that cannot reach anything.',
  },
  33: {
    explanation: 'Policy Manager opens and edits a saved XML configuration file with no device attached, then saves to the Firebox as a separate, explicit step. That separation is the thing to remember: editing a local file changes nothing on the appliance until you save to the device. Fireware Web UI and Firebox System Manager both require a live connection.',
  },
  34: {
    explanation: 'True. IPS matches traffic against a signature set describing known vulnerabilities and exploit patterns, so it depends on current signature updates and an active subscription. It complements, rather than replaces, the behavioural analysis in APT Blocker, which catches threats no signature has been written for yet.',
  },
  35: {
    explanation: 'APT Blocker and Data Loss Prevention both sit behind the Gateway AntiVirus scanner in the proxy pipeline: GAV has to extract and pass the content before either can examine it, so both require GAV configured and active. IPS inspects network traffic in its own engine, and WebBlocker decides on the URL before any content is scanned, so neither has that dependency.',
  },
  36: {
    explanation: 'BOVPN failover rides on Multi-WAN: Link Monitor decides an external interface is down, Multi-WAN moves to the surviving interface, and the tunnel renegotiates from the new gateway address. This is why a BOVPN gateway can list more than one gateway pair. Pings inside a tunnel test the tunnel, not the link that carries it, and dynamic routing convergence is a separate mechanism.',
  },
  37: {
    explanation: 'Firebox System Manager is the live-status application: Traffic Monitor, Front Panel, subscription status and the diagnostic tools all live there. Policy Manager edits configuration, and the Log Server and Report Server are back-end services that store and process log data rather than display it in real time.',
  },
  38: {
    explanation: 'No. A 1-to-1 NAT mapping only defines the address translation; it creates no policies, so inbound traffic is still denied until you add a policy that permits it. Write that policy to the private address, because NAT is applied before the policy lookup for inbound connections - a policy written to the public address will not match.',
  },
  39: {
    explanation: 'The Firebox is an LDAP client to the domain controller, so it needs the server IP address, the domain name, and a search base that tells it where to look for user objects. It does not join the domain. A RADIUS shared secret belongs to a RADIUS server definition, which is a different authentication server type.',
  },
  40: {
    explanation: 'On a factory-default multi-port Firebox, Interface 1 (Eth1) is the Trusted interface at 10.0.1.1/24 and Interface 0 (Eth0) is External. Confirm against the model documentation before relying on it in the field, because interface counts and roles differ across models and a migrated configuration can remap them.',
  },
  41: {
    explanation: '1-to-1 NAT is bidirectional: the mapped host reaches the Internet as its dedicated public address, and traffic to that public address arrives at the host, all without per-port rules. Static NAT is the one-directional counterpart - it publishes an internal service on a public address and port for inbound connections only - and dynamic NAT is outbound-only many-to-one.',
  },
  42: {
    explanation: 'Multi-WAN exists for exactly this: when Link Monitor marks an interface down, the Firebox routes new traffic over the remaining active external interfaces. Existing connections bound to the failed interface still break, because their NAT state and source address are gone - failover protects continuity of service, not individual sessions.',
  },
  43: {
    explanation: 'The Warn action shows the user a warning page and lets them continue to the site if they choose, which is the behaviour the requirement describes. Allow passes silently with no acknowledgement, Deny gives no way through, and Bypass skips WebBlocker evaluation for that destination entirely.',
  },
  44: {
    explanation: 'In an active/active FireCluster, every member processes traffic and the cluster distributes connections among them, so you get both redundancy and additional throughput. In active/passive, the backup member holds configuration and state but passes no traffic until it takes over. Both modes need a dedicated cluster interface for state synchronisation.',
  },
  45: {
    explanation: 'DNSWatch intercepts DNS requests and blocks resolution of known malicious domains, which stops the connection before it is ever made - useful precisely because it works even for protocols the firewall cannot inspect. It is a security control, not a performance feature: caching for faster page loads and internal name records are ordinary DNS server functions.',
  },
  46: {
    explanation: 'Mobile VPN with SSL defaults to TCP 443, which is why it so often works from restrictive guest networks and hotel Wi-Fi that block IPSec. It is built on OpenVPN, whose own default is UDP 1194 - a configurable alternative on the Firebox but not the WatchGuard default.',
  },
  47: {
    explanation: 'Phase 1 covers peer authentication and the IKE SA, so the pre-shared key and the Phase 1 negotiation mode must match on both gateways. Tunnel route subnets and PFS are Phase 2 settings, and the virtual IP pool belongs to Mobile VPN and has nothing to do with a branch office VPN.',
  },
  48: {
    explanation: 'Firebox System Manager carries the diagnostic tool set - ping, traceroute, DNS lookup and TCP dump - and runs them from the Firebox itself. That origin matters when you interpret the result: a successful ping from the Firebox proves the Firebox has a path, not that a client behind a policy does, so always retest from the affected source.',
  },
  49: {
    explanation: 'The Outgoing policy is the default packet filter allowing TCP and UDP from Any-Trusted and Any-Optional to Any-External. The WatchGuard policy is management access to the device, not user traffic, and the other two options are not default policy names at all. Disabling Outgoing is a legitimate hardening step, but it means explicitly adding DNS, HTTP and HTTPS.',
  },
  50: {
    explanation: 'Content inspection means the Firebox terminates the TLS session and re-signs it, so clients must trust the Proxy Authority certificate that performs the signing - installed in the Trusted Root Certification Authorities store. Skip that deployment step and every inspected HTTPS site produces a certificate warning. The Web UI management certificate secures administration and is unrelated.',
  },
  51: {
    explanation: 'Dynamic NAT rewrites the source address of outbound packets from a private address to the external interface address, and tracks the connection so replies find their way back. Mapping inbound connections to internal servers by port is static NAT, and bidirectional subnet mapping is 1-to-1 NAT.',
  },
  52: {
    explanation: 'Round-robin assigns each new connection to the next interface in turn, and interface weights bias that distribution so a faster link takes proportionally more. Spillover is threshold-based rather than proportional - it does not touch the second link until the first is saturated - and failover uses only one link at a time.',
  },
  53: {
    explanation: 'A Firebox uses auto-order by default, ranking policies from most specific to least specific, so a single-host policy beats a subnet policy regardless of where either sits in the list. Switching to manual order hands that decision to you and the list order from top to bottom becomes what matters. Names, creation dates and port numbers never affect precedence.',
  },
  54: {
    explanation: 'The SMTP-proxy and the IMAP-proxy are the mail proxies that can apply spamBlocker and Gateway AntiVirus (the POP3-proxy can too, but it is not offered here). The HTTP-proxy can scan webmail content but has no view of SMTP or IMAP sessions, and the TCP-UDP proxy only redirects traffic to a protocol proxy rather than scanning mail itself.',
  },
  55: {
    explanation: 'APT Blocker uploads suspicious files to a cloud sandbox and executes them under full-system emulation, watching for malicious behaviour rather than matching a signature - which is how it catches malware no signature exists for. Gateway AntiVirus is signature-based, and IntelligentAV uses a machine-learning model on the device; neither detonates the file.',
  },
  56: {
    explanation: 'Mobile VPN with IKEv2 authenticates users against Firebox-DB, RADIUS, or Active Directory and LDAP. SecurID is the distractor worth understanding: you can absolutely use SecurID tokens with IKEv2, but you do so through a RADIUS server, so it is not a separate authentication database the Firebox talks to directly.',
  },
  57: {
    explanation: 'IKEv2 is the current recommendation for new gateways: fewer round trips to establish, built-in dead peer detection and NAT traversal, and MOBIKE so a client can change networks without rebuilding the tunnel. IKEv1 remains supported for interoperability with older peers. There is no IKEv3, and L2TP is not an IKE version.',
  },
  58: {
    explanation: 'Traffic Monitor in Firebox System Manager shows log messages as they are generated and can be filtered by client IP address, which is what "in real time" calls for. Status Report gives counters and device state rather than per-connection records, and the Log Server stores messages for historical reporting instead of streaming them.',
  },
  59: {
    explanation: 'No. A backup image is tied to the device it came from and can be restored only to the same Firebox or an identical model, because it carries model-specific state and the original feature key. For a different model, migrate the XML configuration instead - and expect to remap interfaces, since interface counts and roles differ between models.',
  },
  60: {
    explanation: 'NAT loopback is what lets a client on a Trusted or Optional network reach an internal server by its public address, so internal and external users can use one DNS name. The SNAT rule publishing the server has to exist first - loopback extends it to internal sources rather than replacing it, which is why static NAT alone is not the answer.',
  },
  61: {
    explanation: 'Allowing unrecognised certificate authorities does not make the session trusted end to end. The Firebox completes the connection but re-signs it to the client with a certificate the client has no reason to trust, so the browser warns. Content inspection still happens, which is what separates this from a bypass, and TLS is never removed from the client leg.',
  },
  62: {
    explanation: 'An Optional interface is a fully routed interface: it passes traffic, it is included in the default Outgoing policy alongside Trusted, and it has no inbound policies from External by default. Traffic between Optional and Trusted is not automatically permitted either - that is the separation an Optional zone exists to provide for DMZ hosts and guest networks.',
  },
  63: {
    explanation: 'Reputation Enabled Defense scores the destination URL from a cloud reputation service, so a destination with a solidly good or bad reputation can skip full scanning and cut latency. It reasons about where the traffic is going. Contrast APT Blocker, which decides by running the file, and WebBlocker, which decides by content category rather than reputation.',
  },
  64: {
    explanation: 'Both keyed causes fit a tunnel that comes up but carries nothing. If the virtual IP pool overlaps the subnet the client is sitting on, the client routes VPN-destined traffic to its own LAN, and if no policy allows the SSL-VPN group to reach Any-Trusted, the Firebox denies the traffic after the tunnel is established. A missing client certificate would prevent the tunnel from connecting at all, and the virtual IP always comes from the VPN pool rather than an interface DHCP scope.',
  },
  65: {
    explanation: 'PFS forces a fresh Diffie-Hellman exchange at every Phase 2 rekey, so each IPSec SA gets key material not derived from the Phase 1 secret. The payoff is containment: compromising one key does not retroactively expose traffic protected by earlier or later SAs. It costs CPU at rekey time and must be enabled on both peers with the same DH group or Phase 2 fails.',
  },
  66: {
    explanation: 'System Status > Routes shows the active routing table, including connected, static and dynamically learned routes, so it is where you confirm which route a destination actually matches. The Front Panel dashboard summarises device health, and the Policies page shows what is permitted rather than where a packet will be sent.',
  },
  67: {
    explanation: 'The factory-default Web UI is reached at https://10.0.1.1:8080 - HTTPS, on the Trusted interface address, on port 8080. Plain HTTP on port 80 is not offered, and 4100 is the Authentication Portal for network users rather than an administration endpoint.',
  },
  68: {
    explanation: 'Scope the FTP policy to the Marketing group as its source and place it above the broad Outgoing policy so it is evaluated first - in auto-order the group-scoped policy is already the more specific match. The Firebox has no concept of an exception within a policy, and disabling Outgoing to solve one FTP requirement breaks every other outbound service.',
  },
  69: {
    explanation: 'Static NAT maps a public address and port to an internal address, so one public IP can publish many services: 203.0.113.80:80 to the web server and 203.0.113.80:25 to the mail server on different private hosts. 1-to-1 NAT maps whole addresses and so would need a second public IP, and dynamic NAT handles only outbound traffic.',
  },
  70: {
    explanation: 'A factory-default Firebox uses 10.0.1.1/24 on Interface 1 (Trusted) and runs a DHCP server on that subnet, which is how the setup laptop gets an address. Changing this subnet during setup is normal - just be sure the management workstation can still reach the new management address before you apply the change.',
  },
  71: {
    explanation: 'Body Content Types inspects the response body and matches on content type and file signature, so it catches an archive even when the file name has been changed to disguise it. Filtering by the visible extension alone is easy to evade, which is why the HTTP proxy identifies content rather than trusting the name.',
  },
  72: {
    explanation: 'IntelligentAV runs a machine-learning model on the Firebox to classify files as malicious or benign, so it can flag malware it has never seen without waiting for a daily signature update. Gateway AntiVirus is the signature-based scanner it supplements, and APT Blocker detonates files in a cloud sandbox rather than scoring them with a local model.',
  },
  73: {
    explanation: 'IKEv2 clients are built into current Windows, macOS and iOS, so users configure a native VPN profile with no software to install - the reason it is the usual choice for managed devices. Mobile VPN with SSL needs the WatchGuard client (or an OpenVPN client), and the legacy IPSec client is a separate install too.',
  },
  74: {
    explanation: 'SA lifetime is a Phase 2 parameter, and the message names phase two, so adjust the Phase 2 tunnel expiration in time or kilobytes to match the peer. Everything the distractors offer - pre-shared key, Phase 1 DH group, PFS in gateway settings - lives in Phase 1 and cannot resolve a Phase 2 lifetime mismatch.',
  },
  75: {
    explanation: 'The Dimension Server database stores the log data that historical reports are built from, which is why a report can be empty even when the Firebox is reaching Dimension: logging has to be enabled on the policies, the messages have to arrive, and the report has to cover the right device and time range.',
  },
  76: {
    explanation: 'Holding the Reset button down while powering on returns the Firebox to factory-default settings, including the default Trusted address and passphrases, after which you run the setup wizard again. It is genuinely destructive - the running configuration is gone - so treat a current backup image as a prerequisite. Removing a feature key or changing an interface address does not clear an unknown passphrase.',
  },
  77: {
    explanation: 'The host-specific deny policy applies. In manual order it wins because it sits higher in the list; in auto-order it wins because a single host is more specific than Any-Trusted. Both mechanisms agree here, which is why this ordering is the standard way to carve one exception out of a broad allow.',
  },
  78: {
    explanation: '1-to-1 NAT is bidirectional, so outbound traffic from the mapped host is translated to its dedicated public address in the range rather than to the external interface primary address. That is what makes it the right choice for a server that must present a consistent, predictable public identity for outbound connections - an SMTP server, for example, where the receiving side checks the sending address.',
  },
  79: {
    explanation: 'With no usable external interface there is no route to the Internet, so the Firebox drops the traffic unless a configured backup path exists. SD-WAN chooses among working links by measured quality; it cannot manufacture a path when every link is down. The cluster synchronisation interface carries state between members and never carries user traffic.',
  },
  80: {
    explanation: 'The TCP-UDP proxy handles TCP or UDP traffic that no protocol-specific proxy covers, and hands off HTTP, HTTPS, FTP and SIP to their own proxies when it detects them on non-standard ports. Note what it does not do: there is no SSH or RDP parser in Fireware, so for those protocols it provides connection-level control, not command-level inspection.',
  },
  81: {
    explanation: 'Application Control identifies applications by their traffic signature, so it blocks a streaming service regardless of which domain or port it uses that day. WebBlocker works from URL categories and is defeated as soon as the application moves to a new domain, and APT Blocker analyses files rather than classifying applications.',
  },
  82: {
    explanation: 'The pool must not overlap any internal, routed or remote VPN subnet, because the client resolves overlapping destinations to its own local network and the traffic never enters the tunnel. This is the most common reason a "connected" SSL VPN client reaches nothing, and it is why the 192.168.113.0/24 default is worth changing if your sites use common home-router ranges.',
  },
  83: {
    explanation: 'In a policy-based BOVPN, firewall policies with the tunnel as their action or destination decide what traffic uses the VPN - so you control the tunnel with the same policy model as everything else. A virtual interface BOVPN is the alternative: it presents the tunnel as a routable interface, so static or dynamic routing decides instead.',
  },
  84: {
    explanation: 'Historical reporting requires log messages to have been sent to and retained by a log server - WatchGuard Dimension, a WatchGuard Log Server, or WatchGuard Cloud - and it requires logging to be enabled on the policies that carried the traffic. Traffic Monitor is a live view, so anything that scrolled past before the question was asked is gone. Permitting traffic and logging it are separate settings, which is why a policy can work perfectly and still appear nowhere in a report.',
  },
  85: {
    explanation: 'The feature key records which features a specific device is licensed for and when they expire, so subscription services stay inactive until the current key is imported or synchronised. Feature keys are bound to a device serial number, so one Firebox key is never a substitute for another.',
  },
  86: {
    explanation: 'Yes. An alias can contain IP addresses, address ranges, FQDNs, interfaces, users and groups, and other aliases, so you can build one named object per role and reuse it across policies. The payoff is maintenance: when the membership changes you edit the alias once instead of hunting through every policy that referenced the raw address.',
  },
  87: {
    explanation: 'A SNAT action maps to a single internal IP address, or to a set of internal addresses with server load balancing across them. It is address-based: there is no domain-name destination, because the Firebox has to rewrite the packet header at forwarding time and cannot wait on a DNS lookup to do it.',
  },
  88: {
    explanation: 'SD-WAN measures latency, jitter and packet loss on each link and steers individual applications to the link that meets their configured thresholds. Multi-WAN spillover only reacts to bandwidth, and policy-based routing pins traffic to an interface without any regard to whether that interface is currently performing well.',
  },
  89: {
    explanation: 'WebBlocker exceptions match on an exact URL, a wildcard pattern, or a regular expression, so you can scope an exception as tightly or as broadly as the situation needs. The distractors describe things exceptions are not: they act on the URL in the request, not on DNS record mappings or IP subnet membership.',
  },
  90: {
    explanation: 'On the HTTP-proxy, Gateway AntiVirus can Allow the file, Block it (deny and add the source to the blocked sites list), or Drop it silently. What it never does is repair a file - there is no disinfect or re-encode action, because the proxy decides whether to deliver content rather than rewriting it. Other proxies add actions of their own: the SMTP-proxy also offers Lock and Quarantine.',
  },
  91: {
    explanation: 'Mobile VPN with SSL is built on OpenVPN, so its client profile is a .ovpn file bundled by the Firebox with the client installer. IKEv2 clients use a native OS VPN profile instead, which is why they need no WatchGuard software at all.',
  },
  92: {
    explanation: 'A virtual interface BOVPN presents the tunnel as a routable interface, so ordinary static or dynamic routing decides what crosses it and the tunnel can participate in failover and dynamic routing protocols. A policy-based BOVPN instead uses firewall policies and fixed tunnel routes. Both encrypt identically and both support IKEv2 - the difference is entirely in how traffic is selected.',
  },
  93: {
    explanation: 'Traffic Monitor streams log messages as the Firebox generates them, including interface link-state events, so it is where a flapping link shows up with timestamps you can correlate against user reports. The Interfaces status page shows the current state only - useful for what is true now, useless for what happened twenty minutes ago.',
  },
  94: {
    explanation: 'The default Trusted interface address is 10.0.1.1 with a /24 mask, and the Firebox serves DHCP on that subnet so a setup laptop can reach it. 192.168.x.x defaults belong to consumer routers, not to a factory-default Firebox.',
  },
  95: {
    explanation: 'The default Outgoing policy sends Any-Trusted and Any-Optional traffic to Any-External, so Any-External is the destination. The sources are Trusted and Optional - a distinction worth keeping straight, because confusing the source and destination aliases is what leads people to believe the default configuration permits inbound traffic.',
  },
  96: {
    explanation: 'NAT loopback lets internal clients connect to a locally hosted server using its public IP address, so one DNS name works from inside and outside the network. It depends on a SNAT rule already publishing that server, and the policy has to include the internal sources - an external-only source scope is the usual reason loopback appears not to work.',
  },
  97: {
    explanation: 'A TCP port probe opens a TCP connection to the configured port, so the target must actually accept that connection - a SYN with no response counts as a failure. That makes it a stronger test than ICMP when you want to know a service is alive, and a worse one if the host answers ping but the probed port is closed by policy.',
  },
  98: {
    explanation: 'Fireware has no SSH proxy, and a packet filter matches only addresses, protocol and ports, so nothing on the Firebox can tell an SFTP subsystem request apart from an interactive shell inside the same encrypted session. Enforce this on the SSH server itself, with the Firebox restricting who may reach TCP 22 at all. Restricting source addresses is worth doing, but it controls who connects, not what they do once connected.',
  },
  99: {
    explanation: 'spamBlocker classifies inbound messages as spam, bulk, suspect or not spam, and the SMTP-proxy applies a configured action to each verdict. Reputation Enabled Defense is the tempting alternative because it also uses cloud reputation, but it scores web destinations to tune scanning, not mail messages.',
  },
  100: {
    explanation: 'The cluster master pushes configuration and connection state to the backup over the dedicated cluster interface, so a failover preserves established sessions rather than merely restarting with the same rules. That dedicated interface is a requirement, not an optimisation - synchronisation never runs over the external interface.',
  },
  101: {
    explanation: 'BOVPN over TLS wraps tunnel traffic in TLS so it survives networks that block IPSec (UDP 500 and 4500) or ESP entirely - hotel, guest and some carrier networks. It is a site-to-site technology between Fireboxes, so no host software is involved, and it works on locally managed devices as well as cloud-managed ones.',
  },
  102: {
    explanation: 'A WebBlocker exception for the specific URL restores access to exactly that site and leaves every other category enforced - the smallest change that solves the problem. Disabling WebBlocker or setting all categories to Allow fixes one user request by removing protection for everyone, which is the trade the question is testing.',
  },
  103: {
    explanation: 'Auto-order sorts policies from most specific to least specific, so a single-host or single-port policy is evaluated before a broad one no matter where it appears in the list. If you need to control evaluation order yourself, switch to manual order - and then the top-to-bottom list position becomes what decides.',
  },
  104: {
    explanation: 'Application Control recognises applications by their traffic characteristics, so it can block BitTorrent or Skype even when they hop ports or tunnel over HTTPS. That signature-based identification is the difference from WebBlocker, which can only act on a URL category, and from IPS, which looks for exploit attempts rather than classifying the application.',
  },
  105: {
    explanation: 'Drop-in mode puts the same network on every interface, so the Firebox filters traffic without any host re-addressing - the reason to choose it is when renumbering the network is not an option. The cost is real: NAT, multi-WAN and several other routed features are limited or unavailable, so mixed routing is the right default for a new deployment.',
  },
  106: {
    explanation: 'AuthPoint offers push notification, QR code, and one-time password - from the mobile app or a hardware token - so those are the factors a user can present. SMS and voice calls are deliberately not offered: both are vulnerable to SIM-swap and interception, and WatchGuard does not implement them as AuthPoint methods.',
  },
  107: {
    explanation: 'ThreatSync correlates Firebox detections with WatchGuard Endpoint Security (EPDR) telemetry, which is what lets it act at the endpoint - isolating a host or killing a process - in response to something the network saw. AuthPoint handles identity and DNSWatchGO handles DNS filtering; neither supplies the endpoint detection data ThreatSync correlates.',
  },
  108: {
    topic: 'Switching & Wireless', track: 'network-plus',
    explanation: 'VLANs divide one physical switch into separate broadcast domains, so Accounting and Sales are isolated at Layer 2 and any traffic between them must pass through a router or firewall where policy can be applied. Spanning tree prevents switching loops and link aggregation combines links for bandwidth - neither creates separation.',
  },
  109: {
    explanation: 'Source and destination IP addresses are Layer 3 fields and source and destination ports are Layer 4 fields, so a packet filter matches at both layers. Layer 7 inspection is what a proxy policy adds, and Layer 2 MAC addresses are not part of a standard packet filter match.',
  },
  110: {
    topic: 'IP Addressing', track: 'network-plus',
    explanation: '/27 means 27 one bits: 255.255.255.224. The last octet of 224 leaves 5 host bits, so each subnet holds 32 addresses of which 30 are usable. 255.255.255.192 is /26 and 255.255.255.240 is /28, so miscounting by one bit doubles or halves the block.',
  },
  111: {
    explanation: 'A static MAC-to-IP reservation in the DHCP scope makes the Firebox hand the same address to that printer every time, while the device still gets its mask, gateway and DNS from DHCP. Simply excluding the address from the pool stops anyone else receiving it but gives the printer nothing, so it would then need manual static configuration.',
  },
  112: {
    topic: 'Network Services', track: 'network-plus',
    explanation: 'RDP listens on TCP 3389. It is a standing target for credential stuffing and ransomware entry, so it should never be published directly to the Internet - put it behind a VPN or a gateway with MFA. TCP 22 is SSH and UDP 500 is IKE.',
  },
  113: {
    explanation: 'The pool must not overlap any routed internal network or remote VPN subnet, or the client sends that traffic to its own LAN instead of into the tunnel. It does not need to be public - it is a private range used only inside the VPN - and it must not match the Trusted subnet, which would make every internal destination ambiguous.',
  },
  114: {
    topic: 'Routing', track: 'network-plus',
    explanation: 'OSPF is a link-state protocol that sums the cost of each link along a path, with cost derived from bandwidth by default, so a fast multi-hop path can beat a slow single hop. Hop count is what RIP uses, and that difference is precisely why OSPF makes better decisions on networks with mixed link speeds.',
  },
  115: {
    topic: 'Switching & Wireless', track: 'network-plus',
    explanation: 'An access port carries one VLAN untagged to an end device; a trunk port carries several VLANs with 802.1Q tags to another switch, router or firewall. Getting this backwards is the classic cause of a link that shows up physically while no VLAN traffic passes - both ends have to agree which VLANs are tagged.',
  },
  116: {
    explanation: 'Gateway AntiVirus cannot open a password-encrypted archive, and it stops at the configured scan size limit, so both leave the file unscanned - which is why the action for unscannable content is a setting worth deciding deliberately. Containing an executable or several files makes an archive more interesting to scan, not less.',
  },
  117: {
    topic: 'Switching & Wireless', track: 'network-plus',
    explanation: '802.1X provides port-based network access control: the switch port stays unauthorised until the supplicant authenticates to a RADIUS server, so an unknown device gets no network access at all. 802.1Q is VLAN tagging, 802.11ax is Wi-Fi 6, and 802.3ad is link aggregation.',
  },
  118: {
    explanation: 'The AuthPoint Gateway is installed on the local network and synchronises users from on-premises Active Directory to the AuthPoint cloud, and it also serves RADIUS for local resources. The AuthPoint Agent for Windows is a different component - it enforces MFA at Windows logon on individual machines rather than performing directory synchronisation.',
  },
  119: {
    topic: 'IP Addressing', track: 'network-plus',
    explanation: 'A /25 has 7 host bits, so 2^7 = 128 addresses, minus the network and broadcast addresses, gives 126 usable. The two tempting wrong answers are 128 (forgetting to subtract both reserved addresses) and 254 (the /24 answer, which is what you get by ignoring the borrowed bit).',
  },
  120: {
    explanation: 'ThreatSync can isolate a compromised endpoint from the network and kill the malicious process, which contains the incident while leaving the machine intact for investigation. Destroying data is deliberately not in scope: an automated response has to be reversible, because it will occasionally fire on a false positive.',
  },
  121: {
    topic: 'Network Services', track: 'network-plus',
    explanation: 'DNSSEC signs DNS records so a resolver can verify a response really came from the authoritative zone, which defeats cache poisoning and forged answers. It authenticates rather than encrypts - the query is still visible on the wire. DNS over HTTPS is the opposite trade: it encrypts the query in transit but does not prove the answer is authentic.',
  },
  122: {
    topic: 'Switching & Wireless', track: 'network-plus',
    explanation: 'Link aggregation with LACP bonds several physical ports into one logical interface, adding bandwidth and surviving the loss of a member link. Multi-WAN load-balances across separate external connections rather than bonding ports into one interface, and spanning tree blocks redundant paths instead of using them.',
  },
  123: {
    topic: 'Network Services', track: 'network-plus',
    explanation: 'HTTPS uses TCP 443. Remember that a policy allowing 443 permits the encrypted session but tells you nothing about its content - inspecting what travels inside it requires an HTTPS-proxy with content inspection enabled.',
  },
  124: {
    topic: 'IP Addressing', track: 'network-plus',
    explanation: '/24 is 24 one bits, which is 255.255.255.0 - the whole last octet left for hosts, giving 254 usable addresses. 255.255.0.0 is /16 and 255.255.255.255 is /32, a single-host route.',
  },
  125: {
    topic: 'Network Services', track: 'network-plus',
    explanation: 'DHCP assigns an address, mask, gateway and DNS servers to a client automatically. Because the initial Discover is a local broadcast, a client on a subnet with no DHCP server needs a relay at its Layer 3 boundary - the Firebox can provide either role. DNS resolves names and ARP maps IP addresses to MAC addresses.',
  },
  126: {
    explanation: 'The default local management URL is https://10.0.1.1:8080 - HTTPS, the Trusted interface address, port 8080. Port 4100 is the Authentication Portal where network users log in, not an administration interface, and plain HTTP is not available.',
  },
  127: {
    explanation: 'System Status > Diagnostics in Fireware Web UI runs ping, traceroute, DNS lookup and packet capture from the Firebox itself. Keep that origin in mind: a successful test here proves the Firebox has a path, not that a client subject to policy does, so always repeat the test from the affected source before concluding the network is fine.',
  },
};
