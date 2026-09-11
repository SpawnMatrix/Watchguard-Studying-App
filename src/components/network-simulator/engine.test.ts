import { describe,it,expect } from 'vitest';
import { defaultConfig as config, defaultFlow as flow, evaluateFlow, validateFlow, challenges } from './engine';
describe('policy simulation boundaries',()=>{
 it('never lets an unmatched external flow into Trusted or Optional',()=>{for(const to of ['trusted','dmz'] as const)for(const protocol of ['TCP','UDP','HTTPS','ICMP'] as const)expect(evaluateFlow(config,{...flow,from:'external',to,protocol}).status).toBe('Denied');});
 it('limits Outgoing to TCP/UDP toward External and keeps Ping separate',()=>{
  expect(evaluateFlow({...config,ping:false},{...flow,protocol:'ICMP',dstPort:0}).status).toBe('Denied');
  expect(evaluateFlow(config,{...flow,protocol:'ICMP',dstPort:0}).matchedPolicy).toBe('Ping policy');
  expect(evaluateFlow(config,{...flow,to:'dmz'}).status).toBe('Denied');
 });
 it('matches DNS by both transport and port',()=>{
  const narrow={...config,outgoing:false};
  expect(evaluateFlow(narrow,{...flow,protocol:'UDP',dstPort:53}).status).toBe('Allowed');
  for(const protocol of ['UDP','TCP'] as const)expect(evaluateFlow(narrow,{...flow,protocol,dstPort:123}).status).toBe('Denied');
  expect(evaluateFlow(narrow,{...flow,protocol:'TCP',dstPort:53}).status).toBe('Denied');
  expect(evaluateFlow(config,{...flow,protocol:'TCP',dstPort:53}).matchedPolicy).toBe('Outgoing TCP-UDP');
 });
 it('applies host blocks first and external port blocks only to TCP/UDP',()=>{
  expect(evaluateFlow(config,{...flow,dstIP:config.blockedSites[0]}).matchedPolicy).toBe('Blocked Sites');
  expect(evaluateFlow(config,{...flow,dstPort:23}).matchedPolicy).toBe('Blocked Ports');
  expect(evaluateFlow({...config,interZone:true},{...flow,to:'dmz',dstPort:23}).status).toBe('Allowed');
  expect(evaluateFlow({...config,blockedPorts:[0]},{...flow,protocol:'ICMP',dstPort:0}).status).toBe('Allowed');
 });
 it('separates client certificate rejection, scanning, and raw encryption',()=>{
  const tls={...flow,protocol:'HTTPS' as const,dstPort:443,payload:'EICAR test marker'};
  expect(evaluateFlow(config,tls).status).toBe('Allowed');
  expect(evaluateFlow({...config,inspectTls:true},tls).failureOrigin).toBe('client');
  const blocked=evaluateFlow({...config,inspectTls:true,trustCa:true},tls);
  expect(blocked.status).toBe('Denied');expect(blocked.trace.at(-1)?.stage).toBe('Content inspection');
  expect(evaluateFlow({...config,inspectTls:true,trustCa:true},{...tls,payload:'clean'}).status).toBe('Allowed');
 });
 it('does not apply the HTTP proxy to UDP/80',()=>{expect(evaluateFlow({...config,outgoing:false},{...flow,protocol:'UDP',dstPort:80}).status).toBe('Denied');});
 it('validates addresses, ports and routed zones',()=>{
  for(const srcIP of ['999.0.0.1','10.1.1','10.0.0.01'])expect(validateFlow({...flow,srcIP})).toBeTruthy();
  for(const dstPort of [0,65536,NaN,1.5])expect(validateFlow({...flow,dstPort})).toBeTruthy();
  expect(validateFlow({...flow,to:'trusted'})).toBeTruthy();expect(validateFlow(flow)).toBeNull();
 });
 it('has a bounded solution for every guided challenge',()=>{
  const fixes={dns:{dns:true},udp:{},tls:{trustCa:true},gav:{inspectTls:true,trustCa:true},inbound:{inboundWeb:true},block:{}};
  for(const challenge of challenges){const c={...config,...challenge.config,...fixes[challenge.id as keyof typeof fixes]},f={...flow,...challenge.flow};expect(challenge.solved(c,f),challenge.id).toBe(true);expect(evaluateFlow(c,f).status).toBe(['gav','udp','block'].includes(challenge.id)?'Denied':'Allowed');}
 });
});
