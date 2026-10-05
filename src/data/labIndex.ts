/**
 * Lab names by Lab Book number, without the steps.
 *
 * Study Home shows how many labs exist and suggests labs by name. Importing labs.ts for that put
 * every step of every lab into the first bundle. labIndex.test.ts fails if this ever disagrees with
 * labs.ts, so the duplication cannot drift.
 */
export const LAB_NAMES: Readonly<Record<number, string>> = {
  1: "Lab 1: Initial Configuration",
  2: "Lab 2: Help",
  3: "Lab 3: Backup and Restore",
  4: "Lab 4: Connect to the Dimension Server",
  5: "Lab 5: Connect to WatchGuard Cloud",
  6: "Lab 6: Routing",
  7: "Lab 7: Routing to Another Device",
  8: "Lab 8: Link Monitor and SD-WAN",
  9: "Lab 9: Traffic Management",
  10: "Lab 10: Packet Filters",
  11: "Lab 11: Proxies",
  12: "Lab 12: Subscription Services",
  13: "Lab 13: Active Directory",
  14: "Lab 14: Authentication",
  15: "Lab 15: Mobile VPNs",
  16: "Lab 16: BOVPNs",
  17: "Lab 17: Fireware Web UI",
  18: "Lab 18: Dimension Logs and Reports",
  19: "Lab 19: WatchGuard Cloud Logs and Reports",
  20: "Lab 20: Log Notifications and Scheduled Reports",
};

export const LAB_COUNT = Object.keys(LAB_NAMES).length;
