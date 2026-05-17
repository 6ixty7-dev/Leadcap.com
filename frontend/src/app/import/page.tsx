'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { importCSV, importJSON, fetchImportHistory } from '@/lib/api';
import { ImportResult, ImportHistory } from '@/types';
import { formatDateTime } from '@/lib/utils';
import {
  Upload, FileText, CheckCircle, AlertTriangle, XCircle,
  Download, Clock, FileJson, Table, Loader2, CloudUpload
} from 'lucide-react';

function parseCSVText(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header — handle quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }

  return rows;
}

export default function ImportPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchImportHistory().then(res => { if (res.data) setHistory(res.data); }).catch(() => {});
  }, [result]);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setError(null);

    try {
      const text = await f.text();

      if (f.name.endsWith('.json')) {
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : [data];
        setParsedData(arr);
      } else {
        const rows = parseCSVText(text);
        if (rows.length === 0) { setError('No valid rows found in CSV'); return; }
        setParsedData(rows);
      }
    } catch (err: any) {
      setError(`Failed to parse file: ${err.message}`);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleImport = async () => {
    if (!parsedData || !file) return;
    setImporting(true);
    setError(null);

    try {
      const isJSON = file.name.endsWith('.json');
      const res = isJSON
        ? await importJSON(parsedData, file.name)
        : await importCSV(parsedData, file.name);

      if (res.data) setResult(res.data);
    } catch (err: any) {
      setError(err.message);
    }
    setImporting(false);
  };

  const resetImport = () => {
    setFile(null);
    setParsedData(null);
    setResult(null);
    setError(null);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Upload className="w-6 h-6 text-yellow-400" />
          Import Leads
        </h1>
        <p className="text-zinc-500 text-sm mt-0.5">Upload CSV or JSON files to import leads</p>
      </div>

      {/* Upload Zone */}
      {!result && (
        <div
          className={`glass-card p-12 border-2 border-dashed transition-all duration-300 cursor-pointer ${
            isDragging
              ? 'border-yellow-400/50 bg-yellow-400/5'
              : 'border-zinc-700/50 hover:border-zinc-600/50'
          }`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />
          <div className="text-center">
            <motion.div
              animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
              className="inline-flex"
            >
              <CloudUpload className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-yellow-400' : 'text-zinc-600'}`} />
            </motion.div>
            <p className="text-sm text-zinc-300 font-medium">
              {isDragging ? 'Drop your file here' : 'Drag & drop a file, or click to browse'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Supports CSV and JSON files</p>
          </div>
        </div>
      )}

      {/* File Preview */}
      <AnimatePresence>
        {parsedData && !result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {file?.name.endsWith('.json')
                  ? <FileJson className="w-5 h-5 text-yellow-400" />
                  : <Table className="w-5 h-5 text-yellow-400" />
                }
                <div>
                  <p className="text-sm font-medium">{file?.name}</p>
                  <p className="text-xs text-zinc-500">{parsedData.length} rows detected</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={resetImport} className="btn-ghost text-xs">Cancel</button>
                <button onClick={handleImport} disabled={importing} className="btn-primary text-xs flex items-center gap-2">
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {importing ? 'Importing...' : `Import ${parsedData.length} Leads`}
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {Object.keys(parsedData[0] || {}).slice(0, 8).map(h => (
                      <th key={h} className="text-left py-2 px-3 text-zinc-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-zinc-800/30">
                      {Object.values(row).slice(0, 8).map((v, j) => (
                        <td key={j} className="py-2 px-3 text-zinc-400 max-w-[150px] truncate">{v || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.length > 5 && (
              <p className="text-xs text-zinc-600 text-center">Showing 5 of {parsedData.length} rows</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 border-red-500/20 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Import Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 text-center space-y-4"
          >
            <CheckCircle className="w-16 h-16 mx-auto text-emerald-400" />
            <h3 className="text-lg font-bold">Import Complete!</h3>
            <div className="flex items-center justify-center gap-8">
              <div>
                <p className="text-2xl font-bold text-emerald-400">{result.imported}</p>
                <p className="text-xs text-zinc-500">Imported</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">{result.duplicates}</p>
                <p className="text-xs text-zinc-500">Duplicates</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{result.failed}</p>
                <p className="text-xs text-zinc-500">Failed</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="text-left mt-4 p-3 rounded-xl bg-red-500/5 border border-red-500/10 max-h-[150px] overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-400/80">{e}</p>
                ))}
              </div>
            )}
            <button onClick={resetImport} className="btn-primary text-sm mt-4">Import More</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import History */}
      {history.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-500" /> Import History
          </h3>
          <div className="space-y-2">
            {history.slice(0, 10).map(h => (
              <div key={h.id} className="flex items-center justify-between py-2 border-b border-zinc-800/30 last:border-0">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-zinc-500" />
                  <div>
                    <p className="text-sm text-zinc-300">{h.filename}</p>
                    <p className="text-xs text-zinc-600">{formatDateTime(h.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-emerald-400">{h.imported_rows} imported</span>
                  {h.duplicate_rows > 0 && <span className="text-yellow-400">{h.duplicate_rows} dups</span>}
                  {h.failed_rows > 0 && <span className="text-red-400">{h.failed_rows} failed</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
