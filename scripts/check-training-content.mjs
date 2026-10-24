import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const { labs, checkpoints } = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '-e',
  "import {trainingLabs,trainingCheckpoints} from './src/data/trainingLabs2026.ts'; console.log(JSON.stringify({labs:trainingLabs,checkpoints:trainingCheckpoints}))"], { encoding: 'utf8' }));
const browser = await chromium.launch();
try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto((process.env.A11Y_URL || 'http://127.0.0.1:3000') + '/#labs');
    await page.getByPlaceholder('e.g. packet_pilot').fill('training_review');
    await page.getByRole('button', { name: /this device only/i }).click();
    for (const lab of labs) {
      await page.getByRole('button', { name: new RegExp(lab.name) }).first().click();
      for (const step of lab.steps) {
        const checkpoint = checkpoints[`${lab.id}.${step.stepNumber}`];
        await page.getByText(checkpoint.question, { exact: true }).waitFor();
        const proceed = page.getByRole('button', { name: step.stepNumber === 4 ? 'Complete Lab Exercise' : 'Confirm Completion & Proceed', exact: true });
        assert.equal(await proceed.isEnabled(), false);
        if (step.stepNumber === 1) {
          await page.getByRole('group', { name: 'Checkpoint answers' }).getByRole('button', { name: checkpoint.options[1], exact: true }).click();
          assert.equal(await proceed.isEnabled(), false);
          await page.getByRole('button', { name: 'Try again', exact: true }).click();
        }
        await page.getByRole('group', { name: 'Checkpoint answers' }).getByRole('button', { name: checkpoint.answer, exact: true }).click();
        await proceed.click();
      }
      await page.getByRole('heading', { name: 'Lab complete', exact: true }).waitFor();
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('watchguard-lab-progress-v1')));
      assert.equal(saved[lab.id].done.length, 4);
      await page.getByRole('button', { name: 'Back to Catalog', exact: true }).click();
    }
    assert.deepEqual(errors, []);
    console.log(`${width}px: all three training walkthroughs, 12 checkpoint gates, retries, completion and saved progress passed.`);
    await page.close();
  }
} finally { await browser.close(); }
