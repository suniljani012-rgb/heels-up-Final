export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number; // in paise
  original_price: number | null;
  stock: number;
  active: boolean;
  featured: boolean;
  is_new: boolean;
  is_trending: boolean;
  sizes: string[];
  images: string[];
  description?: string;
  brand?: string;
  tags?: string[];
  show_mrp?: boolean;
  meta_title?: string;
  meta_desc?: string;
  size_stock?: { size_label: string; stock: number; reserved?: number }[];
  sold_count?: number;
}

export interface OrderItem {
  id: number | string;
  product_id?: number | null;
  product_name: string;
  size: string;
  color?: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface Order {
  id: number | string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  subtotal_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  order_status: 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'Completed';
  payment_status: string;
  payment_method: string;
  created_at: string;
  tracking_number?: string;
  tracking_url?: string;
  courier_name?: string;
  source: 'web' | 'pos' | 'whatsapp' | 'instagram';
  items: OrderItem[];
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
  is_pos?: boolean;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  delivery_method?: string;
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

export interface Coupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order: number;
  max_discount?: number;
  max_uses?: number;
  used_count: number;
  active: boolean;
  expires_at?: string;
  description?: string;
}

export interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  image_url: string;
  link?: string;
  active: boolean;
  sort_order: number;
}

export interface PageConfig {
  id: number;
  title: string;
  slug: string;
  content: string;
  active: boolean;
}

export interface Staff {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  name?: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'staff' | string;
  is_blocked: boolean;
  is_active?: number;
  permissions?: string;
  notes?: string;
  last_login_at?: string;
  created_at?: string;
  two_factor_enabled?: boolean;
}

export interface Customer {
  id: number;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  order_count?: number;
  orders_count?: number;
  total_spent?: number;
  created_at: string;
  is_blocked?: boolean;
  is_active?: number | boolean;
}

export interface ReturnItem {
  product_id: number;
  product_name: string;
  size: string;
  color?: string;
  quantity: number;
  price: number;
}

export interface ReturnRequest {
  id: number;
  order_id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  return_type: 'refund' | 'exchange';
  reason: string;
  items: string;
  status: 'pending' | 'approved' | 'received' | 'completed' | 'rejected';
  action_notes?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  description?: string;
  images?: string;
  refund_amount?: number;
}

export interface Review {
  id: number;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  reviewer_name: string;
  product_name: string;
  product_id: number;
  status: 'pending' | 'approved' | 'rejected';
  approved: boolean;
  merchant_reply?: string;
}

export interface AuditLog {
  id: number;
  action: string;
  admin_email?: string;
  details: string;
  created_at: string;
}

export interface PosSale {
  id: number;
  sale_number: string;
  customer_name: string;
  customer_phone: string;
  items_json: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  notes?: string;
  created_at: string;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

export interface DashboardData {
  total_sales: number;
  total_pos_sales: number;
  orders_count: number;
  pos_sales_count: number;
  aov?: number;
  repeatCustomers?: number;
  salesGrowth?: number;
  daily_sales?: { label: string; revenue: number }[];
  category_sales?: { category: string; value: number }[];
  low_stock_products?: any[];
}
