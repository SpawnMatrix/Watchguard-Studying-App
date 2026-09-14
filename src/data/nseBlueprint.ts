/**
 * WatchGuard Network Security Essentials (Locally-Managed Fireboxes) exam blueprint, and where each
 * Local Firebox question sits in it.
 *
 * The categories and weights are the Assessment Objectives published in WatchGuard's Network Security
 * Essentials for Locally-Managed Fireboxes Study Guide (Fireware v12.9.2, March 2023, pp. 336-338).
 * The exam itself is 70 questions with a 75% passing score.
 *
 * Question topics mostly line up with a category, so the topic is the default. They do not always:
 * the authored "Policies" section on authentication, legacy questions filed under Initial Setup that
 * are really about Active Directory, and Default Threat Protection items filed under Security Services
 * all belong elsewhere in WatchGuard's own list. Those are overridden by id. Every override is a
 * decision about what the question tests, not where it happens to be stored.
 */
import type { Question } from './questions';

export type NseCategory = 1 | 2 | 3 | 4 | 5 | 6;

export const NSE_WEIGHTS: Record<NseCategory, { name: string; weight: number }> = {
  1: { name: 'Network and Network Security Basics', weight: 10 },
  2: { name: 'Administration and Setup', weight: 10 },
  3: { name: 'Monitoring, Logging, and Reporting', weight: 15 },
  4: { name: 'Networking and NAT', weight: 25 },
  5: { name: 'Policies, Proxies, and Security Services', weight: 25 },
  6: { name: 'Authentication and VPNs', weight: 15 },
};

/**
 * The category a topic usually maps to, for Local Firebox questions only: the same topic names are used
 * on the Network+ track, which has its own blueprint. Troubleshooting has no default: each one is classified.
 */
const TOPIC_DEFAULT: Partial<Record<Question['topic'], NseCategory>> = {
  // Generic networking the exam asks about, on the Local Firebox track (ids 1800-1849).
  'IP Addressing': 1,
  'Network Services': 1,
  'Initial Setup': 2,
  'Logging & Monitoring': 3,
  Routing: 4,
  NAT: 4,
  Policies: 5,
  Proxies: 5,
  'Security Services': 5,
  'Mobile VPN': 6,
  BOVPN: 6,
};

const range = (from: number, to: number, category: NseCategory) =>
  Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, category])) as Record<number, NseCategory>;

export const NSE_OVERRIDES: Record<number, NseCategory> = {
  // Basics: generic networking that is not unique to the Firebox.
  109: 1,

  // Administration and Setup: default policies, Default Threat Protection, management access.
  12: 2, 15: 2, 49: 2, 95: 2, // default policy set
  17: 2, 18: 2, 1546: 2, 1547: 2, 10030: 2, // blocked sites and default packet handling are Default Threat Protection
  1500: 2, 1501: 2, 1502: 2, 1503: 2, 1513: 2,

  // Monitoring, Logging, and Reporting: status tools, diagnostics, reading log messages.
  16: 3, 66: 3, 127: 3, 310: 3,
  1508: 3, 1511: 3, 1514: 3, 1516: 3, 1519: 3,
  // Traffic Monitor log-analysis scenarios: the skill tested is reading a Firebox log message.
  ...range(10101, 10116, 3),

  // Networking and NAT
  111: 4, 105: 4, 1504: 4, 1509: 4, 1510: 4,

  // Policies, Proxies, and Security Services
  1507: 5, 1515: 5, 1517: 5, 1518: 5,
  // Policy-ordering exercises test policy precedence, whatever service they happen to involve.
  ...range(10201, 10210, 5),

  // Authentication and VPNs: authentication servers, users and groups in policies, the portal.
  2: 6, 3: 6, 21: 6, 39: 6, 68: 6, 106: 6, 118: 6, 302: 6, 303: 6, 1512: 6, 1505: 6, 1506: 6,
  ...range(1180, 1199, 6), // authored section "Authentication and Users and Groups"
};

export function nseCategory(q: Pick<Question, 'id' | 'topic'>): NseCategory | undefined {
  return NSE_OVERRIDES[q.id] ?? TOPIC_DEFAULT[q.topic];
}

export interface NseCoverage { category: NseCategory; name: string; weight: number; count: number; share: number; gap: number }

export function nseCoverage(questions: readonly Pick<Question, 'id' | 'topic'>[]): NseCoverage[] {
  const counts: Record<NseCategory, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let classified = 0;
  for (const q of questions) {
    const category = nseCategory(q);
    if (category) { counts[category]++; classified++; }
  }
  return ([1, 2, 3, 4, 5, 6] as NseCategory[]).map(category => {
    const share = classified ? Math.round((counts[category] / classified) * 100) : 0;
    return { category, ...NSE_WEIGHTS[category], count: counts[category], share, gap: share - NSE_WEIGHTS[category].weight };
  });
}
