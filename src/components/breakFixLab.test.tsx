import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import BreakFixLab from './BreakFixLab';
import BreakFixInspector from './BreakFixInspector';
import { createScenario, deviceLabels } from '../engine/breakfix';

describe('break/fix lab rendering', () => {
  it('opens on the ticket, the failing tests and the Firebox inspector', () => {
    const seed = 2; // deny-above
    const { fault } = createScenario(seed);
    const html = renderToStaticMarkup(<BreakFixLab initialSeed={seed} onExit={() => {}} />);
    expect(html).toContain('Help desk ticket');
    expect(html).toContain(fault.ticket.replace(/'/g, '&#x27;'));
    expect(html).toContain('Run tests');
    expect(html.match(/class="is-fail"/g)?.length).toBeGreaterThan(0);
    expect(html).toContain('Firewall policies');
    // The answer is not on screen until it is solved or revealed.
    expect(html).not.toContain(fault.title);
    expect(html).not.toContain('Network fixed');
  });

  it('never renders a hint before one is asked for', () => {
    const { fault } = createScenario(6);
    const html = renderToStaticMarkup(<BreakFixLab initialSeed={6} onExit={() => {}} />);
    expect(html).toContain('Get a hint');
    expect(html).not.toContain(`check: ${fault.setting}`);
  });

  it('gives every device an inspector without crashing', () => {
    const { broken } = createScenario(11);
    for (const device of Object.keys(deviceLabels)) {
      const html = renderToStaticMarkup(<BreakFixInspector device={device} net={broken} onChange={() => {}} />);
      expect(html, device).toContain(deviceLabels[device] === 'Firebox' ? 'Firebox' : deviceLabels[device]);
    }
  });

  it('shows a DHCP client its lease rather than editable fields', () => {
    const { broken } = createScenario(36); // dhcp-scope
    const html = renderToStaticMarkup(<BreakFixInspector device="pc1" net={broken} onChange={() => {}} />);
    expect(html).toContain('169.254');
    expect(html).not.toContain('<input');
  });

  it('is reachable from the Topology Lab', () => {
    const studio = readFileSync(path.join(__dirname, 'TopologyStudio.tsx'), 'utf8');
    expect(studio).toMatch(/Fix a broken network/);
    expect(studio).toMatch(/<BreakFixLab onExit=\{\(\)=>setTroubleshooting\(false\)\}\/>/);
  });
});
