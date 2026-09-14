import { describe, expect, it } from 'vitest';
import { QUESTION_TWINS, twinGroup } from './questionTwins';
import { examQuestions } from './questions';
import { filterQuestions } from '../engine/catalog';
import { createMockExam } from '../engine/mockExam';

const byId = new Map(examQuestions.map(q => [q.id, q]));

describe('same-fact question groups', () => {
  it('name real questions, each in one group only, and stay inside one track', () => {
    const seen = new Set<number>();
    for (const group of QUESTION_TWINS) {
      expect(group.length, `${group}`).toBeGreaterThanOrEqual(2);
      for (const id of group) {
        expect(byId.has(id), `#${id} exists`).toBe(true);
        expect(seen.has(id), `#${id} is in one group`).toBe(false);
        seen.add(id);
      }
      expect(new Set(group.map(id => byId.get(id)!.track ?? 'local')).size, `${group} share a track`).toBe(1);
    }
  });

  const noTwinsTwice = (exam: { id: number; variant?: unknown }[]) => {
    const groups = exam.filter(q => !q.variant).map(q => twinGroup(q.id)).filter(g => g !== undefined);
    return new Set(groups).size === groups.length;
  };

  for (const track of ['local', 'network-plus', 'cloud'] as const) {
    it(`never puts two questions on the same fact into one ${track} mock exam`, () => {
      const pool = filterQuestions({ track });
      for (let seed = 1; seed <= 150; seed++) {
        const exam = createMockExam(pool, seed, track === 'local' ? 70 : 50);
        expect(noTwinsTwice(exam), `seed ${seed}`).toBe(true);
      }
    });
  }

  it('does not shorten a small filtered pool to remove a twin', () => {
    const pool = examQuestions.filter(q => q.id === 302 || q.id === 1188);
    expect(createMockExam(pool, 7, 50)).toHaveLength(2);
  });
});

describe('facts checked against the Network Security Essentials Study Guide', () => {
  const bank = examQuestions.map(q => [q.question, ...q.options, q.explanation ?? ''].join(' '));
  const mentions = (phrase: RegExp) => examQuestions.filter((_, i) => phrase.test(bank[i])).map(q => q.id);

  it('uses the Fireware multi-WAN method names', () => {
    // Failover, Round-robin, Routing Table and Interface Overflow (pp. 92-102). Spillover is another vendor's term.
    expect(mentions(/spillover|routing table cost|interface failover/i)).toEqual([]);
  });

  it('puts the SNAT action in the policy rather than writing the policy to the private address', () => {
    // "To use static NAT, you add a static NAT action to the To section of the policy" (p. 127).
    expect(mentions(/before (it looks for a matching policy|the policy lookup)|policy (has to be |is )?written to (the private|10\.)/i)).toEqual([]);
  });

  it('restores a backup image only to the Firebox that created it', () => {
    // "A backup image can only be restored to the device it was created from" (p. 20).
    expect(mentions(/identical model/i)).toEqual([]);
  });

  it('lists the authentication servers Mobile VPN with IKEv2 supports', () => {
    // Authentication Server Compatibility table: AuthPoint, RADIUS, Firebox-DB; AD only through RADIUS; no LDAP or SecurID.
    const ikev2 = byId.get(56)!;
    expect(ikev2.correctAnswers.sort()).toEqual(['AuthPoint', 'Firebox-DB', 'RADIUS']);
    expect(ikev2.correctAnswers).not.toContain('LDAP');
  });

  it('does not credit multi-WAN with BOVPN failover', () => {
    // "Multi-WAN does not impact BOVPNs or inbound traffic" (p. 92); failover uses Link Monitor and DPD (p. 287).
    expect(mentions(/rides on multi-wan/i)).toEqual([]);
  });
});
