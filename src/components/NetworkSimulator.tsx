import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Download, FlaskConical, CheckCircle2, LayoutDashboard, Shield, Activity, Send, ArrowRight } from 'lucide-react';
import { PolicyController, FlowInjector, TopologyPanel, SyslogTerminal, type Packet, type Zone, type Protocol } from './network-simulator';
import { challenges, defaultConfig, defaultFlow, evaluateFlow, validateFlow, type Flow, type SandboxConfig } from './network-simulator/engine';

import { flowPresets, packetOutcome, packetToFlow, policyRows } from './network-simulator/workspace';

type SandboxView = 'overview' | 'policies' | 'test' | 'monitor';

export default function NetworkSimulator() {
  const [config,setConfig]=useState<SandboxConfig>(()=>structuredClone(defaultConfig));
  const [flow,setFlow]=useState<Flow>({...defaultFlow});
  const [packets,setPackets]=useState<Packet[]>([]),[inspectedPacket,setInspectedPacket]=useState<Packet|null>(null);
  const [autoGen,setAutoGen]=useState(false),[challengeId,setChallengeId]=useState(''),[completed,setCompleted]=useState<string[]>([]);
  const [feedback,setFeedback]=useState(''),[error,setError]=useState('');
  const [view,setView]=useState<SandboxView>('overview');
  const [animatingPacket,setAnimatingPacket]=useState<{from:string;to:string;status:'Allowed'|'Denied';protocol:string}|null>(null);
  const counter=useRef(Date.now()),animationTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const challenge=challenges.find(c=>c.id===challengeId);
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
    const selected=challenges.find(c=>c.id===id);setChallengeId(id);setView('test');setAutoGen(false);setInspectedPacket(null);setFeedback('');setError('');
    if(selected){setConfig({...structuredClone(defaultConfig),...selected.config});setFlow({...defaultFlow,...selected.flow});}
  }
  function reset(){setConfig(structuredClone(defaultConfig));setFlow({...defaultFlow});setChallengeId('');setAutoGen(false);setInspectedPacket(null);setFeedback('');setError('');}
  function exportTrace(){const url=URL.createObjectURL(new Blob([JSON.stringify({kind:'WatchGuard teaching simulation',config,packets},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='sandbox-trace.json';link.click();URL.revokeObjectURL(url);}
  const summary={allowed:0,denied:0,client:0};
  packets.forEach(packet=>summary[packetOutcome(packet)]++);
  const navigation=[{id:'overview',label:'Front Panel',icon:LayoutDashboard},{id:'policies',label:'Firewall Policies',icon:Shield},{id:'test',label:'Policy Test',icon:Send},{id:'monitor',label:'Traffic Monitor',icon:Activity}] as const;
  function replay(packet:Packet){const input=packetToFlow(packet);setFlow(input);record(input,true);setView('test');}
  return <div className="sandbox-workspace">
    <header className="section-heading"><div><p className="eyebrow">LOCAL FIREBOX · TEACHING SIMULATION</p><h1>Network Sandbox</h1><p>Configure the policy. Test the traffic. Explain the result.</p></div><span className="catalog-count"><FlaskConical size={18}/>{challenges.length} guided challenges</span></header>
    <section className="sandbox-mission" aria-label="Guided challenges">
      <div className="sandbox-mission-top"><label>Choose a challenge<select aria-label="Sandbox challenge" value={challengeId} onChange={e=>loadChallenge(e.target.value)}><option value="">Free exploration</option>{challenges.map(c=><option key={c.id} value={c.id}>{completed.includes(c.id)?'✓ ':''}{c.title}</option>)}</select></label><span>{completed.length} / {challenges.length} completed this visit</span></div>
      {challenge?<div className="sandbox-objective"><strong>{challenge.goal}</strong><details><summary>Need a hint?</summary><p>{challenge.hint}</p></details></div>:<p className="sandbox-description">Start with a challenge or explore a test preset. This browser-only model covers policies, global blocks and content inspection. NAT, VPN, routing failures and return sessions are outside its scope.</p>}
      {feedback&&<p role="status" className="sandbox-feedback"><CheckCircle2 size={18}/>{feedback}</p>}
    </section>
    <div className="sandbox-toolbar"><span>{autoGen?'Generating sample traffic every 4.5 seconds':'Traffic generator paused'}</span><div><button className="secondary-button" aria-pressed={autoGen} onClick={()=>setAutoGen(v=>!v)}>{autoGen?<Pause size={16}/>:<Play size={16}/>} {autoGen?'Pause traffic':'Auto traffic'}</button><button className="secondary-button" onClick={reset}><RotateCcw size={16}/>Reset policies</button><button className="secondary-button" disabled={!packets.length} onClick={exportTrace}><Download size={16}/>Export trace</button></div></div>
    <div className="firebox-console">
      <nav className="sandbox-nav" aria-label="Sandbox sections"><div className="sandbox-device"><Shield size={24}/><strong>Training Firebox</strong><span>Locally managed lab</span></div>{navigation.map(({id,label,icon:Icon})=><button key={id} aria-current={view===id?'page':undefined} onClick={()=>setView(id)}><Icon size={18}/>{label}{id==='monitor'&&<small>{packets.length}</small>}</button>)}<p>Configuration stays in this visit. Changes affect subsequent tests.</p></nav>
      <div className="sandbox-content">
        <div className="sandbox-breadcrumb">Training Firebox <span>/</span> {navigation.find(item=>item.id===view)?.label}</div>
        {error&&<p className="sandbox-error" role="alert">{error}</p>}
        {view==='overview'&&<section aria-label="Sandbox front panel">
          <div className="sandbox-pane-heading"><div><p className="eyebrow">DASHBOARD</p><h2>Front Panel</h2></div><span>{policyRows.filter(row=>config[row.key]).length} active teaching policies</span></div>
          <div className="sandbox-stat-grid">{([{label:'Allowed',value:summary.allowed,tone:'allowed'},{label:'Firewall denied',value:summary.denied,tone:'denied'},{label:'Client TLS failure',value:summary.client,tone:'client'}]).map(item=><div key={item.label}><span className={`flow-badge ${item.tone}`}>{item.label}</span><strong>{item.value}</strong><small>In the last {packets.length} recorded flows</small></div>)}</div>
          <TopologyPanel animatingPacket={animatingPacket}/>
          <div className="sandbox-getting-started"><h3>Your troubleshooting loop</h3><button onClick={()=>setView('policies')}><span>01</span><div><strong>Configure policies</strong><p>Inspect the source, destination, service and inspection settings.</p></div><ArrowRight size={18}/></button><button onClick={()=>setView('test')}><span>02</span><div><strong>Send a test flow</strong><p>Use a preset or construct a flow with your own addresses and ports.</p></div><ArrowRight size={18}/></button><button onClick={()=>setView('monitor')}><span>03</span><div><strong>Read the decision trace</strong><p>Find the deciding rule, adjust it, then re-test the same flow.</p></div><ArrowRight size={18}/></button></div>
        </section>}
        <div hidden={view!=='policies'}><PolicyController config={config} onChange={value=>{setConfig(value);setFeedback('');}}/><button className="primary-button sandbox-next" onClick={()=>setView('test')}>Test these policies<ArrowRight size={16}/></button></div>
        {view==='test'&&<section aria-label="Policy test workspace">
          <div className="sandbox-pane-heading"><div><p className="eyebrow">FIREWALL / TEST</p><h2>Policy Test</h2></div><button className="secondary-button" onClick={()=>setView('policies')}><Shield size={16}/>Edit policies</button></div>
          <p className="sandbox-description">The result reflects current lab policies. Running a test records its original decision; changing a policy never rewrites history.</p>
          <div className="sandbox-presets" aria-label="Test flow presets">{flowPresets.map(preset=><button className="secondary-button" key={preset.id} onClick={()=>{setFlow({...preset.flow});setFeedback('');setError('');}}>{preset.label}</button>)}</div>
          <div className="sandbox-test-grid"><FlowInjector srcZone={flow.from} setSrcZone={v=>changeZone('from',v)} dstZone={flow.to} setDstZone={v=>changeZone('to',v)} customProtocol={flow.protocol} setCustomProtocol={changeProtocol} customPort={flow.dstPort} setCustomPort={v=>update('dstPort',v)} customSrcIP={flow.srcIP} setCustomSrcIP={v=>update('srcIP',v)} customDstIP={flow.dstIP} setCustomDstIP={v=>update('dstIP',v)} customPayload={flow.payload} setCustomPayload={v=>update('payload',v)} handleInjectPacket={e=>{e?.preventDefault();record(flow,true);}}/><div><TopologyPanel animatingPacket={animatingPacket}/><p className="sandbox-description">ETH0 · External / ETH1 · Trusted / ETH2 · Optional. Diagram labels are example interface addresses; the test form controls the actual evaluated flow.</p></div></div>
        </section>}
        <div hidden={view!=='monitor'&&view!=='test'}><SyslogTerminal inspectedPacket={inspectedPacket} setInspectedPacket={setInspectedPacket} packets={packets} onClear={()=>{setPackets([]);setInspectedPacket(null);}} onReplay={replay}/></div>
      </div>
    </div>
    <p className="sandbox-reference">Inspired by local Fireware workflows, not an official Firebox emulator. Reference: <a href="https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/policies/policy_outgoing_about_c.html" target="_blank" rel="noreferrer">Outgoing policy</a> · <a href="https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/Fireware/intrusionprevention/blocked_ports_about_c.html" target="_blank" rel="noreferrer">Blocked ports</a> · <a href="https://www.watchguard.com/help/docs/help-center/en-US/content/en-us/Fireware/system_status/traffic_monitor_web.html" target="_blank" rel="noreferrer">Traffic Monitor</a>. Sample blocks and policies are lab settings, not a complete factory configuration.</p>
  </div>;
}
