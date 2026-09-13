import { useState, type FormEvent } from 'react';
import { Shield, Trash2, Plus } from 'lucide-react';
import { validIPv4, type SandboxConfig } from './engine';
import { policyRows } from './workspace';

interface Props {config:SandboxConfig; onChange:(config:SandboxConfig)=>void}
export function PolicyController({config,onChange}:Props) {
  const [site,setSite]=useState(''),[port,setPort]=useState(''),[error,setError]=useState('');
  function addBlock(event:FormEvent,kind:'site'|'port') {
    event.preventDefault();
    if(kind==='site') {
      const address=site.trim();
      if(!validIPv4(address)){setError('Use a valid IPv4 host address for a blocked site.');return;}
      onChange({...config,blockedSites:[...new Set([...config.blockedSites,address])]});setSite('');
    } else {
      const value=Number(port);
      if(!/^\d+$/.test(port)||value<1||value>65535){setError('Use a blocked port from 1 to 65535.');return;}
      onChange({...config,blockedPorts:[...new Set([...config.blockedPorts,value])]});setPort('');
    }
    setError('');
  }
  return <section className="firewall-policies" aria-label="Firewall policies">
    <div className="sandbox-pane-heading"><div><p className="eyebrow">FIREWALL</p><h2><Shield size={20}/>Firewall policies</h2></div><span>{policyRows.filter(row=>config[row.key]).length} enabled</span></div>
    <p className="sandbox-description">Changes apply to the next test flow. These fixed teaching rules match specific services before the broad Outgoing rule; this is not Fireware's complete policy-order algorithm.</p>
    <div className="sandbox-policy-scroll" tabIndex={0} role="region" aria-label="Scrollable policy table">
      <table className="sandbox-policy-table"><thead><tr><th scope="col">Enabled</th><th scope="col">Policy</th><th scope="col">From → To</th><th scope="col">Service</th><th scope="col">Action / inspection</th></tr></thead>
        <tbody>{policyRows.map(row=><tr key={row.key} data-enabled={config[row.key]}><td><input type="checkbox" aria-label={`${row.name} policy`} checked={config[row.key]} onChange={event=>onChange({...config,[row.key]:event.target.checked})}/></td><th scope="row">{row.name}</th><td>{row.scope}</td><td>{row.service}</td><td>{row.inspection}</td></tr>)}</tbody>
      </table>
    </div>
    <label className="sandbox-client-trust"><input type="checkbox" disabled={!config.inspectTls} checked={config.trustCa} onChange={event=>onChange({...config,trustCa:event.target.checked})}/><div><strong>Client trusts inspection CA</strong><p>Needed for this client's HTTPS inspection test. Certificate trust is a client setting, separate from the firewall allow decision.</p></div></label>
    <div className="sandbox-protections">
      <section><h3>Blocked Sites</h3><p>These lab hosts are blocked before policy selection.</p><ul>{config.blockedSites.map(address=><li key={address}><code>{address}</code><button aria-label={`Remove blocked site ${address}`} onClick={()=>onChange({...config,blockedSites:config.blockedSites.filter(value=>value!==address)})}><Trash2 size={16}/></button></li>)}</ul><form onSubmit={event=>addBlock(event,'site')}><input aria-label="Blocked IPv4 address" placeholder="203.0.113.66" value={site} onChange={event=>setSite(event.target.value)}/><button className="secondary-button" aria-label="Add blocked site"><Plus size={16}/>Add</button></form></section>
      <section><h3>Blocked Ports</h3><p>Applies to modeled TCP/UDP flows crossing External.</p><ul>{config.blockedPorts.map(value=><li key={value}><code>Port {value}</code><button aria-label={`Remove blocked port ${value}`} onClick={()=>onChange({...config,blockedPorts:config.blockedPorts.filter(port=>port!==value)})}><Trash2 size={16}/></button></li>)}</ul><form onSubmit={event=>addBlock(event,'port')}><input aria-label="Blocked port number" inputMode="numeric" placeholder="1–65535" value={port} onChange={event=>setPort(event.target.value)}/><button className="secondary-button" aria-label="Add blocked port"><Plus size={16}/>Add</button></form></section>
    </div>
    {error&&<p role="alert" className="sandbox-error">{error}</p>}
  </section>;
}
