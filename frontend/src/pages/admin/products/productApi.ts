// frontend/src/pages/admin/products/productApi.ts
import type { AdminProduct, BulkImportResult, PaginatedProducts, ProductPayload, SizeStockRow } from './productTypes';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  active?: string;
  min_price?: number;
  max_price?: number;
  sort?: string;
  order?: string;
}

export async function fetchProducts(token: string, params: ProductListParams = {}): Promise<PaginatedProducts> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const res = await fetch(`/api/admin/products?${query.toString()}`, { headers: authHeaders(token) });
  return parseResponse<PaginatedProducts>(res);
}

export async function fetchProductDetail(token: string, id: number): Promise<AdminProduct> {
  const res = await fetch(`/api/admin/products/${id}`, { headers: authHeaders(token) });
  const data = await parseResponse<{ data: AdminProduct }>(res);
  return data.data;
}

export async function createProduct(token: string, payload: ProductPayload): Promise<AdminProduct> {
  const res = await fetch('/api/admin/products', {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  const data = await parseResponse<{ data: AdminProduct }>(res);
  return data.data;
}

export async function updateProduct(token: string, id: number, payload: ProductPayload): Promise<AdminProduct> {
  const res = await fetch(`/api/admin/products/${id}`, {
    method: 'PUT',
    headers: { ...JSON_HEADERS, ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  const data = await parseResponse<{ data: AdminProduct }>(res);
  return data.data;
}

export async function deleteProduct(token: string, id: number): Promise<{ soft_deleted?: boolean }> {
  const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE', headers: authHeaders(token) });
  return parseResponse<{ soft_deleted?: boolean }>(res);
}

export async function bulkImportProducts(token: string, products: unknown[]): Promise<BulkImportResult> {
  const res = await fetch('/api/admin/products/bulk/import', {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...authHeaders(token) },
    body: JSON.stringify({ products }),
  });
  const data = await parseResponse<{ data: BulkImportResult }>(res);
  return data.data;
}

export async function updateProductStock(token: string, id: number, sizeStock: SizeStockRow[], reason?: string): Promise<void> {
  const res = await fetch(`/api/admin/products/${id}/stock`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...authHeaders(token) },
    body: JSON.stringify({ size_stock: sizeStock, reason }),
  });
  await parseResponse(res);
}

export interface StockAuditEntry {
  id: number;
  size_label: string | null;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  reason: string;
  created_by: number | null;
  created_at: string;
}

export async function fetchStockHistory(token: string, id: number): Promise<StockAuditEntry[]> {
  const res = await fetch(`/api/admin/products/${id}/stock-history`, { headers: authHeaders(token) });
  const data = await parseResponse<{ data: StockAuditEntry[] }>(res);
  return data.data || [];
}

export async function downloadCsvTemplate(): Promise<void> {
  const headers = [
    'name', 'sku', 'category', 'price', 'original_price', 'cost_price', 'color', 'material',
    'heel_height', 'width_option', 'brand', 'description', 'tags',
    'stock_36', 'stock_37', 'stock_38', 'stock_39', 'stock_40', 'stock_41',
    'active', 'featured', 'is_new', 'is_trending', 'meta_title', 'meta_description'
  ];
  const example = [
    'Oxford Double Strap', 'HU-OX-01-BLK', 'Jodhpuris', '4999', '8999', '2500', 'Black', 'Leather',
    'Medium', 'Standard', 'HeelsUp', 'Premium leather oxford', 'wedding;premium',
    '5', '10', '8', '6', '4', '2',
    'true', 'false', 'true', 'false', 'Premium Oxford Boots', 'Buy premium oxford boots'
  ];
  const csv = [headers.join(','), example.join(',')].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'heelsup_bulk_products_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}