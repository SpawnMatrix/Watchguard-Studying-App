import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { interfaceHealth, pcAddress, type MonitoredInterface, type ProbeTarget, type UrlPathRule } from '../../engine/labSim';
import type { PageProps } from './SimPages';

/**
 * Pages for the labs that build on the basics: Link Monitor and SD-WAN (Lab 8), proxy actions and
 * content inspection (Lab 11), and Firebox-DB authentication (Lab 14).
 */

function PageHead({ crumb, title }: { crumb: string; title: string }) {
  return <div className="fbx-page-head"><div><p className="fbx-crumb">{crumb}</p><h3>{title}</h3></div></div>;
}

const emptyTarget = (): ProbeTarget => ({ type: 'Ping', host: '', port: 80, query: '' });

export function LinkMonitorPage({ s, dispatch }: PageProps) {
  const enabled = s.interfaces.filter(i => i.type !== 'Disabled');
  const [ifaceId, setIfaceId] = useState(enabled[0]?.id ?? 0);
  const existing = s.linkMonitor.find(m => m.ifaceId === ifaceId);
  const [draft, setDraft] = useState<MonitoredInterface>(() => existing ?? { ifaceId, nextHop: '', targets: [], measure: null });
  const iface = s.interfaces.find(i => i.id === ifaceId);
  const choose = (id: number) => { setIfaceId(id); setDraft(s.linkMonitor.find(m => m.ifaceId === id) ?? { ifaceId: id, nextHop: '', targets: [], measure: null }); };
  const setTarget = (index: number, patch: Partial<ProbeTarget>) => setDraft({ ...draft, targets: draft.targets.map((x, i) => i === index ? { ...x, ...patch } : x) });
  return <section aria-label="Link Monitor">
    <PageHead crumb="Network" title="Link Monitor" />
    <table className="fbx-table"><thead><tr><th>Monitored interface</th><th>Next hop</th><th>Targets</th><th>Status</th><th /></tr></thead>
      <tbody>{s.linkMonitor.length ? s.linkMonitor.map(m => {
        const name = s.interfaces.find(i => i.id === m.ifaceId)?.name ?? m.ifaceId;
        return <tr key={m.ifaceId}><td>{name}</td><td><code>{m.nextHop || '-'}</code></td><td>{m.targets.map(x => `${x.type} ${x.host}${x.type === 'TCP' ? `:${x.port}` : ''}`).join(', ') || 'next hop'}</td><td>{interfaceHealth(s, m.ifaceId).active ? 'Active' : 'Inactive'}</td>
          <td><button type="button" className="fbx-link" aria-label={`Stop monitoring ${name}`} onClick={() => dispatch({ type: 'removeMonitoredInterface', ifaceId: m.ifaceId })}><Trash2 size={14} /></button></td></tr>;
      }) : <tr><td colSpan={5}>No interfaces are monitored.</td></tr>}</tbody></table>
    <form className="fbx-form fbx-card" onSubmit={e => { e.preventDefault(); dispatch({ type: 'setMonitoredInterface', entry: { ...draft, ifaceId } }); }}>
      <h4>Monitor an interface</h4>
      <label className="fbx-field"><span>Interface</span>
        <select className="fbx-input" value={ifaceId} onChange={e => choose(Number(e.target.value))}>{enabled.map(i => <option key={i.id} value={i.id}>{i.name} ({i.type})</option>)}</select></label>
      {iface?.type !== 'External' && <label className="fbx-field"><span>Next hop</span><input className="fbx-input" value={draft.nextHop} placeholder="192.168.10.2" onChange={e => setDraft({ ...draft, nextHop: e.target.value.trim() })} /></label>}
      <div className="fbx-targets">
        {draft.targets.map((target, index) => <div key={index} className="fbx-target">
          <select className="fbx-input" aria-label={`Probe ${index + 1} type`} value={target.type} onChange={e => setTarget(index, { type: e.target.value as ProbeTarget['type'] })}><option>Ping</option><option>DNS</option><option>TCP</option></select>
          <input className="fbx-input" aria-label={`Probe ${index + 1} host`} placeholder="Host or IP" value={target.host} onChange={e => setTarget(index, { host: e.target.value.trim() })} />
          {target.type === 'TCP' && <input className="fbx-input" aria-label={`Probe ${index + 1} port`} type="number" min={1} max={65535} value={target.port} onChange={e => setTarget(index, { port: Number(e.target.value) })} />}
          {target.type === 'DNS' && <input className="fbx-input" aria-label={`Probe ${index + 1} domain to query`} placeholder="Domain to query" value={target.query} onChange={e => setTarget(index, { query: e.target.value.trim() })} />}
          <label className="fbx-check"><input type="radio" name="measure" checked={draft.measure === index} onChange={() => setDraft({ ...draft, measure: index })} /> Measure loss, latency and jitter</label>
          <button type="button" className="fbx-link" aria-label={`Remove probe ${index + 1}`} onClick={() => setDraft({ ...draft, targets: draft.targets.filter((_, i) => i !== index), measure: draft.measure === index ? null : draft.measure !== null && draft.measure > index ? draft.measure - 1 : draft.measure })}><Trash2 size={14} /></button>
        </div>)}
      </div>
      <div className="fbx-actions">
        <button type="button" className="secondary-button" onClick={() => setDraft({ ...draft, targets: [...draft.targets, emptyTarget()] })}>Add probe target</button>
        <button type="submit" className="primary-button">Save</button>
      </div>
    </form>
  </section>;
}

export function SdwanPage({ s, dispatch }: PageProps) {
  const [name, setName] = useState('');
  const [chosen, setChosen] = useState<number[]>([]);
  const enabled = s.interfaces.filter(i => i.type !== 'Disabled');
  return <section aria-label="SD-WAN actions">
    <PageHead crumb="Network" title="SD-WAN" />
    <table className="fbx-table"><thead><tr><th>Action</th><th>Interfaces, in order</th><th>Used by</th></tr></thead>
      <tbody>{s.sdwanActions.length ? s.sdwanActions.map(a => <tr key={a.name}><td>{a.name}</td><td>{a.interfaces.map(id => s.interfaces.find(i => i.id === id)?.name).join(' → ')}</td><td>{s.policies.filter(p => p.sdwan === a.name).map(p => p.name).join(', ') || 'No policies'}</td></tr>) : <tr><td colSpan={3}>No SD-WAN actions.</td></tr>}</tbody></table>
    <form className="fbx-form fbx-card" onSubmit={e => { e.preventDefault(); dispatch({ type: 'addSdwanAction', action: { name, interfaces: chosen } }); }}>
      <h4>Add SD-WAN action</h4>
      <label className="fbx-field"><span>Name</span><input className="fbx-input" value={name} onChange={e => setName(e.target.value)} /></label>
      <fieldset className="fbx-fieldset"><legend>Interfaces (first is preferred)</legend>
        {enabled.map(i => <label key={i.id} className="fbx-check"><input type="checkbox" checked={chosen.includes(i.id)} onChange={e => setChosen(e.target.checked ? [...chosen, i.id] : chosen.filter(x => x !== i.id))} /> {i.name}</label>)}
      </fieldset>
      <div className="fbx-actions"><button type="submit" className="primary-button">Add action</button></div>
    </form>
    <p className="fbx-note">An action does nothing until a policy uses it: edit the policy in Firewall Policies and choose the action.</p>
  </section>;
}

export function SdwanStatusPage({ s }: PageProps) {
  const rows = s.interfaces.filter(i => i.type !== 'Disabled').map(i => ({ i, h: interfaceHealth(s, i.id) }));
  return <section aria-label="SD-WAN status">
    <PageHead crumb="System Status" title="SD-WAN" />
    <table className="fbx-table"><thead><tr><th>Interface</th><th>Status</th><th>Loss</th><th>Latency</th><th>Jitter</th></tr></thead>
      <tbody>{rows.map(({ i, h }) => <tr key={i.id}><td>{i.name}</td><td className={h.active ? 'fbx-allow' : 'fbx-deny'}>{h.active ? 'Active' : 'Inactive'}<small>{h.detail}</small></td><td>{h.lossPct}%</td><td>{h.latencyMs === null ? '-' : `${h.latencyMs} ms`}</td><td>{h.jitterMs === null ? '-' : `${h.jitterMs} ms`}</td></tr>)}</tbody></table>
    {s.sdwanActions.map(a => {
      const active = a.interfaces.map(id => s.interfaces.find(i => i.id === id)).find(i => i && interfaceHealth(s, i.id).active);
      return <p key={a.name} className="fbx-result">SD-WAN action <strong>{a.name}</strong>: {active ? `sending traffic through ${active.name}.` : 'no interface is active, so traffic that uses it is dropped (all gateways are down).'}</p>;
    })}
  </section>;
}

export function ProxyActionsPage({ s, dispatch }: PageProps) {
  const [rule, setRule] = useState<UrlPathRule>({ pattern: '', action: 'Deny', log: true });
  return <section aria-label="Proxy actions">
    <PageHead crumb="Firewall" title="Proxy Actions" />
    <div className="fbx-card">
      <h4>Default-HTTP-Client · HTTP Request · URL Paths</h4>
      <table className="fbx-table"><thead><tr><th>Pattern</th><th>Action</th><th>Log</th><th /></tr></thead>
        <tbody>{s.proxy.urlPaths.length ? s.proxy.urlPaths.map((r, index) => <tr key={index}><td><code>{r.pattern}</code></td><td className={r.action === 'Deny' ? 'fbx-deny' : 'fbx-allow'}>{r.action}</td><td>{r.log ? 'Yes' : 'No'}</td>
          <td><button type="button" className="fbx-link" aria-label={`Delete rule ${r.pattern}`} onClick={() => dispatch({ type: 'deleteUrlPath', index })}><Trash2 size={14} /></button></td></tr>) : <tr><td colSpan={4}>No URL path rules: every path is allowed.</td></tr>}</tbody></table>
      <form className="fbx-form" onSubmit={e => { e.preventDefault(); dispatch({ type: 'addUrlPath', rule }); }}>
        <label className="fbx-field"><span>Pattern</span><input className="fbx-input" value={rule.pattern} placeholder="*example*" onChange={e => setRule({ ...rule, pattern: e.target.value })} /></label>
        <label className="fbx-field"><span>Action</span><select className="fbx-input" value={rule.action} onChange={e => setRule({ ...rule, action: e.target.value as 'Allow' | 'Deny' })}><option>Deny</option><option>Allow</option></select></label>
        <label className="fbx-check"><input type="checkbox" checked={rule.log} onChange={e => setRule({ ...rule, log: e.target.checked })} /> Log this action</label>
        <div className="fbx-actions"><button type="submit" className="primary-button">Add rule</button></div>
      </form>
    </div>
    <div className="fbx-card">
      <h4>Default-HTTPS-Client · Content Inspection</h4>
      <label className="fbx-field"><span>When a connection matches no domain rule</span>
        <select className="fbx-input" value={s.proxy.httpsNoMatch} onChange={e => dispatch({ type: 'setHttpsNoMatch', value: e.target.value as 'Allow' | 'Inspect' })}>
          <option value="Allow">Allow (no inspection)</option><option value="Inspect">Inspect with Default-HTTP-Client</option>
        </select></label>
      <p className="fbx-note">Inspection decrypts HTTPS and re-signs it with the Firebox Proxy Authority certificate. Clients that do not trust that certificate see a warning on every site.</p>
    </div>
  </section>;
}

export function AuthServersPage({ s, dispatch }: PageProps) {
  const [user, setUser] = useState({ name: '', passphrase: '' });
  const [group, setGroup] = useState({ name: '', members: [] as string[] });
  return <section aria-label="Authentication servers">
    <PageHead crumb="Authentication" title="Servers · Firebox-DB" />
    <table className="fbx-table"><thead><tr><th>User</th><th>Groups</th></tr></thead>
      <tbody>{s.auth.users.length ? s.auth.users.map(u => <tr key={u.name}><td>{u.name}</td><td>{u.groups.join(', ') || '-'}</td></tr>) : <tr><td colSpan={2}>No Firebox-DB users.</td></tr>}</tbody></table>
    <form className="fbx-form fbx-card" onSubmit={e => { e.preventDefault(); dispatch({ type: 'addAuthUser', name: user.name, passphrase: user.passphrase }); }}>
      <h4>Add user</h4>
      <label className="fbx-field"><span>Name</span><input className="fbx-input" value={user.name} onChange={e => setUser({ ...user, name: e.target.value })} /></label>
      <label className="fbx-field"><span>Passphrase</span><input className="fbx-input" type="password" value={user.passphrase} onChange={e => setUser({ ...user, passphrase: e.target.value })} /><small>At least 8 characters</small></label>
      <div className="fbx-actions"><button type="submit" className="primary-button">Add user</button></div>
    </form>
    <form className="fbx-form fbx-card" onSubmit={e => { e.preventDefault(); dispatch({ type: 'addAuthGroup', name: group.name, members: group.members }); }}>
      <h4>Add group</h4>
      <label className="fbx-field"><span>Name</span><input className="fbx-input" value={group.name} onChange={e => setGroup({ ...group, name: e.target.value })} /></label>
      <fieldset className="fbx-fieldset"><legend>Members</legend>
        {s.auth.users.length ? s.auth.users.map(u => <label key={u.name} className="fbx-check"><input type="checkbox" checked={group.members.includes(u.name)} onChange={e => setGroup({ ...group, members: e.target.checked ? [...group.members, u.name] : group.members.filter(m => m !== u.name) })} /> {u.name}</label>) : <p className="fbx-note">Add a user first.</p>}
      </fieldset>
      <div className="fbx-actions"><button type="submit" className="primary-button">Add group</button></div>
    </form>
    <p className="fbx-note">Groups: {s.auth.groups.join(', ') || 'none'}. Use a group name in a policy's From list to allow only its signed-in members.</p>
  </section>;
}

export function AuthSettingsPage({ s, dispatch }: PageProps) {
  return <section aria-label="Authentication settings">
    <PageHead crumb="Authentication" title="Settings" />
    <label className="fbx-check"><input type="checkbox" checked={s.auth.autoRedirect} onChange={e => dispatch({ type: 'setAutoRedirect', enabled: e.target.checked })} /> Automatically redirect users to the authentication page</label>
    <p className="fbx-note">The authentication portal is at https://{s.interfaces.find(i => i.id === 1)?.ip}:4100.</p>
  </section>;
}

export function AuthListPage({ s }: PageProps) {
  const pc = pcAddress(s);
  return <section aria-label="Authentication list">
    <PageHead crumb="System Status" title="Authentication List" />
    <table className="fbx-table"><thead><tr><th>User</th><th>Type</th><th>IP address</th></tr></thead>
      <tbody>{s.pc.authUser ? <tr><td>{s.pc.authUser}</td><td>Firewall · Firebox-DB</td><td><code>{pc.ip}</code></td></tr> : <tr><td colSpan={3}>No users are authenticated.</td></tr>}</tbody></table>
  </section>;
}

/** Certificate Portal and authentication portal, shown on the Management PC page once set up. */
export function PortalPanels({ s, dispatch }: PageProps) {
  const [login, setLogin] = useState({ user: '', passphrase: '' });
  const trusted = s.interfaces.find(i => i.id === 1)?.ip;
  if (!s.setupComplete) return null;
  return <div className="fbx-portals">
    <div className="fbx-card">
      <h4>Certificate Portal · http://{trusted}:4126</h4>
      <p className="fbx-note">{s.pc.trustsProxyCa ? 'This PC trusts the Firebox Proxy Authority certificate.' : s.pc.caDownloaded ? 'Certificate downloaded but not installed.' : 'Not downloaded.'}</p>
      <div className="fbx-actions">
        <button type="button" className="secondary-button" onClick={() => dispatch({ type: 'downloadProxyCa' })}>Download Proxy Authority certificate</button>
        <button type="button" className="secondary-button" disabled={!s.pc.caDownloaded || s.pc.trustsProxyCa} onClick={() => dispatch({ type: 'installProxyCa' })}>Install as trusted root</button>
      </div>
    </div>
    <div className="fbx-card">
      <h4>Authentication portal · https://{trusted}:4100</h4>
      {s.pc.authUser
        ? <div className="fbx-actions"><p className="fbx-note">Signed in as <strong>{s.pc.authUser}</strong>.</p><button type="button" className="secondary-button" onClick={() => dispatch({ type: 'authLogout' })}>Sign out</button></div>
        : <form className="fbx-inline" onSubmit={e => { e.preventDefault(); dispatch({ type: 'authLogin', user: login.user, passphrase: login.passphrase }); }}>
          <input className="fbx-input" aria-label="Portal user name" placeholder="User name" value={login.user} onChange={e => setLogin({ ...login, user: e.target.value })} />
          <input className="fbx-input" aria-label="Portal passphrase" type="password" placeholder="Passphrase" value={login.passphrase} onChange={e => setLogin({ ...login, passphrase: e.target.value })} />
          <button type="submit" className="secondary-button">Sign in</button>
        </form>}
    </div>
  </div>;
}
