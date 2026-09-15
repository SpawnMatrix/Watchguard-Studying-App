import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import NetworkTopology from './NetworkTopology';
import TopologyQuizzer from './TopologyQuizzer';
import type { TopologyDiagramData } from '../engine/topology';
import type { Question } from '../data/questions';

const diagram: TopologyDiagramData = {
  version: 1, title: 'Feedback fixture', width: 700, height: 300,
  nodes: [
    { id: 'client', kind: 'client', label: 'Client', x: 120, y: 150 },
    { id: 'firebox', kind: 'firebox', label: 'Firebox', x: 580, y: 150 },
  ],
  edges: [{ id: 'link', from: 'client', to: 'firebox' }],
  hotspots: [
    { target: 'node', targetId: 'client', answer: 'Client' },
    { target: 'edge', targetId: 'link', answer: 'Link' },
  ],
};

describe('visible topology feedback', () => {
  it('distinguishes selected, correct and wrong hotspots without relying on color', () => {
    const props = { diagram, selected: ['Client'], correct: ['Link'], onSelect: () => {} };
    const before = renderToStaticMarkup(<NetworkTopology {...props}/>);
    expect(before).toContain('hotspot-marker is-selected');
    expect(before).not.toContain('hotspot-marker is-correct');
    expect(before).not.toContain('hotspot-marker is-incorrect');
    const after = renderToStaticMarkup(<NetworkTopology {...props} submitted/>);
    expect(after).toContain('hotspot-marker is-correct');
    expect(after).toContain('lucide-check');
    expect(after).toContain('hotspot-marker is-incorrect');
    expect(after).toContain('lucide-x');
    expect(after).not.toContain('hotspot-marker is-selected');
  });

  it('uses the legacy single answer for both diagram and button feedback', () => {
    // Old browser sessions can lack the newer correctAnswers array.
    const question = {
      id: 1, type: 'topology', question: 'Choose the link.', topic: 'Routing',
      options: ['Client', 'Link'], correctAnswer: 'Link',
      isMultiSelect: false, correctAnswersCount: 1, topology: diagram,
    } as Question;
    const html = renderToStaticMarkup(<TopologyQuizzer question={question}
      selectedOptions={['Link']} isSubmitted isLoading={false} onOptionToggle={() => {}}/>);
    expect(html).toContain('Link — correct answer');
    expect(html).toContain('hotspot-marker is-correct');
    expect(html).not.toContain('is-incorrect');
    expect(html).toContain('border-green-500');
  });
});
