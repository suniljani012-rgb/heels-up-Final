import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch categories');
      return data.data;
    }
  });
}

export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const res = await fetch('/api/banners');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch banners');
      return data.data;
    }
  });
}



export function useLatestReviews() {
  return useQuery({
    queryKey: ['latestReviews'],
    queryFn: async () => {
      const res = await fetch('/api/reviews/latest');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch latest reviews');
      return data.data;
    }
  });
}

export function useGoogleReviews() {
  return useQuery({
    queryKey: ['googleReviews'],
    queryFn: async () => {
      const res = await fetch('/api/reviews/google');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch google reviews');
      return data.data;
    }
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['featuredProducts'],
    queryFn: async () => {
      const res = await fetch('/api/products?limit=8&featured=true');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch featured products');
      return data.data;
    }
  });
}

export function useShopProducts(filters: {
  page: number;
  category: string;
  sort: string;
  searchQ: string;
  priceMin: string;
  priceMax: string;
  size: string;
}) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['shopProducts', filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(filters.page || 1));
      queryParams.set('limit', '12');
      if (filters.category) queryParams.set('cat', filters.category);
      if (filters.sort) queryParams.set('sort', filters.sort);
      if (filters.searchQ) queryParams.set('q', filters.searchQ);
      if (filters.priceMin) queryParams.set('min_price', String(Number(filters.priceMin) * 100)); // to paise
      if (filters.priceMax) queryParams.set('max_price', String(Number(filters.priceMax) * 100)); // to paise
      if (filters.size) queryParams.set('size', filters.size);

      const res = await fetch(`/api/products?${queryParams.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch shop products');

      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((p: any) => {
          queryClient.setQueryData(['product', String(p.id)], {
            product: p,
            reviews: p.reviews || [],
            images: p.images || [],
            related: []
          });
        });
      }
      return data;
    }
  });
}
