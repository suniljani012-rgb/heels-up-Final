// frontend/src/pages/admin/products/productTypes.ts

export interface SizeStockRow {
  size_label: string;
  stock: number;
  reserved?: number;
}

export interface ProductImageRecord {
  id: number;
  url: string;
  alt: string;
  position: number;
  is_primary: boolean;
  mime_type?: string;
  format?: string;
}

export interface AdminProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  category_id: number | null;
  price: number;
  original_price: number | null;
  mrp: number | null;
  show_mrp: boolean;
  stock: number;
  active: boolean;
  is_active: boolean;
  featured: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_trending: boolean;
  rating: number;
  review_count: number;
  sold_count: number;
  sales: number;
  sales_count: number;
  description: string;
  detailed_description: string;
  brand: string;
  tags: string[];
  tags_json: string;
  color: string;
  material: string;
  heel_height: string;
  width_option: string;
  cost_price: number | null;
  supplier_id: number | null;
  sizes: string[];
  size_stock: SizeStockRow[];
  size_stock_map: Record<string, number>;
  images: string[];
  colors: string[];
  meta_title: string;
  meta_description: string;
  seo_keywords: string;
  created_at: string;
  updated_at: string;
  image_records?: ProductImageRecord[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  sort_order: number;
  active: boolean;
}

export interface ProductPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedProducts {
  data: AdminProduct[];
  pagination: ProductPagination;
}

export interface ProductPayload {
  name: string;
  sku: string;
  category: string;
  description: string;
  detailed_description: string;
  price: number;
  original_price: number | null;
  cost_price: number | null;
  color: string;
  material: string;
  heel_height: string;
  width_option: string;
  brand: string;
  active: boolean;
  featured: boolean;
  is_new: boolean;
  is_trending: boolean;
  show_mrp: boolean;
  sizes: string[];
  size_stock: SizeStockRow[];
  images: { url: string; alt: string; position: number }[];
  tags: string[];
  meta_title: string;
  meta_description: string;
  seo_keywords: string;
  supplier_id: number | null;
}

export interface BulkImportRow {
  name: string;
  sku: string;
  category: string;
  price: number;
  original_price?: number | null;
  cost_price?: number | null;
  color?: string;
  material?: string;
  heel_height?: string;
  width_option?: string;
  brand?: string;
  description?: string;
  tags?: string[];
  active?: boolean;
  featured?: boolean;
  is_new?: boolean;
  is_trending?: boolean;
  meta_title?: string;
  meta_description?: string;
  size_stock: SizeStockRow[];
}

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: string[];
  created_ids?: number[];
}