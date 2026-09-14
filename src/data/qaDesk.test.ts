import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { LOCAL_QA_DATABASE } from './qaDesk';

const byQuestion = (fragment: string) => {
  const item = LOCAL_QA_DATABASE.find(q => q.question.toLowerCase().includes(fragment.toLowerCase()));
  if (!item) throw new Error(`No Q&A item about "${fragment}"`);
  return item.answer;
};
const all = LOCAL_QA_DATABASE.map(q => `${q.question}\n${q.answer}`).join('\n');

describe('Q&A Desk study notes', () => {
  it('have unique ids, a known category, keywords and a documentation link', () => {
    expect(new Set(LOCAL_QA_DATABASE.map(q => q.id)).size).toBe(LOCAL_QA_DATABASE.length);
    for (const q of LOCAL_QA_DATABASE) {
      expect(['Setup', 'Policies', 'Routing', 'VPN', 'Diagnostics'], `#${q.id}`).toContain(q.category);
      expect(q.keywords.length, `#${q.id}`).toBeGreaterThan(3);
      expect(q.refLink, `#${q.id}`).toMatch(/^https:\/\/www\.watchguard\.com\//);
    }
  });

  it('never leave a bold or code mark unclosed, which would print the raw asterisks', () => {
    for (const q of LOCAL_QA_DATABASE) {
      expect((q.answer.match(/\*\*/g) ?? []).length % 2, `#${q.id} bold`).toBe(0);
      expect((q.answer.match(/`/g) ?? []).length % 2, `#${q.id} code`).toBe(0);
    }
  });

  it('are what the Q&A Desk shows for the Local Firebox track', () => {
    const chat = readFileSync(path.join(__dirname, '..', 'components', 'GeneralChat.tsx'), 'utf8');
    expect(chat).toMatch(/import \{ LOCAL_QA_DATABASE \} from "\.\.\/data\/qaDesk"/);
    expect(chat).not.toMatch(/const LOCAL_QA_DATABASE/);
  });
});

describe('Q&A Desk facts checked against the Study Guide', () => {
  it('gives the management ports from the WatchGuard and WatchGuard Web UI policies', () => {
    const ports = byQuestion('ports are used to manage');
    for (const port of ['8080', '4117', '4118']) expect(ports).toContain(port);
    expect(all).not.toContain('4105');
  });

  it('describes the factory-default optional interfaces', () => {
    expect(byQuestion('default interface settings')).toContain('10.0.x.1/24');
  });

  it('names the four multi-WAN methods, with Routing Table as ECMP', () => {
    const methods = byQuestion('Multi-WAN configuration modes');
    for (const name of ['Failover', 'Round-robin', 'Routing Table', 'Interface Overflow', 'ECMP']) expect(methods).toContain(name);
  });

  it('keeps PFS in the Phase 2 settings shared by both BOVPN types', () => {
    expect(byQuestion('Virtual Interface BOVPN')).not.toMatch(/PFS\)? is applied (directly )?on the policy/i);
    expect(byQuestion('Phase 1 and Phase 2')).toMatch(/Phase 2[^•]*Perfect Forward Secrecy/);
  });

  it('lists only the WebBlocker actions Fireware has', () => {
    const webBlocker = byQuestion('WebBlocker categories');
    expect(webBlocker).toMatch(/\*\*Allow\*\*[\s\S]*\*\*Deny\*\*[\s\S]*\*\*Warn\*\*/);
    expect(webBlocker).not.toMatch(/\*\*Drop\*\*/);
  });

  it('describes ThreatSync rather than the retired TDR Host Sensor as current', () => {
    expect(byQuestion('ThreatSync')).toMatch(/XDR/);
    expect(all).not.toMatch(/Host Sensors?:/);
  });

  it('publishes a server by putting the SNAT action in the policy', () => {
    expect(byQuestion('static NAT (SNAT)')).toMatch(/SNAT action to the \*\*To\*\* section/);
  });

  it('restores a backup image only to the Firebox that created it', () => {
    expect(byQuestion('FXI and XML')).toMatch(/only to the Firebox it was created from/);
  });
});
