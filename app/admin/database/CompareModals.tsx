import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../../../components/ui/button";
import { CheckCircle, AlertTriangle, RefreshCw, X, ArrowRightLeft, Database, Key } from "lucide-react";
import { toast } from "sonner";

interface CompareModalsProps {
  type: 'kv' | 'db' | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CompareModals({ type, onClose, onSuccess }: CompareModalsProps) {
  const [loading, setLoading] = useState(false);
  const [diffs, setDiffs] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [direction, setDirection] = useState<'prod_to_preview' | 'preview_to_prod'>('prod_to_preview');

  // For KV inline editing
  const [edits, setEdits] = useState<Record<number, string>>({});

  const fetchDiffs = useCallback(async () => {
    setLoading(true);
    setDiffs([]);
    setSelectedIndices([]);
    setEdits({});
    try {
      const endpoint = type === 'kv' ? '/api/admin/database/compare-kv' : '/api/admin/database/compare-db-schema';
      const res = await fetch(endpoint);
      const data: any = await res.json();
      if (data.success) {
        setDiffs(data.diffs || []);
      } else {
        toast.error(`Failed to compare ${type?.toUpperCase()}: ${data.error}`);
      }
    } catch (e: any) {
      toast.error(`Network error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (type) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDiffs();
    }
  }, [type, fetchDiffs]);

  const handleApply = async () => {
    if (selectedIndices.length === 0) return;
    
    let payload: any = { direction };
    const endpoint = type === 'kv' ? '/api/admin/database/apply-kv' : '/api/admin/database/apply-db-schema';

    if (type === 'kv') {
      const changes = selectedIndices.map(i => {
        const d = diffs[i];
        let action = 'set';
        let value = edits[i] !== undefined ? edits[i] : (direction === 'prod_to_preview' ? d.prodValue : d.previewValue);
        
        if (direction === 'prod_to_preview' && d.type === 'missing_in_prod') action = 'delete';
        if (direction === 'preview_to_prod' && d.type === 'missing_in_preview') action = 'delete';
        
        return { key: d.key, action, value };
      });
      payload.changes = changes;
    } else {
      const queries = selectedIndices.map(i => {
         const d = diffs[i];
         if (direction === 'prod_to_preview') {
            if (d.type === 'table_missing_in_prod') return `DROP TABLE IF EXISTS "${d.table}"`;
            if (d.type === 'table_missing_in_preview') return d.sql;
            if (d.type === 'column_missing_in_preview') return `ALTER TABLE "${d.table}" ADD COLUMN "${d.column}" ${d.colDef.type}`;
            if (d.type === 'column_missing_in_prod') return `ALTER TABLE "${d.table}" DROP COLUMN "${d.column}"`;
         } else {
            if (d.type === 'table_missing_in_preview') return `DROP TABLE IF EXISTS "${d.table}"`;
            if (d.type === 'table_missing_in_prod') return d.sql;
            if (d.type === 'column_missing_in_prod') return `ALTER TABLE "${d.table}" ADD COLUMN "${d.column}" ${d.colDef.type}`;
            if (d.type === 'column_missing_in_preview') return `ALTER TABLE "${d.table}" DROP COLUMN "${d.column}"`;
         }
         return null;
      }).filter(Boolean);
      
      payload.queries = queries;
    }

    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data: any = await res.json();
      if (data.success) {
        toast.success("Changes applied successfully!");
        onSuccess();
        fetchDiffs();
      } else {
        toast.error(`Apply failed: ${data.error}`);
      }
    } catch (e: any) {
      toast.error(`Network error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800">
        
        <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {type === 'kv' ? <Key className="w-5 h-5 text-purple-500" /> : <Database className="w-5 h-5 text-blue-500" />}
            {type === 'kv' ? 'Compare KV Secrets' : 'Compare DB Schema'}
          </h2>
          <Button onClick={onClose} className="bg-transparent hover:bg-gray-200 text-black px-2 py-1"><X className="w-5 h-5" /></Button>
        </div>

        <div className="p-4 flex gap-4 bg-white dark:bg-gray-900 border-b dark:border-gray-800 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Sync Direction:</span>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button 
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${direction === 'prod_to_preview' ? 'bg-white dark:bg-gray-700 shadow font-medium' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                onClick={() => setDirection('prod_to_preview')}
              >
                Prod → Preview
              </button>
              <button 
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${direction === 'preview_to_prod' ? 'bg-white dark:bg-gray-700 shadow font-medium' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
                onClick={() => setDirection('preview_to_prod')}
              >
                Preview → Prod
              </button>
            </div>
          </div>
          <Button onClick={fetchDiffs} disabled={loading} className="flex items-center gap-2 bg-transparent border text-black hover:bg-gray-100">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-gray-50/50 dark:bg-gray-900">
          {loading && diffs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <RefreshCw className="w-8 h-8 animate-spin mb-4" />
              <p>Analyzing differences...</p>
            </div>
          ) : diffs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-green-600 dark:text-green-400">
              <CheckCircle className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-semibold">Everything is in Sync!</h3>
              <p className="text-sm mt-2 text-gray-500">No differences found between Production and Preview.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {diffs.map((diff, i) => {
                const isSelected = selectedIndices.includes(i);
                
                let bgColor = 'bg-white dark:bg-gray-800';
                let borderColor = 'border-gray-200 dark:border-gray-700';
                let badge = null;

                if (diff.type === 'missing_in_preview' || diff.type === 'table_missing_in_preview' || diff.type === 'column_missing_in_preview') {
                  bgColor = direction === 'prod_to_preview' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';
                  borderColor = direction === 'prod_to_preview' ? 'border-green-200 dark:border-green-900/50' : 'border-red-200 dark:border-red-900/50';
                  badge = <span className={`text-xs px-2 py-1 rounded font-medium ${direction === 'prod_to_preview' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>{direction === 'prod_to_preview' ? '+ WILL ADD' : '- WILL DELETE'}</span>;
                } else if (diff.type === 'missing_in_prod' || diff.type === 'table_missing_in_prod' || diff.type === 'column_missing_in_prod') {
                  bgColor = direction === 'preview_to_prod' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';
                  borderColor = direction === 'preview_to_prod' ? 'border-green-200 dark:border-green-900/50' : 'border-red-200 dark:border-red-900/50';
                  badge = <span className={`text-xs px-2 py-1 rounded font-medium ${direction === 'preview_to_prod' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>{direction === 'preview_to_prod' ? '+ WILL ADD' : '- WILL DELETE'}</span>;
                } else if (diff.type === 'mismatch') {
                  bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
                  borderColor = 'border-yellow-200 dark:border-yellow-900/50';
                  badge = <span className="text-xs px-2 py-1 rounded font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">~ WILL OVERWRITE</span>;
                } else if (diff.type === 'schema_mismatch') {
                  bgColor = 'bg-orange-50 dark:bg-orange-900/20';
                  borderColor = 'border-orange-200 dark:border-orange-900/50';
                  badge = <span className="text-xs px-2 py-1 rounded font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">! MANUAL ACTION REQUIRED</span>;
                }

                return (
                  <div key={i} className={`flex items-start gap-4 p-4 border rounded-lg transition-all ${bgColor} ${borderColor} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                    <input 
                      type="checkbox" 
                      className="mt-1.5 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      checked={isSelected}
                      disabled={diff.type === 'schema_mismatch'}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIndices(prev => [...prev, i]);
                        else setSelectedIndices(prev => prev.filter(x => x !== i));
                      }}
                    />
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">
                          {type === 'kv' ? diff.key : `${diff.table} ${diff.column ? `(${diff.column})` : ''}`}
                        </h4>
                        {badge}
                      </div>

                      {type === 'kv' ? (
                        <div className="grid grid-cols-2 gap-4 text-sm font-mono mt-3">
                          <div className="p-3 bg-white dark:bg-gray-950 rounded border border-gray-200 dark:border-gray-800 relative">
                            <span className="absolute -top-2.5 left-2 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 dark:text-gray-400">PROD</span>
                            <div className="break-all whitespace-pre-wrap mt-1">{diff.prodValue === null ? <span className="text-gray-400 italic">Not found</span> : diff.prodValue}</div>
                          </div>
                          <div className="p-3 bg-white dark:bg-gray-950 rounded border border-gray-200 dark:border-gray-800 relative">
                            <span className="absolute -top-2.5 left-2 bg-purple-200 dark:bg-purple-900/50 px-2 py-0.5 rounded text-[10px] font-bold text-purple-700 dark:text-purple-300">PREVIEW</span>
                            <div className="break-all whitespace-pre-wrap mt-1">{diff.previewValue === null ? <span className="text-gray-400 italic">Not found</span> : diff.previewValue}</div>
                          </div>
                          
                          {/* Inline Edit for KV */}
                          {isSelected && diff.type !== 'missing_in_prod' && direction === 'prod_to_preview' && (
                            <div className="col-span-2 mt-2">
                               <label className="text-xs font-semibold mb-1 block">Override value before applying (optional):</label>
                               <input 
                                 type="text" 
                                 className="w-full text-sm p-2 bg-white dark:bg-gray-900 border rounded"
                                 value={edits[i] !== undefined ? edits[i] : diff.prodValue}
                                 onChange={(e) => setEdits(prev => ({...prev, [i]: e.target.value}))}
                               />
                            </div>
                          )}
                           {isSelected && diff.type !== 'missing_in_preview' && direction === 'preview_to_prod' && (
                            <div className="col-span-2 mt-2">
                               <label className="text-xs font-semibold mb-1 block">Override value before applying (optional):</label>
                               <input 
                                 type="text" 
                                 className="w-full text-sm p-2 bg-white dark:bg-gray-900 border rounded"
                                 value={edits[i] !== undefined ? edits[i] : diff.previewValue}
                                 onChange={(e) => setEdits(prev => ({...prev, [i]: e.target.value}))}
                               />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 text-sm font-mono mt-3">
                           <div className="p-3 bg-white dark:bg-gray-950 rounded border border-gray-200 dark:border-gray-800 relative">
                            <span className="absolute -top-2.5 left-2 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 dark:text-gray-400">PROD SQL</span>
                            <div className="break-all whitespace-pre-wrap mt-1 text-xs">{diff.prodSql || <span className="text-gray-400 italic">Not found</span>}</div>
                          </div>
                          <div className="p-3 bg-white dark:bg-gray-950 rounded border border-gray-200 dark:border-gray-800 relative">
                            <span className="absolute -top-2.5 left-2 bg-blue-200 dark:bg-blue-900/50 px-2 py-0.5 rounded text-[10px] font-bold text-blue-700 dark:text-blue-300">PREVIEW SQL</span>
                            <div className="break-all whitespace-pre-wrap mt-1 text-xs">{diff.prevSql || diff.sql || <span className="text-gray-400 italic">Not found</span>}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center">
          <div className="text-sm text-gray-500 font-medium">
            {selectedIndices.length} of {diffs.length} changes selected
          </div>
          <div className="flex gap-3">
            <Button className="bg-transparent border text-black hover:bg-gray-100" onClick={() => setSelectedIndices(diffs.map((d, i) => d.type === 'schema_mismatch' ? -1 : i).filter(i => i !== -1))}>Select All</Button>
            <Button className="bg-transparent border text-black hover:bg-gray-100" onClick={() => setSelectedIndices([])}>Clear</Button>
            <Button 
               onClick={handleApply} 
               disabled={selectedIndices.length === 0 || loading}
               className={`flex items-center gap-2 ${direction === 'prod_to_preview' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            >
              <CheckCircle className="w-4 h-4" /> 
              Apply to {direction === 'prod_to_preview' ? 'PREVIEW' : 'PRODUCTION'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
