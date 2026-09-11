import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Play, Pause, RotateCcw, Download, FlaskConical, CheckCircle2 } from 'lucide-react';
import { PolicyController, FlowInjector, TopologyPanel, SyslogTerminal, type Packet, type Zone, type Protocol } from './network-simulator';
import { challenges, defaultConfig, defaultFlow, evaluateFlow, validIPv4, validateFlow, type Flow, type SandboxConfig } from './network-simulator/engine';

export default function NetworkSimulator() {
  const [config,setConfig]=useState<SandboxConfig>(()=>structuredClone(defaultConfig));
  const [flow,setFlow]=useState<Flow>({...defaultFlow});
  const [packets,setPackets]=useState<Packet[]>([]),[inspectedPacket,setInspectedPacket]=useState<Packet|null>(null);
  const [autoGen,setAutoGen]=useState(false),[challengeId,setChallengeId]=useState(''),[completed,setCompleted]=useState<string[]>([]);
  const [feedback,setFeedback]=useState(''),[error,setError]=useState('');
  const [newSiteBlock,setNewSiteBlock]=useState(''),[newPortBlock,setNewPortBlock]=useState('');
  const [animatingPacket,setAnimatingPacket]=useState<{from:string;to:string;status:'Allowed'|'Denied';protocol:string}|null>(null);
  const counter=useRef(Date.now()),animationTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const challenge=challenges.find(c=>c.id===challengeId);
  const patch=<K extends keyof SandboxConfig>(key:K,value:SandboxConfig[K])=>setConfig(c=>({...c,[key]:value}));
  const update=<K extends keyof Flow>(key:K,value:Flow[K])=>{setFlow(f=>({...f,[key]:value}));setFeedback('');};
  const changeZone=(key:'from'|'to',zone:Zone)=>setFlow(f=>({...f,[key]:zone,[key==='from'?'srcIP':'dstIP']:zone==='trusted'?'10.0.1.25':zone==='dmz'?'192.168.10.15':'203.0.113.25'}));
  const changeProtocol=(protocol:Protocol)=>setFlow(f=>({...f,protocol,dstPort:protocol==='HTTPS'?443:protocol==='UDP'?53:protocol==='ICMP'?0:80,payload:protocol==='HTTPS'?'Clean HTTPS test':protocol==='UDP'?'DNS query':protocol==='ICMP'?'ICMP echo request':'HTTP request'}));
  useEffect(()=>()=>{if(animationTimer.current)clearTimeout(animationTimer.current);},[]);

  function record(input:Flow,manual:boolean) {
    const problem=validateFlow(input);if(problem){setError(problem);return;}
    setError('');
    const packet:Packet={...input,...evaluateFlow(config,input),id:++counter.current,timestamp:new Date().toISOString().slice(11,19)};
    setPackets(previous=>[packet,...previous].slice(0,50));
    if(manual){
      setInspectedPacket(packet);setAnimatingPacket({from:input.from,to:input.to,status:packet.status,protocol:input.protocol});
      if(animationTimer.current)clearTimeout(animationTimer.current);
      animationTimer.current=setTimeout(()=>setAnimatingPacket(null),1500);
      if(challenge){
        const intended={...defaultFlow,...challenge.flow};
        const sameFlow=(['from','to','protocol','dstIP','dstPort','payload'] as const).every(key=>input[key]===intended[key]);
        const expected=challenge.id==='gav'?'HTTPS-proxy with content inspection':challenge.id==='block'?'Blocked Sites':challenge.id==='udp'?'Unhandled Internal Packet':null;
        const resultMatches=expected?packet.matchedPolicy===expected&&packet.status==='Denied'&&!packet.failureOrigin:packet.status==='Allowed';
        if(sameFlow&&resultMatches&&challenge.solved(config,input)){setCompleted(ids=>ids.includes(challenge.id)?ids:[...ids,challenge.id]);setFeedback('Challenge complete. Explain the deciding step before moving on.');}
        else setFeedback('Keep investigating. Use the decision trace and the hint, then run the challenge flow again.');
      }
    }
  }
  useEffect(()=>{
    if(!autoGen)return;
    const timer=setInterval(()=>{
      const sample=challenges[Math.floor(Math.random()*challenges.length)];
      record({...defaultFlow,...sample.flow,srcPort:Math.floor(Math.random()*40000)+1024},false);
    },4500);
    return()=>clearInterval(timer);
  },[autoGen,config]);
  function loadChallenge(id:string){
    const selected=challenges.find(c=>c.id===id);setChallengeId(id);setAutoGen(false);setInspectedPacket(null);setFeedback('');setError('');
    if(selected){setConfig({...structuredClone(defaultConfig),...selected.config});setFlow({...defaultFlow,...selected.flow});}
  }
  function reset(){setConfig(structuredClone(defaultConfig));setFlow({...defaultFlow});setChallengeId('');setAutoGen(false);setInspectedPacket(null);setFeedback('');setError('');}
  function addSite(e:FormEvent){e.preventDefault();const site=newSiteBlock.trim();if(!validIPv4(site)){setError('Use a valid IPv4 host address for a blocked site.');return;}patch('blockedSites',[...new Set([...config.blockedSites,site])]);setNewSiteBlock('');setError('');}
  function addPort(e:FormEvent){e.preventDefault();const port=Number(newPortBlock);if(!/^\d+$/.test(newPortBlock)||!Number.isInteger(port)||port<1||port>65535){setError('Use a blocked port from 1 to 65535.');return;}patch('blockedPorts',[...new Set([...config.blockedPorts,port])]);setNewPortBlock('');setError('');}
  function exportTrace(){const url=URL.createObjectURL(new Blob([JSON.stringify({kind:'WatchGuard teaching simulation',config,packets},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='sandbox-trace.json';link.click();URL.revokeObjectURL(url);}
  return <div className="sandbox-workspace">
    <header className="section-heading"><div><p className="eyebrow">PACKET PATH LAB</p><h1>Follow the flow. Find the cause.</h1><p>Change a policy, send a test flow, and see exactly which decision changes.</p></div><span className="catalog-count"><FlaskConical size={18}/>6 guided challenges</span></header>
    <section className="sandbox-mission" aria-label="Guided challenges">
      <div className="sandbox-mission-top"><label>Choose a challenge<select aria-label="Sandbox challenge" value={challengeId} onChange={e=>loadChallenge(e.target.value)}><option value="">Free exploration</option>{challenges.map(c=><option key={c.id} value={c.id}>{completed.includes(c.id)?'✓ ':''}{c.title}</option>)}</select></label><span>{completed.length} / {challenges.length} completed this visit</span></div>
      {challenge?<div className="sandbox-objective"><strong>{challenge.goal}</strong><details><summary>Need a hint?</summary><p>{challenge.hint}</p></details></div>:<p className="sandbox-description">Start with a challenge or build your own flow below. These are explicit teaching policies; this is not a live Firebox or a complete emulator. NAT, VPN, routing failures, and return sessions are outside this model.</p>}
      {feedback&&<p role="status" className="sandbox-feedback"><CheckCircle2 size={18}/>{feedback}</p>}
    </section>
    <div className="sandbox-toolbar"><span>Simulation controls</span><div><button className="secondary-button" aria-pressed={autoGen} onClick={()=>setAutoGen(v=>!v)}>{autoGen?<Pause size={16}/>:<Play size={16}/>} {autoGen?'Pause traffic':'Auto traffic'}</button><button className="secondary-button" onClick={reset}><RotateCcw size={16}/>Reset policies</button><button className="secondary-button" disabled={!packets.length} onClick={exportTrace}><Download size={16}/>Export trace</button></div></div>
    {error&&<p className="sandbox-error" role="alert">{error}</p>}
    <div className="sandbox-panels">
      <div><PolicyController outgoingEnabled={config.outgoing} setOutgoingOutgoing={v=>patch('outgoing',v)} dnsPolicyEnabled={config.dns} setDnsPolicyEnabled={v=>patch('dns',v)} httpProxyEnabled={config.httpProxy} setHttpProxyEnabled={v=>patch('httpProxy',v)} httpsContentInspection={config.inspectTls} setHttpsContentInspection={v=>patch('inspectTls',v)} certTrusted={config.trustCa} setCertTrusted={v=>patch('trustCa',v)} blockedSites={config.blockedSites} setBlockedSites={v=>setConfig(c=>({...c,blockedSites:typeof v==='function'?v(c.blockedSites):v}))} blockedPorts={config.blockedPorts} setBlockedPorts={v=>setConfig(c=>({...c,blockedPorts:typeof v==='function'?v(c.blockedPorts):v}))} newSiteBlock={newSiteBlock} setNewSiteBlock={setNewSiteBlock} newPortBlock={newPortBlock} setNewPortBlock={setNewPortBlock} handleAddSiteBlock={addSite} handleAddPortBlock={addPort}/>
      <div className="sandbox-extra-policies">{([{key:'ping',label:'Ping policy',detail:'ICMP from Trusted/Optional to External.'},{key:'inboundWeb',label:'Published web policy',detail:'External → DMZ TCP/443 only. NAT is assumed outside this model.'},{key:'interZone',label:'Inter-zone lab policy',detail:'Permits Trusted ↔ Optional in this isolated exercise.'}] as const).map(item=><label key={item.key}><div><strong>{item.label}</strong><span>{item.detail}</span></div><input type="checkbox" checked={config[item.key]} onChange={e=>patch(item.key,e.target.checked)}/></label>)}</div></div>
      <FlowInjector srcZone={flow.from} setSrcZone={v=>changeZone('from',v)} dstZone={flow.to} setDstZone={v=>changeZone('to',v)} customProtocol={flow.protocol} setCustomProtocol={changeProtocol} customPort={flow.dstPort} setCustomPort={v=>update('dstPort',v)} customSrcIP={flow.srcIP} setCustomSrcIP={v=>update('srcIP',v)} customDstIP={flow.dstIP} setCustomDstIP={v=>update('dstIP',v)} customPayload={flow.payload} setCustomPayload={v=>update('payload',v)} handleInjectPacket={e=>{e?.preventDefault();record(flow,true);}}/>
    </div>
    <TopologyPanel animatingPacket={animatingPacket}/>
    <SyslogTerminal inspectedPacket={inspectedPacket} setInspectedPacket={setInspectedPacket} packets={packets} onClear={()=>{setPackets([]);setInspectedPacket(null);}}/>
    <p className="sandbox-reference">Check real-device behavior: <a href="https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/policies/policy_outgoing_about_c.html" target="_blank" rel="noreferrer">Outgoing policy</a> · <a href="https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/intrusionprevention/blocked_ports_about_c.html" target="_blank" rel="noreferrer">Blocked ports</a>. Sample blocks and policies are lab settings, not a complete factory configuration.</p>
  </div>;
}
