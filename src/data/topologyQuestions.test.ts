import { describe, expect, it } from 'vitest';
import { examQuestions } from './questions';
import { topologyQuestions } from './topologyQuestions';
import { legacyTopologyScenes } from './legacyTopologyScenes';
import { generateQuestion, questionTemplates } from '../engine/templates';
import { gradeQuestion, validateQuestion } from '../engine/grading';
import type { TopologyDiagramData } from '../engine/topology';

/**
 * Conformance checks for topology contract v1 (src/engine/topology.ts, documented in
 * docs/visual-workstream.md). The renderer is built in the parallel visual workstream, so these
 * assertions are what keep authored content honest about the shape that renderer will receive:
 * resolvable edge endpoints, hotspot answers that really are options, and the spacing the contract
 * asks for so labels do not collide once the diagram is drawn.
 */

const NODE_KINDS = new Set(['firebox', 'router', 'switch', 'server', 'client', 'subnet', 'cloud']);
const ZONES = new Set(['trusted', 'external', 'optional', 'dmz', 'vpn']);
const EDGE_KINDS = new Set(['ethernet', 'vpn', 'wireless']);
/** Contract: reserve 105 units either side of a node center and 60 above and below. */
const PAD_X = 105;
const PAD_Y = 60;

function checkDiagram(label: string, diagram: TopologyDiagramData, options: readonly string[]) {
  expect(diagram.version, `${label} version`).toBe(1);
  expect(diagram.title.trim().length, `${label} title`).toBeGreaterThan(0);
  expect(diagram.nodes.length, `${label} nodes`).toBeGreaterThan(1);

  const nodeIds = new Set<string>();
  for (const node of diagram.nodes) {
    expect(nodeIds.has(node.id), `${label} duplicate node id ${node.id}`).toBe(false);
    nodeIds.add(node.id);
    expect(NODE_KINDS.has(node.kind), `${label} node ${node.id} kind ${node.kind}`).toBe(true);
    if (node.zone) expect(ZONES.has(node.zone), `${label} node ${node.id} zone ${node.zone}`).toBe(true);
    expect(node.label.trim().length, `${label} node ${node.id} label`).toBeGreaterThan(0);
    // Recommended label budget from the contract; details wrap, labels do not.
    expect(node.label.length, `${label} node ${node.id} label length`).toBeLessThanOrEqual(24);
    // Every node must sit far enough inside the canvas for its reserved box to fit.
    expect(node.x - PAD_X, `${label} node ${node.id} left edge`).toBeGreaterThanOrEqual(0);
    expect(node.x + PAD_X, `${label} node ${node.id} right edge`).toBeLessThanOrEqual(diagram.width);
    expect(node.y - PAD_Y, `${label} node ${node.id} top edge`).toBeGreaterThanOrEqual(0);
    expect(node.y + PAD_Y, `${label} node ${node.id} bottom edge`).toBeLessThanOrEqual(diagram.height);
  }

  // No two nodes may have overlapping reserved boxes.
  for (let i = 0; i < diagram.nodes.length; i++) {
    for (let j = i + 1; j < diagram.nodes.length; j++) {
      const a = diagram.nodes[i], b = diagram.nodes[j];
      const clears = Math.abs(a.x - b.x) >= PAD_X * 2 || Math.abs(a.y - b.y) >= PAD_Y * 2;
      expect(clears, `${label} nodes ${a.id} and ${b.id} overlap`).toBe(true);
    }
  }

  const edgeIds = new Set<string>();
  for (const edge of diagram.edges) {
    expect(edgeIds.has(edge.id), `${label} duplicate edge id ${edge.id}`).toBe(false);
    edgeIds.add(edge.id);
    expect(nodeIds.has(edge.from), `${label} edge ${edge.id} from ${edge.from}`).toBe(true);
    expect(nodeIds.has(edge.to), `${label} edge ${edge.id} to ${edge.to}`).toBe(true);
    expect(edge.from, `${label} edge ${edge.id} is a self-loop`).not.toBe(edge.to);
    if (edge.kind) expect(EDGE_KINDS.has(edge.kind), `${label} edge ${edge.id} kind`).toBe(true);
    if (edge.zone) expect(ZONES.has(edge.zone), `${label} edge ${edge.id} zone`).toBe(true);
  }

  const targets = new Set<string>();
  for (const hotspot of diagram.hotspots ?? []) {
    const key = `${hotspot.target}:${hotspot.targetId}`;
    // Contract: only one hotspot per target.
    expect(targets.has(key), `${label} duplicate hotspot on ${key}`).toBe(false);
    targets.add(key);
    const known = hotspot.target === 'node' ? nodeIds : edgeIds;
    expect(known.has(hotspot.targetId), `${label} hotspot target ${key}`).toBe(true);
    // A click has to select a real option, or grading can never see it.
    expect(options, `${label} hotspot answer for ${key}`).toContain(hotspot.answer);
  }
}

describe('topology contract v1 conformance', () => {
  it('authors at least a dozen diagram scenarios across both tracks', () => {
    expect(topologyQuestions.length).toBeGreaterThanOrEqual(12);
    expect(topologyQuestions.filter(q => q.track === 'network-plus').length).toBeGreaterThanOrEqual(4);
    expect(topologyQuestions.filter(q => q.track === 'local').length).toBeGreaterThanOrEqual(4);
    expect(new Set(topologyQuestions.map(q => q.id)).size).toBe(topologyQuestions.length);
    expect(new Set(topologyQuestions.map(q => q.question)).size).toBe(topologyQuestions.length);
  });

  it('keeps every authored scenario valid, gradable and diagram-backed', () => {
    for (const q of topologyQuestions) {
      validateQuestion(q);
      expect(q.type, `question ${q.id} type`).toBe('topology');
      expect(q.explanation?.length ?? 0, `question ${q.id} explanation`).toBeGreaterThan(40);
      expect(q.sources?.length ?? 0, `question ${q.id} sources`).toBeGreaterThan(0);
      expect(gradeQuestion(q, q.correctAnswers)).toBe(true);
      expect(gradeQuestion(q, [q.options.find(o => !q.correctAnswers.includes(o))!])).toBe(false);
      checkDiagram(`question ${q.id}`, q.topology!, q.options);
    }
  });

  it('repairs the Phase 2 questions that pointed at assets which were never added', () => {
    for (const id of Object.keys(legacyTopologyScenes).map(Number)) {
      const q = examQuestions.find(x => x.id === id)!;
      expect(q, `question ${id} still present`).toBeDefined();
      expect(q.topology, `question ${id} diagram`).toBeDefined();
      // The whole point of the repair: no question may reference a missing image again.
      expect(q.topologyImage, `question ${id} legacy image`).toBeUndefined();
      expect(q.hotspots, `question ${id} percentage hotspots`).toBeUndefined();
      validateQuestion(q);
      checkDiagram(`legacy question ${id}`, q.topology!, q.options);
    }
  });

  it('leaves no question in the whole bank pointing at a topology image file', () => {
    expect(examQuestions.filter(q => q.topologyImage)).toHaveLength(0);
  });

  it('keeps generated diagram templates conformant across seeds', () => {
    const diagramTemplates = questionTemplates.filter(t => t.id >= 10051 && t.id <= 10056);
    expect(diagramTemplates).toHaveLength(6);
    for (const template of diagramTemplates) {
      for (let seed = 0; seed < 120; seed++) {
        const q = generateQuestion({ templateId: template.id, seed, version: 1 });
        expect(q.type, `${template.title} type`).toBe('topology');
        expect(q.topology, `${template.title} diagram`).toBeDefined();
        checkDiagram(`${template.title} seed ${seed}`, q.topology!, q.options);
      }
    }
  });
});
