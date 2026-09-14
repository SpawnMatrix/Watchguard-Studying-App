import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import FireboxSimulator, { PAGES, pageLabel } from './FireboxSimulator';
import { configuredFirebox, factoryDefault, simReduce, type FireboxSim, type PageId } from '../../engine/labSim';
import { handsOnLabs, simForStep } from '../../data/labTasks';

const render = (s: FireboxSim, page: PageId) =>
  renderToStaticMarkup(<FireboxSimulator s={s} dispatch={() => {}} page={page} onPage={() => {}} />);

describe('simulated Firebox pages', () => {
  it('renders every page of a configured Firebox without crashing', () => {
    // Put something on the pages that list things, so their populated branches render too.
    let s = simForStep(6, 4)!;
    s = simReduce(s, { type: 'ping', host: '8.8.4.4' });
    s = simReduce(s, { type: 'createBackup', name: 'nightly', key: 'lab-backup-key' });
    for (const item of PAGES.flatMap(g => g.items)) {
      const html = render(s, item.id);
      expect(html, item.id).toContain(item.label === 'Setup Wizard' ? 'Setup complete' : item.label === 'Management PC' ? 'Management PC' : item.label.split(' ')[0]);
      expect(html, item.id).not.toContain('available after the setup wizard');
    }
  });

  it('keeps configuration pages locked until a factory-default Firebox has been set up', () => {
    const s = factoryDefault();
    expect(render(s, 'policies')).toContain('available after the setup wizard');
    expect(render(s, 'bench')).toContain('Firebox power off');
    expect(render(s, 'wizard')).toContain('Power it on and cable this PC');
  });

  it('shows errors from the simulated device, such as an unreachable route gateway', () => {
    const s = simReduce(configuredFirebox(), { type: 'addRoute', route: { type: 'Host IPv4', destination: '8.8.4.4', prefix: 32, gateway: '192.168.10.200', metric: 1 } });
    expect(render(s, 'routes')).toMatch(/role="alert".*not on the network of any enabled interface/s);
  });

  it('names every task page in the menu, so "Open ..." buttons always lead somewhere', () => {
    for (const lab of Object.values(handsOnLabs)) {
      for (const task of Object.values(lab.tasks)) expect(pageLabel(task.page)).toContain(' > ');
    }
  });

  it('marks itself as a teaching simulation', () => {
    expect(render(configuredFirebox(), 'frontPanel')).toContain('Teaching simulation');
  });
});

describe('hands-on labs in the walkthrough', () => {
  const source = readFileSync(path.join(__dirname, '../LabWalkthrough.tsx'), 'utf8');

  it('shows the simulator beside the steps and steps the catalogue aside', () => {
    expect(source).toMatch(/<FireboxSimulator s=\{sim\} dispatch=\{simDispatch\} page=\{simPage\} onPage=\{setSimPage\} \/>/);
    expect(source).toMatch(/\$\{handsOn \? "hidden" : ""\} lg:col-span-4/);
  });

  it('rebuilds the simulator when a lab is opened, reset or restarted', () => {
    expect(source.match(/setSim\(simForStep\(/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
