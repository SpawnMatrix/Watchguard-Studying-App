import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import NetworkTopology from './NetworkTopology';
import TopologyQuizzer from './TopologyQuizzer';
import StandardQuizzer from './StandardQuizzer';
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
    { target: 'node', targetId: 'firebox', answer: 'Firebox' },
  ],
};

describe('answer review feedback', () => {
  it('marks selected, correct and wrong diagram nodes with a shape, not only a colour', () => {
    const props = { diagram, selected: ['Client'], correct: ['Firebox'], onSelect: () => {} };
    const before = renderToStaticMarkup(<NetworkTopology {...props}/>);
    expect(before).toContain('hotspot-marker is-selected');
    expect(before).not.toMatch(/hotspot-marker is-(correct|incorrect)/);
    const after = renderToStaticMarkup(<NetworkTopology {...props} submitted/>);
    expect(after).toContain('hotspot-marker is-correct');
    expect(after).toContain('lucide-check');
    expect(after).toContain('hotspot-marker is-incorrect');
    expect(after).toContain('lucide-x');
    expect(after).not.toContain('hotspot-marker is-selected');
  });

  it('uses the legacy single answer for both the diagram and the buttons', () => {
    // Sessions saved by older builds can lack the correctAnswers array.
    const question = {
      id: 1, type: 'topology', question: 'Choose the firewall.', topic: 'Routing',
      options: ['Client', 'Firebox'], correctAnswer: 'Firebox',
      isMultiSelect: false, correctAnswersCount: 1, topology: diagram,
    } as Question;
    const html = renderToStaticMarkup(<TopologyQuizzer question={question}
      selectedOptions={['Firebox']} isSubmitted isLoading={false} onOptionToggle={() => {}}/>);
    expect(html).toContain('Firebox — correct answer');
    expect(html).toContain('hotspot-marker is-correct');
    expect(html).not.toContain('is-incorrect');
    expect(html).toContain('data-answer-state="correct"');
  });

  it('tags every submitted option so the theme can keep it readable', () => {
    const question = {
      id: 2, question: 'Pick one.', topic: 'Initial Setup', options: ['Right', 'Wrong', 'Ignored'],
      correctAnswer: 'Right', correctAnswers: ['Right'], isMultiSelect: false, correctAnswersCount: 1,
    } as Question;
    const states = (submitted: boolean) => [...renderToStaticMarkup(<StandardQuizzer question={question}
      selectedOptions={['Wrong']} isSubmitted={submitted} isLoading={false} onOptionToggle={() => {}}/>)
      .matchAll(/data-answer-state="(\w+)"/g)].map(m => m[1]);
    expect(states(false)).toEqual([]);
    expect(states(true)).toEqual(['correct', 'incorrect', 'other']);
  });
});
