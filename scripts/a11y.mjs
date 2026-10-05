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
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const fixtures = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('./a11y-fixtures.ts', import.meta.url))], { encoding: 'utf8' }));

const base = process.env.A11Y_URL || 'http://127.0.0.1:3000';
const SECTIONS = ['home', 'chat', 'quiz', 'topology', 'labs', 'flashcards', 'sandbox', 'admin', 'news', 'ideas'];
const THEMES = ['dark', 'light'];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const allowlist = JSON.parse(readFileSync(new URL('./a11y-allowlist.json', import.meta.url), 'utf8'));

const browser = await chromium.launch();
const failures = [];
let checked = 0;

async function open(theme, hash, passGate = true, setup) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await context.addInitScript(t => { try { localStorage.setItem('watchguard-portal-theme', t); } catch {} }, theme);
  const page = await context.newPage();
  if (setup) await setup(context, page);
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
  await page.evaluate(() => document.fonts.ready);
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
    if (section === 'home') {
      await page.getByRole('button', { name: 'Edit display name', exact: true }).click();
      await page.getByRole('dialog', { name: 'Edit your display name' }).waitFor();
      await check(page, `profile-dialog/${theme}`);
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    }
    if (section === 'chat') {
      for (const track of ['local', 'cloud', 'network-plus']) {
        await page.getByLabel('Learning track', { exact: true }).selectOption(track);
        const note = page.locator('button').filter({ has: page.locator('h4') }).first();
        await note.click();
        await page.getByText('Keywords:', { exact: true }).waitFor();
        await check(page, `qa-expanded-${track}/${theme}`);
      }
    }
    if (section === 'admin') {
      for (const track of ['local', 'network-plus', 'cloud']) {
        await page.getByLabel('Learning track', { exact: true }).selectOption(track);
        const date = new Date(); date.setDate(date.getDate() + 24);
        const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        await page.getByLabel(/When do you sit/).fill(iso);
        await page.getByRole('button', { name: 'Plan my days', exact: true }).click();
        await page.getByRole('button', { name: 'Change date', exact: true }).waitFor();
        await check(page, `exam-plan-${track}/${theme}`);
      }
    }
    await context.close();
  }
  {
    const { context, page } = await open(theme, '', false);
    await page.getByRole('button', { name: 'Sign in', exact: true }).first().click();
    await check(page, `signin-dialog/${theme}`);
    await page.getByRole('button', { name: 'Forgot your PIN?', exact: true }).click();
    await page.getByLabel('Recovery code', { exact: true }).waitFor();
    await check(page, `recovery-dialog/${theme}`);
    await page.getByRole('button', { name: 'Lost your recovery code too?', exact: true }).click();
    await page.getByRole('button', { name: 'Give me a code', exact: true }).waitFor();
    await check(page, `assisted-recovery-dialog/${theme}`);
    await context.close();
  }
  {
    const { context, page } = await open(theme, 'labs', true, async context => {
      await context.addInitScript(progress => localStorage.setItem('watchguard-lab-progress-v1', JSON.stringify(progress)), fixtures.lab.progress);
    });
    await page.getByRole('button').filter({ has: page.getByRole('heading', { name: fixtures.lab.name, exact: true }) }).first().click();
    await page.getByRole('heading', { name: 'Lab complete', exact: true }).waitFor();
    await check(page, `lab-complete/${theme}`);
    await context.close();
  }
  {
    // Fixture responses exercise populated markup without posting to or modifying any server.
    const { context, page } = await open(theme, 'ideas', true, async (_context, page) => {
      await page.route('**/api/suggestions', route => route.fulfill({ json: { suggestions:
        ['open', 'planned', 'shipped'].map((status, i) => ({ id: i + 1, body: `Accessibility fixture ${status}: **study idea**`,
          displayName: i === 1 ? 'fixture_author' : null, status, adminReply: 'Thanks for the suggestion. **Update** available here.',
          createdAt: Date.now(), updatedAt: Date.now() })) } }));
    });
    await page.getByText('fixture_author', { exact: true }).waitFor();
    await check(page, `ideas-populated/${theme}`);
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
