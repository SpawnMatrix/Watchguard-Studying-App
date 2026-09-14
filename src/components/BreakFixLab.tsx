import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Lightbulb, Play, RotateCcw, Shuffle, Ticket, XCircle } from 'lucide-react';
import { breakFixDiagram, createScenario, deviceLabels, runAllTests, type BreakFixNetwork, type TestResult } from '../engine/breakfix';
import { newSeed } from '../engine/random';
import NetworkTopology from './NetworkTopology';
import BreakFixInspector from './BreakFixInspector';

const clone = (net: BreakFixNetwork): BreakFixNetwork => JSON.parse(JSON.stringify(net));
const labelToDevice = Object.fromEntries(Object.entries(deviceLabels).map(([id, label]) => [label, id]));

/**
 * The break/fix lab: a ticket, a network with one fault, and the tools to find it.
 *
 * Tests are only re-run when the learner asks, as on a real network. A result that no longer matches
 * the configuration is flagged, so nobody mistakes an old green tick for proof their change worked.
 */
export default function BreakFixLab({ onExit, initialSeed }: { onExit: () => void; initialSeed?: number }) {
  const [seed, setSeed] = useState(() => initialSeed ?? newSeed());
  const scenario = useMemo(() => createScenario(seed), [seed]);
  const [net, setNet] = useState<BreakFixNetwork>(() => clone(scenario.broken));
  const [results, setResults] = useState<TestResult[]>(() => runAllTests(scenario.broken));
  const [stale, setStale] = useState(false);
  const [selected, setSelected] = useState('firebox');
  const [hints, setHints] = useState(0);
  const [testRuns, setTestRuns] = useState(1);
  const [revealed, setRevealed] = useState(false);
  const [openTrace, setOpenTrace] = useState<string | null>(null);

  const solved = !stale && results.every(r => r.pass);
  const diagram = useMemo(() => breakFixDiagram(net), [net]);
  const failing = results.filter(r => !r.pass);

  const start = (next: number) => {
    const s = createScenario(next);
    setSeed(next);
    setNet(clone(s.broken));
    setResults(runAllTests(s.broken));
    setStale(false);
    setSelected('firebox');
    setHints(0);
    setTestRuns(1);
    setRevealed(false);
    setOpenTrace(null);
  };

  const change = (mutate: (draft: BreakFixNetwork) => void) => {
    setNet(prev => { const next = clone(prev); mutate(next); return next; });
    setStale(true);
  };

  const runTests = () => {
    const next = runAllTests(net);
    setResults(next);
    setStale(false);
    setTestRuns(n => n + 1);
    setOpenTrace(next.find(r => !r.pass)?.id ?? null);
  };

  const resetToBroken = () => {
    setNet(clone(scenario.broken));
    setResults(runAllTests(scenario.broken));
    setStale(false);
  };

  const hintText = [
    `Compare what works with what fails. Failing: ${failing.map(f => f.label).join('; ') || 'nothing right now'}. Open a failing test and read where its trace stops.`,
    `Inspect the ${deviceLabels[scenario.fault.device]}.`,
    `On the ${deviceLabels[scenario.fault.device]}, check: ${scenario.fault.setting}.`,
  ];

  return (
    <section className="breakfix" aria-label="Troubleshooting lab">
      <div className="breakfix-toolbar">
        <button type="button" className="secondary-button" onClick={onExit}><ArrowLeft size={16} />Back to Topology Lab</button>
        <button type="button" className="secondary-button" onClick={() => start(newSeed())}><Shuffle size={16} />New broken network</button>
      </div>

      <div className="breakfix-ticket">
        <Ticket size={20} aria-hidden="true" />
        <div>
          <p className="eyebrow">Help desk ticket</p>
          <p className="breakfix-ticket-text">{scenario.fault.ticket}</p>
          <p className="breakfix-ticket-meta">Find the fault, fix it, and re-run the tests until all six pass. Nothing is multiple choice: any change that genuinely fixes the network counts.</p>
        </div>
      </div>

      {(solved || revealed) && (
        <div className={`breakfix-result ${solved ? 'is-solved' : 'is-revealed'}`} role="status">
          <h3>{solved ? <><CheckCircle2 size={18} aria-hidden="true" /> Network fixed</> : 'The fault'}</h3>
          <p><strong>{scenario.fault.title}.</strong> {scenario.fault.explain(scenario.working, scenario.broken)}</p>
          {solved && <p className="breakfix-stats">Solved with {testRuns - 1} test run{testRuns - 1 === 1 ? '' : 's'} and {hints === 0 ? 'no hints' : `${hints} hint${hints === 1 ? '' : 's'}`}{revealed ? ', after revealing the answer' : ''}.</p>}
          <div className="flex flex-wrap gap-3">
            <button type="button" className="primary-button" onClick={() => start(newSeed())}><Shuffle size={16} />Try another broken network</button>
            {!solved && <button type="button" className="secondary-button" onClick={() => setRevealed(false)}>Hide and keep trying</button>}
          </div>
        </div>
      )}

      <div className="breakfix-grid">
        <div className="space-y-4 min-w-0">
          <NetworkTopology diagram={diagram} defaultFit selected={[deviceLabels[selected]]} onSelect={label => setSelected(labelToDevice[label] ?? 'firebox')} />

          <section className="breakfix-tests" aria-label="Connectivity tests">
            <div className="breakfix-tests-head">
              <h3>Connectivity tests</h3>
              <button type="button" className="primary-button" onClick={runTests}><Play size={16} />Run tests</button>
            </div>
            {stale && <p className="breakfix-stale" role="status">Settings changed since these results. Run the tests again to see the effect.</p>}
            <ul>
              {results.map(r => (
                <li key={r.id} className={r.pass ? 'is-pass' : 'is-fail'}>
                  <button type="button" className="breakfix-test" aria-expanded={openTrace === r.id} onClick={() => setOpenTrace(openTrace === r.id ? null : r.id)}>
                    {r.pass ? <CheckCircle2 size={16} aria-label="Pass" /> : <XCircle size={16} aria-label="Fail" />}
                    <span>{r.label}</span>
                    <small>{openTrace === r.id ? 'Hide trace' : 'Show trace'}</small>
                  </button>
                  {openTrace === r.id && (
                    <ol className="breakfix-trace" aria-label={`Trace for ${r.label}`}>
                      {r.lines.map((line, i) => (
                        <li key={i} className={line.ok ? '' : 'is-stop'}>
                          <button type="button" className="breakfix-trace-device" onClick={() => deviceLabels[line.device] && setSelected(line.device)}>{deviceLabels[line.device] ?? line.device}</button>
                          <span>{line.text}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4 min-w-0">
          <div className="breakfix-device-picker">
            <label htmlFor="bf-device">Inspect device</label>
            <select id="bf-device" className="bf-input" value={selected} onChange={e => setSelected(e.target.value)}>
              {Object.entries(deviceLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>
          <BreakFixInspector device={selected} net={net} onChange={change} />

          <section className="breakfix-help" aria-label="Hints">
            {hintText.slice(0, hints).map((text, i) => <p key={i}><Lightbulb size={14} aria-hidden="true" /> {text}</p>)}
            <div className="flex flex-wrap gap-2">
              {hints < hintText.length && !solved && <button type="button" className="secondary-button" onClick={() => setHints(h => h + 1)}><Lightbulb size={16} />{hints === 0 ? 'Get a hint' : 'Another hint'}</button>}
              {!solved && !revealed && <button type="button" className="secondary-button" onClick={() => setRevealed(true)}>Show the fault</button>}
              <button type="button" className="secondary-button" onClick={resetToBroken}><RotateCcw size={16} />Undo my changes</button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
