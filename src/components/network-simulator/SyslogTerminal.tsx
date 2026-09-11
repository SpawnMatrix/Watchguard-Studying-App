import { Terminal } from 'lucide-react';
import type { Packet } from './types';
interface Props {inspectedPacket:Packet|null;setInspectedPacket:(packet:Packet|null)=>void;packets:Packet[];onClear:()=>void}
export function SyslogTerminal({inspectedPacket:packet,setInspectedPacket,packets,onClear}:Props){
 return <section className="sandbox-inspection" aria-label="Flow inspection and history">
  {packet&&<article className="sandbox-trace" aria-label="Decision trace">
   <div className="sandbox-trace-heading"><div><span className={`flow-badge ${packet.failureOrigin?'client':packet.status.toLowerCase()}`}>{packet.failureOrigin?'Client TLS failure':packet.status}</span><strong>{packet.matchedPolicy}</strong></div><button className="text-button" onClick={()=>setInspectedPacket(null)}>Close inspection</button></div>
   <p className="flow-addresses">{packet.srcIP} → {packet.dstIP} · {packet.protocol}{packet.protocol==='ICMP'?'':`/${packet.dstPort}`}</p>
   <p>{packet.reason}</p>
   <ol>{packet.trace?.map((step,index)=><li key={index} data-result={step.result}><span>{index+1}</span><div><strong>{step.stage}</strong><p>{step.detail}</p></div><small>{step.result==='stop'?'Stops here':step.result==='skip'?'Not inspected':'Pass'}</small></li>)}</ol>
  </article>}
  <div className="sandbox-log"><div className="sandbox-log-heading"><strong><Terminal size={16}/>Traffic history <span>(UTC)</span></strong><button className="text-button" disabled={!packets.length} onClick={onClear}>Clear history</button></div>
  <p className="sandbox-description">Select any flow to inspect its original decision, even after you change policies.</p>
  <div className="sandbox-log-rows">{packets.length?packets.map(p=><button key={p.id} aria-pressed={p.id===packet?.id} className={`sandbox-log-row ${p.status.toLowerCase()}`} onClick={()=>setInspectedPacket(p)}><span>{p.timestamp}</span><strong>{p.failureOrigin?'Client error':p.status}</strong><span>{p.srcIP} → {p.dstIP}</span><span>{p.protocol}{p.protocol==='ICMP'?'':`/${p.dstPort}`} · {p.matchedPolicy}</span></button>):<p className="sandbox-log-empty">No flows yet. Run a challenge or inject your own traffic.</p>}</div></div>
 </section>;
}
