import { watchguardLabs as labs } from '../src/data/labs';
// Derive completion from the real lab so adding a step cannot silently invalidate the fixture.
const lab = labs.find(l => l.id === 1)!;
process.stdout.write(JSON.stringify({ lab: { id: lab.id, name: lab.name,
  progress: { [lab.id]: { done: lab.steps.map((_, i) => i), step: lab.steps.length - 1 } } } }));

