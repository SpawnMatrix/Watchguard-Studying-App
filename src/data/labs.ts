export interface LabStep {
  stepNumber: number;
  title: string;
  instruction: string;
  expectedConsoleAction?: string; // used for simulator visualization
}

export interface Lab {
  id: number;
  name: string;
  objectives: string;
  prerequisites: string;
  steps: LabStep[];
}

export const watchguardLabs: Lab[] = [
  {
    id: 1,
    name: "Lab 1: Initial Configuration",
    objectives:
      "Connect your management computer to Eth1 of a factory-default Firebox and use WatchGuard System Manager's Quick Setup Wizard to perform initial bootstrapping, configure trusted/external subnets, set passphrases, and create administrative accounts.",
    prerequisites:
      "Firebox reset to factory defaults. Management PC connected to physical interface Eth1.",
    steps: [
      {
        stepNumber: 1,
        title: "Confirm Connections & Subnets",
        instruction:
          "Connect Eth0 (External) to your internet source. Connect Eth1 (Trusted) to your management PC. Turn on the Firebox. Verify that your management PC receives a DHCP address on the default 10.0.1.0/24 subnet.",
        expectedConsoleAction: "CHECK_DHCP_10.0.1.0",
      },
      {
        stepNumber: 2,
        title: "Launch Quick Setup Wizard",
        instruction:
          "Open WatchGuard System Manager (WSM). Select Tools > Quick Setup Wizard. Select 'Yes, my device is ready to be discovered' and choose your active network adapter.",
        expectedConsoleAction: "LAUNCH_QSW",
      },
      {
        stepNumber: 3,
        title: "Configure Interfaces",
        instruction:
          "Configure the External interface (Eth0) to use DHCP to get an IP from your ISP. Set the Trusted interface (Eth1) IP to 10.0.1.1/24 and check the 'Enable DHCP Server' box to hand out 10.0.1.2 - 10.0.1.100.",
        expectedConsoleAction: "SET_INTERFACES_DEFAULT",
      },
      {
        stepNumber: 4,
        title: "Configure DNS & Credentials",
        instruction:
          "Select 'Use this DNS server information' and set public DNS to 1.1.1.1 and 8.8.8.8. When prompted, type a unique passphrase for both the 'status' (read-only) and 'admin' (read-write) accounts.",
        expectedConsoleAction: "SET_DNS_AND_PASSPHRASES",
      },
      {
        stepNumber: 5,
        title: "Verify Feature Key Retrieval",
        instruction:
          "The Firebox will attempt to contact WatchGuard servers to fetch your licensing Feature Key. If it has internet access, it completes automatically. Otherwise, paste your manual feature key. Click Finish to write the initial bootstrap config to the Firebox.",
        expectedConsoleAction: "FETCH_FEATURE_KEY",
      },
    ],
  },
  {
    id: 6,
    name: "Lab 6: Mixed Routing Configuration",
    objectives:
      "Configure physical Interface 2 as an Optional DMZ network, disable DHCP on it, and create a custom static host route to redirect specific WAN traffic over a next-hop gateway.",
    prerequisites: "Completion of Lab Exercise 1. Access to Policy Manager.",
    steps: [
      {
        stepNumber: 1,
        title: "Open Network Configuration",
        instruction:
          "Open WatchGuard System Manager and connect to your Firebox at 10.0.1.1 with status passphrase. Open Policy Manager. Select Network > Configuration.",
        expectedConsoleAction: "OPEN_NETWORK_CONFIG",
      },
      {
        stepNumber: 2,
        title: "Configure Optional DMZ Interface",
        instruction:
          "Select Interface 2 and click Configure. Set Name: 'DMZ', Type: 'Optional', and IP Address: '192.168.10.1/24'. Select 'Disable DHCP' and click OK.",
        expectedConsoleAction: "ADD_DMZ_INTERFACE",
      },
      {
        stepNumber: 3,
        title: "Configure Static Host Route",
        instruction:
          "Select Network > Routes. Click Add. Set Destination Type: 'Host IPv4'. Set Route To: '8.8.8.4'. Set Gateway: '192.168.10.200'. Metric: '1'. Click OK.",
        expectedConsoleAction: "ADD_STATIC_ROUTE",
      },
      {
        stepNumber: 4,
        title: "Save Configuration to Firebox",
        instruction:
          "Select File > Save > To Firebox. Authenticate with user name 'admin' and your admin passphrase. Wait for the configuration to upload and verify the active routing table under Firebox System Manager's Status Report tab.",
        expectedConsoleAction: "SAVE_TO_FIREBOX",
      },
    ],
  },
  {
    id: 8,
    name: "Lab 8: Link Monitor & SD-WAN",
    objectives:
      "Configure multi-interface logical Link Monitors to track gateway uptime, define an SD-WAN path policy over the DMZ interface, and configure a Ping policy to use SD-WAN failover.",
    prerequisites: "Lab 6 completed (DMZ interface active).",
    steps: [
      {
        stepNumber: 1,
        title: "Set Monitored Interfaces",
        instruction:
          "In Policy Manager, select Network > Configuration > Link Monitor. Click Add and choose your 'External' interface. In Settings, click Add and configure a ping probe target of 8.8.8.8 and a TCP probe target of watchguard.com on port 80.",
        expectedConsoleAction: "ADD_LINK_MONITOR_WAN",
      },
      {
        stepNumber: 2,
        title: "Add DMZ Monitored Interface",
        instruction:
          "Click Add under Monitored Interfaces and select your 'DMZ' interface. Check the 'Next hop' box and type your DMZ gateway IP: 192.168.10.2.",
        expectedConsoleAction: "ADD_LINK_MONITOR_DMZ",
      },
      {
        stepNumber: 3,
        title: "Create SD-WAN Action",
        instruction:
          "Select the SD-WAN tab in Network Configuration. Click Add. Type 'DMZ-Failover' in Name. Select 'Failover' as the method. Add 'DMZ' as the primary interface and 'External' as the backup.",
        expectedConsoleAction: "CREATE_SDWAN_ACTION",
      },
      {
        stepNumber: 4,
        title: "Apply SD-WAN to Ping Policy",
        instruction:
          "Double-click your 'Ping' policy in the policy grid. Select the 'Route outbound traffic using' check box. In the drop-down, select your newly created 'DMZ-Failover' SD-WAN action. Click OK and save to Firebox.",
        expectedConsoleAction: "APPLY_SDWAN_TO_POLICY",
      },
    ],
  },
  {
    id: 11,
    name: "Lab 11: HTTP & HTTPS Proxy Content Inspection",
    objectives:
      "Delete restrictive packet filters, configure the Layer 7 HTTP-proxy to deny specific path patterns, and enable deep content inspection in the HTTPS-proxy with local CA certificate enrollment.",
    prerequisites:
      "Lab 10 completed. Client devices ready to install trusted root authorities.",
    steps: [
      {
        stepNumber: 1,
        title: "Clean Obsolete Policies",
        instruction:
          "Open Policy Manager. Locate the rigid HTTP Deny and HTTPS Deny packet filter policies you created in Lab 10. Right-click each and select Delete to hand over L7 traffic management to the HTTP-proxy.",
        expectedConsoleAction: "CLEAN_L10_FILTERS",
      },
      {
        stepNumber: 2,
        title: "Configure HTTP-Proxy Rule",
        instruction:
          "Double-click the HTTP-proxy policy. Ensure 'Default-HTTP-Client' is the selected proxy action. Click Edit next to the action. In the Category tree, select URL Paths. Click Add, type '*example*' in the pattern box, and select disposition as Deny. Check both Log boxes.",
        expectedConsoleAction: "EDIT_HTTP_PROXY_PATHS",
      },
      {
        stepNumber: 3,
        title: "Enable deep Content Inspection",
        instruction:
          "Double-click the HTTPS-proxy policy. Click Edit next to the 'Default-HTTPS-Client' action. Under Content Inspection settings, change the default action to 'Inspect' and select 'Default-HTTP-Client' as the sub-proxy action. Enable logging and click OK.",
        expectedConsoleAction: "ENABLE_HTTPS_CONTENT_INSPECTION",
      },
      {
        stepNumber: 4,
        title: "Import Proxy Authority CA",
        instruction:
          "Open a web browser on your client PC. Navigate to http://10.0.1.1:4126/. Under the Firebox Certificate Portal, click Download. Double-click the downloaded CA certificate and install it in your computer's 'Trusted Root Certification Authorities' store to prevent SSL warnings.",
        expectedConsoleAction: "INSTALL_CA_CERTIFICATE",
      },
    ],
  },
  {
    id: 14,
    name: "Lab 14: Local Firebox User Authentication",
    objectives:
      "Create local users and security groups inside the Firebox-DB, remove wide-open 'Any-Trusted' permissions from HTTP proxies, and configure automatic redirect to the Firewall Authentication Portal.",
    prerequisites: "Lab 11 completed.",
    steps: [
      {
        stepNumber: 1,
        title: "Create Local User & Group",
        instruction:
          "In Policy Manager, select Setup > Authentication > Authentication Servers. On the Firebox-DB tab, click Add under Users. Enter Name: 'tech-user' and configure a strong passphrase. Click Add under User Groups, create group name 'Web-Users', and move 'tech-user' into the member list.",
        expectedConsoleAction: "CREATE_FIREBOX_DB_USER",
      },
      {
        stepNumber: 2,
        title: "Secure HTTP-Proxy Policy",
        instruction:
          "Double-click your HTTP-proxy policy. Under the 'From' grid, select 'Any-Trusted' and 'Any-Optional' and click Remove. Click Add under From, click Add User, select Type: 'Firewall and Group', choose 'Web-Users [Firebox-DB]' and click OK.",
        expectedConsoleAction: "RESTRIC_HTTP_PROXY_TO_GROUP",
      },
      {
        stepNumber: 3,
        title: "Secure HTTPS-Proxy Policy",
        instruction:
          "Double-click your HTTPS-proxy policy. Repeat the same cleanup: remove 'Any-Trusted' and 'Any-Optional', then click Add and add the 'Web-Users [Firebox-DB]' group. This forces all web browsing to undergo user validation.",
        expectedConsoleAction: "RESTRICT_HTTPS_PROXY_TO_GROUP",
      },
      {
        stepNumber: 4,
        title: "Enable Automatic Redirection",
        instruction:
          "Select Setup > Authentication > Authentication Settings. Under the Firewall Authentication tab, check the 'Automatically redirect users to the authentication page' check box. Under default server, select Firebox-DB. Save configuration to the Firebox.",
        expectedConsoleAction: "ENABLE_AUTH_PORTAL_REDIRECT",
      },
    ],
  },
  {
    id: 15,
    name: "Lab 15: Configuring Branch Office VPN (BOVPN)",
    objectives:
      "Configure a Branch Office VPN (BOVPN) between a local Firebox and a remote Firebox to allow secure communication between the two trusted networks.",
    prerequisites:
      "Lab 1 completed. A remote Firebox IP address and Pre-Shared Key.",
    steps: [
      {
        stepNumber: 1,
        title: "Create the BOVPN Gateway",
        instruction:
          "In Policy Manager, select VPN > Branch Office Gateways. Click Add. Enter a Gateway Name. In the Credential Method tab, enter the Pre-Shared Key. In the Gateway Endpoints tab, click Add to define the Local Gateway (your external IP) and Remote Gateway (the remote Firebox external IP).",
        expectedConsoleAction: "CREATE_BOVPN_GATEWAY",
      },
      {
        stepNumber: 2,
        title: "Configure Phase 1 Settings",
        instruction:
          "In the Phase 1 Settings tab of the BOVPN Gateway, verify the default settings or match the remote gateway's settings (e.g., Main Mode, SHA2-256, AES-256, Diffie-Hellman Group 14). Click OK.",
        expectedConsoleAction: "CONFIGURE_PHASE_1",
      },
      {
        stepNumber: 3,
        title: "Create the BOVPN Tunnel",
        instruction:
          "Select VPN > Branch Office Tunnels. Click Add. Select the Gateway you just created from the drop-down list. In the Addresses tab, click Add to define the Local IP (your trusted network, e.g., 10.0.1.0/24) and Remote IP (the remote trusted network, e.g., 10.0.2.0/24).",
        expectedConsoleAction: "CREATE_BOVPN_TUNNEL",
      },
      {
        stepNumber: 4,
        title: "Configure Phase 2 Settings",
        instruction:
          "In the Phase 2 Settings tab of the BOVPN Tunnel, verify the default settings or match the remote tunnel's settings (e.g., ESP, SHA2-256, AES-256, Enable PFS). Click OK.",
        expectedConsoleAction: "CONFIGURE_PHASE_2",
      },
      {
        stepNumber: 5,
        title: "Save and Verify",
        instruction:
          "Save the configuration to the Firebox. Open Firebox System Manager (FSM) and go to the Front Panel tab to verify the BOVPN tunnel status. Expand the Branch Office VPN section and look for active tunnel connections.",
        expectedConsoleAction: "VERIFY_BOVPN",
      },
    ],
  },
];
