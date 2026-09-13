import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { watchguardLabs } from '../data/labs';

/**
 * Guards the layout regression from completing the lab catalogue.
 *
 * Going from 8 labs to 20 nearly tripled the catalogue column. The two columns sit in a CSS grid,
 * and a grid row stretches to its tallest item, so the walkthrough pane inflated to match: measured
 * at 2897px, with the step-completion footer pinned at its bottom, 2847px down the page behind a
 * wall of empty space. The button was rendered and reachable only by scrolling past nothing.
 *
 * Nothing about that is visible to a render test - the markup was correct throughout - so this
 * asserts the constraint that actually prevents it: each column caps itself to the viewport on
 * large screens and scrolls internally, rather than letting its content set the row height.
 */
const source = readFileSync(path.join(__dirname, 'LabWalkthrough.tsx'), 'utf8');

describe('lab walkthrough layout', () => {
  it('caps both columns to the viewport on large screens', () => {
    const capped = source.match(/lg:max-h-\[calc\(100vh-[^\]]+\)\]/g) ?? [];
    // One for the catalogue column, one for the walkthrough pane.
    expect(capped.length, 'both columns need the cap, or the taller one sets the row height').toBe(2);
  });

  it('keeps the catalogue list scrolling inside its own column', () => {
    expect(source).toMatch(/overflow-y-auto/);
  });

  it('still renders the step-completion control', () => {
    // The control that disappeared below the fold. If it is removed or renamed, this fails loudly
    // rather than silently leaving learners unable to advance a lab.
    expect(source).toMatch(/onClick=\{handleStepComplete\}/);
    expect(source).toMatch(/Confirm Completion & Proceed/);
    expect(source).toMatch(/Complete Lab Exercise/);
  });

  it('has enough labs for the column height to matter', () => {
    // Documents why the cap exists: the regression only appears at this scale.
    expect(watchguardLabs.length).toBeGreaterThanOrEqual(20);
  });
});
