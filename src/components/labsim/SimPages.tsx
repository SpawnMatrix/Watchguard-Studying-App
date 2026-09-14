import { useState, type FormEvent, type ReactNode } from 'react';
import { Power, Plug, TerminalSquare, Trash2 } from 'lucide-react';
import {
  INTERNET_HOSTS, UPGRADE_VERSION, fireWatchConnections, isIPv4, matchPolicy, orderedPolicies, pcAddress, routeLookup,
  type FireboxSim, type Flow, type InterfaceType, type PolicyService, type SimAction, type SimInterface, type SimRoute,
} from '../../engine/labSim';

export interface PageProps { s: FireboxSim; dispatch: (action: SimAction) => void }

const splitList = (value: string) => value.split(',').map(v => v.trim()).filter(Boolean);

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="fbx-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function PageHead({ crumb, title, children }: { crumb: string; title: string; children?: ReactNode }) {
  return <div className="fbx-page-head"><div><p className="fbx-crumb">{crumb}</p><h3>{title}</h3></div>{children}</div>;
}

/* ---------------------------------------------------------------- Management PC and bench */

export function BenchPage({ s, dispatch }: PageProps) {
  const [host, setHost] = useState('8.8.4.4');
  const [url, setUrl] = useState('https://www.watchguard.com');
  const pc = pcAddress(s);
  return <section aria-label="Management PC">
    <PageHead crumb="Lab bench" title="Management PC" />
    <div className="fbx-bench">
      <button type="button" className={`fbx-toggle ${s.bench.power ? 'is-on' : ''}`} aria-pressed={s.bench.power} onClick={() => dispatch({ type: 'bench', power: !s.bench.power })}><Power size={16} />Firebox power {s.bench.power ? 'on' : 'off'}</button>
      <button type="button" className={`fbx-toggle ${s.bench.externalCable ? 'is-on' : ''}`} aria-pressed={s.bench.externalCable} onClick={() => dispatch({ type: 'bench', externalCable: !s.bench.externalCable })}><Plug size={16} />Eth0 to Internet {s.bench.externalCable ? 'connected' : 'unplugged'}</button>
      <button type="button" className={`fbx-toggle ${s.bench.trustedCable ? 'is-on' : ''}`} aria-pressed={s.bench.trustedCable} onClick={() => dispatch({ type: 'bench', trustedCable: !s.bench.trustedCable })}><Plug size={16} />Eth1 to this PC {s.bench.trustedCable ? 'connected' : 'unplugged'}</button>
    </div>
    <p className="fbx-note">This PC is a DHCP client on the Firebox's trusted interface. Current address: <code>{pc.ip}</code>{pc.problem ? ` (${pc.problem})` : ''}</p>
    <div className="fbx-commands">
      <button type="button" className="secondary-button" onClick={() => dispatch({ type: 'ipconfig' })}><TerminalSquare size={15} />ipconfig</button>
      <form onSubmit={e => { e.preventDefault(); dispatch({ type: 'ping', host }); }} className="fbx-inline">
        <input className="fbx-input" aria-label="Host to ping" value={host} onChange={e => setHost(e.target.value)} />
        <button className="secondary-button" type="submit">ping</button>
      </form>
      <form onSubmit={e => { e.preventDefault(); dispatch({ type: 'browse', url }); }} className="fbx-inline">
        <input className="fbx-input" aria-label="URL to open" value={url} onChange={e => setUrl(e.target.value)} />
        <button className="secondary-button" type="submit">open</button>
      </form>
      <button type="button" className="secondary-button" onClick={() => dispatch({ type: 'speedtest' })}>speed test</button>
    </div>
    <pre className="fbx-terminal" aria-live="polite" aria-label="Command output">{s.terminal.length ? s.terminal.join('\n') : 'Command output appears here.'}</pre>
  </section>;
}

/* ---------------------------------------------------------------- Setup wizard */

export function WizardPage({ s, dispatch }: PageProps) {
  const w = s.wizard;
  const set = (patch: Partial<FireboxSim['wizard']>) => dispatch({ type: 'wizardUpdate', patch });
  const titles = ['Name the Firebox', 'External interface', 'Trusted interface', 'DNS servers', 'Passphrases'];
  if (s.setupComplete) return <section aria-label="Setup wizard"><PageHead crumb="Setup" title="Setup complete" /><p className="fbx-note">{s.deviceName} is configured. Use the menu to manage it.</p></section>;
  if (pcAddress(s).problem) {
    return <section aria-label="Setup wizard"><PageHead crumb="Setup" title="Web Setup Wizard" /><p className="fbx-note">The wizard is served by the Firebox at https://10.0.1.1:8080. Power it on and cable this PC to interface 1 first.</p></section>;
  }
  return <section aria-label="Setup wizard">
    <PageHead crumb={`Setup wizard · step ${w.page + 1} of 5`} title={titles[w.page]} />
    <div className="fbx-form">
      {w.page === 0 && <Field label="Device name"><input className="fbx-input" value={w.deviceName} onChange={e => set({ deviceName: e.target.value })} /></Field>}
      {w.page === 1 && <>
        <Field label="Configure Eth0 using">
          <select className="fbx-input" value={w.externalMode} onChange={e => set({ externalMode: e.target.value as 'DHCP' | 'Static' })}><option>Static</option><option>DHCP</option></select>
        </Field>
        {w.externalMode === 'Static' && <>
          <Field label="IP address"><input className="fbx-input" value={w.externalIp} placeholder="203.0.113.2" onChange={e => set({ externalIp: e.target.value.trim() })} /></Field>
          <Field label="Prefix"><input className="fbx-input" type="number" min={1} max={32} value={w.externalPrefix} onChange={e => set({ externalPrefix: Number(e.target.value) })} /></Field>
          <Field label="Default gateway"><input className="fbx-input" value={w.externalGateway} placeholder="203.0.113.1" onChange={e => set({ externalGateway: e.target.value.trim() })} /></Field>
        </>}
      </>}
      {w.page === 2 && <>
        <Field label="Trusted interface IP address"><input className="fbx-input" value={w.trustedIp} onChange={e => set({ trustedIp: e.target.value.trim() })} /></Field>
        <Field label="Prefix"><input className="fbx-input" type="number" min={1} max={32} value={w.trustedPrefix} onChange={e => set({ trustedPrefix: Number(e.target.value) })} /></Field>
        <label className="fbx-check"><input type="checkbox" checked={w.dhcpEnabled} onChange={e => set({ dhcpEnabled: e.target.checked })} /> Enable DHCP server on the trusted interface</label>
      </>}
      {w.page === 3 && <>
        <Field label="Primary DNS server"><input className="fbx-input" value={w.dns1} onChange={e => set({ dns1: e.target.value.trim() })} /></Field>
        <Field label="Secondary DNS server" hint="Optional"><input className="fbx-input" value={w.dns2} onChange={e => set({ dns2: e.target.value.trim() })} /></Field>
      </>}
      {w.page === 4 && <>
        <Field label="Status passphrase (read-only)" hint="At least 8 characters"><input className="fbx-input" type="password" value={w.statusPassphrase} onChange={e => set({ statusPassphrase: e.target.value })} /></Field>
        <Field label="Admin passphrase (read-write)" hint="At least 8 characters, different from status"><input className="fbx-input" type="password" value={w.adminPassphrase} onChange={e => set({ adminPassphrase: e.target.value })} /></Field>
      </>}
    </div>
    <div className="fbx-actions">
      <button type="button" className="secondary-button" disabled={w.page === 0} onClick={() => dispatch({ type: 'wizardBack' })}>Back</button>
      <button type="button" className="primary-button" onClick={() => dispatch({ type: 'wizardNext' })}>{w.page === 4 ? 'Finish' : 'Next'}</button>
    </div>
  </section>;
}

/* ---------------------------------------------------------------- Dashboard */

export function FrontPanelPage({ s }: PageProps) {
  const link = (i: SimInterface) => i.type === 'Disabled' ? 'Disabled' : (i.id === 0 && s.bench.externalCable) || (i.id === 1 && s.bench.trustedCable) ? 'Link up' : 'No link';
  return <section aria-label="Front Panel">
    <PageHead crumb="Dashboard" title="Front Panel" />
    <dl className="fbx-facts"><div><dt>Name</dt><dd>{s.deviceName}</dd></div><div><dt>Model</dt><dd>{s.model}</dd></div><div><dt>Fireware</dt><dd>{s.version}</dd></div><div><dt>Policies</dt><dd>{s.policies.filter(p => p.enabled).length} enabled</dd></div></dl>
    <table className="fbx-table"><thead><tr><th>Interface</th><th>Type</th><th>Address</th><th>Status</th></tr></thead>
      <tbody>{s.interfaces.map(i => <tr key={i.id}><td>{i.id} · {i.name}</td><td>{i.type}</td><td><code>{i.type === 'Disabled' ? '-' : `${i.ip}/${i.prefix}`}</code></td><td>{link(i)}</td></tr>)}</tbody></table>
  </section>;
}

export function TrafficMonitorPage({ s, dispatch }: PageProps) {
  const [draft, setDraft] = useState(''), [filter, setFilter] = useState('');
  const lines = s.log.filter(l => !filter || l.text.toLowerCase().includes(filter.toLowerCase()) || l.disposition.toLowerCase().includes(filter.toLowerCase()));
  const apply = (e: FormEvent) => { e.preventDefault(); setFilter(draft); dispatch({ type: 'trafficFilter', text: draft }); };
  return <section aria-label="Traffic Monitor">
    <PageHead crumb="Dashboard" title="Traffic Monitor">
      <form onSubmit={apply} className="fbx-inline"><input className="fbx-input" aria-label="Filter log messages" placeholder="Filter, e.g. deny" value={draft} onChange={e => setDraft(e.target.value)} /><button className="secondary-button" type="submit">Filter</button></form>
    </PageHead>
    <ol className="fbx-log" aria-label="Log messages">
      {lines.length ? lines.map(l => <li key={l.id} className={`is-${l.disposition.toLowerCase()}`}><span>{l.disposition}</span>{l.text}</li>) : <li className="is-info">No log messages{filter ? ` match "${filter}"` : ' yet. Generate traffic from the Management PC'}.</li>}
    </ol>
  </section>;
}

export function FireWatchPage({ s, dispatch }: PageProps) {
  const [draft, setDraft] = useState(''), [source, setSource] = useState('');
  const rows = fireWatchConnections(s).filter(r => !source || r.source === source);
  return <section aria-label="FireWatch">
    <PageHead crumb="Dashboard" title="FireWatch">
      <form onSubmit={e => { e.preventDefault(); setSource(draft.trim()); dispatch({ type: 'fireWatchFilter', source: draft }); }} className="fbx-inline">
        <input className="fbx-input" aria-label="Filter by source" placeholder="Source IP" value={draft} onChange={e => setDraft(e.target.value)} /><button className="secondary-button" type="submit">Filter source</button>
      </form>
    </PageHead>
    <table className="fbx-table"><thead><tr><th>Source</th><th>Destination</th><th>Policy</th><th>Out</th></tr></thead>
      <tbody>{rows.length ? rows.map((r, i) => <tr key={i}><td><code>{r.source}</code></td><td><code>{r.destination}</code></td><td>{r.policy}</td><td>{r.interface}</td></tr>) : <tr><td colSpan={4}>No active connections{source ? ` from ${source}` : ''}.</td></tr>}</tbody></table>
  </section>;
}

export function StatusRoutesPage({ s }: PageProps) {
  const rows = [
    ...s.interfaces.filter(i => i.type !== 'Disabled' && isIPv4(i.ip)).map(i => ({ dest: `${i.ip.split('.').slice(0, 3).join('.')}.0/${i.prefix}`, gw: 'connected', dev: i.name, metric: 0 })),
    ...s.routes.map(r => ({ dest: `${r.destination}/${r.type === 'Host IPv4' ? 32 : r.prefix}`, gw: r.gateway, dev: (() => { const l = routeLookup(s, r.gateway); return 'iface' in l ? l.iface.name : '-'; })(), metric: r.metric })),
    ...s.interfaces.filter(i => i.type === 'External' && isIPv4(i.gateway)).map(i => ({ dest: '0.0.0.0/0', gw: i.gateway, dev: i.name, metric: 1 })),
  ];
  return <section aria-label="Routes status">
    <PageHead crumb="System Status" title="Routes" />
    <table className="fbx-table"><thead><tr><th>Destination</th><th>Gateway</th><th>Interface</th><th>Metric</th></tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}><td><code>{r.dest}</code></td><td><code>{r.gw}</code></td><td>{r.dev}</td><td>{r.metric}</td></tr>)}</tbody></table>
  </section>;
}

/* ---------------------------------------------------------------- Network */

export function InterfacesPage({ s, dispatch }: PageProps) {
  const [editing, setEditing] = useState<SimInterface | null>(null);
  return <section aria-label="Interfaces">
    <PageHead crumb="Network" title="Interfaces" />
    <table className="fbx-table"><thead><tr><th>#</th><th>Name</th><th>Type</th><th>Address</th><th>DHCP</th><th /></tr></thead>
      <tbody>{s.interfaces.map(i => <tr key={i.id}><td>{i.id}</td><td>{i.name}</td><td>{i.type}</td><td><code>{i.type === 'Disabled' ? '-' : `${i.ip}/${i.prefix}`}</code></td><td>{i.dhcpServer ? 'Server' : '-'}</td><td><button type="button" className="fbx-link" onClick={() => setEditing(structuredClone(i))}>Edit</button></td></tr>)}</tbody></table>
    {editing && <form className="fbx-form fbx-card" onSubmit={e => { e.preventDefault(); dispatch({ type: 'saveInterface', iface: editing }); setEditing(null); }}>
      <h4>Edit interface {editing.id}</h4>
      <Field label="Interface name"><input className="fbx-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></Field>
      <Field label="Interface type"><select className="fbx-input" value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as InterfaceType })}>{(['Disabled', 'External', 'Trusted', 'Optional', 'Custom'] as InterfaceType[]).map(t => <option key={t}>{t}</option>)}</select></Field>
      {editing.type !== 'Disabled' && <>
        <Field label="IPv4 address"><input className="fbx-input" value={editing.ip} onChange={e => setEditing({ ...editing, ip: e.target.value.trim() })} /></Field>
        <Field label="Prefix"><input className="fbx-input" type="number" min={1} max={32} value={editing.prefix} onChange={e => setEditing({ ...editing, prefix: Number(e.target.value) })} /></Field>
        {editing.type === 'External'
          ? <Field label="Default gateway"><input className="fbx-input" value={editing.gateway} onChange={e => setEditing({ ...editing, gateway: e.target.value.trim() })} /></Field>
          : <>
            <label className="fbx-check"><input type="checkbox" checked={editing.dhcpServer} onChange={e => setEditing({ ...editing, dhcpServer: e.target.checked })} /> Use DHCP server</label>
            {editing.dhcpServer && <>
              <Field label="Address pool start"><input className="fbx-input" value={editing.dhcpStart} onChange={e => setEditing({ ...editing, dhcpStart: e.target.value.trim() })} /></Field>
              <Field label="Address pool end"><input className="fbx-input" value={editing.dhcpEnd} onChange={e => setEditing({ ...editing, dhcpEnd: e.target.value.trim() })} /></Field>
            </>}
          </>}
      </>}
      <div className="fbx-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="primary-button">Save</button></div>
    </form>}
  </section>;
}

export function RoutesPage({ s, dispatch }: PageProps) {
  const [route, setRoute] = useState<SimRoute>({ type: 'Host IPv4', destination: '', prefix: 24, gateway: '', metric: 1 });
  return <section aria-label="Static routes">
    <PageHead crumb="Network" title="Routes" />
    <table className="fbx-table"><thead><tr><th>Type</th><th>Destination</th><th>Gateway</th><th>Metric</th><th /></tr></thead>
      <tbody>{s.routes.length ? s.routes.map((r, i) => <tr key={i}><td>{r.type}</td><td><code>{r.destination}{r.type === 'Network IPv4' ? `/${r.prefix}` : ''}</code></td><td><code>{r.gateway}</code></td><td>{r.metric}</td><td><button type="button" className="fbx-link" aria-label={`Delete route to ${r.destination}`} onClick={() => dispatch({ type: 'deleteRoute', index: i })}><Trash2 size={14} /></button></td></tr>) : <tr><td colSpan={5}>No static routes.</td></tr>}</tbody></table>
    <form className="fbx-form fbx-card" onSubmit={e => { e.preventDefault(); dispatch({ type: 'addRoute', route }); }}>
      <h4>Add route</h4>
      <Field label="Choose type"><select className="fbx-input" value={route.type} onChange={e => setRoute({ ...route, type: e.target.value as SimRoute['type'] })}><option>Host IPv4</option><option>Network IPv4</option></select></Field>
      <Field label="Route to"><input className="fbx-input" value={route.destination} placeholder={route.type === 'Host IPv4' ? '8.8.4.4' : '10.0.20.0'} onChange={e => setRoute({ ...route, destination: e.target.value.trim() })} /></Field>
      {route.type === 'Network IPv4' && <Field label="Prefix"><input className="fbx-input" type="number" min={1} max={32} value={route.prefix} onChange={e => setRoute({ ...route, prefix: Number(e.target.value) })} /></Field>}
      <Field label="Gateway"><input className="fbx-input" value={route.gateway} onChange={e => setRoute({ ...route, gateway: e.target.value.trim() })} /></Field>
      <Field label="Metric"><input className="fbx-input" type="number" min={1} max={1024} value={route.metric} onChange={e => setRoute({ ...route, metric: Number(e.target.value) })} /></Field>
      <div className="fbx-actions"><button type="submit" className="primary-button">Add route</button></div>
    </form>
  </section>;
}

/* ---------------------------------------------------------------- Firewall */

const SERVICES: PolicyService[] = ['HTTP', 'HTTPS', 'DNS', 'Ping', 'FTP', 'HTTP-proxy', 'HTTPS-proxy', 'FTP-proxy', 'Outgoing'];

export function PoliciesPage({ s, dispatch }: PageProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', action: 'Allowed' as 'Allowed' | 'Denied', to: '', tmForward: '', tmReverse: '' });
  const [adding, setAdding] = useState({ service: 'HTTP' as PolicyService, name: '', action: 'Allowed' as 'Allowed' | 'Denied', from: 'Any-Trusted', to: 'Any-External' });
  const ordered = orderedPolicies(s);
  const tm = s.trafficManagement.actions;
  return <section aria-label="Firewall policies">
    <PageHead crumb="Firewall" title="Firewall Policies"><span className="fbx-note">Automatic order: most specific first</span></PageHead>
    <div className="fbx-scroll"><table className="fbx-table"><thead><tr><th>#</th><th>On</th><th>Name</th><th>Action</th><th>From</th><th>To</th><th>Traffic mgmt</th><th /></tr></thead>
      <tbody>{ordered.map((p, index) => <tr key={p.id} className={p.enabled ? '' : 'is-off'}>
        <td>{index + 1}</td>
        <td><input type="checkbox" aria-label={`Enable ${p.name}`} checked={p.enabled} onChange={e => dispatch({ type: 'setPolicy', id: p.id, patch: { enabled: e.target.checked } })} /></td>
        <td><strong>{p.name}</strong><small>{p.service}</small></td>
        <td className={p.action === 'Denied' ? 'fbx-deny' : 'fbx-allow'}>{p.action}</td>
        <td>{p.from.join(', ')}</td><td>{p.to.join(', ')}</td>
        <td>{p.tmForward || p.tmReverse ? `${p.tmForward || '-'} / ${p.tmReverse || '-'}` : '-'}</td>
        <td className="fbx-row-actions"><button type="button" className="fbx-link" onClick={() => { setEditing(p.id); setDraft({ name: p.name, action: p.action, to: p.to.join(', '), tmForward: p.tmForward, tmReverse: p.tmReverse }); }}>Edit</button><button type="button" className="fbx-link" aria-label={`Delete ${p.name}`} onClick={() => dispatch({ type: 'deletePolicy', id: p.id })}><Trash2 size={14} /></button></td>
      </tr>)}</tbody></table></div>
    {editing && <form className="fbx-form fbx-card" onSubmit={e => { e.preventDefault(); dispatch({ type: 'setPolicy', id: editing, patch: { name: draft.name, action: draft.action, to: splitList(draft.to), tmForward: draft.tmForward, tmReverse: draft.tmReverse } }); setEditing(null); }}>
      <h4>Edit {s.policies.find(p => p.id === editing)?.name}</h4>
      <Field label="Name"><input className="fbx-input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field>
      <Field label="Connections are"><select className="fbx-input" value={draft.action} onChange={e => setDraft({ ...draft, action: e.target.value as 'Allowed' | 'Denied' })}><option>Allowed</option><option>Denied</option></select></Field>
      <Field label="To" hint="Comma separated: Any-External, an IP address, or a domain such as *.example.com"><input className="fbx-input" value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} /></Field>
      <Field label="Traffic management: forward"><select className="fbx-input" value={draft.tmForward} onChange={e => setDraft({ ...draft, tmForward: e.target.value })}><option value="">None</option>{tm.map(a => <option key={a.name}>{a.name}</option>)}</select></Field>
      <Field label="Traffic management: reverse"><select className="fbx-input" value={draft.tmReverse} onChange={e => setDraft({ ...draft, tmReverse: e.target.value })}><option value="">None</option>{tm.map(a => <option key={a.name}>{a.name}</option>)}</select></Field>
      <div className="fbx-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="primary-button">Save</button></div>
    </form>}
    <form className="fbx-form fbx-card" onSubmit={e => { e.preventDefault(); dispatch({ type: 'addPolicy', service: adding.service, name: adding.name || adding.service, action: adding.action, from: splitList(adding.from), to: splitList(adding.to) }); }}>
      <h4>Add policy</h4>
      <Field label="Policy type"><select className="fbx-input" value={adding.service} onChange={e => setAdding({ ...adding, service: e.target.value as PolicyService })}>{SERVICES.map(v => <option key={v}>{v}</option>)}</select></Field>
      <Field label="Name"><input className="fbx-input" value={adding.name} placeholder={adding.service} onChange={e => setAdding({ ...adding, name: e.target.value })} /></Field>
      <Field label="Connections are"><select className="fbx-input" value={adding.action} onChange={e => setAdding({ ...adding, action: e.target.value as 'Allowed' | 'Denied' })}><option>Allowed</option><option>Denied</option></select></Field>
      <Field label="From"><input className="fbx-input" value={adding.from} onChange={e => setAdding({ ...adding, from: e.target.value })} /></Field>
      <Field label="To"><input className="fbx-input" value={adding.to} onChange={e => setAdding({ ...adding, to: e.target.value })} /></Field>
      <div className="fbx-actions"><button type="submit" className="primary-button">Add policy</button></div>
    </form>
  </section>;
}

export function PolicyCheckerPage({ s, dispatch }: PageProps) {
  const [form, setForm] = useState({ zone: 'Trusted' as InterfaceType, protocol: 'tcp' as Flow['protocol'], src: '10.0.1.2', dst: '198.51.100.40', port: 443 });
  const [result, setResult] = useState<string | null>(null);
  const check = (e: FormEvent) => {
    e.preventDefault();
    const fqdn = isIPv4(form.dst) ? undefined : form.dst.trim().toLowerCase();
    const dst = fqdn ? INTERNET_HOSTS[fqdn] ?? '' : form.dst.trim();
    if (!isIPv4(dst) || !isIPv4(form.src)) { setResult('Enter a valid source IP, and a destination IP or a known host name.'); return; }
    const flow: Flow = { protocol: form.protocol, port: form.protocol === 'icmp' ? 0 : form.port, srcIp: form.src, srcZone: form.zone, dst, fqdn };
    const route = routeLookup(s, dst);
    const policy = matchPolicy(s, flow, 'error' in route ? 'External' : route.iface.type);
    dispatch({ type: 'policyCheck', flow });
    setResult(policy
      ? `${policy.name} (${policy.service}) handles this connection: ${policy.action}. It goes out ${'error' in route ? 'no interface' : route.iface.name} by ${'error' in route ? 'no route' : route.label}.`
      : 'No policy matches: the connection is denied as Unhandled Internal Packet.');
  };
  return <section aria-label="Policy Checker">
    <PageHead crumb="Firewall" title="Policy Checker" />
    <form className="fbx-form fbx-card" onSubmit={check}>
      <Field label="Arrives on"><select className="fbx-input" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value as InterfaceType })}><option>Trusted</option><option>Optional</option><option>External</option></select></Field>
      <Field label="Protocol"><select className="fbx-input" value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value as Flow['protocol'] })}><option value="tcp">TCP</option><option value="udp">UDP</option><option value="icmp">ICMP</option></select></Field>
      <Field label="Source IP"><input className="fbx-input" value={form.src} onChange={e => setForm({ ...form, src: e.target.value.trim() })} /></Field>
      <Field label="Destination IP or host"><input className="fbx-input" value={form.dst} onChange={e => setForm({ ...form, dst: e.target.value })} /></Field>
      {form.protocol !== 'icmp' && <Field label="Destination port"><input className="fbx-input" type="number" min={1} max={65535} value={form.port} onChange={e => setForm({ ...form, port: Number(e.target.value) })} /></Field>}
      <div className="fbx-actions"><button type="submit" className="primary-button">Check policy</button></div>
    </form>
    {result && <p className="fbx-result" role="status">{result}</p>}
  </section>;
}

export function TrafficManagementPage({ s, dispatch }: PageProps) {
  const [action, setAction] = useState({ name: '', maxKbps: 500, scope: 'All policies' as 'All policies' | 'Per policy' });
  return <section aria-label="Traffic Management">
    <PageHead crumb="Firewall" title="Traffic Management" />
    {!s.trafficManagement.enabled && <p className="fbx-warning">Traffic management is turned off in System &gt; Global Settings, so these actions have no effect yet.</p>}
    <table className="fbx-table"><thead><tr><th>Action</th><th>Maximum</th><th>Scope</th></tr></thead>
      <tbody>{s.trafficManagement.actions.length ? s.trafficManagement.actions.map(a => <tr key={a.name}><td>{a.name}</td><td>{a.maxKbps} Kbps</td><td>{a.scope}</td></tr>) : <tr><td colSpan={3}>No actions.</td></tr>}</tbody></table>
    <form className="fbx-form fbx-card" onSubmit={e => { e.preventDefault(); dispatch({ type: 'addTmAction', action }); }}>
      <h4>Add action</h4>
      <Field label="Name"><input className="fbx-input" value={action.name} onChange={e => setAction({ ...action, name: e.target.value })} /></Field>
      <Field label="Maximum bandwidth (Kbps)"><input className="fbx-input" type="number" min={1} value={action.maxKbps} onChange={e => setAction({ ...action, maxKbps: Number(e.target.value) })} /></Field>
      <Field label="Scope"><select className="fbx-input" value={action.scope} onChange={e => setAction({ ...action, scope: e.target.value as 'All policies' | 'Per policy' })}><option>All policies</option><option>Per policy</option></select></Field>
      <div className="fbx-actions"><button type="submit" className="primary-button">Add action</button></div>
    </form>
  </section>;
}

/* ---------------------------------------------------------------- System */

export function GlobalSettingsPage({ s, dispatch }: PageProps) {
  return <section aria-label="Global Settings">
    <PageHead crumb="System" title="Global Settings · Networking" />
    <label className="fbx-check"><input type="checkbox" checked={s.trafficManagement.enabled} onChange={e => dispatch({ type: 'setTrafficManagement', enabled: e.target.checked })} /> Enable all traffic management and QoS features</label>
  </section>;
}

export function UsersRolesPage({ s, dispatch }: PageProps) {
  const [user, setUser] = useState({ name: '', passphrase: '', role: 'Device Monitor' as 'Device Monitor' | 'Device Administrator' });
  return <section aria-label="Users and Roles">
    <PageHead crumb="System" title="Users and Roles" />
    <table className="fbx-table"><thead><tr><th>User</th><th>Role</th></tr></thead>
      <tbody><tr><td>status</td><td>Device Monitor (built in)</td></tr><tr><td>admin</td><td>Device Administrator (built in)</td></tr>{s.users.map(u => <tr key={u.name}><td>{u.name}</td><td>{u.role}</td></tr>)}</tbody></table>
    <form className="fbx-form fbx-card" onSubmit={e => { e.preventDefault(); dispatch({ type: 'addUser', user: { name: user.name, role: user.role }, passphrase: user.passphrase }); }}>
      <h4>Add user</h4>
      <Field label="Name"><input className="fbx-input" value={user.name} onChange={e => setUser({ ...user, name: e.target.value })} /></Field>
      <Field label="Passphrase" hint="At least 8 characters"><input className="fbx-input" type="password" value={user.passphrase} onChange={e => setUser({ ...user, passphrase: e.target.value })} /></Field>
      <Field label="Role"><select className="fbx-input" value={user.role} onChange={e => setUser({ ...user, role: e.target.value as 'Device Monitor' | 'Device Administrator' })}><option>Device Monitor</option><option>Device Administrator</option></select></Field>
      <div className="fbx-actions"><button type="submit" className="primary-button">Add user</button></div>
    </form>
  </section>;
}

export function ConfigFilePage({ s, dispatch }: PageProps) {
  const [report, setReport] = useState(false);
  return <section aria-label="Configuration File">
    <PageHead crumb="System" title="Configuration File" />
    <div className="fbx-actions">
      <button type="button" className="secondary-button" onClick={() => dispatch({ type: 'downloadConfig' })}>Download configuration file</button>
      <button type="button" className="secondary-button" onClick={() => { setReport(true); dispatch({ type: 'configReport' }); }}>Configuration Report</button>
    </div>
    {report && <div className="fbx-card fbx-report" aria-label="Configuration report">
      <h4>{s.deviceName} configuration report</h4>
      <p>Fireware {s.version} · {s.interfaces.filter(i => i.type !== 'Disabled').length} interfaces · {s.routes.length} static routes · DNS {s.dns.join(', ') || 'none'}</p>
      <ul>{orderedPolicies(s).map(p => <li key={p.id}>{p.name}: {p.action}, {p.from.join(', ')} to {p.to.join(', ')}{p.enabled ? '' : ' (disabled)'}</li>)}</ul>
    </div>}
    <div className="fbx-card">
      <h4>Save configuration (Policy Manager)</h4>
      <label className="fbx-check"><input type="checkbox" checked={s.alwaysBackup} onChange={e => dispatch({ type: 'setAlwaysBackup', enabled: e.target.checked })} /> Always create a backup when saving</label>
      <div className="fbx-actions"><button type="button" className="primary-button" onClick={() => dispatch({ type: 'saveConfig' })}>Save configuration to file</button></div>
      <p className="fbx-note">WatchGuard configs folder: {s.configFiles.length ? s.configFiles.join(', ') : 'empty'}</p>
    </div>
  </section>;
}

export function BackupPage({ s, dispatch }: PageProps) {
  const [create, setCreate] = useState({ name: '', key: '' });
  const [restoreKey, setRestoreKey] = useState<Record<string, string>>({});
  return <section aria-label="Backup and Restore Image">
    <PageHead crumb="System" title="Backup and Restore Image" />
    <form className="fbx-form fbx-card" onSubmit={e => { e.preventDefault(); dispatch({ type: 'createBackup', name: create.name, key: create.key }); }}>
      <h4>Create backup image</h4>
      <Field label="Name"><input className="fbx-input" value={create.name} onChange={e => setCreate({ ...create, name: e.target.value })} /></Field>
      <Field label="Encryption key" hint="At least 8 characters. You need it to restore."><input className="fbx-input" type="password" value={create.key} onChange={e => setCreate({ ...create, key: e.target.value })} /></Field>
      <div className="fbx-actions"><button type="submit" className="primary-button">Create backup image</button></div>
    </form>
    <table className="fbx-table"><thead><tr><th>Image</th><th>Fireware</th><th>Restore</th></tr></thead>
      <tbody>{s.backups.length ? s.backups.map(b => <tr key={b.id}><td>{b.name}{b.automatic && <small>automatic</small>}</td><td>{b.version}</td><td>
        <form className="fbx-inline" onSubmit={e => { e.preventDefault(); dispatch({ type: 'restoreBackup', id: b.id, key: restoreKey[b.id] ?? '' }); }}>
          <input className="fbx-input" type="password" aria-label={`Encryption key for ${b.name}`} placeholder="Encryption key" value={restoreKey[b.id] ?? ''} onChange={e => setRestoreKey({ ...restoreKey, [b.id]: e.target.value })} />
          <button type="submit" className="secondary-button">Restore</button>
        </form></td></tr>) : <tr><td colSpan={3}>No backup images on this Firebox.</td></tr>}</tbody></table>
  </section>;
}

export function UpgradePage({ s, dispatch }: PageProps) {
  const [pass, setPass] = useState('');
  return <section aria-label="Upgrade OS">
    <PageHead crumb="System" title="Upgrade OS" />
    <p className="fbx-note">Installed: Fireware {s.version}. {s.version === UPGRADE_VERSION ? 'This is the latest version.' : `Available: Fireware ${UPGRADE_VERSION}.`}</p>
    {s.version !== UPGRADE_VERSION && <form className="fbx-form fbx-card" onSubmit={e => { e.preventDefault(); dispatch({ type: 'upgrade', adminPassphrase: pass }); }}>
      <Field label="Admin passphrase"><input className="fbx-input" type="password" value={pass} onChange={e => setPass(e.target.value)} /></Field>
      <div className="fbx-actions"><button type="submit" className="primary-button">Upgrade to {UPGRADE_VERSION}</button></div>
    </form>}
  </section>;
}
