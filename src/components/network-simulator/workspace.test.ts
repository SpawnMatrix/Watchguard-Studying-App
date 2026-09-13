import { describe, expect, it } from 'vitest';
import { defaultConfig, defaultFlow, evaluateFlow, validateFlow } from './engine';
import { filterTraffic, flowPresets, packetToFlow } from './workspace';
import type { Packet } from './types';

const packet=(id:number,config=defaultConfig):Packet=>({...defaultFlow,...evaluateFlow(config,defaultFlow),id,timestamp:'12:00:00'});
describe('sandbox workspace',()=>{
  it('offers valid, independently editable presets',()=>{
    expect(new Set(flowPresets.map(preset=>preset.id)).size).toBe(flowPresets.length);
    for(const preset of flowPresets){expect(validateFlow(preset.flow)).toBeNull();expect(preset.flow).not.toBe(defaultFlow);}
  });
  it('separates client TLS failures from firewall denies',()=>{
    const tlsFlow={...defaultFlow,protocol:'HTTPS' as const,dstPort:443};
    const client:Packet={...tlsFlow,...evaluateFlow({...defaultConfig,inspectTls:true,trustCa:false},tlsFlow),id:2,timestamp:'12:00:01'};
    const denied=packet(3,{...defaultConfig,httpProxy:false,outgoing:false});
    const packets=[packet(1),client,denied];
    expect(filterTraffic(packets,'','denied')).toEqual([denied]);
    expect(filterTraffic(packets,'','client')).toEqual([client]);
    expect(filterTraffic(packets,'','allowed')).toEqual([packets[0]]);
  });
  it('combines outcome and all search terms without altering history',()=>{
    const packets=[packet(1),packet(2,{...defaultConfig,httpProxy:false,outgoing:false})];
    expect(filterTraffic(packets,'  198.51.100.20 HTTP  ','allowed')).toEqual([packets[0]]);
    expect(filterTraffic(packets,'53','all')).toEqual([]);
    expect(packets).toHaveLength(2);
  });
  it('replays flow inputs against changed policies without carrying over the old result',()=>{
    const original=packet(1);
    const replay=packetToFlow(original);
    expect(replay).toEqual(defaultFlow);
    expect(replay).not.toHaveProperty('status');
    expect(evaluateFlow({...defaultConfig,httpProxy:false,outgoing:false},replay).status).toBe('Denied');
    expect(original.status).toBe('Allowed');
  });
});
