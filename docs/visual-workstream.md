# Visual workstream contract

Branch: `codex/visual-topology-workstream`, based on main (ccf8e43). The separate lab/content branch is reference only.

Follow-through: `codex/topology-ui-validation` starts from current main `b1bcc15` (v1.15.0). The original requested diagram, global track selector, Study Home and collapsible quiz settings have already landed on main. This branch preserves those features and the v1 contract, and adds clearer answer feedback and settings navigation. The fetched `feature/expand-lab-book-and-sandbox` branch remains reference only.

## Topology contract v1 (stable)

The authoritative TypeScript interfaces are in `src/engine/topology.ts`. Authors add `topology: TopologyDiagramData` to a question and use `type: 'topology'`.

```ts
topology: {
  version: 1, title: 'Branch connection', width: 720, height: 320,
  description: 'Illustrative links; policy decisions are evaluated separately.',
  nodes: [
    { id: 'lan', kind: 'subnet', label: 'Trusted LAN', detail: '10.0.1.0/24', zone: 'trusted', x: 130, y: 160 },
    { id: 'fw', kind: 'firebox', label: 'Firebox', x: 560, y: 160 }
  ],
  edges: [{ id: 'eth1', from: 'lan', to: 'fw', label: 'Eth1', zone: 'trusted', flow: true }],
  hotspots: [{ target: 'node', targetId: 'fw', answer: 'Firebox' }]
}
```

Coordinates are node centers in SVG units. Reserve 105 units either side and 60 above/below each node; space centers at least 250 units apart. IDs must be unique within nodes/edges; edge endpoints must exist. Labels should be concise (24 characters recommended); details wrap. Zones: trusted, external, optional, dmz, vpn. Node kinds: firebox, router, switch, server, client, subnet, cloud. Link kinds: ethernet (default), vpn, wireless. A hotspot references a node or edge ID and an exact question option string. Only one hotspot per target. `active` on nodes and `flow` on edges are optional illustrative animation, never an indication of the correct answer. Grading remains in the existing quiz engine. SVG controls also have equivalent answer buttons for small screens and assistive technology.

Legacy image-name and generated label/detail adapters preserve question IDs, text, options and scoring. Future authors should use the structured contract rather than percentage hotspots or nonexistent assets.

## Global tracks

The shell selection is a per-username browser preference, independent of synchronized quiz/progress data. Default is Local Firebox. It filters flashcards and the Q&A question catalog and supplies the default for new quizzes. Existing saved quiz sessions (including mixed-track exams) remain resumable; a visible action applies a changed track and starts a fresh session while retaining history. Weakness review remains cross-track so no missed concept becomes inaccessible. Labs and sandbox remain shared local Firebox practice with an explicit coverage notice for other tracks; no cloud simulator is implied. Progress/home statistics remain lifetime totals across tracks, labeled as such. No account database migration is required.

## Validation

Run locked dependency install, TypeScript, all Vitest tests, production build, and a real dev-server browser pass including mobile, light/dark themes, track changes, and topology interactions. Never weaken generator, policy ordering, or guided challenge assertions.

Implemented review: npm ci, lint, 89 tests, and production build pass locally. Browser checks used an isolated SQLite fixture on a separate dev-server port: restored mixed-track exam, keyboard hotspot selection, wrong/correct grading, four legacy diagrams, both generated diagrams, track persistence on reload, track-specific flashcards/Q&A, lab/sandbox navigation, mobile page overflow, light/dark themes, report rendering, and admin session open/lock. All original assertions remain unchanged. Packet/node animations have an explicit reduced-motion override; this was checked in CSS, not through OS preference emulation.

Visual review: the home view uses an orange-accented resume card, lifetime statistics, topic bars, and a seven-day activity strip. Topology questions expand to the full content column; diagrams retain readable SVG units and scroll within their own region on phones, with normal answer buttons below. Quiz settings collapse into one disclosure row. Progress and account/tutor settings are separate views which remain mounted while switching, preserving form state.

The progress screen previously contained an older admin form rather than the existing secured AdminConsole; it now renders that component without modifying its authorization logic. ReportVisualization is wired to the existing report result. If the optional server analysis rejects a learner without an admin session, the existing local report builder still provides their own practice report.

### v1.15.1 visual follow-through

The same `TopologyDiagramData` contract remains authoritative, with no new required or optional content fields. Selected hotspots have a dot marker; submitted nodes and edges have check/cross markers in addition to green/red feedback. These markers are decorative: the existing keyboard controls and accessible correct/incorrect answer labels remain the source of interaction. Node pulses stop while selected or graded; packet motion still follows the pause control and reduced-motion CSS.

Submitted standard and topology answer buttons retain full opacity, with darker green/red text in light mode. Accounts & tutor settings has Personal tutor and Administrator sections using the existing console button pattern; changing sections keeps both forms mounted. Mobile administrator inputs and actions stack within the card.

Track behavior is unchanged: the exact three header choices plus disabled More coming soon remain persistent per browser username. Q&A, flashcards and the topology catalog filter immediately; new quizzes use the header track. A saved quiz requires the explicit Start [track] session action before its track changes. Labs and Network Sandbox retain local Firebox exercises with a coverage notice. Home totals remain across tracks; the newer exam-readiness view on Progress filters to the selected exam track. No progress schema, account data or database migration changes are involved.

Validation for this follow-through: `npm ci`, `npm run lint`, all 333 tests in 39 files, `npm run build` and `npm run check:release` passed. The load-bearing generator, ordered-policy and guided-challenge tests were not edited. Browser review used `npm run dev` on port 3197 with a separate `.work/ui-review-data` database and a disposable device-only profile. Checked keyboard node selection, wrong-node/correct-edge grading, light/dark diagram and answer styles, pause/fit controls, a 390px mobile viewport without page overflow, the three track choices, persistence after reload and re-entering the device profile, saved-quiz track mismatch notice, flashcard reveal, Cloud Q&A, labs, sandbox, home progress and settings navigation. Server-authorized administrator operations are covered by the existing tests; no real account or production data was used. Reduced motion was verified in the CSS rules, not by changing the operating-system preference.

Dockerfile, workflow files, production data, and the separate lab/content branch are unchanged. GitHub's existing checks cover Node 22/24 and container replacement with persisted account data. The preexisting working-tree edit in deploy/docker/update-watchguard.sh is excluded from this branch's commits.
