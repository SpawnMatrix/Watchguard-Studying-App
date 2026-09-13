import { defaultFlow, type Flow, type SandboxConfig } from './engine';
import type { Packet } from './types';

export type PolicyKey = Exclude<keyof SandboxConfig, 'trustCa' | 'blockedSites' | 'blockedPorts'>;
export const policyRows: {key: PolicyKey; name: string; scope: string; service: string; inspection: string}[] = [
  {key:'inboundWeb', name:'Published web', scope:'External → Optional', service:'TCP/443', inspection:'Packet filter; NAT assumed'},
  {key:'interZone', name:'Inter-zone lab', scope:'Trusted ↔ Optional', service:'All modeled protocols', inspection:'Packet filter'},
  {key:'ping', name:'Ping', scope:'Trusted / Optional → External', service:'ICMP', inspection:'Packet filter'},
  {key:'dns', name:'DNS', scope:'Trusted / Optional → External', service:'UDP/53', inspection:'Packet filter'},
  {key:'httpProxy', name:'HTTP-proxy', scope:'Trusted / Optional → External', service:'TCP/80', inspection:'GAV test-marker inspection'},
  {key:'inspectTls', name:'HTTPS-proxy', scope:'Trusted / Optional → External', service:'TCP/443', inspection:'TLS inspection + GAV'},
  {key:'outgoing', name:'Outgoing', scope:'Trusted / Optional → External', service:'TCP / UDP', inspection:'Packet filter; no content scan'},
];

export const flowPresets: {id:string; label:string; flow:Flow}[] = [
  {id:'web',label:'Browse HTTP',flow:{...defaultFlow}},
  {id:'dns',label:'DNS lookup',flow:{...defaultFlow,protocol:'UDP',dstPort:53,payload:'DNS query'}},
  {id:'tls',label:'Clean HTTPS',flow:{...defaultFlow,protocol:'HTTPS',dstPort:443,payload:'Clean HTTPS test'}},
  {id:'eicar',label:'HTTPS test marker',flow:{...defaultFlow,protocol:'HTTPS',dstPort:443,payload:'EICAR test marker'}},
  {id:'ping',label:'Ping external host',flow:{...defaultFlow,protocol:'ICMP',dstPort:0,payload:'ICMP echo request'}},
  {id:'inbound',label:'Inbound web request',flow:{...defaultFlow,from:'external',to:'dmz',srcIP:'203.0.113.25',dstIP:'192.168.10.15',dstPort:443,payload:'Inbound web request'}},
];

export type TrafficOutcome = 'all' | 'allowed' | 'denied' | 'client';
export function packetOutcome(packet:Packet):Exclude<TrafficOutcome,'all'> {
  return packet.failureOrigin === 'client' ? 'client' : packet.status === 'Allowed' ? 'allowed' : 'denied';
}
export function filterTraffic(packets:Packet[], query:string, outcome:TrafficOutcome):Packet[] {
  const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return packets.filter(packet=>{
    if(outcome!=='all'&&packetOutcome(packet)!==outcome)return false;
    const searchable=[packet.srcIP,packet.dstIP,packet.srcPort,packet.dstPort,packet.protocol,packet.matchedPolicy,packet.reason,packet.from,packet.to].join(' ').toLowerCase();
    return terms.every(term=>searchable.includes(term));
  });
}

export function packetToFlow(packet:Packet):Flow {
  const {from,to,protocol,srcIP,dstIP,srcPort,dstPort,payload}=packet;
  return {from,to,protocol,srcIP,dstIP,srcPort,dstPort,payload};
}
