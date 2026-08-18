// frontend/src/pages/admin/products/useProducts.ts
import { useCallback, useEffect, useState } from 'react';
import { fetchProducts, type ProductListParams } from './productApi';
import type { AdminProduct, ProductPagination } from './productTypes';

interface UseProductsOptions {
  token: string;
  pageSize?: number;
  enabled?: boolean;
}

export function useProducts({ token, pageSize = 12, enabled = true }: UseProductsOptions) {
  const [data, setData] = useState<AdminProduct[]>([]);
  const [pagination, setPagination] = useState<ProductPagination>({ page: 1, limit: pageSize, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductListParams>({ page: 1, limit: pageSize });

  const reload = useCallback(async () => {
    if (!token || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProducts(token, filters);
      setData(result.data);
      setPagination(result.pagination);
    } catch (e: any) {
      setError(e?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [token, enabled, filters]);

  useEffect(() => {
    reload();
  }, [reload]);

  const goToPage = (page: number) => setFilters(f => ({ ...f, page }));
  const setSearch = (q: string) => setFilters(f => ({ ...f, q, page: 1 }));
  const setCategory = (category: string) => setFilters(f => ({ ...f, category, page: 1 }));
  const reset = () => setFilters({ page: 1, limit: pageSize });

  return { data, pagination, loading, error, filters, reload, goToPage, setSearch, setCategory, reset };
}