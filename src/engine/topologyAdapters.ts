import type { Question } from '../data/questions';
import type { TopologyDiagramData, TopologyNode } from './topology';

const node=(id:string,kind:TopologyNode['kind'],label:string,x:number,y:number,detail?:string,zone?:TopologyNode['zone']):TopologyNode=>({id,kind,label,x,y,detail,zone});

/** Explicit compatibility layouts; never infer connectivity from an arbitrary list. */
export function questionTopology(q: Question): TopologyDiagramData | undefined {
  if(q.topology)return q.topology;
  const base={version:1 as const,width:850,height:340,title:'Network overview'};
  if(q.networkDiagram){
    const parts=q.networkDiagram;
    if(q.variant?.templateId===10015 || parts[0]?.label==='Firebox Optional')return {...base,title:'Downstream routing',nodes:[node('fw','firebox',parts[0].label,130,170,parts[0].detail,'optional'),node('router','router',parts[1].label,425,170,parts[1].detail,'optional'),node('lan','subnet',parts[2].label,720,170,parts[2].detail,'optional')],edges:[{id:'optional',from:'fw',to:'router',label:'Optional',zone:'optional',flow:true},{id:'remote',from:'router',to:'lan',label:'Downstream LAN',zone:'optional'}]};
    if(parts[0]?.label==='Firebox'&&parts[1]?.label==='Branch')return {...base,height:520,title:'Route candidates',nodes:[{...node('fw','firebox','Firebox',130,260,parts[0].detail),active:true},node('branch','subnet','Branch route',650,80,parts[1].detail),node('tunnel','cloud','Tunnel route',650,260,parts[2].detail,'vpn'),node('wan','cloud','WAN route',650,440,'0.0.0.0/0','external')],edges:[{id:'branch-route',from:'fw',to:'branch',label:'Route candidate'},{id:'tunnel-route',from:'fw',to:'tunnel',label:'Route candidate',kind:'vpn',zone:'vpn'},{id:'default-route',from:'fw',to:'wan',label:'Route candidate',zone:'external'}]};
    // Unknown legacy lists retain their information without inventing links.
    return {...base,width:Math.max(350,parts.length*270),title:'Network elements',nodes:parts.map((p,i)=>node(`element-${i}`,'subnet',p.label,135+i*270,170,p.detail)),edges:[]};
  }
  if(!q.topologyImage)return undefined;
  if(q.topologyImage.endsWith('topology-nat.svg'))return {...base,title:'Public address from the internal network',nodes:[node('client','client','Client A',130,235,undefined,'trusted'),node('fw','firebox','Firebox',425,85,'Public: 203.0.113.5'),node('server','server','Internal Server B',720,235,undefined,'trusted')],edges:[{id:'request',from:'client',to:'fw',label:'To public address',zone:'trusted',flow:true},{id:'server-link',from:'fw',to:'server',label:'Internal server',zone:'trusted',flow:true}]};
  if(q.topologyImage.endsWith('topology-1.svg'))return {...base,height:490,title:'Remote subnet behind a downstream router',nodes:[node('fw','firebox','Firebox',130,130),node('core','switch','Core Switch',425,130,undefined,'trusted'),node('router','router','Downstream router',720,130,undefined,'trusted'),node('clients','client','Trusted clients',425,390,undefined,'trusted'),node('remote','subnet','Remote subnet',720,390,'192.168.50.0/24','trusted')],edges:[{id:'eth1',from:'fw',to:'core',label:'Eth1',zone:'trusted'},{id:'next-hop',from:'core',to:'router',zone:'trusted'},{id:'clients',from:'clients',to:'core',zone:'trusted'},{id:'remote',from:'router',to:'remote',zone:'trusted'}]};
  const edge=q.topologyImage.endsWith('topology-edge.svg');
  const nodes=[node('edge','router','Edge Router',130,170,'ISP uplink','external'),node('fw','firebox','Firebox',425,170),node('core','switch','Core Switch',720,170,undefined,'trusted')];
  if(!edge)nodes.push(node('servers','server','Server Farm',720,400,undefined,'trusted'));
  const answers=edge?['Hotspot A','Hotspot B','Hotspot C']:['Hotspot A (Edge Router)','Hotspot B (Firebox)','Hotspot C (Core Switch)','Hotspot D (Server Farm)'];
  return {...base,height:edge?340:490,title:edge?'Network perimeter':'Branch office VPN placement',nodes,edges:[{id:'wan',from:'edge',to:'fw',label:'External',zone:'external'},{id:'lan',from:'fw',to:'core',label:'Trusted',zone:'trusted'},...(!edge?[{id:'servers',from:'core',to:'servers',zone:'trusted' as const}]:[])],hotspots:(edge?['edge','fw','core']:['edge','fw','core','servers']).map((targetId,i)=>({target:'node',targetId,answer:answers[i]}))};
}
