import { writeFileSync } from 'node:fs';
import { studyQuestions } from '../src/engine/catalog';
import { createMockExam } from '../src/engine/mockExam';
import { coverageQuestions } from '../src/data/coverageQuestions';
import { NSE_WEIGHTS, nseCategory } from '../src/data/nseBlueprint';
import { N10_009_WEIGHTS, NETWORK_PLUS_DOMAIN } from '../src/data/networkPlusBlueprint';
import { objectiveRows, appliedIds, expand } from './coverage-map';

const SEEDS = 2000;
const added = new Set(coverageQuestions.map(q => q.id));
const applied = new Set([...expand(appliedIds), ...added]);
const pct = (n: number) => `${n.toFixed(2)}%`;
const report: string[] = [`# Exam coverage audit — 1.16.0

Audited 2026-09-19 against main 031a843. Reproduce: \`npx tsx scripts/audit-exam-coverage.ts\`.

## Evidence and scope

- **Local:** supplied WatchGuard *Network Security Essentials for Locally-Managed Fireboxes*, March 2023 / Fireware 12.9.2, printed pp. 336–338. Every assessment knowledge-area bullet is represented below. Row identifiers after the category number are audit identifiers, not vendor numbering. The source PDF is deliberately not redistributed. This verifies the repository's historical baseline, not a claim that the current live exam is unchanged.
- **Network+:** [CompTIA's N10-009 objectives, document v6.0](https://lecbyo.files.cmp.optimizely.com/download/35a7403ab73211ef9dcda6f347fbf652), pp. 3–14, accessed 2026-09-19. All 25 numbered objectives are mapped. The older v4.0 link in the repository is not evidence of current completeness. Weights remain 23/20/19/14/24. CompTIA publishes domain weights, not objective weights.
- **Cloud:** the official [study-guide portal](https://www.watchguard.com/wgrd-training/exam-study-guides) returned 401. The [WatchGuard-authored June 2022 guide, mirrored on StudyLib](https://studylib.net/doc/28453724/watchguard-network-security-essentials-study-guide-cloud-...), pp. 174–175, supplies a **provisional historical checklist**, not independently authenticated current exam criteria. Its category weights are 18/12/25/30/15. All its knowledge-area bullets appear below. Current behavior for new Cloud scenarios is sourced to individual WatchGuard Help pages on each question. No Cloud blueprint or pass-readiness claim is introduced from this unverified-current outline.

## Counting and depth

Each authored question is one item; each template is one concept, irrespective of generated variants. Existing same-fact twins remain in bank counts; the actual mock sampler handles their suppression. Every catalog item has exactly one reviewed **primary** objective or an explicit supplementary classification in \`scripts/coverage-map.ts\`. This prevents broad section metadata from claiming several objectives per question. A second skill mentioned in a distractor does not count as coverage. The ID ledger below makes each classification reviewable.

**A** = applied: interpreting evidence, calculation, or a decision under stated constraints. **R** = recall, including a definition dressed as a scenario or a memorized UI location. These are editorial judgments, independent of the existing section-wide \`difficulty: applied\` labels. One scenario does not establish mastery or cover every example under an objective. In particular, Network+ performance-based skill coverage cannot be inferred from multiple-choice counts. Labs are not counted as questions or mock draws; the 20 existing lab walkthroughs do not fill a missing quiz objective merely by existing.

**Before → after** separates this PR from the baseline. Draw percentages are measured from the real \`createMockExam\` function: 2,000 deterministic seeds (0–1999), 50 questions each, whole track, all topics/formats, mixed authored/generated. They include twin suppression, integer quotas, and template reuse. They are empirical shares, not a promise about each seed. Filtered sessions can fall back to uniform sampling. Vendors do not publish per-objective percentages, so no equal-split objective target is invented.

## Findings that change how to use the bank

- The main gaps before this change were Network+ **1.2 appliances/functions** and **3.5 management/access**, and Local **content actions/domain rules**. This PR adds 7 Network+, 5 Local, and 16 Cloud scenarios (28 total). All three previously empty Local/Network+ rows now have applied questions.
- Cloud had **33 concepts (32 authored + 1 template)** versus Local's **485 (436 + 49)**: only 6.8% as many concepts. It now has 49, versus Local's 490. Sixteen original Cloud items are adjacent products, local-device visibility, or generic administration and are deliberately not credited as cloud-managed configuration coverage. Adding cloud-management words to a prompt does not close a networking or VPN objective.
- Cloud's sole generated template, **10029**, asks where configuration is managed. At baseline the sampler repeats it **21 times in a 50-question mock (42%)** after twin suppression leaves 29 authored items. After these additions it still repeats five times (10%). These are the same skill, not twenty-one distinct scenarios. Cloud mocks remain unsuitable as evidence of full exam readiness.
- **Overweight:** Cloud setup/monitoring receives 66% of baseline draws against the historical 12% weight (5.5 times the target), falling to 34% after additions (still 2.8 times). Local authentication/VPN has 19.39% of bank items against 15%; quotas limit its mock share. Network+ concepts occupy 27.07% of the audited bank against 23%, with an actual 25.62% draw. No vendor objective-level weights are published, so heavy objectives such as IPv4 subnetting or local subscription services cannot honestly be called over their individual exam weight. Their exact counts and draws are shown below.
- Local and Network+ have fixed **engine-category** quotas (Local 5/5/7/13/13/7; Network+ 12/10/9/7/12). Balanced quota totals conceal large differences inside categories. Cloud has no quota enforcement. The category tables below compare semantic coverage with published weights, including supplementary draw share instead of silently assigning it to an objective.
- Some existing engine placements disagree with the primary skill: Network+ 1327–1329 are ports/protocols but drawn from Operations; 1348 is a PoE fault but drawn from Implementation. Local 1069 is a status-tool question drawn from Networking; 1133 is logging drawn from Policies; 1105 is VPN NAT drawn from Networking. This audit reports their **actual** draw; it does not relabel them to make the figures look balanced or change the production sampling algorithm.
- The Network+ numbered objectives all have at least one item after this PR, but example-level holes remain: SAN/NAS/CDN, several media/connector types, VXLAN/SASE and IPv6 transition design are not adequately exercised. Local WINS has no dedicated scenario even though the combined WINS/DNS row has DNS questions. Cloud IPv6 is not taught by the new IPv4 item. These are incomplete subskills, not proof that a broad objective is complete.
`];

for (const [track, rows] of Object.entries(objectiveRows)) {
  const pool = studyQuestions.filter(q => (q.track ?? 'local') === track);
  const before = pool.filter(q => !added.has(q.id));
  const mapping = new Map<number, string>();
  for (const [label, spec] of rows) for (const id of expand(spec)) {
    if (mapping.has(id)) throw new Error(`Duplicate mapping ${id}`);
    mapping.set(id, label);
  }
  for (const q of pool.filter(q => added.has(q.id))) {
    const code = q.objective!.split(' ')[0];
    const row = rows.find(([label]) => label.split(' ')[0] === code);
    if (!row) throw new Error(`No objective for new question ${q.id}`);
    mapping.set(q.id, row[0]);
  }
  for (const q of pool) if (!mapping.has(q.id)) throw new Error(`Unmapped ${q.id}`);
  for (const id of mapping.keys()) if (!pool.some(q => q.id === id)) throw new Error(`Stale mapping ${id}`);
  const sample = (bank: typeof pool) => {
    const counts = new Map<string, number>();
    for (let seed = 0; seed < SEEDS; seed++) {
      const exam = createMockExam(bank, seed, 50);
      if (exam.length !== 50) throw new Error(`Short mock: ${track}`);
      for (const q of exam) {
        const label = mapping.get(q.id)!;
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }
    return counts;
  };
  const oldDraw = sample(before), draw = sample(pool);
  const share = (counts: Map<string, number>, label: string) => (counts.get(label) ?? 0) / (SEEDS * 50) * 100;
  report.push(`\n## ${track}\n\n${before.length} → ${pool.length} concepts. ${pool.filter(q => q.variant).length} templates after the change.\n`);
  const weights = track === 'local' ? NSE_WEIGHTS : track === 'network-plus' ? N10_009_WEIGHTS : {
    1: { name: 'Basics', weight: 18 }, 2: { name: 'Setup and monitoring', weight: 12 },
    3: { name: 'Networking', weight: 25 }, 4: { name: 'Policies and services', weight: 30 }, 5: { name: 'Authentication and VPN', weight: 15 },
  };
  report.push('| Category | Published weight | Concepts after | Bank share | Actual draw before → after |\n|---|---:|---:|---:|---:|');
  for (const [category, data] of Object.entries(weights)) {
    const labels = rows.map(r => r[0]).filter(l => l.startsWith(category + '.'));
    const count = pool.filter(q => labels.includes(mapping.get(q.id)!)).length;
    const total = (m: Map<string, number>) => labels.reduce((n, l) => n + share(m, l), 0);
    report.push(`| ${category}. ${data.name} | ${data.weight}% | ${count} | ${pct(count / pool.length * 100)} | ${pct(total(oldDraw))} → ${pct(total(draw))} |`);
  }
  report.push('\n| Objective | Questions before → after | A / R after | Actual draw before → after | Depth / gaps | Question IDs (after) |\n|---|---:|---:|---:|---|---|');
  for (const [label] of rows) {
    const qs = pool.filter(q => mapping.get(q.id) === label);
    const a = qs.filter(q => applied.has(q.id)).length;
    const flag = !qs.length ? '**NO COVERAGE**' : !a ? '**RECALL ONLY**' : a === 1 ? 'Only one applied item' : 'Some applied coverage';
    report.push(`| ${label} | ${qs.filter(q => !added.has(q.id)).length} → ${qs.length} | ${a} / ${qs.length - a} | ${pct(share(oldDraw, label))} → ${pct(share(draw, label))} | ${flag} | ${qs.map(q => q.id).join(', ') || '—'} |`);
  }
  const missing = rows.filter(([l]) => !pool.some(q => mapping.get(q.id) === l)).map(r => r[0]);
  const recall = rows.filter(([l]) => pool.some(q => mapping.get(q.id) === l) && !pool.some(q => mapping.get(q.id) === l && applied.has(q.id))).map(r => r[0]);
  report.push(`\n**Still empty:** ${missing.join('; ') || 'None at this objective granularity'}.\n\n**Recall only:** ${recall.join('; ') || 'None'}.\n`);
  // Engine categories are deliberately not the editorial objective mapping.
  if (track !== 'cloud') {
    const classify = track === 'local' ? nseCategory : (q: typeof pool[number]) => NETWORK_PLUS_DOMAIN[q.id];
    report.push('Engine-category bank counts after: ' + Object.keys(weights).map(c => `${c}: ${pool.filter(q => classify(q) === Number(c)).length}`).join(', ') + '.\n');
  }
}

const gap = (q: typeof coverageQuestions[number]) => q.correctAnswer.length - Math.max(...q.options.filter(o => o !== q.correctAnswer).map(o => o.length));
const strict = coverageQuestions.filter(q => gap(q) > 0).length;
const ties = coverageQuestions.filter(q => gap(q) === 0).length;
const visible = coverageQuestions.filter(q => gap(q) > 4);
report.push(`\n## New-question length measurement\n\n${coverageQuestions.length} four-option, single-answer questions. Correct answer strictly longest: **${strict}/${coverageQuestions.length} (${pct(strict / coverageQuestions.length * 100)})**; tied for longest: ${ties}; more than four characters longer than every distractor: **${visible.length}**. This uses string length, the same metric as \`answerLength.test.ts\`. Maximum positive gap: ${Math.max(...coverageQuestions.map(gap))} characters. It measures only new questions, so the old bank cannot dilute a bias.\n\nThe protected answer-length, lab-checkpoint, engine and phase2 guards are unchanged. New scenarios include a reason each distractor fails under the stated constraints.\n`);
if (visible.length || strict / coverageQuestions.length > .35) throw new Error(`New-question answer length failed: ${visible.map(q => q.id)}`);
writeFileSync('docs/exam-coverage.md', report.join('\n'));
console.log(`Wrote docs/exam-coverage.md. New answer-longest: ${strict}/${coverageQuestions.length}; ties ${ties}; visible tells ${visible.length}.`);

