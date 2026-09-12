import type { TopologyNode } from './topology';

/** Keep link labels outside device cards, especially the narrow gaps in stacked layouts. */
export function topologyEdgeGeometry(from:TopologyNode,to:TopologyNode,label='') {
  const dx=to.x-from.x,dy=to.y-from.y;
  const trim=Math.min(.42,1/Math.max(Math.abs(dx)/110,Math.abs(dy)/64));
  const x1=from.x+dx*trim,y1=from.y+dy*trim,x2=to.x-dx*trim,y2=to.y-dy*trim;
  const vertical=Math.abs(dx)<1;
  const crowdedHorizontal=Math.abs(dy)<1&&label.length*6.5>Math.abs(dx)-220;
  return {
    d:`M ${x1} ${y1} L ${x2} ${y2}`,
    labelX:(from.x+to.x)/2+(vertical?14:0),
    labelY:(from.y+to.y)/2+(vertical?4:crowdedHorizontal?-76:-13),
    anchor:vertical?'start' as const:'middle' as const,
  };
}
