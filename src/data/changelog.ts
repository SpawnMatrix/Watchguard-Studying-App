/**
 * The learner-facing changelog.
 *
 * `docs/releases/` holds the engineering notes: migrations, key-derivation
 * schemes, which assertion moved and why. Those are the right thing to write
 * for a reviewer and the wrong thing to show someone who came here to study.
 * This file is the other half — what changed for the person using the portal,
 * in their language, with no version archaeology.
 *
 * Adding a release means adding an entry here or naming it in `INTERNAL_ONLY`.
 * `changelog.test.ts` fails the build if a release note exists with neither,
 * which is the only way a curated list stays honest: it cannot quietly fall
 * behind, because CI will not let it.
 */

export type ChangeKind = 'new' | 'improved' | 'fixed';

export interface Change {
  kind: ChangeKind;
  /** One sentence. `**bold**` and `` `code` `` render; nothing else does. */
  text: string;
}

export interface ChangelogEntry {
  /** Matches a file in docs/releases/v<version>.md. */
  version: string;
  /** ISO date the release landed. */
  date: string;
  /** One line, shown as the heading. No version number in it. */
  headline: string;
  changes: Change[];
}

/**
 * Releases with nothing a learner would notice: dependency removals, dead-code
 * deletions, container and deployment plumbing. Listed rather than skipped, so
 * the gap between two versions in the list is always explained.
 */
export const INTERNAL_ONLY: Record<string, string> = {
  '1.3.1': 'Dependency and container hardening.',
  '1.3.2': 'Deployment fix for reaching the portal behind a proxy.',
  '1.3.3': 'Container resource configuration.',
  '1.9.1': 'Automated, verified database backups.',
  '1.15.3': 'Removed unused code.',
  '1.15.5': 'Removed an unused dependency.',
};

/** Newest first. */
export const changelog: ChangelogEntry[] = [
  {
    version: '1.23.0',
    date: '2026-10-05',
    headline: 'Answer on the diagram itself',
    changes: [
      { kind: 'new', text: '**Eleven new diagram questions** ask you to click the device or link that answers them: where NAT changes an address, which Firebox decrypts a BOVPN, where a broadcast stops, and more.' },
      { kind: 'improved', text: 'Thirteen of the sixteen network diagrams now have a question you answer by clicking the drawing, up from two.' },
    ],
  },
  {
    version: '1.22.2',
    date: '2026-10-05',
    headline: 'Calmer motion and a tidier settings page',
    changes: [
      { kind: 'improved', text: 'If your device asks for reduced motion, sections now switch without sliding or fading.' },
      { kind: 'improved', text: '**Accounts & tutor settings** opens on your own tutor key, with administrator controls in a separate view.' },
    ],
  },
  {
    version: '1.22.1',
    date: '2026-10-05',
    headline: 'Easier-to-read answers and the fonts we meant to use',
    changes: [
      { kind: 'fixed', text: 'In light mode, the correct and incorrect answers after **Check answer** are now dark enough to read. The correct answer was the faintest text on the screen.' },
      { kind: 'fixed', text: 'Options you did not pick stay readable after you check an answer instead of fading out.' },
      { kind: 'improved', text: 'Diagram answers show a tick or a cross on the device, so you can see which was right without relying on colour.' },
      { kind: 'fixed', text: 'The portal’s typefaces now load. They are served by the portal itself, so no font service learns that you visited.' },
      { kind: 'fixed', text: 'Your first visit says **Welcome**, not “Welcome back”.' },
    ],
  },
  {
    version: '1.22.0',
    date: '2026-09-28',
    headline: 'Share an idea and follow its progress',
    changes: [
      { kind: 'new', text: 'The **Ideas & Feedback** board lets signed-in learners suggest improvements, anonymously or with their username.' },
      { kind: 'new', text: 'Published ideas show their status and an administrator’s reply. **My ideas** also shows your submissions while they await review.' },
      { kind: 'improved', text: 'Your browser keeps the link to your submissions. Clearing its storage loses access to those submissions in My ideas, so keep personal details out of your posts.' },
    ],
  },
  {
    version: '1.21.0',
    date: '2026-09-28',
    headline: 'See what changed while you were away',
    changes: [
      { kind: 'new', text: 'A **What’s New** section listing every update to the portal, newest first, in plain language.' },
      { kind: 'new', text: 'A count beside it shows how many updates have landed since you last looked. Opening the list clears it.' },
      { kind: 'improved', text: 'The count is kept on your own device and never sent to the server, so it is not one more thing recorded about you.' },
    ],
  },
  {
    version: '1.20.0',
    date: '2026-09-28',
    headline: 'Get back into your account without handing it to anyone',
    changes: [
      { kind: 'new', text: 'Forgotten your PIN while still signed in? **Change my PIN** on your account panel. Nobody else is involved.' },
      { kind: 'new', text: 'Lost your recovery code as well? Ask for a short code on your own device, read it to an administrator, then set the new PIN back on that same device — an approval is useless anywhere else.' },
      { kind: 'improved', text: 'Administrators can no longer list accounts, see anyone’s progress or activity, or sign another device out. Approving a recovery does not tell them whose account it was.' },
    ],
  },
  {
    version: '1.19.0',
    date: '2026-09-28',
    headline: 'The sign-in pages stopped hinting at which usernames exist',
    changes: [
      { kind: 'fixed', text: 'Account recovery answered noticeably faster for a username that did not exist, so the portal could be asked which names had accounts. Every attempt now costs the same.' },
      { kind: 'improved', text: 'The tutor now has a firm limit on how much text it will forward, and only accepts requests coming from the study app itself.' },
    ],
  },
  {
    version: '1.18.1',
    date: '2026-09-28',
    headline: 'A BOVPN question described the wrong traffic as unencrypted',
    changes: [
      { kind: 'fixed', text: 'The branch office VPN question called internal links cleartext. Traffic inside a site sits outside the tunnel, but can still be encrypted by the application carrying it.' },
      { kind: 'fixed', text: 'The IPsec label on that diagram sat under the Internet card, where it read as labelling the wrong hop.' },
    ],
  },
  {
    version: '1.18.0',
    date: '2026-09-28',
    headline: 'Practice that covers the whole exam, not just the popular parts',
    changes: [
      { kind: 'improved', text: 'Every question is now mapped to an exam objective, so thin spots in the bank are visible instead of hidden behind a healthy-looking topic count.' },
      { kind: 'new', text: '28 new questions filling the objectives that had the least practice.' },
      { kind: 'improved', text: 'Mock exams were measured over thousands of runs to confirm they sample the blueprint rather than drifting toward whatever there is most of.' },
    ],
  },
  {
    version: '1.17.0',
    date: '2026-09-19',
    headline: 'Less is recorded about you, and it is written down',
    changes: [
      { kind: 'improved', text: 'The server keeps no record of who asked for what. Failures are logged as a category only — never your name, your address, or anything you typed.' },
      { kind: 'improved', text: 'Your address is held only while rate limiting needs it, for **at most twenty minutes**, and is now cleared on a timer instead of waiting for the next sign-in.' },
      { kind: 'new', text: 'A written inventory of everything the portal stores or sends, in `docs/privacy.md`, so the claim can be checked rather than believed.' },
    ],
  },
  {
    version: '1.15.4',
    date: '2026-09-15',
    headline: 'Quieter topology diagrams',
    changes: [
      { kind: 'improved', text: 'The diagram size toggle only appears when the diagram is actually wider than its panel.' },
    ],
  },
  {
    version: '1.15.2',
    date: '2026-09-14',
    headline: 'A routing question marked the right answer wrong',
    changes: [
      { kind: 'fixed', text: 'One multi-select routing question compared against a stale answer string and could reject a correct selection.' },
    ],
  },
  {
    version: '1.15.1',
    date: '2026-09-14',
    headline: 'Topology diagrams you can actually read',
    changes: [
      { kind: 'improved', text: 'Diagrams scale to a readable size, keyboard users can reach every hotspot, and animation can be turned off.' },
    ],
  },
  {
    version: '1.15.0',
    date: '2026-09-14',
    headline: 'Know where you stand before exam day',
    changes: [
      { kind: 'new', text: 'An exam-readiness view broken down by category, built from what you have actually answered.' },
      { kind: 'new', text: 'A lab dashboard showing which exercises you have finished and which are left.' },
      { kind: 'improved', text: 'Plainer wording across the study screens.' },
    ],
  },
  {
    version: '1.14.0',
    date: '2026-09-14',
    headline: 'Scenario questions rewritten from the Study Guide',
    changes: [
      { kind: 'improved', text: 'Scenario questions were rewritten against the official guide so the situations and the vocabulary match what the exam uses.' },
    ],
  },
  {
    version: '1.13.0',
    date: '2026-09-14',
    headline: 'Every question checked against the Study Guide',
    changes: [
      { kind: 'fixed', text: 'The whole bank was audited against the official guide and answers that no longer matched current Fireware behaviour were corrected.' },
    ],
  },
  {
    version: '1.12.0',
    date: '2026-09-14',
    headline: 'Faster to study, faster to load',
    changes: [
      { kind: 'new', text: 'Answer with the keyboard: number or letter keys to choose, **Enter** to check, **Enter** again to move on.' },
      { kind: 'new', text: 'The section you are in now lives in the address bar, so you can bookmark it or use the back button.' },
      { kind: 'improved', text: 'Heavy sections load only when you open them, so the first screen arrives sooner.' },
    ],
  },
  {
    version: '1.11.0',
    date: '2026-09-14',
    headline: 'Three more hands-on labs',
    changes: [
      { kind: 'new', text: 'SD-WAN, proxies and authentication labs, each worked through on the simulated Firebox.' },
    ],
  },
  {
    version: '1.10.0',
    date: '2026-09-14',
    headline: 'Labs you do on a simulated Firebox',
    changes: [
      { kind: 'new', text: 'Lab exercises now run against a simulated Firebox, so the steps are something you perform rather than something you read.' },
    ],
  },
  {
    version: '1.9.0',
    date: '2026-09-13',
    headline: 'A local Firebox bank matched to the NSE exam',
    changes: [
      { kind: 'new', text: 'A question bank for locally-managed Fireboxes, mapped to the WatchGuard NSE objectives.' },
    ],
  },
  {
    version: '1.8.0',
    date: '2026-09-13',
    headline: 'Fix a broken network',
    changes: [
      { kind: 'new', text: 'A generated branch office with one fault out of seventeen. Run connectivity tests, read the packet trace, edit the configuration and re-test — the tests trace real traffic, so any genuine fix passes.' },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-09-13',
    headline: 'Labs you can actually work through',
    changes: [
      { kind: 'improved', text: 'Lab exercises gained checkpoints, progress that persists, and instructions written as steps rather than prose.' },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-09-13',
    headline: 'Network+ mock exams follow the real blueprint',
    changes: [
      { kind: 'improved', text: 'Mock exams sample each domain in the proportion the N10-009 blueprint specifies, so a practice score means something.' },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-09-13',
    headline: 'A Network+ bank matched to N10-009',
    changes: [
      { kind: 'new', text: 'A full Network+ question bank mapped to the current exam blueprint.' },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-09-13',
    headline: 'A Firebox-style sandbox to experiment in',
    changes: [
      { kind: 'new', text: 'A sandbox workspace laid out like the Firebox interface, for trying configurations without a lab to follow.' },
    ],
  },
  {
    version: '1.3.4',
    date: '2026-09-13',
    headline: 'The lab step button was out of reach',
    changes: [
      { kind: 'fixed', text: 'On smaller screens the button to advance a lab step could not be reached.' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-09-12',
    headline: 'The complete lab catalogue',
    changes: [
      { kind: 'new', text: 'All twenty NSE lab exercises, sortable and filterable by category.' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-09-12',
    headline: 'Topology practice and study tracks',
    changes: [
      { kind: 'new', text: 'Topology diagram questions with keyboard-accessible hotspots.' },
      { kind: 'new', text: 'Separate study tracks for WatchGuard and Network+, so practice stays on the exam you are sitting.' },
    ],
  },
];

/**
 * Reads `YYYY-MM-DD` as a date in the reader's own timezone.
 *
 * `new Date('2026-09-28')` is parsed as UTC midnight, which formats as the
 * 27th for everyone west of Greenwich — so a release dated today appeared to
 * have shipped yesterday. A release date has no time of day; building it from
 * the parts keeps it the day it says it is, wherever it is read.
 */
export function releaseDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** The version shown at the top of the list, or null when it is empty. */
export const latestChangelogVersion = changelog[0]?.version ?? null;

/**
 * Entries newer than `seen`, by position rather than by parsing versions:
 * the list is authoritative and already ordered, and comparing positions
 * cannot be confused by a hotfix released out of order.
 */
export function unseenEntries(seen: string | null): ChangelogEntry[] {
  if (!seen) return [];
  const index = changelog.findIndex(entry => entry.version === seen);
  return index < 0 ? [] : changelog.slice(0, index);
}
