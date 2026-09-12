/** Stable content contract v1. Coordinates are SVG units; node positions are centers. */
export type TopologyZone = 'trusted' | 'external' | 'optional' | 'dmz' | 'vpn';
export interface TopologyNode {
  id: string;
  kind: 'firebox' | 'router' | 'switch' | 'server' | 'client' | 'subnet' | 'cloud';
  label: string;
  detail?: string;
  zone?: TopologyZone;
  x: number;
  y: number;
  active?: boolean;
}
export interface TopologyEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  kind?: 'ethernet' | 'vpn' | 'wireless';
  zone?: TopologyZone;
  /** Illustrative direction from -> to, never a computed allow/deny decision. */
  flow?: boolean;
}
export interface TopologyHotspot {
  target: 'node' | 'edge';
  targetId: string;
  /** Exact existing question option, not a new answer ID. */
  answer: string;
}
export interface TopologyDiagramData {
  version: 1;
  title: string;
  description?: string;
  width: number;
  height: number;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  hotspots?: TopologyHotspot[];
}
