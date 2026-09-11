import React, { useCallback, useEffect, useState } from 'react';
import { Settings, Key, Eye, EyeOff, Lock, Users, ShieldCheck, LogOut } from 'lucide-react';
import { handleError } from '../../utils/errorHandler';

interface AdminConsoleProps {
  displayName: string;
}

interface AdminState {
  isAdmin: boolean;
  username: string | null;
  accountIsAdmin: boolean;
  breakGlassAvailable: boolean;
  adminCount: number;
  globalAIEnabled: boolean;
}

interface ManagedUser {
  username: string;
  isAdmin: boolean;
  createdAt: number;
  revision: number;
  updatedAt: number;
}

const EMPTY: AdminState = {
  isAdmin: false, username: null, accountIsAdmin: false,
  breakGlassAvailable: false, adminCount: 0, globalAIEnabled: false,
};

/**
 * Administrative requests carry no credential in the body. Authority comes
 * from the HttpOnly admin session cookie the server issues, so the password
 * is never held in component state or replayed on each action.
 */
async function adminRequest(path: string, body?: unknown, method = 'POST') {
  const response = await fetch('/api/admin' + path, {
    method: body === undefined ? 'GET' : method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Study-Request': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || 'Request failed.'), { status: response.status });
  return data;
}

export default function AdminConsole({ displayName }: AdminConsoleProps) {
  const [userCustomKey, setUserCustomKey] = useState(() => localStorage.getItem('watchguard_custom_gemini_api_key') || '');
  const [showKey, setShowKey] = useState(false);
  const [password, setPassword] = useState('');
  const [state, setState] = useState<AdminState>(EMPTY);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await adminRequest('/me', undefined, 'GET');
      setState(data);
      if (data.isAdmin) {
        const list = await adminRequest('/users', undefined, 'GET').catch(() => ({ users: [] }));
        setUsers(list.users ?? []);
      } else {
        setUsers([]);
      }
    } catch (err) {
      handleError('Failed to query administrator status', err);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleSaveCustomKey = (val: string) => {
    setUserCustomKey(val);
    if (val.trim()) localStorage.setItem('watchguard_custom_gemini_api_key', val.trim());
    else localStorage.removeItem('watchguard_custom_gemini_api_key');
  };

  const handleClearCustomKey = () => {
    setUserCustomKey('');
    localStorage.removeItem('watchguard_custom_gemini_api_key');
  };

  const report = (text: string, ok: boolean) => { setMessage(text); setIsSuccess(ok); };

  const handleElevate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); report('', false);
    try {
      const result = await adminRequest('/session', { password });
      // The password is discarded the moment the session exists.
      setPassword('');
      report(result.promoted
        ? 'Administrator role granted to your account. You will not need this password again.'
        : 'Administrator session opened.', true);
      await refresh();
    } catch (err: any) {
      report(err.message || 'Invalid administrator credentials.', false);
    } finally { setBusy(false); }
  };

  const handleLock = async () => {
    setBusy(true);
    try { await adminRequest('/logout', {}); report('Administrator session closed.', true); await refresh(); }
    catch (err: any) { report(err.message || 'Could not close the session.', false); }
    finally { setBusy(false); }
  };

  const handleToggleGlobalAI = async () => {
    setBusy(true); report('', false);
    try {
      const data = await adminRequest('/toggle-ai', { globalAIEnabled: !state.globalAIEnabled });
      setState(previous => ({ ...previous, globalAIEnabled: data.globalAIEnabled }));
      report(`Global AI feature successfully toggled ${data.globalAIEnabled ? 'ON' : 'OFF'}.`, true);
    } catch (err: any) {
      report(err.message || 'Failed to toggle global AI state.', false);
    } finally { setBusy(false); }
  };

  const handleRole = async (username: string, isAdmin: boolean) => {
    setBusy(true); report('', false);
    try {
      await adminRequest('/users/role', { username, isAdmin });
      report(`${username} is ${isAdmin ? 'now an administrator' : 'no longer an administrator'}.`, true);
      await refresh();
    } catch (err: any) {
      report(err.message || 'Could not change that role.', false);
    } finally { setBusy(false); }
  };

  const handleSignOutUser = async (username: string) => {
    setBusy(true); report('', false);
    try {
      await adminRequest('/users/sign-out', { username });
      report(`Signed ${username} out of every device.`, true);
    } catch (err: any) {
      report(err.message || 'Could not sign that account out.', false);
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-watchguard-gray border border-watchguard-border rounded-2xl p-6 shadow-2xl space-y-6 transition-transform hover:-translate-y-1 hover:shadow-watchguard-orange/10">
      <div className="flex items-center justify-between border-b border-watchguard-border pb-3 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4 text-watchguard-orange" />
          <h3 className="font-display font-semibold text-white">Administration Control Console</h3>
        </div>
        <div className="flex items-center space-x-2.5 text-[10px] font-mono">
          <span className="text-gray-400">Current User:</span>
          <span className="text-watchguard-orange bg-watchguard-orange/10 px-2 py-0.5 rounded border border-watchguard-orange/20 font-bold">
            {state.username || displayName}
          </span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-400">Tutor Features:</span>
          {state.globalAIEnabled ? (
            <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 uppercase tracking-wide font-bold">Online</span>
          ) : (
            <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-wide font-bold">Offline (Q&amp;A mode)</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Student Custom Key Override */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-gray-200 font-mono flex items-center space-x-1.5 mb-1">
              <Key className="w-3.5 h-3.5 text-watchguard-orange" />
              <span>Custom Gemini API Key Override</span>
            </h4>
            <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
              Want to run your own unlimited AI endpoints? Provide your own Google Gemini API key to override administrator resource control gates. This key is saved locally in your browser.
            </p>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={userCustomKey}
                onChange={(e) => handleSaveCustomKey(e.target.value)}
                placeholder="AI Studio API Key (AI_...) or Gemini Key"
                className="w-full bg-watchguard-dark border border-watchguard-border text-xs text-white rounded-lg pl-3 pr-10 py-2.5 outline-none focus:border-watchguard-orange/50 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-all cursor-pointer"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {userCustomKey && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-green-400 font-mono">✓ API key active locally</span>
                <button
                  onClick={handleClearCustomKey}
                  className="text-[10px] text-red-400 hover:text-red-300 transition-all font-mono underline bg-transparent border-0 cursor-pointer"
                >
                  Clear Override Key
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Server-authenticated admin controls */}
        <div className="space-y-4 border-t md:border-t-0 md:border-l border-watchguard-border pt-4 md:pt-0 md:pl-6">
          <div>
            <h4 className="text-xs font-bold text-gray-200 font-mono flex items-center space-x-1.5 mb-1">
              <Lock className="w-3.5 h-3.5 text-watchguard-orange" />
              <span>Administrator Controls</span>
            </h4>
            <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
              {state.isAdmin ? (
                <span className="text-green-400 font-medium">✓ Administrator session active. It closes automatically after 30 minutes of inactivity.</span>
              ) : state.accountIsAdmin ? (
                <span>Your account holds the administrator role. Open a session to change shared server settings.</span>
              ) : state.username ? (
                <span>Signed in as <strong className="text-gray-200">{state.username}</strong>. Enter the administrator password once to grant this account the administrator role.</span>
              ) : (
                <span>Sign in to a study account first, then enter the administrator password to claim the role. Without an account you can still open a temporary session.</span>
              )}
            </p>
          </div>

          {!state.isAdmin && (
            <form onSubmit={handleElevate} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder={state.accountIsAdmin ? 'Not required — press Authenticate' : 'Administrator password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-watchguard-dark border border-watchguard-border text-xs text-white rounded-lg px-3 py-2 outline-none focus:border-watchguard-orange/50 transition-all font-mono"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="bg-watchguard-orange hover:bg-watchguard-orange/95 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all border border-watchguard-orange/40 cursor-pointer"
                >
                  Authenticate
                </button>
              </div>
              {!state.breakGlassAvailable && !state.accountIsAdmin && (
                <p className="text-[10px] text-gray-500 font-mono">
                  No administrator password is configured. Set ADMIN_BOOTSTRAP_USER to grant the first administrator.
                </p>
              )}
            </form>
          )}

          {state.isAdmin && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-watchguard-dark border border-watchguard-border rounded-lg p-2.5">
                <div className="space-y-0.5">
                  <span className="text-xs text-white font-mono block">Global AI Features</span>
                  <span className="text-[10px] text-gray-400 font-sans block">Default: Offline (Q&amp;A only)</span>
                </div>
                <button
                  onClick={handleToggleGlobalAI}
                  disabled={busy}
                  className={`text-xs font-semibold px-4 py-1.5 rounded-md transition-all border cursor-pointer disabled:opacity-60 ${
                    state.globalAIEnabled
                      ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                      : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                  }`}
                >
                  {state.globalAIEnabled ? 'Toggle OFF' : 'Toggle ON'}
                </button>
              </div>

              {users.length > 0 && (
                <div className="bg-watchguard-dark border border-watchguard-border rounded-lg p-2.5 space-y-2">
                  <span className="text-xs text-white font-mono flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-watchguard-orange" />
                    Learner accounts ({users.length})
                  </span>
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {users.map(user => (
                      <div key={user.username} className="flex items-center justify-between gap-2 text-[10px] font-mono border-b border-watchguard-border/40 pb-1.5 last:border-0">
                        <span className="text-gray-200 truncate flex items-center gap-1">
                          {user.isAdmin && <ShieldCheck className="w-3 h-3 text-watchguard-orange flex-shrink-0" />}
                          {user.username}
                        </span>
                        <span className="text-gray-500 flex-shrink-0">rev {user.revision}</span>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleRole(user.username, !user.isAdmin)}
                            disabled={busy}
                            className="text-watchguard-orange hover:text-watchguard-orange/80 underline bg-transparent border-0 cursor-pointer disabled:opacity-50"
                          >
                            {user.isAdmin ? 'Demote' : 'Promote'}
                          </button>
                          <button
                            onClick={() => handleSignOutUser(user.username)}
                            disabled={busy}
                            className="text-gray-400 hover:text-white underline bg-transparent border-0 cursor-pointer disabled:opacity-50"
                          >
                            Sign out
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-green-400 font-mono">✓ Authorized Admin Access Active</span>
                <button
                  onClick={handleLock}
                  disabled={busy}
                  className="text-[10px] text-gray-400 hover:text-white transition-all font-mono underline bg-transparent border-0 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  <LogOut className="w-3 h-3" />
                  Lock Manual Session
                </button>
              </div>
            </div>
          )}

          {message && (
            <p className={`text-[10px] font-mono mt-2 ${isSuccess ? 'text-green-400' : 'text-red-400'}`} role="status">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
