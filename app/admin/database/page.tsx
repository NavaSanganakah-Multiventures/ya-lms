"use client";

import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Database, Download, FileText, CheckCircle, AlertTriangle, Clock, RefreshCw, Key, Cloud, Upload, ArrowRightFromLine, Server, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CompareModals } from "./CompareModals";

 export default function DatabaseMigrationPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string>("");
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [checkDone, setCheckDone] = useState(false);
  const [syncWorkflowId, setSyncWorkflowId] = useState<string | null>(null);
  const [skipOldTables, setSkipOldTables] = useState(true);
  const [modalType, setModalType] = useState<'kv' | 'db' | null>(null);
  const [kvBackups, setKvBackups] = useState<any[]>([]);
  const [kvBackupLoading, setKvBackupLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
    fetchKvBackupHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/admin/database/history");
      const data: any = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const fetchKvBackupHistory = async () => {
    try {
      const res = await fetch("/api/admin/database/kv-backup-history");
      const data: any = await res.json();
      if (data.success) {
        setKvBackups(data.kvBackups);
      }
    } catch (e) {
      console.error("Failed to load KV backup history", e);
    }
  };

  const handleKvBackup = async (environment: 'production' | 'preview') => {
    setKvBackupLoading(true);
    setLogs((prev) => prev + `Starting KV backup for ${environment}...\n`);
    try {
      const res = await fetch("/api/admin/database/backup-kv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment }),
      });
      const data: any = await res.json();
      if (data.success) {
        toast.success(`KV backup (${environment}) successful!`);
        setLogs((prev) => prev + `KV backup created: ${data.backup_url} (${data.key_count} keys)\n`);
        fetchKvBackupHistory();
      } else {
        toast.error(`KV backup failed: ${data.error}`);
        setLogs((prev) => prev + `KV backup Error: ${data.error}\n`);
      }
    } catch (e: any) {
      toast.error("Network error");
      setLogs((prev) => prev + `Exception: ${e.message}\n`);
    } finally {
      setKvBackupLoading(false);
    }
  };

  const handleKvRestore = async (backupUrl: string, targetEnv: 'production' | 'preview') => {
    const envLabel = targetEnv === 'production' ? 'PRODUCTION' : 'PREVIEW';
    const warning = targetEnv === 'production'
      ? `⚠️ क्या आप PRODUCTION KV secrets को ओवरराइट करना चाहते हैं?\n\nयह सभी production secrets को बदल देगा।`
      : `क्या आप PREVIEW KV secrets को ओवरराइट करना चाहते हैं?`;
    if (!confirm(`${warning}\n\nBackup: ${backupUrl}`)) return;

    setKvBackupLoading(true);
    setLogs((prev) => prev + `Starting KV restore to ${envLabel} from ${backupUrl}...\n`);
    try {
      const idempotencyKey = `kv-restore-${backupUrl}-${targetEnv}-${Date.now()}`;
      const res = await fetch("/api/admin/database/restore-kv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup_url: backupUrl, target_environment: targetEnv, idempotency_key: idempotencyKey }),
      });
      const data: any = await res.json();
      if (data.success) {
        toast.success(`KV restored to ${envLabel} (${data.key_count} keys)`);
        setLogs((prev) => prev + `KV restored to ${envLabel}: ${data.key_count} keys written\n`);
        fetchKvBackupHistory();
      } else {
        toast.error(`KV restore failed: ${data.error}`);
        setLogs((prev) => prev + `KV restore Error: ${data.error}\n`);
      }
    } catch (e: any) {
      toast.error("Network error");
      setLogs((prev) => prev + `Exception: ${e.message}\n`);
    } finally {
      setKvBackupLoading(false);
    }
  };

  const handleCheck = async () => {
    setLoading(true);
    setLogs("Checking database schema differences...\n");
    try {
      const res = await fetch("/api/admin/database/check");
      const data: any = await res.json();
      if (data.success) {
        setMissingTables(data.missingTables || []);
        setMissingColumns(data.missingColumns || []);
        setCheckDone(true);
        if (data.missingTables.length === 0 && data.missingColumns.length === 0) {
          setLogs((prev) => prev + "Database is up to date! No changes needed.\n");
        } else {
          setLogs((prev) => prev + `Found ${data.missingTables.length} missing tables and ${data.missingColumns.length} missing columns.\n`);
        }
      } else {
        toast.error("Failed to check database");
        setLogs((prev) => prev + `Error: ${data.error}\n`);
      }
    } catch (e: any) {
      toast.error("Network error");
      setLogs((prev) => prev + `Exception: ${e.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    setLogs("Starting database backup...\n");
    try {
      const res = await fetch("/api/admin/database/backup", { method: "POST" });
      const data: any = await res.json();
      if (data.success) {
        toast.success("Backup successful");
        setLogs((prev) => prev + `Backup created successfully: ${data.file}\n`);
        fetchHistory();
      } else {
        toast.error("Backup failed");
        setLogs((prev) => prev + `Backup Error: ${data.error}\n`);
      }
    } catch (e: any) {
      toast.error("Network error");
      setLogs((prev) => prev + `Exception: ${e.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!confirm("Are you sure you want to run the migration? A backup will be taken automatically.")) return;

    setLoading(true);
    setLogs("Starting Backup & Migration process...\n");
    try {
      const res = await fetch("/api/admin/database/migrate", { method: "POST" });
      const data: any = await res.json();
      if (data.success) {
        toast.success("Migration successful");
        setLogs((prev) => prev + `Backup: ${data.file}\n\nMigration Logs:\n${data.logs}\n`);
        setMissingTables([]);
        setMissingColumns([]);
        fetchHistory();
      } else {
        toast.error("Migration failed");
        setLogs((prev) => prev + `Migration Error: ${data.error}\n`);
      }
    } catch (e: any) {
      toast.error("Network error");
      setLogs((prev) => prev + `Exception: ${e.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (backupUrl: string) => {
    if (!confirm(`Are you sure you want to restore from ${backupUrl}? This will OVERWRITE ALL EXISTING DATA and cannot be undone!`)) return;

    setLoading(true);
    const idempotencyKey = `restore-${backupUrl}-${Date.now()}`;
    let logs = `Starting database restore from ${backupUrl}...\n`;
    if (skipOldTables) logs += `_OLD / unknown tables will be auto-skipped.\n`;
    setLogs(logs);
    try {
      const res = await fetch("/api/admin/database/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup_url: backupUrl, skip_old_tables: skipOldTables, idempotency_key: idempotencyKey }),
      });
      const data: any = await res.json();
      if (data.success) {
        let msg = `Database restored successfully from ${backupUrl}`;
        if (data.skipped?.length > 0) {
          msg += `\nSkipped tables (${data.skipped.length}): ${data.skipped.join(', ')}`;
        }
        toast.success("Restore successful");
        setLogs((prev) => prev + msg + '\n');
        fetchHistory();
      } else {
        let msg = `Restore completed with issues:\n`;
        if (data.errors?.length > 0) {
          msg += `\nFailed tables:\n`;
          for (const e of data.errors) {
            msg += `  - ${e.table}: ${e.reason}\n`;
          }
        }
        if (data.skipped?.length > 0) {
          msg += `\nSkipped tables (${data.skipped.length}): ${data.skipped.join(', ')}\n`;
        }
        if (data.error) msg += `\nError: ${data.error}\n`;
        toast.error("Restore completed with errors");
        setLogs((prev) => prev + msg);
        fetchHistory();
      }
    } catch (e: any) {
      toast.error("Network error");
      setLogs((prev) => prev + `Exception: ${e.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncR2 = async () => {
    if (!confirm("क्या आप सुनिश्चित हैं? यह केवल R2 फाइलों को प्रोडक्शन से प्रीव्यू में कॉपी करेगा।")) return;

    setLoading(true);
    setLogs((prev) => prev + "Starting background R2 sync to Preview...\n");
    try {
      const res = await fetch("/api/admin/database/sync-r2", { method: "POST" });
      const data: any = await res.json();
      if (data.success) {
        toast.success("R2 Sync started in background!");
        setSyncWorkflowId(data.workflowId);
        setLogs((prev) => prev + `Workflow ID: ${data.workflowId}\nChecking status...\n`);
      } else {
        toast.error("R2 Sync start failed");
        setLogs((prev) => prev + `R2 Sync Error: ${data.error}\n`);
      }
    } catch (e: any) {
      toast.error("Network error");
      setLogs((prev) => prev + `Exception: ${e.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncR2FromPreview = async () => {
    if (!confirm("क्या आप सुनिश्चित हैं? यह PREVIEW R2 की सभी फाइलों को PRODUCTION R2 में कॉपी करेगा। \n\n⚠️ चेतावनी: Production R2 की सभी मौजूदा फाइलें हटा दी जाएंगी और Preview की फाइलों से बदल दी जाएंगी।")) return;

    setLoading(true);
    setLogs((prev) => prev + "Starting background R2 sync from Preview to Production...\n");
    try {
      const res = await fetch("/api/admin/database/sync-r2-from-preview", { method: "POST" });
      const data: any = await res.json();
      if (data.success) {
        toast.success("Preview→Prod R2 Sync started in background!");
        setSyncWorkflowId(data.workflowId);
        setLogs((prev) => prev + `Workflow ID: ${data.workflowId}\nChecking status...\n`);
      } else {
        toast.error("Preview→Prod R2 Sync start failed");
        setLogs((prev) => prev + `R2 Sync Error: ${data.error}\n`);
      }
    } catch (e: any) {
      toast.error("Network error");
      setLogs((prev) => prev + `Exception: ${e.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToPreview = async () => {
    if (!confirm("क्या आप सुनिश्चित हैं? यह क्रिया प्रोडक्शन (Production) के सभी डेटा (D1 Data, R2 Files) को कॉपी करके प्रीव्यू (Preview) में डाल देगी। KV और DB Schema सिंक के लिए कृपया Compare टूल्स का उपयोग करें।")) return;

    setLoading(true);
    setLogs((prev) => prev + "Starting background Data & R2 sync to Preview...\n");
    try {
      const res = await fetch("/api/admin/database/sync-to-preview", { method: "POST" });
      const data: any = await res.json();
      if (data.success) {
        toast.success("Sync started in background!");
        setSyncWorkflowId(data.workflowId);
        setLogs((prev) => prev + `Workflow ID: ${data.workflowId}\nChecking status...\n`);
      } else {
        toast.error("Sync start failed");
        setLogs((prev) => prev + `Sync Error: ${data.error}\n`);
      }
    } catch (e: any) {
      toast.error("Network error");
      setLogs((prev) => prev + `Exception: ${e.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!syncWorkflowId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/database/sync-status/${syncWorkflowId}`);
        const data: any = await res.json();
        if (data.success) {
          const status = data.status.status;
          setLogs((prev) => {
            const lines = prev.split('\n');
            if (lines[lines.length - 2]?.startsWith('Status:')) {
               lines[lines.length - 2] = `Status: ${status}`;
               return lines.join('\n');
            }
            return prev + `Status: ${status}\n`;
          });

          if (status === 'complete' || status === 'errored' || status === 'terminated') {
             clearInterval(interval);
             setSyncWorkflowId(null);
             if (status === 'complete') toast.success("Sync Complete!");
             else toast.error("Sync Failed!");
          }
        } else {
          setLogs((prev) => prev + `Status check failed: ${data.error || 'Unknown error'}\n`);
          toast.error("Failed to fetch sync status");
        }
      } catch (e: any) {
        console.error(e);
        setLogs((prev) => prev + `Status check exception: ${e.message}\n`);
        toast.error("Error fetching sync status");
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [syncWorkflowId]);


  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <CompareModals type={modalType} onClose={() => setModalType(null)} onSuccess={() => { setModalType(null); fetchHistory(); }} />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="w-8 h-8 text-blue-600" />
            Database Migration & Backup
          </h1>
          <p className="text-gray-500 mt-2">Manage your database schema, run safe migrations, and create backups.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-blue-200 dark:border-blue-900 shadow-sm">
            <CardHeader className="bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/50">
              <CardTitle className="text-blue-800 dark:text-blue-300">Granular Compare & Sync</CardTitle>
              <CardDescription>Selectively sync KV Secrets and DB Schema between Production and Preview.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
               <div className="flex flex-wrap gap-4">
                <Button onClick={() => setModalType('kv')} disabled={loading} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Key className="w-4 h-4" />
                  Compare & Sync KV Secrets
                </Button>
                <Button onClick={() => setModalType('db')} disabled={loading} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white">
                  <Database className="w-4 h-4" />
                  Compare & Sync DB Schema
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 dark:border-purple-900 shadow-sm">
            <CardHeader className="bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/50">
              <CardTitle className="text-purple-800 dark:text-purple-300 flex items-center gap-2">
                <Key className="w-5 h-5" />
                KV Secrets Backup & Restore
              </CardTitle>
              <CardDescription>Take a snapshot of KV secrets and save in R2. Restore to any environment.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => handleKvBackup('production')} disabled={loading || kvBackupLoading} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
                  <HardDrive className="w-4 h-4" />
                  Backup KV (Production)
                </Button>
                <Button onClick={() => handleKvBackup('preview')} disabled={loading || kvBackupLoading} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                  <Server className="w-4 h-4" />
                  Backup KV (Preview)
                </Button>
              </div>

              {kvBackups.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Recent KV Backups
                  </h4>
                  <div className="space-y-2">
                    {kvBackups.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${item.environment === 'production' ? 'bg-green-500' : 'bg-purple-500'}`} />
                            <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{item.environment}</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(item.created_at), "MMM d, yyyy h:mm a")}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 font-mono mt-1 truncate" title={item.backup_url}>
                            {item.backup_url} · {item.key_count} keys
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 ml-4">
                          <Button
                            onClick={() => handleKvRestore(item.backup_url, 'preview')}
                            disabled={loading || kvBackupLoading}
                            className="h-7 text-xs flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <Download className="w-3 h-3 rotate-180" /> → Preview
                          </Button>
                          <Button
                            onClick={() => handleKvRestore(item.backup_url, 'production')}
                            disabled={loading || kvBackupLoading}
                            className="h-7 text-xs flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Download className="w-3 h-3 rotate-180" /> → Prod
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {kvBackups.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">No KV backups yet. Click a button above to create one.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Migration Controls</CardTitle>
              <CardDescription>Analyze changes and run migrations safely.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button onClick={handleCheck} disabled={loading} className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Check Differences
                </Button>
                <Button onClick={handleBackup} disabled={loading} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Manual Backup
                </Button>
                <Button onClick={handleMigrate} disabled={loading || !checkDone} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  <CheckCircle className="w-4 h-4" />
                  Backup & Migrate
                </Button>
                <Button onClick={handleSyncToPreview} disabled={loading || !!syncWorkflowId} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white" title="Syncs DB Data and R2 to Preview for testing.">
                  <RefreshCw className={`w-4 h-4 ${syncWorkflowId ? 'animate-spin' : ''}`} />
                  {syncWorkflowId ? "Syncing..." : "Sync Data & R2 to Preview"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider self-center">R2 Only:</span>
                <Button onClick={handleSyncR2} disabled={loading || !!syncWorkflowId} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white" title="Copy R2 files from Production to Preview">
                  <Cloud className="w-4 h-4" />
                  {syncWorkflowId ? "Syncing..." : "Sync R2 → Preview"}
                </Button>
                <Button onClick={handleSyncR2FromPreview} disabled={loading || !!syncWorkflowId} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white" title="⚠️ Copy R2 files from Preview to Production (overwrites Production)">
                  <Upload className="w-4 h-4" />
                  {syncWorkflowId ? "Syncing..." : "Sync R2 ← Preview (to Prod)"}
                </Button>
              </div>

              {checkDone && (missingTables.length > 0 || missingColumns.length > 0) && (
                <div className="mt-4 p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
                  <h3 className="font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Pending Changes
                  </h3>
                  <div className="mt-2 space-y-2">
                    {missingTables.map((t, i) => (
                      <div key={`t-${i}`} className="text-sm font-mono bg-white dark:bg-gray-900 p-2 rounded border truncate">
                        <span className="text-green-600 font-bold">+ TABLE</span> {t.substring(0, 80)}...
                      </div>
                    ))}
                    {missingColumns.map((c, i) => (
                      <div key={`c-${i}`} className="text-sm font-mono bg-white dark:bg-gray-900 p-2 rounded border">
                        <span className="text-blue-600 font-bold">+ COLUMN</span> {c}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {checkDone && missingTables.length === 0 && missingColumns.length === 0 && (
                <div className="mt-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 text-green-800 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Database is completely synchronized with schema.sql
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Execution Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-950 text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                {logs || "Waiting for action..."}
              </pre>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                History
              </CardTitle>
              <CardDescription>Recent backups and migrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 border rounded-lg bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipOldTables}
                    onChange={(e) => setSkipOldTables(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Skip _OLD & unknown tables</span>
                    <p className="text-xs text-gray-500 mt-0.5">Restore के दौरान उन tables को छोड़ दें जो अब DB में मौजूद नहीं हैं</p>
                  </div>
                </label>
              </div>
              <div className="space-y-4">
                {history.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No history found</p>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="border-b last:border-0 pb-3 last:pb-0">
                      <div className="text-sm font-medium">{format(new Date(item.created_at), "MMM d, yyyy h:mm a")}</div>
                      <div className="text-xs text-gray-500 font-mono mt-1 truncate" title={item.backup_url}>
                        {item.backup_url}
                      </div>
                      <div className="text-xs mt-1 text-blue-600 dark:text-blue-400 truncate">
                        {item.logs?.substring(0, 50)}...
                      </div>
                      <div className="mt-2">
                        <Button
                          onClick={() => handleRestore(item.backup_url)}
                          disabled={loading || !item.backup_url}
                          className="h-7 text-xs flex items-center gap-1"
                        >
                          <Download className="w-3 h-3 rotate-180" /> Restore
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
