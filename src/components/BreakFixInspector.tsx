import { ArrowDown, ArrowUp } from 'lucide-react';
import { deviceLabels, effectiveAddressing, isIPv4, type BreakFixNetwork } from '../engine/breakfix';

interface Props {
  device: string;
  net: BreakFixNetwork;
  onChange: (mutate: (net: BreakFixNetwork) => void) => void;
}

/** Free-text address fields, validated as you type. The simulation decides whether a value works. */
function AddressField({ label, value, onChange, hint }: { label: string; value: string; onChange: (value: string) => void; hint?: string }) {
  const invalid = value.trim() !== '' && !isIPv4(value.trim());
  return (
    <label className="bf-field">
      <span>{label}</span>
      <input className="bf-input" value={value} spellCheck={false} inputMode="decimal" aria-invalid={invalid}
        onChange={e => onChange(e.target.value.trim())} />
      {invalid && <small className="bf-invalid">Not a valid IPv4 address</small>}
      {hint && !invalid && <small>{hint}</small>}
    </label>
  );
}

function PrefixField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label className="bf-field">
      <span>Prefix length</span>
      <select className="bf-input" value={value} onChange={e => onChange(Number(e.target.value))}>
        {Array.from({ length: 23 }, (_, i) => i + 8).map(p => <option key={p} value={p}>/{p}</option>)}
      </select>
    </label>
  );
}

const ReadOnly = ({ label, value }: { label: string; value: string }) => (
  <div className="bf-field is-readonly"><span>{label}</span><code>{value}</code></div>
);

export default function BreakFixInspector({ device, net, onChange }: Props) {
  const title = deviceLabels[device] ?? device;
  const hostConfig = net.hosts.find(h => h.id === device);

  if (device === 'internet') {
    return (
      <section className="bf-inspector" aria-label="Internet">
        <h3>{title}</h3>
        <p className="bf-note">Outside your control, as on a real ticket. Use it as a known-good reference.</p>
        <ReadOnly label="Website" value={`${net.internet.webName} · ${net.internet.webIp}`} />
        <ReadOnly label="Public DNS resolver" value={net.internet.resolverIp} />
        <ReadOnly label="Customer test client" value={net.internet.clientIp} />
        <ReadOnly label="ISP gateway" value={net.internet.ispGateway} />
      </section>
    );
  }

  if (hostConfig && hostConfig.addressing === 'dhcp') {
    const lease = effectiveAddressing(net, hostConfig);
    return (
      <section className="bf-inspector" aria-label={title}>
        <h3>{title}</h3>
        <p className="bf-note">A DHCP client. It has no settings of its own to edit: its address, gateway and DNS server come from whoever answers its DHCP request.</p>
        <ReadOnly label="ipconfig: address" value={`${lease.ip}/${lease.prefix}`} />
        <ReadOnly label="ipconfig: default gateway" value={lease.gateway || '(none)'} />
        <ReadOnly label="ipconfig: DNS server" value={lease.dns || '(none)'} />
      </section>
    );
  }

  if (hostConfig) {
    const set = (key: 'ip' | 'gateway' | 'dns') => (value: string) => onChange(n => { n.hosts.find(h => h.id === device)![key] = value; });
    return (
      <section className="bf-inspector" aria-label={title}>
        <h3>{title}</h3>
        <p className="bf-note">Static IPv4 settings.{hostConfig.role === 'server' ? ' Changing a server address also changes where other devices must send traffic.' : ''}</p>
        <div className="bf-fields">
          <AddressField label="IP address" value={hostConfig.ip} onChange={set('ip')} />
          <PrefixField value={hostConfig.prefix} onChange={v => onChange(n => { n.hosts.find(h => h.id === device)!.prefix = v; })} />
          <AddressField label="Default gateway" value={hostConfig.gateway} onChange={set('gateway')} />
          <AddressField label="DNS server" value={hostConfig.dns} onChange={set('dns')} />
        </div>
        {hostConfig.services.length > 0 && <ReadOnly label="Listening on" value={hostConfig.services.map(s => `${s.protocol.toUpperCase()} ${s.port}`).join(', ')} />}
      </section>
    );
  }

  if (device === 'switch') {
    return (
      <section className="bf-inspector" aria-label={title}>
        <h3>{title}</h3>
        <p className="bf-note">Access ports carry one untagged VLAN. The uplink to the Firebox trusted interface is on VLAN {net.switch.uplinkVlan}.</p>
        <table className="bf-table">
          <thead><tr><th scope="col">Port</th><th scope="col">Connected to</th><th scope="col">Access VLAN</th></tr></thead>
          <tbody>
            <tr><th scope="row">Port 1</th><td>Firebox Eth1 (uplink)</td><td><code>{net.switch.uplinkVlan}</code></td></tr>
            {net.switch.ports.map(port => (
              <tr key={port.id}>
                <th scope="row">{port.label}</th>
                <td>{deviceLabels[port.device]}</td>
                <td>
                  <input className="bf-input bf-narrow" type="number" min={1} max={4094} value={port.vlan} aria-label={`${port.label} access VLAN`}
                    onChange={e => { const v = Number(e.target.value); onChange(n => { n.switch.ports.find(p => p.id === port.id)!.vlan = v; }); }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    );
  }

  if (device === 'r1') {
    return (
      <section className="bf-inspector" aria-label={title}>
        <h3>{title}</h3>
        <ReadOnly label="Inside interface (office)" value={`${net.router.insideIp}/${net.router.insidePrefix}`} />
        <ReadOnly label="Lab interface" value={`${net.router.labIp}/${net.router.labPrefix}`} />
        <AddressField label="Default gateway" value={net.router.defaultGateway} onChange={v => onChange(n => { n.router.defaultGateway = v; })} />
      </section>
    );
  }

  // Firebox
  const fb = net.firebox;
  const movePolicy = (index: number, delta: number) => onChange(n => {
    const list = n.firebox.policies, target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
  });
  return (
    <section className="bf-inspector" aria-label="Firebox">
      <h3>Firebox</h3>
      <details open>
        <summary>Interfaces</summary>
        <table className="bf-table">
          <thead><tr><th scope="col">Interface</th><th scope="col">Address</th></tr></thead>
          <tbody>{fb.interfaces.map(i => <tr key={i.id}><th scope="row">{i.name}</th><td><code>{i.ip}/{i.prefix}</code></td></tr>)}</tbody>
        </table>
        <ReadOnly label="Default route (external gateway)" value={fb.externalGateway} />
      </details>

      <details open>
        <summary>Firewall policies <small>(checked top to bottom; first match wins)</small></summary>
        <ol className="bf-policies">
          {fb.policies.map((p, index) => (
            <li key={p.id} className={`bf-policy ${p.enabled ? '' : 'is-disabled'} ${p.action === 'deny' ? 'is-deny' : ''}`}>
              <div className="bf-policy-head">
                <label className="bf-check"><input type="checkbox" checked={p.enabled} onChange={e => { const v = e.target.checked; onChange(n => { n.firebox.policies.find(x => x.id === p.id)!.enabled = v; }); }} /> <strong>{p.name}</strong></label>
                <span className={`bf-action ${p.action}`}>{p.action === 'allow' ? 'Allowed' : 'Denied'}</span>
                <span className="bf-order">
                  <button type="button" aria-label={`Move ${p.name} up`} disabled={index === 0} onClick={() => movePolicy(index, -1)}><ArrowUp size={14} /></button>
                  <button type="button" aria-label={`Move ${p.name} down`} disabled={index === fb.policies.length - 1} onClick={() => movePolicy(index, 1)}><ArrowDown size={14} /></button>
                </span>
              </div>
              <div className="bf-policy-body">
                <span>{p.protocol.toUpperCase()}{p.protocol !== 'icmp' && <> port <input className="bf-input bf-narrow" type="number" min={1} max={65535} value={p.port} aria-label={`${p.name} port`}
                  onChange={e => { const v = Number(e.target.value); onChange(n => { n.firebox.policies.find(x => x.id === p.id)!.port = v; }); }} /></>}</span>
                <span>From <code>{p.from}</code></span>
                <label>To <input className="bf-input bf-medium" value={p.to} spellCheck={false} aria-label={`${p.name} To`}
                  onChange={e => { const v = e.target.value.trim(); onChange(n => { n.firebox.policies.find(x => x.id === p.id)!.to = v; }); }} /></label>
              </div>
            </li>
          ))}
        </ol>
        <p className="bf-note">To accepts an alias (Any, Any-Trusted, Any-Optional, Any-External) or one IPv4 address.</p>
      </details>

      <details open>
        <summary>NAT</summary>
        <label className="bf-check"><input type="checkbox" checked={fb.dynamicNat.trusted} onChange={e => { const v = e.target.checked; onChange(n => { n.firebox.dynamicNat.trusted = v; }); }} /> Dynamic NAT: Any-Trusted to Any-External</label>
        <label className="bf-check"><input type="checkbox" checked={fb.dynamicNat.optional} onChange={e => { const v = e.target.checked; onChange(n => { n.firebox.dynamicNat.optional = v; }); }} /> Dynamic NAT: Any-Optional to Any-External</label>
        {fb.staticNat.map(rule => (
          <div key={rule.id} className="bf-fields">
            <ReadOnly label="Static NAT public address" value={`${rule.publicIp} · TCP ${rule.port}`} />
            <AddressField label="Translates to internal address" value={rule.internalIp} onChange={v => onChange(n => { n.firebox.staticNat.find(x => x.id === rule.id)!.internalIp = v; })} />
          </div>
        ))}
      </details>

      <details open>
        <summary>Static routes</summary>
        {fb.routes.map(route => (
          <div key={route.id} className="bf-fields">
            <ReadOnly label="Destination" value={`${route.network}/${route.prefix}`} />
            <AddressField label="Gateway" value={route.gateway} onChange={v => onChange(n => { n.firebox.routes.find(x => x.id === route.id)!.gateway = v; })} />
          </div>
        ))}
      </details>

      <details open>
        <summary>DHCP server (trusted interface)</summary>
        <label className="bf-check"><input type="checkbox" checked={fb.dhcp.enabled} onChange={e => { const v = e.target.checked; onChange(n => { n.firebox.dhcp.enabled = v; }); }} /> Enabled</label>
        <div className="bf-fields">
          <AddressField label="Address range start" value={fb.dhcp.start} onChange={v => onChange(n => { n.firebox.dhcp.start = v; })} />
          <AddressField label="Address range end" value={fb.dhcp.end} onChange={v => onChange(n => { n.firebox.dhcp.end = v; })} />
          <AddressField label="Default gateway handed out" value={fb.dhcp.gateway} onChange={v => onChange(n => { n.firebox.dhcp.gateway = v; })} />
          <AddressField label="DNS server handed out" value={fb.dhcp.dns} onChange={v => onChange(n => { n.firebox.dhcp.dns = v; })} />
        </div>
      </details>
    </section>
  );
}
