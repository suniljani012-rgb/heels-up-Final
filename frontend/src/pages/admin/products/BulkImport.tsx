// frontend/src/pages/admin/products/BulkImport.tsx
import React, { useRef, useState } from 'react';
import { X, FileText, UploadCloud, Download, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToastStore } from '../../../store/useToastStore';
import { bulkImportProducts, downloadCsvTemplate } from './productApi';
import { isValidEuSize } from './productValidation';
import type { BulkImportResult, BulkImportRow } from './productTypes';

interface BulkImportProps {
  token: string;
  defaultCategory: string;
  onClose: () => void;
  onComplete: () => void;
}

// Parse a CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const REQUIRED_FIELDS = ['name', 'sku', 'category', 'price'];

export default function BulkImport({ token, defaultCategory, onClose, onComplete }: BulkImportProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!csvFile) { showToast('error', 'No File', 'Select a CSV file first.'); return; }
    setLoading(true);
    setResult(null);
    try {
      const text = await csvFile.text();
      const lines = text.trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
      if (lines.length < 2) throw new Error('CSV must contain a header row plus at least one data row.');

      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
      const missing = REQUIRED_FIELDS.filter(f => !headers.includes(f));
      if (missing.length > 0) throw new Error(`Missing required columns: ${missing.join(', ')}`);

      const rows: BulkImportRow[] = [];
      const errors: string[] = [];
      const seenSkus = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const rowNum = i + 1;
        const vals = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = (vals[idx] || '').trim(); });

        try {
          const name = row['name'];
          const sku = row['sku'].toUpperCase();
          const category = row['category'] || defaultCategory;
          const priceRaw = row['price'];
          const price = Math.round((parseFloat(priceRaw) || 0) * 100);

          if (!name || !sku || !category || !priceRaw || price <= 0) {
            throw new Error('Name, SKU, category and a valid price are required');
          }
          if (!/^[A-Za-z0-9._-]+$/.test(sku)) {
            throw new Error('SKU contains invalid characters');
          }
          if (seenSkus.has(sku)) {
            throw new Error(`Duplicate SKU: ${sku}`);
          }
          seenSkus.add(sku);

          // Collect all stock_<size> columns generically
          const size_stock = headers
            .filter(h => h.startsWith('stock_'))
            .map(h => ({ size_label: h.replace('stock_', ''), stock: parseInt(row[h] || '0', 10) || 0 }))
            .filter(s => isValidEuSize(s.size_label));

          rows.push({
            name,
            sku,
            category,
            price,
            original_price: row['original_price'] ? Math.round((parseFloat(row['original_price']) || 0) * 100) : null,
            cost_price: row['cost_price'] ? Math.round((parseFloat(row['cost_price']) || 0) * 100) : null,
            color: row['color'] || '',
            material: row['material'] || '',
            heel_height: row['heel_height'] || '',
            width_option: row['width_option'] || '',
            brand: row['brand'] || 'HeelsUp',
            description: row['description'] || '',
            tags: row['tags'] ? row['tags'].split(';').map(t => t.trim()).filter(Boolean) : [],
            active: row['active'] !== 'false',
            featured: row['featured'] === 'true',
            is_new: row['is_new'] !== 'false',
            is_trending: row['is_trending'] === 'true',
            meta_title: row['meta_title'] || '',
            meta_description: row['meta_description'] || '',
            size_stock,
          });
        } catch (err: any) {
          errors.push(`Row ${rowNum} (${row['sku'] || 'unknown'}): ${err.message}`);
        }
      }

      if (rows.length === 0) {
        throw new Error(`No valid rows found. ${errors.length} row(s) had errors.`);
      }
      if (errors.length > rows.length) {
        throw new Error(`Too many invalid rows (${errors.length}). Please fix the CSV and retry.`);
      }

      const res = await bulkImportProducts(token, rows);
      setResult({ ...res, errors: [...(res.errors || []), ...errors] });
      if (res.success > 0) {
        showToast('success', 'Import Complete', `${res.success} product(s) imported.`);
        onComplete();
      } else {
        showToast('error', 'Import Failed', 'No products could be imported.');
      }
    } catch (e: any) {
      showToast('error', 'CSV Error', e?.message || 'Failed to process CSV file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="bg-white border border-neutral-200 w-full max-w-lg rounded-3xl shadow-2xl relative z-10 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Bulk Product Import</h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">Validated CSV import with row-level error reporting</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500"><X className="w-4 h-4" /></button>
        </div>

        <div onClick={() => csvRef.current?.click()}
          className="border-2 border-dashed border-neutral-200 hover:border-neutral-400 rounded-2xl p-8 text-center cursor-pointer transition-colors group">
          <input ref={csvRef} type="file" accept=".csv" onChange={e => { setCsvFile(e.target.files?.[0] || null); setResult(null); }} className="hidden" />
          <FileText className="w-8 h-8 text-neutral-300 group-hover:text-neutral-500 mx-auto mb-2 transition-colors" />
          {csvFile ? (
            <div><p className="text-sm font-bold text-neutral-900">{csvFile.name}</p><p className="text-[10px] text-neutral-500">{(csvFile.size / 1024).toFixed(1)} KB</p></div>
          ) : (
            <><p className="text-sm font-semibold text-neutral-600">Click to select CSV</p><p className="text-[10px] text-neutral-400 mt-1">Download the template first for correct columns</p></>
          )}
        </div>

        {result && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold">{result.success} products imported</span>
              {result.failed > 0 && <span className="text-rose-600 text-[10px] font-bold">({result.failed} failed)</span>}
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-rose-600">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">{result.errors.length} row(s) with errors:</span>
                </div>
                <div className="max-h-28 overflow-y-auto">{result.errors.map((e, i) => <p key={i} className="text-[9px] text-rose-500 font-mono pl-5">{e}</p>)}</div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={downloadCsvTemplate}
            className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Template
          </button>
          <button onClick={handleImport} disabled={!csvFile || loading}
            className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
            {loading ? 'Importing...' : 'Start Import'}
          </button>
        </div>
      </div>
    </div>
  );
}