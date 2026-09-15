# Modern study workspace

Branch: `codex/modern-study-ui`, based on main `2032102` (v1.15.3).

## Visual direction

The existing orange accent, deep primary-button color, Inter / Space Grotesk / JetBrains Mono fonts, light-theme tokens and Lucide icons are retained. `src/styles/workspace.css` is imported by the existing Tailwind stylesheet and scopes the new shell styles with `.modern-shell`; no styling framework or dependency was added.

Study Home has a welcome heading, saved-session hero with a schematic network illustration, three lifetime metrics, four working study shortcuts, observed topic accuracy and actual seven-day activity bars. Empty history remains an empty state. The illustration opens Topology Lab and animates packets only while hovered or keyboard-focused. It is decorative, not a graded or simulated network result.

The header consolidates account controls and session information into a native details menu. The theme toggle and persistent learning-track selector remain available in every section. On phones, all eight study sections remain in a horizontally scrollable navigation row. Tab navigation and section URL hashes continue to work.

The [topology v1 contract and track propagation](visual-workstream.md) remain unchanged. This branch also incorporates the earlier feedback/settings improvements from `codex/topology-ui-validation`, alongside main's larger topology labels and subsequent content fixes. The earlier feedback branch does not need to be merged separately if this branch is merged.

## Review boundaries

Review uses the development server on port 3197 with `.work/modern-ui-review` as its separate database directory and a device-only test profile. No production learner account or deployment is modified. Generated questions, grading, lab tasks, sandbox checks and storage code are unchanged.

Validation completed: `npm ci`, `npm run lint`, all 333 tests across 39 files, `npm run build`, and `npm run check:release`. The existing load-bearing generator, policy-order and sandbox-solution assertions were not edited. The locked install reports five existing moderate dependency advisories; dependency versions were not changed in this UI branch.

Browser review covered dark/light Home, 390px phone and 768px/1024px tablet layouts, all eight study sections, saved-quiz resume and track mismatch, starting the selected track, quiz settings, a correct standard answer, generated topology rendering, account-menu Escape, profile editing, and the active mobile navigation item following shortcut navigation. No horizontal page overflow was observed at those widths. Motion behavior was checked in CSS and the React MotionConfig configuration; OS motion preferences were not changed. Earlier topology feedback review covered correct and incorrect node/edge states.

The horizontal section row reveals the active item after navigation and resize without animating the page. Desktop and mobile screenshots are saved locally under the parent workspace's `.work/modern-ui-previews/` folder.
