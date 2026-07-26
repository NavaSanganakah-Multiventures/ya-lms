'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Save, Trash2, RefreshCw, Wifi, WifiOff, Loader2, Search, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';

interface SecretsMap {
  [key: string]: string;
}

export default function AdminSecretsPage() {
  const [secrets, setSecrets] = useState<SecretsMap>({});
  const [maskedKeys, setMaskedKeys] = useState<string[]>([]);
  const [filteredSecrets, setFilteredSecrets] = useState<SecretsMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const secretsArray = Object.entries(filteredSecrets).map(([key, value]) => ({ key, value }));

  useEffect(() => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const filtered: SecretsMap = {};
      for (const [key, value] of Object.entries(secrets)) {
        if (key.toLowerCase().includes(q) || value.toLowerCase().includes(q)) {
          filtered[key] = value;
        }
      }
      setFilteredSecrets(filtered);
    } else {
      setFilteredSecrets(secrets);
    }
  }, [searchQuery, secrets]);

  const fetchSecrets = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/secrets', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSecrets(data.secrets || {});
        setMaskedKeys(data.maskedKeys || []);
      }
    } catch (e) {
      console.error('Failed to fetch secrets', e);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchSecrets().finally(() => setIsLoading(false));
  }, [fetchSecrets]);

  useRealtimeChannel('admin_secrets', () => fetchSecrets());

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const displayValue = (key: string, value: string) => {
    if (maskedKeys.includes(key)) {
      return value.length > 8 ? value.substring(0, 4) + '****' : '****';
    }
    return value;
  };

  const handleToggleMask = async (key: string, currentlyMasked: boolean) => {
    try {
      const res = await fetch('/api/admin/secrets/toggle-mask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, masked: !currentlyMasked }),
      });
      if (res.ok) {
        setMaskedKeys(prev =>
          currentlyMasked ? prev.filter(k => k !== key) : [...prev, key]
        );
      }
    } catch {}
  };

  const handleSave = async (key: string, value: string) => {
    setSavingKey(key);
    try {
      const res = await fetch(`/api/admin/secrets/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      if (res.ok) {
        setEditingKey(null);
        showMessage('success', `"${key}" सफलतापूर्वक सेव हो गया!`);
      } else {
        const err = await res.json();
        showMessage('error', err.error || 'सेव करने में समस्या आई');
      }
    } catch {
      showMessage('error', 'सर्वर एरर');
    }
    setSavingKey(null);
  };

  const handleDelete = async (key: string) => {
    if (!window.confirm(`Delete secret "${key}"?`)) return;
    setDeletingKey(key);
    try {
      const res = await fetch('/api/admin/secrets/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        showMessage('success', `"${key}" हटा दिया गया!`);
      } else {
        const err = await res.json();
        showMessage('error', err.error || 'हटाने में समस्या आई');
      }
    } catch {
      showMessage('error', 'सर्वर एरर');
    }
    setDeletingKey(null);
  };

  const handleAdd = async () => {
    if (!newKey.trim()) return;
    setSavingKey('__new__');
    try {
      const res = await fetch(`/api/admin/secrets/${encodeURIComponent(newKey.trim())}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue }),
      });
      if (res.ok) {
        setNewKey('');
        setNewValue('');
        setShowAddForm(false);
        showMessage('success', `"${newKey.trim()}" जोड़ दिया गया!`);
      } else {
        const err = await res.json();
        showMessage('error', err.error || 'जोड़ने में समस्या आई');
      }
    } catch {
      showMessage('error', 'सर्वर एरर');
    }
    setSavingKey(null);
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">KV Secrets प्रबंधन</h1>
          <p className="text-neutral-500 mt-1">प्लेटफ़ॉर्म KV सीक्रेट्स को मैनेज करें</p>
        </div>
        <div className="flex items-center gap-3">
          <WifiIndicator />
          <button
            onClick={fetchSecrets}
            className="p-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> नया Secret
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border text-sm font-bold ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {showAddForm && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">नया Secret जोड़ें</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Key</label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="SECRET_KEY_NAME"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 font-mono text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Value</label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="secret value"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 font-mono text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setShowAddForm(false); setNewKey(''); setNewValue(''); }}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-sm font-bold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newKey.trim() || savingKey === '__new__'}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
            >
              {savingKey === '__new__' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Secret
            </button>
          </div>
        </div>
      )}

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-neutral-800">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keys or values..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 font-mono text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                <th className="text-left px-6 py-4 w-1">#</th>
                <th className="text-left px-6 py-4">Key</th>
                <th className="text-left px-6 py-4">Value</th>
                <th className="text-right px-6 py-4 w-56">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-neutral-500" />
                  </td>
                </tr>
              ) : secretsArray.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-neutral-500">
                    {searchQuery ? 'No matching secrets found' : 'No secrets found. Add one to get started.'}
                  </td>
                </tr>
              ) : (
                secretsArray.map(({ key, value }, idx) => {
                  const isMasked = maskedKeys.includes(key);
                  return (
                    <tr key={key} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                      <td className="px-6 py-4 text-sm text-neutral-500 font-mono">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <code className="text-sm text-orange-400 font-mono bg-orange-500/10 px-2 py-1 rounded-lg">
                          {key}
                        </code>
                        {isMasked && (
                          <span className="ml-2 text-xs text-emerald-500 font-bold">sensitive</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingKey === key ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 bg-neutral-900 border border-orange-500 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave(key, editValue);
                                if (e.key === 'Escape') setEditingKey(null);
                              }}
                            />
                            <button
                              onClick={() => handleSave(key, editValue)}
                              disabled={savingKey === key}
                              className="p-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-all"
                            >
                              {savingKey === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <code className="text-sm text-neutral-300 font-mono truncate max-w-md block">
                              {displayValue(key, value)}
                            </code>
                            <button
                              onClick={() => copyToClipboard(isMasked ? value : value, key)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-700 rounded-lg transition-all"
                              title="Copy full value"
                            >
                              {copiedKey === key ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-neutral-500" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleMask(key, isMasked)}
                            className={`p-2 rounded-lg transition-all ${
                              isMasked
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                : 'text-neutral-500 hover:bg-neutral-700 hover:text-white'
                            }`}
                            title={isMasked ? 'Show value' : 'Hide value'}
                          >
                            {isMasked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => { setEditingKey(key); setEditValue(value); }}
                            className="p-2 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition-all"
                            title="Edit"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(key)}
                            disabled={deletingKey === key}
                            className="p-2 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg transition-all"
                            title="Delete"
                          >
                            {deletingKey === key ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-neutral-600 font-mono">
        Total: {Object.keys(secrets).length} secrets | {maskedKeys.length} sensitive
      </div>
    </div>
  );
}

function WifiIndicator() {
  const [connected, setConnected] = useState(false);
  const { latestData } = useRealtimeChannel('admin_secrets');

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/ws`;
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    return () => ws.close();
  }, []);

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${
      connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
    }`}>
      {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
      {connected ? 'Realtime Connected' : 'Disconnected'}
    </div>
  );
}
