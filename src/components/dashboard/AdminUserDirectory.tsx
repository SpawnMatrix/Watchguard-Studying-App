import { useEffect, useRef, useState } from 'react';
import { Users } from 'lucide-react';

interface DirectoryUser { username: string; role: 'administrator' | 'learner'; createdAt: number }

export default function AdminUserDirectory() {
  const [users, setUsers] = useState<DirectoryUser[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function load(more = false) {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/users' + (more && cursor ? `?after=${encodeURIComponent(cursor)}` : ''),
        { credentials: 'same-origin', signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 403 ? 'Your administrator session has ended. Authenticate again to view accounts.' : 'Accounts could not be loaded. Please try again.');
      const data = await response.json() as { users: DirectoryUser[]; nextCursor: string | null };
      if (controller.signal.aborted) return;
      setUsers(previous => more ? [...(previous ?? []), ...data.users] : data.users);
      setCursor(data.nextCursor);
    } catch (err) {
      if (!controller.signal.aborted) { setUsers(null); setCursor(null); setError((err as Error).message); }
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <section className="home-card space-y-3" aria-labelledby="account-directory-title">
    <h2 id="account-directory-title"><Users size={19} aria-hidden="true"/>User accounts</h2>
    <p>Username, role and creation date. Study progress and activity are private.</p>
    <button type="button" className="secondary-button" disabled={busy} onClick={() => void load()}>{busy ? 'Loading accounts…' : users ? 'Refresh accounts' : 'Load accounts'}</button>
    {error && <p role="alert" className="text-red-400">{error}</p>}
    {users && <>
      <p role="status">{users.length} account{users.length === 1 ? '' : 's'} shown{cursor ? ' · more available' : ''}</p>
      <ul className="space-y-2" aria-label="User accounts">
        {users.map(user => <li key={user.username} className="rounded-lg border border-watchguard-border bg-watchguard-dark p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0"><strong className="font-mono text-gray-200 break-all">{user.username}</strong><p className="text-sm text-gray-400">{user.role === 'administrator' ? 'Administrator' : 'Learner'}</p></div>
          <span className="text-sm text-gray-400">Created <time dateTime={new Date(user.createdAt).toISOString()}>{new Date(user.createdAt).toLocaleDateString()}</time></span>
        </li>)}
      </ul>
      {cursor && <button type="button" className="secondary-button" disabled={busy} onClick={() => void load(true)}>Load more accounts</button>}
    </>}
  </section>;
}
