import { useId, useState } from 'react';
import { Cloud, Monitor, Network, Router, Server, ShieldCheck, Waypoints, Maximize2, Scan, Pause, Play } from 'lucide-react';
import type { TopologyDiagramData, TopologyHotspot } from '../engine/topology';
import { topologyEdgeGeometry } from '../engine/topologyGeometry';

interface Props {
  diagram: TopologyDiagramData;
  selected?: string[];
  correct?: string[];
  submitted?: boolean;
  disabled?: boolean;
  onSelect?: (answer: string) => void;
  defaultFit?: boolean;
}
const icons = { firebox: ShieldCheck, router: Router, switch: Network, server: Server, client: Monitor, subnet: Waypoints, cloud: Cloud };
function lines(text: string, limit = 25) {
  const words = text.split(/\s+/), result: string[] = [];
  for (const word of words) {
    const last = result.length - 1;
    if (last >= 0 && result[last].length + word.length < limit) result[last] += ` ${word}`;
    else result.push(word);
  }
  return result;
}

/** Diagram is presentation only: answer evaluation is owned by the quiz engine. */
export default function NetworkTopology({ diagram, selected = [], correct = [], submitted = false, disabled = false, onSelect, defaultFit=false }: Props) {
  const id = useId();
  const [fit,setFit]=useState(defaultFit),[paused,setPaused]=useState(false);
  const hasMotion=diagram.edges.some(e=>e.flow)||diagram.nodes.some(n=>n.active);
  const state = (spot?: TopologyHotspot) => !spot ? '' : submitted && correct.includes(spot.answer) ? 'is-correct' : submitted && selected.includes(spot.answer) ? 'is-incorrect' : selected.includes(spot.answer) ? 'is-selected' : '';
  const controls = (spot?: TopologyHotspot) => spot && onSelect ? {
    role: 'button', tabIndex: disabled || submitted ? -1 : 0,
    'aria-label': `${spot.answer}${submitted ? correct.includes(spot.answer) ? ' — correct answer' : selected.includes(spot.answer) ? ' — incorrect answer' : '' : ''}`,
    'aria-pressed': selected.includes(spot.answer), 'aria-disabled': disabled || submitted,
    onClick: () => { if (!disabled && !submitted) onSelect(spot.answer); },
    onKeyDown: (event: {key:string;preventDefault:()=>void}) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!disabled && !submitted) onSelect(spot.answer); } },
  } : {};
  return <figure className={`topology-figure ${paused?'motion-paused':''}`}>
    <figcaption><strong>{diagram.title}</strong><span>Network topology · schematic</span></figcaption>
    <div className="topology-toolbar" role="group" aria-label="Diagram view controls">
      <button type="button" aria-pressed={fit} onClick={()=>setFit(!fit)}>{fit?<Scan size={15}/>:<Maximize2 size={15}/>} {fit?'Readable size':'Fit diagram'}</button>
      {hasMotion&&<button type="button" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?<Play size={15}/>:<Pause size={15}/>} {paused?'Resume packet animation':'Pause packet animation'}</button>}
      <span>{fit?'Overview · choose Readable size for details':'Scroll to explore wider diagrams'}</span>
    </div>
    <div className="topology-scroll" tabIndex={0} role="region" aria-label="Network diagram; scroll horizontally on small screens">
      <svg className="topology-svg" viewBox={`0 0 ${diagram.width} ${diagram.height}`} style={{ minWidth: fit?0:diagram.width }} role="group" aria-labelledby={`${id}-title ${id}-desc`}>
        <title id={`${id}-title`}>{diagram.title}</title><desc id={`${id}-desc`}>{diagram.description || 'Links show connections, not policy permissions. Use the labeled controls to select an answer.'}</desc>
        {diagram.edges.map(edge => {
          const from = diagram.nodes.find(n => n.id === edge.from), to = diagram.nodes.find(n => n.id === edge.to);
          if (!from || !to) return null;
          const spot = diagram.hotspots?.find(s => s.target === 'edge' && s.targetId === edge.id);
          const {d,labelX,labelY,anchor}=topologyEdgeGeometry(from,to,edge.label);
          return <g key={edge.id} className={`topology-edge zone-${edge.zone || 'neutral'} ${state(spot)} ${spot&&onSelect ? 'is-hotspot' : ''}`} {...controls(spot)}>
            <title>{edge.label || `${from.label} to ${to.label}`}</title>
            <path className="link-hit" d={d}/><path className={`link-line link-${edge.kind || 'ethernet'}`} d={d}/>
            {edge.flow && <path className="packet-flow" d={d}/>}
            {edge.label && <text className="link-label" x={labelX} y={labelY} textAnchor={anchor}>{edge.label}</text>}
          </g>;
        })}
        {diagram.nodes.map(node => {
          const Icon=icons[node.kind], spot=diagram.hotspots?.find(s=>s.target==='node'&&s.targetId===node.id);
          const detail=lines(node.detail || '');
          return <g key={node.id} transform={`translate(${node.x} ${node.y})`} className={`topology-node zone-${node.zone || 'neutral'} ${state(spot)} ${node.active ? 'is-active' : ''} ${spot&&onSelect ? 'is-hotspot' : ''}`} {...controls(spot)}>
            <title>{[node.label,node.detail,node.zone].filter(Boolean).join(' · ')}</title>
            <rect className="node-card" x={-105} y={-60} width={210} height={120} rx={12}/>
            <Icon x={-90} y={-43} width={24} height={24} aria-hidden="true"/>
            <text className="node-zone" x={-56} y={-27}>{node.zone || node.kind}</text>
            <text className="node-label" x={-88} y={0}>{node.label}</text>
            {detail.slice(0,3).map((line,i)=><text className="node-detail" key={i} x={-88} y={19+i*14}>{line}</text>)}
          </g>;
        })}
      </svg>
    </div>
    <div className="topology-legend">{(['trusted','external','optional','dmz','vpn'] as const).map(zone=><span className={`zone-${zone}`} key={zone}><i/>{zone === 'dmz' ? 'DMZ' : zone === 'vpn' ? 'VPN' : zone}</span>)}</div>
    <p className="topology-caption">Links illustrate connectivity, not permission to pass traffic.{!!diagram.hotspots?.length && onSelect && ' Select a labeled device, link, or answer below.'}</p>
    <details className="topology-details"><summary>Read network details</summary>
      {diagram.description&&<p>{diagram.description}</p>}
      <dl>{diagram.nodes.map(node=><div key={node.id}><dt>{node.label}{node.zone?` · ${node.zone}`:''}</dt><dd>{node.detail||node.kind}</dd></div>)}</dl>
      <ul aria-label="Network connections">{diagram.edges.map(edge=>{const from=diagram.nodes.find(n=>n.id===edge.from),to=diagram.nodes.find(n=>n.id===edge.to);return from&&to?<li key={edge.id}>{from.label} — {to.label}{edge.label?` · ${edge.label}`:''}</li>:null;})}</ul>
    </details>
  </figure>;
}
