import { useEffect, type ComponentType } from 'react';
import { CheckCircle2, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import type { FireboxSim, PageId, SimAction } from '../../engine/labSim';
import {
  BackupPage, BenchPage, ConfigFilePage, FireWatchPage, FrontPanelPage, GlobalSettingsPage, InterfacesPage, PoliciesPage,
  PolicyCheckerPage, RoutesPage, StatusRoutesPage, TrafficManagementPage, TrafficMonitorPage, UpgradePage, UsersRolesPage, WizardPage,
  type PageProps,
} from './SimPages';
import { AuthListPage, AuthServersPage, AuthSettingsPage, LinkMonitorPage, ProxyActionsPage, SdwanPage, SdwanStatusPage } from './SimPagesAdvanced';

export const PAGES: { group: string; items: { id: PageId; label: string; component: ComponentType<PageProps>; needsSetup: boolean }[] }[] = [
  { group: 'Lab bench', items: [{ id: 'bench', label: 'Management PC', component: BenchPage, needsSetup: false }] },
  { group: 'Setup', items: [{ id: 'wizard', label: 'Setup Wizard', component: WizardPage, needsSetup: false }] },
  { group: 'Dashboard', items: [
    { id: 'frontPanel', label: 'Front Panel', component: FrontPanelPage, needsSetup: true },
    { id: 'trafficMonitor', label: 'Traffic Monitor', component: TrafficMonitorPage, needsSetup: true },
    { id: 'fireWatch', label: 'FireWatch', component: FireWatchPage, needsSetup: true },
  ] },
  { group: 'System Status', items: [
    { id: 'statusRoutes', label: 'Routes', component: StatusRoutesPage, needsSetup: true },
    { id: 'sdwanStatus', label: 'SD-WAN', component: SdwanStatusPage, needsSetup: true },
    { id: 'authList', label: 'Authentication List', component: AuthListPage, needsSetup: true },
  ] },
  { group: 'Network', items: [
    { id: 'interfaces', label: 'Interfaces', component: InterfacesPage, needsSetup: true },
    { id: 'routes', label: 'Routes', component: RoutesPage, needsSetup: true },
    { id: 'linkMonitor', label: 'Link Monitor', component: LinkMonitorPage, needsSetup: true },
    { id: 'sdwan', label: 'SD-WAN', component: SdwanPage, needsSetup: true },
  ] },
  { group: 'Firewall', items: [
    { id: 'policies', label: 'Firewall Policies', component: PoliciesPage, needsSetup: true },
    { id: 'proxyActions', label: 'Proxy Actions', component: ProxyActionsPage, needsSetup: true },
    { id: 'policyChecker', label: 'Policy Checker', component: PolicyCheckerPage, needsSetup: true },
    { id: 'trafficManagement', label: 'Traffic Management', component: TrafficManagementPage, needsSetup: true },
  ] },
  { group: 'Authentication', items: [
    { id: 'authServers', label: 'Servers', component: AuthServersPage, needsSetup: true },
    { id: 'authSettings', label: 'Settings', component: AuthSettingsPage, needsSetup: true },
  ] },
  { group: 'System', items: [
    { id: 'globalSettings', label: 'Global Settings', component: GlobalSettingsPage, needsSetup: true },
    { id: 'usersRoles', label: 'Users and Roles', component: UsersRolesPage, needsSetup: true },
    { id: 'configFile', label: 'Configuration File', component: ConfigFilePage, needsSetup: true },
    { id: 'backup', label: 'Backup and Restore Image', component: BackupPage, needsSetup: true },
    { id: 'upgrade', label: 'Upgrade OS', component: UpgradePage, needsSetup: true },
  ] },
];

const allPages = PAGES.flatMap(g => g.items);
export const pageLabel = (id: PageId) => {
  const group = PAGES.find(g => g.items.some(i => i.id === id));
  const item = allPages.find(i => i.id === id);
  return group && item ? `${group.group} > ${item.label}` : id;
};

interface Props {
  s: FireboxSim;
  dispatch: (action: SimAction) => void;
  page: PageId;
  onPage: (page: PageId) => void;
}

/**
 * A simulated Fireware Web UI and lab bench. Opening a page records a view event, because some lab
 * steps are about looking in the right place, such as reading Traffic Monitor after a ping.
 */
export default function FireboxSimulator({ s, dispatch, page, onPage }: Props) {
  const current = allPages.find(p => p.id === page) ?? allPages[0];
  const locked = current.needsSetup && !s.setupComplete;
  const Page = current.component;

  useEffect(() => { dispatch({ type: 'view', page }); }, [page]);

  return (
    <section className="fbx" aria-label="Simulated Firebox">
      <header className="fbx-top">
        <ShieldCheck size={18} aria-hidden="true" />
        <strong>{s.setupComplete ? s.deviceName : 'Factory-default Firebox'}</strong>
        <span>{s.model} · Fireware {s.version}</span>
        <span className="fbx-sim-tag">Teaching simulation</span>
      </header>
      <div className="fbx-body">
        <nav className="fbx-nav" aria-label="Simulator pages">
          <label className="fbx-nav-select">
            <span>Go to</span>
            <select className="fbx-input" value={page} onChange={e => onPage(e.target.value as PageId)}>
              {PAGES.map(g => <optgroup key={g.group} label={g.group}>{g.items.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}</optgroup>)}
            </select>
          </label>
          {PAGES.map(g => (
            <div key={g.group} className="fbx-nav-group">
              <p>{g.group}</p>
              {g.items.map(i => (
                <button key={i.id} type="button" aria-current={page === i.id ? 'page' : undefined}
                  className={i.needsSetup && !s.setupComplete ? 'is-locked' : ''} onClick={() => onPage(i.id)}>
                  {i.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="fbx-page">
          {s.message && (
            <p className={`fbx-message is-${s.message.tone}`} role={s.message.tone === 'error' ? 'alert' : 'status'}>
              {s.message.tone === 'error' ? <TriangleAlert size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
              <span>{s.message.text}</span>
              <button type="button" aria-label="Dismiss message" onClick={() => dispatch({ type: 'dismissMessage' })}><X size={14} /></button>
            </p>
          )}
          {locked
            ? <p className="fbx-note">This page is available after the setup wizard has configured the Firebox.</p>
            : <Page s={s} dispatch={dispatch} />}
        </div>
      </div>
    </section>
  );
}
