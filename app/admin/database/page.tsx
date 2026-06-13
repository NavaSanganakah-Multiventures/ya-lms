"use client";

import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Database, Download, FileText, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function DatabaseMigrationPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string>("");
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [checkDone, setCheckDone] = useState(false);

  useEffect(() => {
    fetchHistory();
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
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
