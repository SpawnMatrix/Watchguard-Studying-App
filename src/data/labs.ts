export interface LabStep {
  stepNumber: number;
  title: string;
  instruction: string;
  expectedConsoleAction?: string;
  verification?: string; // used for simulator visualization
}

export interface Lab {
  id: number;
  name: string;
  objectives: string;
  prerequisites: string;
  steps: LabStep[];
}

/**
 * Mirrors the 20 exercises in WatchGuard's official Network Security Essentials
 * Lab Book (Fireware v12.5.9/12.7.2), renumbered to match that curriculum
 * exactly. Several require hardware or licensing this portal can't emulate
 * (a second Firebox, an AD domain controller, a WatchGuard Cloud/Dimension
 * subscription) — those prerequisites are called out honestly rather than
 * faked. The value of a walkthrough lab is the click-path itself, which is
 * exactly what the certification exam tests, so every lab is included
 * regardless of whether a learner has that hardware in front of them today.
 */
export const watchguardLabs: Lab[] = [
  {
    id: 1,
    name: "Lab 1: Initial Configuration",
    objectives: "Bootstrap a factory-default Firebox with the Quick Setup Wizard, create a management user, and save a configuration backup.",
    prerequisites: "Firebox reset to factory defaults, cabled to the management PC, with WatchGuard System Manager installed.",
    steps: [
      { stepNumber: 1, title: "Cable Up and Confirm DHCP", instruction: "Wire the external interface to your internet source and the trusted interface to your management PC. Power on the Firebox and confirm the management PC picks up a DHCP lease on 10.0.1.0/24.", expectedConsoleAction: "CHECK_DHCP_10.0.1.0" },
      { stepNumber: 2, title: "Run the Quick Setup Wizard", instruction: "In WatchGuard System Manager, choose Tools > Quick Setup Wizard, accept device discovery, and name the Firebox. Configure the external interface for internet access and set the trusted interface to 10.0.1.1/24 with its DHCP server enabled.", expectedConsoleAction: "LAUNCH_QSW" },
      { stepNumber: 3, title: "Set DNS and Passphrases", instruction: "Point the Firebox at public DNS resolvers (for example 1.1.1.1 and 8.8.8.8), then set distinct passphrases for the read-only status account and the read-write admin account before finishing the wizard.", expectedConsoleAction: "SET_DNS_AND_PASSPHRASES" },
      { stepNumber: 4, title: "Create a Device Monitor User", instruction: "Connect to the Firebox as status, open Policy Manager, and use Manage Users and Roles (signed in as admin) to add a Device Monitor account with its own credentials.", expectedConsoleAction: "CREATE_DEVICE_MONITOR_USER" },
      { stepNumber: 5, title: "Back Up the Configuration", instruction: "In Policy Manager, save the configuration as a file, then enable Always Create a Backup and save again. Confirm both the configuration file and its automatic backup landed in your WatchGuard configs folder.", expectedConsoleAction: "BACKUP_CONFIG" },
    ],
  },
  {
    id: 2,
    name: "Lab 2: Help",
    objectives: "Locate version information and context-sensitive help across WatchGuard System Manager, Policy Manager, and Firebox System Manager.",
    prerequisites: "A Firebox reachable from WatchGuard System Manager.",
    steps: [
      { stepNumber: 1, title: "Check Installed Versions", instruction: "Connect to the Firebox and read its model and Fireware OS version from the Device Status tab, then check the WatchGuard System Manager build under Help > About WatchGuard.", expectedConsoleAction: "VIEW_VERSION_INFO" },
      { stepNumber: 2, title: "Open Policy Manager Help", instruction: "From Policy Manager, open Help Contents, then double-click the Ping policy and use its dialog's Help button to jump straight to that policy's reference page.", expectedConsoleAction: "OPEN_POLICY_MANAGER_HELP" },
      { stepNumber: 3, title: "Open Firebox System Manager Help", instruction: "In Firebox System Manager, open its Help menu, then open Diagnostic Tasks and press F1 to confirm the context-sensitive help follows you into sub-dialogs too.", expectedConsoleAction: "OPEN_FSM_HELP" },
    ],
  },
  {
    id: 3,
    name: "Lab 3: Backup and Restore",
    objectives: "Upgrade Fireware OS, capture a compatible backup image, make a throwaway change, and confirm a restore reverts it.",
    prerequisites: "The latest Fireware OS installer downloaded to the management PC.",
    steps: [
      { stepNumber: 1, title: "Upgrade Fireware OS", instruction: "From Policy Manager, choose File > Upgrade and authenticate as admin. Let the Firebox reboot on the new version.", expectedConsoleAction: "UPGRADE_FIREWARE" },
      { stepNumber: 2, title: "Create a Fresh Backup Image", instruction: "Open File > Backup and Restore and create a new backup compatible with the upgraded version — the one made automatically during the upgrade still targets the old release.", expectedConsoleAction: "CREATE_BACKUP_IMAGE" },
      { stepNumber: 3, title: "Make a Throwaway Change", instruction: "Add a default Ping packet filter policy and save it to the Firebox, purely so you have something to prove the restore actually reverted.", expectedConsoleAction: "ADD_TEST_POLICY" },
      { stepNumber: 4, title: "Restore the Backup", instruction: "Reopen Backup and Restore, select the image from Step 2, and restore it. Reopen Policy Manager afterward and confirm the throwaway Ping policy is gone.", expectedConsoleAction: "RESTORE_BACKUP" },
    ],
  },
  {
    id: 4,
    name: "Lab 4: Connect to the Dimension Server",
    objectives: "Point a Firebox at a WatchGuard Dimension log server and confirm the connection from both ends.",
    prerequisites: "A running WatchGuard Dimension server and its authentication key.",
    steps: [
      { stepNumber: 1, title: "Configure the Log Server", instruction: "In Policy Manager, open Setup > Logging, enable sending log messages to a Dimension or WSM log server, and add its address plus the authentication key from the Dimension setup wizard.", expectedConsoleAction: "CONFIGURE_DIMENSION_LOGGING" },
      { stepNumber: 2, title: "Verify from the Firebox Side", instruction: "Save the change to the Firebox, then check Firebox System Manager's Front Panel detail pane, or search the Status Report for Log Configuration, for a Connected status.", expectedConsoleAction: "VERIFY_LOG_SERVER_STATUS" },
      { stepNumber: 3, title: "Verify from Dimension", instruction: "Log in to Dimension and confirm the Devices tab shows Yes in the Logging column for this Firebox.", expectedConsoleAction: "VERIFY_DIMENSION_DEVICE_LIST" },
    ],
  },
  {
    id: 5,
    name: "Lab 5: Connect to WatchGuard Cloud",
    objectives: "Enroll a Firebox in WatchGuard Cloud and confirm it reports as connected.",
    prerequisites: "A Basic or Total Security Suite license on the Firebox and a WatchGuard Cloud subscriber account.",
    steps: [
      { stepNumber: 1, title: "Start Enrollment in the Cloud", instruction: "In WatchGuard Cloud, go to Monitor > Fireboxes, click Add Device, select this Firebox, and copy the verification code it generates.", expectedConsoleAction: "START_CLOUD_ENROLLMENT" },
      { stepNumber: 2, title: "Enable Cloud Management Locally", instruction: "In Policy Manager, open Setup > WatchGuard Cloud, enable it, and paste the verification code when prompted during the save.", expectedConsoleAction: "ENABLE_WATCHGUARD_CLOUD" },
      { stepNumber: 3, title: "Confirm Both Sides Agree", instruction: "Check Firebox System Manager's detail pane for a Connected WG Cloud status, then confirm the same Firebox shows Connected on its Device Summary page in WatchGuard Cloud.", expectedConsoleAction: "VERIFY_CLOUD_CONNECTED" },
    ],
  },
  {
    id: 6,
    name: "Lab 6: Routing",
    objectives: "Stand up an Optional DMZ interface and add a static host route that redirects a specific destination through it.",
    prerequisites: "Completion of Lab 1.",
    steps: [
      { stepNumber: 1, title: "Baseline the Current Route", instruction: "Start a continuous ping to a public host such as 8.8.4.4 and confirm in Traffic Monitor which interface currently carries it, before you change anything.", expectedConsoleAction: "CHECK_DHCP_10.0.1.0" },
      { stepNumber: 2, title: "Configure the DMZ Interface", instruction: "In Network > Configuration, set interface 2 to name DMZ, type Optional, address 192.168.10.1/24, with DHCP disabled.", expectedConsoleAction: "ADD_DMZ_INTERFACE" },
      { stepNumber: 3, title: "Add a Static Host Route", instruction: "In Network > Routes, add a Host IPv4 route to 8.8.4.4 through gateway 192.168.10.200 at metric 1.", expectedConsoleAction: "ADD_STATIC_ROUTE" },
      { stepNumber: 4, title: "Confirm the Redirect", instruction: "Save to the Firebox, watch the original ping fail momentarily, and use Traffic Monitor plus the Status Report's IPv4 routes to confirm 8.8.4.4 now routes out the DMZ.", expectedConsoleAction: "SAVE_TO_FIREBOX" },
    ],
  },
  {
    id: 7,
    name: "Lab 7: Routing to Another Device",
    objectives: "Configure two Fireboxes with distinct trusted subnets, connect them over a shared interface, and route between the two trusted networks.",
    prerequisites: "A second WatchGuard Firebox (or a third-party router you configure yourself) with its feature key.",
    steps: [
      { stepNumber: 1, title: "Address the Secondary Firebox", instruction: "From factory defaults, import its feature key, set its trusted interface to 10.0.20.1/24 with DHCP enabled, and set a third interface to 10.0.100.2/24 for the site-to-site link.", expectedConsoleAction: "CONFIGURE_SECONDARY_FIREBOX" },
      { stepNumber: 2, title: "Route the Secondary Toward the Primary", instruction: "Add a Network IPv4 route on the secondary Firebox for 10.0.1.0/24 via gateway 10.0.100.1, metric 1, then save it.", expectedConsoleAction: "ADD_SECONDARY_ROUTE" },
      { stepNumber: 3, title: "Mirror the Setup on the Primary", instruction: "On the primary Firebox, set the matching interface to 10.0.100.1/24 and add a route for 10.0.20.0/24 via gateway 10.0.100.2, metric 1.", expectedConsoleAction: "ADD_PRIMARY_ROUTE" },
      { stepNumber: 4, title: "Cable Them Together and Test", instruction: "Connect the two site-to-site interfaces with an Ethernet cable, then ping and tracert from a host on the primary's trusted network to 10.0.20.1 to confirm both routing tables carry the traffic correctly.", expectedConsoleAction: "TEST_SITE_TO_SITE" },
    ],
  },
  {
    id: 8,
    name: "Lab 8: Link Monitor and SD-WAN",
    objectives: "Configure Link Monitor probes on two interfaces, then build an SD-WAN action that steers a policy's traffic.",
    prerequisites: "Completion of Lab 6, for the DMZ interface it reuses.",
    steps: [
      { stepNumber: 1, title: "Baseline With a Continuous Ping", instruction: "Start a continuous ping to 1.1.1.1 in the background so you have live traffic to watch once SD-WAN routing takes effect.", expectedConsoleAction: "START_BASELINE_PING" },
      { stepNumber: 2, title: "Add External Probe Targets", instruction: "In Network > Configuration > Link Monitor, add the external interface, then add probe targets — a ping to 8.8.8.8, a DNS query to 1.1.1.1 for watchguard.com, and a TCP probe on port 80 — and select the DNS probe to measure loss, latency, and jitter.", expectedConsoleAction: "ADD_LINK_MONITOR_WAN" },
      { stepNumber: 3, title: "Add the DMZ Interface", instruction: "Add the DMZ interface to Monitored Interfaces and set its next hop to 192.168.10.2.", expectedConsoleAction: "ADD_LINK_MONITOR_DMZ" },
      { stepNumber: 4, title: "Build and Apply an SD-WAN Action", instruction: "On the SD-WAN tab, create an action named DMZ that includes the DMZ interface, then edit the Ping policy to route its outbound traffic using that action and save to the Firebox.", expectedConsoleAction: "APPLY_SDWAN_TO_POLICY" },
      { stepNumber: 5, title: "Confirm the Failover Behavior", instruction: "Watch the baseline ping start timing out — expected, since the DMZ probe target has no real responder — then review the SD-WAN tab's latency graph across interfaces before removing the action from the Ping policy to restore normal routing.", expectedConsoleAction: "REVIEW_SDWAN_STATS" },
    ],
  },
  {
    id: 9,
    name: "Lab 9: Traffic Management",
    objectives: "Enable QoS, define bandwidth-limiting actions, and apply them to outbound policies.",
    prerequisites: "None beyond a Firebox with active outbound traffic to test against.",
    steps: [
      { stepNumber: 1, title: "Baseline Your Bandwidth", instruction: "Run a speed test through the Firebox before making any changes, so you have a number to compare against afterward.", expectedConsoleAction: "BASELINE_SPEEDTEST" },
      { stepNumber: 2, title: "Enable Traffic Management", instruction: "In Setup > Global Settings > Networking, enable all traffic management and QoS features.", expectedConsoleAction: "ENABLE_TRAFFIC_MANAGEMENT" },
      { stepNumber: 3, title: "Create Bandwidth Actions", instruction: "Under Setup > Actions > Traffic Management, create a 500 Kbps action and a 1 Mbps action, both scoped to all policies.", expectedConsoleAction: "CREATE_BANDWIDTH_ACTIONS" },
      { stepNumber: 4, title: "Apply Actions to Outbound Policies", instruction: "On the Outgoing, HTTP-proxy, and HTTPS-proxy policies, set the forward direction to the 500 Kbps action and the reverse direction to the 1 Mbps action, then save to the Firebox.", expectedConsoleAction: "APPLY_BANDWIDTH_ACTIONS" },
      { stepNumber: 5, title: "Confirm the Throttle", instruction: "Re-run the speed test and confirm upload and download are now capped near your configured limits, then disable Traffic Management afterward to restore full bandwidth.", expectedConsoleAction: "CONFIRM_THROTTLE" },
    ],
  },
  {
    id: 10,
    name: "Lab 10: Packet Filters",
    objectives: "Disable the broad Outgoing policy, lock the DNS packet filter to known servers, and add packet filters that deny a specific site.",
    prerequisites: "None.",
    steps: [
      { stepNumber: 1, title: "Disable the Outgoing Policy", instruction: "Right-click the Outgoing policy, disable it, and save to the Firebox so nothing is implicitly allowed anymore.", expectedConsoleAction: "DISABLE_OUTGOING_POLICY" },
      { stepNumber: 2, title: "Restrict DNS to Known Servers", instruction: "Edit the DNS packet filter's To list: remove Any-External and add only the specific DNS server IPs configured on the Firebox during setup.", expectedConsoleAction: "RESTRICT_DNS_POLICY" },
      { stepNumber: 3, title: "Deny a Specific Domain", instruction: "Add an HTTP packet filter named HTTP Deny and an HTTPS packet filter named HTTPS Deny, each scoped in their To list to an FQDN pattern such as *.example.com with a Denied disposition.", expectedConsoleAction: "ADD_DENY_PACKET_FILTERS" },
      { stepNumber: 4, title: "Confirm With Traffic Monitor", instruction: "Browse to the blocked domain and a normal site, then filter Traffic Monitor for http and for deny to confirm the right traffic was blocked and everything else still resolves.", expectedConsoleAction: "REVIEW_DENY_LOGS" },
    ],
  },
  {
    id: 11,
    name: "Lab 11: Proxies",
    objectives: "Move from packet filters to proxy-based enforcement: deny a URL pattern in the HTTP-proxy and enable HTTPS content inspection.",
    prerequisites: "Completion of Lab 10, on a Firebox not already sitting behind another TLS-inspecting device.",
    steps: [
      { stepNumber: 1, title: "Retire the Packet Filters", instruction: "Delete the HTTP Deny and HTTPS Deny packet filters from Lab 10 so the proxies take over enforcement.", expectedConsoleAction: "CLEAN_L10_FILTERS" },
      { stepNumber: 2, title: "Deny a URL Pattern in HTTP-proxy", instruction: "In the HTTP-proxy's Default-HTTP-Client action, add a URL Paths pattern such as *example* set to Deny with logging enabled on both matched and unmatched outcomes.", expectedConsoleAction: "EDIT_HTTP_PROXY_PATHS" },
      { stepNumber: 3, title: "Enable HTTPS Content Inspection", instruction: "In the HTTPS-proxy action, set the no-rule-matched behavior to Inspect using the HTTP-proxy action you just edited, so encrypted traffic gets the same URL scrutiny once decrypted.", expectedConsoleAction: "ENABLE_HTTPS_CONTENT_INSPECTION" },
      { stepNumber: 4, title: "Trust the Proxy's CA Certificate", instruction: "Download the Proxy Authority certificate from the Firebox Certificate Portal (port 4126) and install it into the management PC's Trusted Root Certification Authorities store to stop browser warnings.", expectedConsoleAction: "INSTALL_CA_CERTIFICATE" },
      { stepNumber: 5, title: "Confirm Decrypted Enforcement", instruction: "Search for the blocked keyword on an HTTPS search engine and confirm the connection is now denied — proof the proxy is inspecting inside the encrypted session, not just matching on the outer hostname.", expectedConsoleAction: "VERIFY_HTTPS_INSPECTION" },
    ],
  },
  {
    id: 12,
    name: "Lab 12: Subscription Services",
    objectives: "Turn on the core subscription services — Application Control, IPS, Botnet Detection, Geolocation, Gateway AntiVirus, Reputation Enabled Defense, WebBlocker, and the TSS-only services — then use the EICAR test file to prove they're actually inspecting traffic.",
    prerequisites: "A Basic or Total Security Suite license; TSS-only services need Total Security Suite specifically.",
    steps: [
      { stepNumber: 1, title: "Update Signatures and Enable Application Control", instruction: "Confirm automatic updates are on for the signature-based services, then clone the Global Application Control action, set peer-to-peer networking categories to Drop, and apply it to the HTTP-proxy, HTTPS-proxy, and DNS policies.", expectedConsoleAction: "CONFIGURE_APPLICATION_CONTROL" },
      { stepNumber: 2, title: "Enable IPS, Botnet Detection, and Geolocation", instruction: "Turn on Intrusion Prevention for the same three policies, enable botnet-site blocking, and clone a Geolocation action that blocks a few countries before applying it to those policies too.", expectedConsoleAction: "CONFIGURE_IPS_BOTNET_GEO" },
      { stepNumber: 3, title: "Enable Gateway AntiVirus and Reputation Enabled Defense", instruction: "In the HTTP-proxy action, turn on Gateway AntiVirus scanning for request paths, response content types, and body content, then enable Reputation Enabled Defense to immediately deny known-bad URLs.", expectedConsoleAction: "CONFIGURE_GAV_RED" },
      { stepNumber: 4, title: "Configure WebBlocker and the TSS Services", instruction: "In WebBlocker, deny the Social Web and Advertisements categories and apply the action to both proxies. If licensed for Total Security Suite, also enable DNSWatch, IntelligentAV, APT Blocker, and a Data Loss Protection sensor on the HTTP-proxy.", expectedConsoleAction: "CONFIGURE_WEBBLOCKER_TSS" },
      { stepNumber: 5, title: "Prove It With the EICAR File", instruction: "Try to download the EICAR test file over HTTP and HTTPS, read which service denied it in Traffic Monitor, then work through disabling and re-enabling services (or adding exceptions) until you understand exactly which service is responsible for each block.", expectedConsoleAction: "TEST_EICAR_FILE" },
    ],
  },
  {
    id: 13,
    name: "Lab 13: Active Directory",
    objectives: "Connect the Firebox to an Active Directory domain and scope a bypass policy to a specific security group.",
    prerequisites: "A Windows Server configured as an Active Directory Domain Controller; builds on the proxies from Lab 11.",
    steps: [
      { stepNumber: 1, title: "Add the AD Domain", instruction: "In Setup > Authentication > Authentication Servers > Active Directory, run the setup wizard with your domain name and domain controller address, then add the exact (case-sensitive) name of a security group to authorize.", expectedConsoleAction: "ADD_AD_DOMAIN" },
      { stepNumber: 2, title: "Build a Group-Scoped Bypass Policy", instruction: "Add an HTTP packet filter named HTTP Allow whose From list is only your AD group and whose To list is only the FQDN you're otherwise blocking, with logging enabled.", expectedConsoleAction: "CREATE_AD_BYPASS_POLICY" },
      { stepNumber: 3, title: "Set the Default Authentication Server", instruction: "In Authentication Settings, set the default server on the authentication page to your AD domain, then save the configuration.", expectedConsoleAction: "SET_DEFAULT_AUTH_SERVER" },
      { stepNumber: 4, title: "Authenticate as an AD User", instruction: "Confirm the blocked site still fails for an unauthenticated session, then sign in through the Firebox's authentication page (port 4100) as a member of the authorized group and confirm the same site now loads.", expectedConsoleAction: "AUTHENTICATE_AS_AD_USER" },
    ],
  },
  {
    id: 14,
    name: "Lab 14: Authentication",
    objectives: "Create local Firebox-DB users and groups, scope web proxies to authenticated users only, and enable automatic redirect to the authentication portal.",
    prerequisites: "Builds on the proxy actions from Lab 11.",
    steps: [
      { stepNumber: 1, title: "Create a Local User and Group", instruction: "On the Firebox-DB tab under Authentication Servers, add a user with a passphrase, then create a group and move that user into its member list.", expectedConsoleAction: "CREATE_FIREBOX_DB_USER" },
      { stepNumber: 2, title: "Require Authentication on the Proxies", instruction: "On both the HTTP-proxy and HTTPS-proxy policies, remove Any-Trusted and Any-Optional from the From list and add your Firebox-DB group (or the AD group from Lab 13) in their place.", expectedConsoleAction: "RESTRICT_PROXIES_TO_GROUP" },
      { stepNumber: 3, title: "Enable Automatic Redirect", instruction: "In Authentication Settings, enable automatic redirect to the authentication page, save to the Firebox, and confirm an unauthenticated browser is bounced to the login page when it tries to reach the web.", expectedConsoleAction: "ENABLE_AUTH_PORTAL_REDIRECT" },
      { stepNumber: 4, title: "Verify With Traffic Monitor", instruction: "After signing in, browse normally and confirm log entries now carry a src_user field, and check the Authentication List tab for your active session.", expectedConsoleAction: "VERIFY_SRC_USER_LOGGING" },
    ],
  },
  {
    id: 15,
    name: "Lab 15: Mobile VPNs",
    objectives: "Configure IKEv2 Mobile VPN, scope a proxy policy to VPN users, and connect a client to it.",
    prerequisites: "Builds on the proxy actions from Lab 11 and the Firebox-DB group from Lab 13 or 14; Windows 8/10 client (Windows 7 would use SSL VPN instead).",
    steps: [
      { stepNumber: 1, title: "Run the IKEv2 Wizard", instruction: "In VPN > Mobile VPN > IKEv2, set the server address to the Firebox's trusted IP, choose Firebox-DB as the authentication server, select your authorized group, and accept the default virtual IP pool.", expectedConsoleAction: "CONFIGURE_IKEV2_WIZARD" },
      { stepNumber: 2, title: "Scope a Proxy Policy to VPN Users", instruction: "Enable logging on the Allow IKEv2-Users policy the wizard created, then add an HTTP-proxy policy scoped to the IKEv2-Users group using the Default-HTTP-Client action.", expectedConsoleAction: "SCOPE_PROXY_TO_VPN_USERS" },
      { stepNumber: 3, title: "Download and Install the Client Profile", instruction: "From VPN > Mobile VPN > Get Started, download the IKEv2 client profile archive, extract it, and run its installer on the management PC to register the VPN connection.", expectedConsoleAction: "INSTALL_VPN_PROFILE" },
      { stepNumber: 4, title: "Connect and Verify", instruction: "Connect using the new VPN entry with a Firebox-DB credential, confirm the blocked domain from Lab 11 is still denied over the tunnel, and filter Traffic Monitor for ikev2 to see the session's traffic.", expectedConsoleAction: "VERIFY_IKEV2_TRAFFIC" },
    ],
  },
  {
    id: 16,
    name: "Lab 16: BOVPNs",
    objectives: "Build a route-based Branch Office VPN virtual interface between two Fireboxes, then confirm it takes over automatically if the primary link fails.",
    prerequisites: "A second WatchGuard Firebox or a route-based-VPN-capable third-party device; reuses the interfaces and routes from Labs 6 and 7, and assumes the SD-WAN action from Lab 8 has been removed from the Ping policy.",
    steps: [
      { stepNumber: 1, title: "Build the Virtual Interface on the Secondary Firebox", instruction: "Configure its DMZ interface at 192.168.10.2/24, then create a BOVPN virtual interface with a pre-shared key whose local gateway is that DMZ address and whose remote gateway is 192.168.10.1.", expectedConsoleAction: "CREATE_BOVPN_VIF_SECONDARY" },
      { stepNumber: 2, title: "Add a VPN Route", instruction: "On the secondary Firebox's new virtual interface, add a Network IPv4 VPN route to 10.0.1.0/24 at metric 2 — a higher (worse) metric than the site-to-site route, so it only gets used as a fallback.", expectedConsoleAction: "ADD_BOVPN_ROUTE_SECONDARY" },
      { stepNumber: 3, title: "Mirror the Configuration on the Primary", instruction: "On the primary Firebox, configure its DMZ at 192.168.10.1/24, build the matching virtual interface pointed at 192.168.10.2, and add a VPN route to 10.0.20.0/24 at metric 2.", expectedConsoleAction: "MIRROR_BOVPN_ON_PRIMARY" },
      { stepNumber: 4, title: "Connect and Confirm Both Paths", instruction: "Cable the two DMZ interfaces together so both the interface-3 site-to-site link and the new BOVPN exist simultaneously, then check the BOVPN's statistics on the Front Panel tab.", expectedConsoleAction: "CONNECT_DUAL_PATHS" },
      { stepNumber: 5, title: "Test the Failover", instruction: "Start a continuous ping across the trusted networks, confirm it prefers the lower-metric site-to-site route, then unplug that interface and watch the ping recover over the BOVPN — Traffic Monitor's destination interface will show the switch.", expectedConsoleAction: "TEST_BOVPN_FAILOVER" },
    ],
  },
  {
    id: 17,
    name: "Lab 17: Fireware Web UI",
    objectives: "Tour the Fireware Web UI's diagnostic tools: the configuration report, FireWatch, Policy Checker, and (if AD is configured) the LDAP connectivity tester.",
    prerequisites: "None, though completing Lab 13 unlocks the LDAP tester step.",
    steps: [
      { stepNumber: 1, title: "Review the Configuration File and Report", instruction: "Log in to the Web UI at your trusted IP on port 8080, download the configuration file from System > Configuration File, and open the Firebox Configuration Report for a readable summary of every policy and setting.", expectedConsoleAction: "REVIEW_CONFIG_REPORT" },
      { stepNumber: 2, title: "Explore FireWatch", instruction: "Open Dashboard > FireWatch, drill into active connections on the external interface, then filter the Source tab down to just your management PC's address.", expectedConsoleAction: "EXPLORE_FIREWATCH" },
      { stepNumber: 3, title: "Run Policy Checker", instruction: "Under Firewall > Firewall Policies, open Policy Checker and test a specific interface/protocol/address/port combination to see exactly which policy would handle it and why.", expectedConsoleAction: "RUN_POLICY_CHECKER" },
      { stepNumber: 4, title: "Test LDAP Connectivity (if AD is configured)", instruction: "If you completed Lab 13, go to Authentication > Servers, run Test Connection against your AD domain with a valid username and password, and confirm the result.", expectedConsoleAction: "TEST_LDAP_CONNECTIVITY" },
    ],
  },
  {
    id: 18,
    name: "Lab 18: Dimension Logs and Reports",
    objectives: "Review the log messages and dashboards WatchGuard Dimension builds from a Firebox's traffic.",
    prerequisites: "Completion of Lab 4, so Dimension actually has data to show.",
    steps: [
      { stepNumber: 1, title: "Read the Executive and Security Dashboards", instruction: "Open your Firebox in Dimension, review the Executive Dashboard's high-level traffic summary, click into a top client, then compare it against the Security Dashboard's view of blocked traffic.", expectedConsoleAction: "REVIEW_DIMENSION_DASHBOARDS" },
      { stepNumber: 2, title: "Compare FireWatch and the Policy Map", instruction: "Open FireWatch in Dimension and compare it to the Fireware Web UI version from Lab 17, then check Policy Map for a visual sense of how traffic distributes across your firewall policies.", expectedConsoleAction: "COMPARE_FIREWATCH_POLICY_MAP" },
      { stepNumber: 3, title: "Pull a Per-Client Report", instruction: "In Log Manager, browse the full log stream, then generate a Per Client Reports > Summary for your management PC's IP address.", expectedConsoleAction: "PULL_PER_CLIENT_REPORT" },
    ],
  },
  {
    id: 19,
    name: "Lab 19: WatchGuard Cloud Logs and Reports",
    objectives: "Review the same category of logs and dashboards, this time from inside WatchGuard Cloud.",
    prerequisites: "Completion of Lab 5, and a Basic or Total Security Suite license for reporting data.",
    steps: [
      { stepNumber: 1, title: "Review the Cloud Dashboards", instruction: "In WatchGuard Cloud, select your Firebox and step through the Executive, Security, and Subscription dashboards to see allowed traffic, blocked traffic, and subscription-service activity respectively.", expectedConsoleAction: "REVIEW_CLOUD_DASHBOARDS" },
      { stepNumber: 2, title: "Compare FireWatch and the Policy Map", instruction: "Open Dashboards > FireWatch and filter it to your management PC, then compare both FireWatch and Policy Map against what you saw in Dimension and the Fireware Web UI.", expectedConsoleAction: "COMPARE_CLOUD_FIREWATCH" },
      { stepNumber: 3, title: "Check Interface Health and Per-Client Reports", instruction: "Review the Interface Summary bandwidth graph under Health, then pull a Per Client Reports entry for your management PC's address.", expectedConsoleAction: "REVIEW_CLOUD_REPORTS" },
    ],
  },
  {
    id: 20,
    name: "Lab 20: Log Notifications and Scheduled Reports",
    objectives: "Wire an HTTP-proxy alarm through to an email notification, and schedule an Executive Summary report from WatchGuard Cloud.",
    prerequisites: "Completion of Lab 5; a Basic or Total Security Suite license; an email address to receive test notifications.",
    steps: [
      { stepNumber: 1, title: "Add an Alarm to the HTTP-proxy", instruction: "On the URL Paths rule you built in Lab 11, enable the Alarm option under Proxy and AV Alarms, and turn on email notification for it.", expectedConsoleAction: "ADD_HTTP_PROXY_ALARM" },
      { stepNumber: 2, title: "Build a Cloud Notification Rule", instruction: "In WatchGuard Cloud, under Administration > Notifications > Rules, add a rule scoped to Device Alarms, delivered by email, sending every alert, and pointed at your email address.", expectedConsoleAction: "BUILD_NOTIFICATION_RULE" },
      { stepNumber: 3, title: "Trigger and Confirm the Alarm", instruction: "Browse to the blocked URL pattern again and confirm you receive the alarm email.", expectedConsoleAction: "TRIGGER_ALARM_EMAIL" },
      { stepNumber: 4, title: "Schedule an Executive Summary Report", instruction: "Under Administration > Scheduled Reports, create an Executive Summary report for this Firebox, run it now for the past 24 hours, and confirm it lands in your inbox.", expectedConsoleAction: "SCHEDULE_EXECUTIVE_REPORT" },
    ],
  },
];
