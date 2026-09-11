# Version 1.1.0 — guided packet-path lab

- Six guided challenges: narrow DNS access, non-DNS UDP, HTTPS certificate trust, encrypted EICAR inspection, inbound DMZ web access, and blocked-site precedence.
- Explicit policy scope, a separate Ping policy, optional inter-zone and inbound-web teaching rules, and editable destination addresses.
- A decision trace for each flow, exact historical inspection by packet identity, 50-flow retention, JSON export, and optional automatic traffic. New visits start paused for deliberate practice.
- TLS client rejection is distinguished from firewall denial. EICAR is identified as a harmless test marker. The sandbox explicitly excludes NAT/VPN emulation, route failures, application reachability, and return-session tracking.
- Dark mode is the initial theme before onboarding; an explicitly saved light preference remains available.
- Footer credit: **Created by Julien Dumitrescu**. Version comes from package.json, with build commit when available. `/api/version` identifies the deployed server build.

References: [Outgoing policy scope](https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/policies/policy_outgoing_about_c.html), [blocked ports](https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/intrusionprevention/blocked_ports_about_c.html), and the locally managed study-guide baseline already recorded in content-sources.md. The simulator's enabled rules and blocked lists are teaching settings, not a claim to reproduce the complete factory configuration.

Next useful expansions are stateful return flows, visual source/destination NAT, and BOVPN negotiation labs. These require separate validated models; the current trace does not imply those mechanisms are simulated.
