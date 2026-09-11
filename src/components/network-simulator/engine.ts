import type { Packet, Protocol, Zone } from './types';
export interface SandboxConfig {
  outgoing: boolean; dns: boolean; httpProxy: boolean; inspectTls: boolean; trustCa: boolean;
  ping: boolean; inboundWeb: boolean; interZone: boolean; blockedSites: string[]; blockedPorts: number[];
}
export interface Flow { from: Zone; to: Zone; protocol: Protocol; srcIP: string; dstIP: string; srcPort: number; dstPort: number; payload: string }
export const defaultConfig: SandboxConfig = {outgoing:true,dns:true,httpProxy:true,inspectTls:false,trustCa:false,ping:true,inboundWeb:false,interZone:false,blockedSites:['203.0.113.66','198.51.100.99'],blockedPorts:[23,21]};
export const defaultFlow: Flow = {from:'trusted',to:'external',protocol:'TCP',srcIP:'10.0.1.25',dstIP:'198.51.100.20',srcPort:52000,dstPort:80,payload:'HTTP request'};
export const validIPv4=(value:string)=>/^(\d{1,3}\.){3}\d{1,3}$/.test(value)&&value.split('.').every(v=>Number(v)<=255&&String(Number(v))===v);
export function validateFlow(f:Flow):string|null {
  if(!validIPv4(f.srcIP)||!validIPv4(f.dstIP))return 'Enter valid IPv4 source and destination addresses.';
  if(f.from===f.to)return 'Choose different zones. This lab models traffic routed through the Firebox.';
  if(f.protocol!=='ICMP'&&(!Number.isInteger(f.dstPort)||f.dstPort<1||f.dstPort>65535))return 'Enter a destination port from 1 to 65535.';
  return null;
}
/** Explicit teaching policies, not a complete Fireware emulator. Policy scope matters. */
export function evaluateFlow(config:SandboxConfig,flow:Flow):Pick<Packet,'status'|'matchedPolicy'|'reason'|'trace'|'failureOrigin'> {
  const trace:NonNullable<Packet['trace']>=[];
  const step=(stage:string,detail:string,result:'pass'|'stop'|'skip'='pass')=>trace.push({stage,detail,result});
  const finish=(allowed:boolean,policy:string,reason:string,client=false)=>({status:allowed?'Allowed' as const:'Denied' as const,matchedPolicy:policy,reason,trace,failureOrigin:client?'client' as const:undefined});
  const invalid=validateFlow(flow);if(invalid){step('Input',invalid,'stop');return finish(false,'Invalid flow',invalid);}
  step('Flow',`${flow.from} → ${flow.to}; ${flow.protocol}${flow.protocol==='ICMP'?' (no TCP/UDP ports)':` destination port ${flow.dstPort}`}`);
  if(config.blockedSites.includes(flow.srcIP)||config.blockedSites.includes(flow.dstIP)){step('Blocked sites','Source or destination matches a configured blocked host.','stop');return finish(false,'Blocked Sites','Global protection stops this flow before policy selection.');}
  step('Blocked sites','Neither address is in this lab’s blocked-host list.');
  if(flow.protocol!=='ICMP'&&(flow.from==='external'||flow.to==='external')&&config.blockedPorts.includes(flow.dstPort)){step('Blocked ports','Destination port is blocked on the external interface.','stop');return finish(false,'Blocked Ports','An allow policy cannot override the blocked-port protection on this external flow.');}
  step('Blocked ports',flow.protocol==='ICMP'?'ICMP has no TCP/UDP destination port.':'No applicable external-interface port block.');
  const outbound=flow.from!=='external'&&flow.to==='external';
  const tcp=flow.protocol==='TCP'||flow.protocol==='HTTPS';
  let policy='';
  if(flow.from==='external'&&flow.to==='dmz'&&tcp&&flow.dstPort===443&&config.inboundWeb)policy='Published web: External → DMZ TCP/443';
  else if(flow.from!=='external'&&flow.to!=='external'&&config.interZone)policy='Lab inter-zone allow policy';
  else if(outbound){
    if(flow.protocol==='ICMP'&&config.ping)policy='Ping policy';
    else if(flow.protocol==='UDP'&&flow.dstPort===53&&config.dns)policy='DNS packet filter: UDP/53';
    else if(tcp&&flow.dstPort===80&&config.httpProxy)policy='HTTP-proxy with GAV';
    else if(tcp&&flow.dstPort===443&&config.inspectTls)policy='HTTPS-proxy with content inspection';
    else if(flow.protocol!=='ICMP'&&config.outgoing)policy='Outgoing TCP-UDP';
  }
  if(!policy){step('Policy selection','No enabled policy matches the source zone, destination zone, transport and port.','stop');return finish(false,flow.from==='external'?'Unhandled External Packet':'Unhandled Internal Packet','Implicit deny: add or enable an appropriately scoped policy. Outgoing covers internal-to-external TCP/UDP only.');}
  step('Policy selection',`${policy} matches. Specific lab policies are evaluated before the broad Outgoing policy.`);
  if(policy==='HTTPS-proxy with content inspection'&&!config.trustCa){step('Client trust','The client rejects the inspection certificate because its issuing CA is not trusted.','stop');return finish(false,policy,'The policy permits inspection, but this simulated client rejects TLS trust. This is not proof of a firewall deny.',true);}
  const inspect=policy==='HTTP-proxy with GAV'||policy==='HTTPS-proxy with content inspection';
  if(inspect){
    if(config.inspectTls&&flow.dstPort===443)step('Client trust','The client trusts the issuing CA. Other certificate checks are assumed valid in this exercise.');
    if(/eicar/i.test(flow.payload)){step('Content inspection','The simulated GAV scanner detects the EICAR test marker.','stop');return finish(false,policy,'The inspection policy blocks the test marker. EICAR is a harmless antivirus test, not live malware.');}
    step('Content inspection','No EICAR marker in the supplied test payload. This does not prove a real file is safe.');
  }else step('Content inspection','No content scanner is attached to the matched lab policy.','skip');
  step('Result','This policy permits the flow. Server availability and application success require separate checks.');
  return finish(true,policy,'Permitted by the matching policy in this lab. Review the trace to see whether content was inspected.');
}
export interface Challenge {id:string;title:string;goal:string;hint:string;config:Partial<SandboxConfig>;flow:Partial<Flow>;solved:(c:SandboxConfig,f:Flow)=>boolean}
export const challenges:Challenge[]=[
 {id:'dns',title:'01 / DNS without broad access',goal:'Allow UDP/53 while keeping the broad Outgoing policy disabled.',hint:'Enable the narrow DNS policy, then run the flow again.',config:{outgoing:false,dns:false},flow:{protocol:'UDP',dstPort:53,payload:'DNS query'},solved:(c,f)=>c.dns&&!c.outgoing&&f.protocol==='UDP'&&f.dstPort===53},
 {id:'udp',title:'02 / UDP is not always DNS',goal:'Observe UDP/123 denied even though the UDP/53 DNS policy is enabled.',hint:'The transport alone is not enough: compare destination ports.',config:{outgoing:false,dns:true},flow:{protocol:'UDP',dstPort:123,payload:'NTP request'},solved:(c,f)=>!c.outgoing&&c.dns&&f.protocol==='UDP'&&f.dstPort===123},
 {id:'tls',title:'03 / Fix certificate trust',goal:'Permit the clean HTTPS flow through inspection without turning inspection off.',hint:'Trust the inspection CA on the client; keep content inspection enabled.',config:{inspectTls:true,trustCa:false},flow:{protocol:'HTTPS',dstPort:443,payload:'Clean HTTPS test'},solved:(c,f)=>c.inspectTls&&c.trustCa&&f.dstPort===443&&!/eicar/i.test(f.payload)},
 {id:'gav',title:'04 / Find the hidden test marker',goal:'Block the EICAR marker inside HTTPS using content inspection and a trusted CA.',hint:'A broad packet filter permits encrypted traffic without scanning its content.',config:{inspectTls:false,trustCa:false},flow:{protocol:'HTTPS',dstPort:443,payload:'EICAR test marker'},solved:(c,f)=>c.inspectTls&&c.trustCa&&f.dstPort===443&&/eicar/i.test(f.payload)},
 {id:'inbound',title:'05 / Publish only the web service',goal:'Allow the External → DMZ TCP/443 flow using the narrow published-web rule.',hint:'Outgoing does not grant inbound access. Addresses here represent the policy view; NAT is outside this exercise.',config:{inboundWeb:false},flow:{from:'external',to:'dmz',srcIP:'203.0.113.25',dstIP:'192.168.10.15',protocol:'TCP',dstPort:443,payload:'Inbound web request'},solved:(c,f)=>c.inboundWeb&&f.from==='external'&&f.to==='dmz'&&f.dstPort===443},
 {id:'block',title:'06 / Global protection wins',goal:'Observe a blocked destination denied despite an enabled Outgoing policy.',hint:'Inspect the blocked-sites decision before looking at allow policies.',config:{outgoing:true},flow:{dstIP:'198.51.100.99',dstPort:8443},solved:(c,f)=>c.outgoing&&c.blockedSites.includes(f.dstIP)},
];
