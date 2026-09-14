import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { watchguardLabs } from '../data/labs';
import { handsOnLabs } from '../data/labTasks';
import LabOverview from './LabOverview';

const handsOnIds = Object.keys(handsOnLabs).map(Number);
const render = (progress = {}, completedLabs: string[] = []) => renderToStaticMarkup(
  <LabOverview labs={watchguardLabs} progress={progress} completedLabs={completedLabs} handsOnIds={handsOnIds} onSelect={() => {}} />);
const lab = (id: number) => watchguardLabs.find(l => l.id === id)!;

describe('lab overview', () => {
  it('offers the first lab to a new learner', () => {
    const html = render();
    expect(html).toContain(`0 of ${watchguardLabs.length} labs complete`);
    expect(html).toContain(`Start ${lab(1).name}`);
    expect(html).not.toContain('Resume');
  });

  it('puts the lab in progress first, then the next unstarted lab', () => {
    const html = render({ 3: { done: [0, 1], step: 2 } }, [lab(1).name]);
    expect(html).toContain(`1 of ${watchguardLabs.length} labs complete · 1 in progress`);
    expect(html).toContain(`Resume ${lab(3).name}`);
    expect(html).toContain(`2 of ${lab(3).steps.length} steps done`);
    expect(html).toContain(`Or start ${lab(2).name}`);
    expect(html.indexOf('Resume')).toBeLessThan(html.indexOf('Or start'));
  });

  it('lists every hands-on lab without repeating its number in the name', () => {
    const html = render();
    for (const id of handsOnIds) expect(html).toContain(lab(id).name.replace(/^Lab \d+:\s*/, ''));
    expect(html).not.toMatch(/Lab \d+: Lab \d+/);
  });

  it('says so when every lab is complete', () => {
    expect(render({}, watchguardLabs.map(l => l.name))).toContain('Every lab is complete.');
  });
});
