// Accessibility sweep: every section, in both themes, checked with axe-core against WCAG 2.1 A/AA.
//
// 1.22.1 found the correct answer rendering at 1.78:1 contrast in light mode. It had been like that
// for 22 releases, because nothing looked. This looks: it opens the account gate, then each section,
// in dark and light, plus the quiz after an answer is checked (where that bug lived), and fails on
// any violation not explained in scripts/a11y-allowlist.json.
//
// Usage: A11Y_URL=http://127.0.0.1:3000 node scripts/a11y.mjs   (a running production build)
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const base = process.env.A11Y_URL || 'http://127.0.0.1:3000';
const SECTIONS = ['home', 'chat', 'quiz', 'topology', 'labs', 'flashcards', 'sandbox', 'admin', 'news', 'ideas'];
const THEMES = ['dark', 'light'];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const allowlist = JSON.parse(readFileSync(new URL('./a11y-allowlist.json', import.meta.url), 'utf8'));

const browser = await chromium.launch();
const failures = [];
let checked = 0;

async function open(theme, hash, passGate = true) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await context.addInitScript(t => { try { localStorage.setItem('watchguard-portal-theme', t); } catch {} }, theme);
  const page = await context.newPage();
  await page.goto(`${base}/${hash ? `#${hash}` : ''}`, { waitUntil: 'networkidle' });
  if (passGate) {
    await page.getByPlaceholder('e.g. packet_pilot').fill('a11y_check');
    await page.getByRole('button', { name: /this device only/i }).click();
    await page.locator('#study-content .section-enter').waitFor();
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !document.querySelector('.section-loading'));
  }
  return { context, page };
}

async function check(page, name) {
  checked++;
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  for (const v of violations) {
    const allowed = allowlist[v.id];
    if (allowed && (allowed.everywhere || allowed.where?.some(w => name.startsWith(w)))) continue;
    failures.push({ where: name, rule: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length,
      examples: v.nodes.slice(0, 3).map(n => `${n.target.join(' ')} — ${n.failureSummary?.split('\n').slice(1, 2).join(' ').trim()}`) });
  }
}

for (const theme of THEMES) {
  {
    const { context, page } = await open(theme, '', false);
    await page.getByPlaceholder('e.g. packet_pilot').waitFor();
    await check(page, `gate/${theme}`);
    await context.close();
  }
  for (const section of SECTIONS) {
    const { context, page } = await open(theme, section);
    await check(page, `${section}/${theme}`);
    if (section === 'quiz') {
      // The answer review state: where the 1.78:1 contrast bug was. Multiple choice, so the first
      // question always has options to pick whatever the random draw would have been.
      await page.locator('.quiz-filter-drawer summary').click();
      await page.getByLabel('Question format').selectOption('standard');
      await page.locator('[data-quiz-option]').first().click();
      await page.getByRole('button', { name: 'Check answer' }).click();
      await page.locator('[data-answer-state]').first().waitFor();
      await check(page, `quiz-reviewed/${theme}`);
    }
    await context.close();
  }
}
await browser.close();

const byRule = new Map();
for (const f of failures) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
console.log(`Checked ${checked} screens against ${TAGS.join(', ')}.`);
if (!failures.length) { console.log('No accessibility violations.'); process.exit(0); }
for (const [rule, list] of byRule) {
  console.log(`\n✗ ${rule} (${list[0].impact}): ${list[0].help}`);
  for (const f of list) console.log(`  ${f.where}: ${f.nodes} element${f.nodes === 1 ? '' : 's'}${f.examples.map(e => `\n      ${e}`).join('')}`);
}
console.log(`\n${failures.length} violation group(s). Fix them, or explain one in scripts/a11y-allowlist.json.`);
process.exit(1);
