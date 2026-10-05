import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// The key field reads its saved value during render; node has no browser storage.
const memory = new Map<string, string>();
Object.assign(globalThis, { localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) } });
const { default: AdminConsole } = await import('./AdminConsole');

describe('accounts & tutor settings', () => {
  const html = renderToStaticMarkup(<AdminConsole displayName="learner_one"/>);
  const section = (label: string) => html.match(new RegExp(`<section[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? '';

  it('opens on the learner’s own tutor settings', () => {
    expect(section('Personal tutor')).not.toContain('hidden');
    expect(html).toContain('Your Gemini API key');
  });

  it('keeps the administrator view mounted but hidden, so switching never loses typed input', () => {
    expect(section('Administrator')).toMatch(/hidden=""/);
    expect(html).toContain('Administrator Controls');
  });

  it('says which view is showing to assistive technology', () => {
    expect(html).toMatch(/aria-pressed="true"[^>]*>Personal tutor</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Administrator</);
  });
});
