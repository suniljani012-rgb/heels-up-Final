PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ─────────────────────────────────────────────
-- TABLE 1: ONLINE CUSTOMERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS online_customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  phone       TEXT,
  password_hash TEXT NOT NULL,
  is_active   INTEGER DEFAULT 1,
  is_blocked  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now')),
  last_login  TEXT
);
CREATE INDEX idx_online_customers_email ON online_customers(email);
CREATE INDEX idx_online_customers_phone ON online_customers(phone);

-- ─────────────────────────────────────────────
-- TABLE 2: OFFLINE CUSTOMERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offline_customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT UNIQUE NOT NULL,
  name        TEXT,
  phone       TEXT,
  total_visits INTEGER DEFAULT 1,
  total_spent  INTEGER DEFAULT 0,
  notes        TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_offline_customers_phone ON offline_customers(phone);

-- ─────────────────────────────────────────────
-- TABLE 3: STAFF
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id     TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  phone        TEXT,
  password_hash TEXT NOT NULL,
  role         TEXT DEFAULT 'staff',
  permissions  TEXT DEFAULT '[]',
  is_active    INTEGER DEFAULT 1,
  created_by   INTEGER,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now')),
  last_login   TEXT
);

-- ─────────────────────────────────────────────
-- TABLE 4: ADMINS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id     TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role         TEXT DEFAULT 'admin',
  is_active    INTEGER DEFAULT 1,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now')),
  last_login   TEXT
);

-- ─────────────────────────────────────────────
-- PRODUCT & INVENTORY TABLES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  product_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  product_code TEXT UNIQUE,
  category TEXT,
  price INTEGER NOT NULL, -- paise
  original_price INTEGER, -- paise
  active INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT, 
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, 
  url TEXT NOT NULL, 
  sort_order INTEGER DEFAULT 0, 
  is_primary INTEGER DEFAULT 0, 
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id INTEGER,
  color TEXT,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, color, size)
);

-- ─────────────────────────────────────────────
-- ONLINE CART & ORDERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  online_customer_id INTEGER NOT NULL REFERENCES online_customers(id),
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id     INTEGER NOT NULL REFERENCES cart(id),
  product_id  INTEGER NOT NULL,
  variant_id  INTEGER,
  color       TEXT,
  size        TEXT NOT NULL,
  quantity    INTEGER DEFAULT 1,
  unit_price  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS online_orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number    TEXT UNIQUE NOT NULL,
  online_customer_id INTEGER NOT NULL REFERENCES online_customers(id),
  delivery_address TEXT NOT NULL,
  subtotal        INTEGER NOT NULL,
  delivery_charge INTEGER DEFAULT 0,
  discount        INTEGER DEFAULT 0,
  total           INTEGER NOT NULL,
  payment_method  TEXT DEFAULT 'razorpay',
  payment_status  TEXT DEFAULT 'pending',
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,
  status          TEXT DEFAULT 'pending',
  tracking_number TEXT,
  notes           TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_online_orders_customer ON online_orders(online_customer_id);
CREATE INDEX idx_online_orders_status ON online_orders(status, created_at);
CREATE INDEX idx_online_orders_payment ON online_orders(payment_status);

CREATE TABLE IF NOT EXISTS online_order_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES online_orders(id),
  product_id      INTEGER NOT NULL,
  product_code    TEXT NOT NULL,
  product_name    TEXT NOT NULL,
  color           TEXT,
  size            TEXT NOT NULL,
  quantity        INTEGER NOT NULL,
  unit_price      INTEGER NOT NULL,
  total_price     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS online_order_status_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES online_orders(id),
  old_status TEXT,
  new_status TEXT NOT NULL,
  note       TEXT,
  changed_by TEXT,
  changed_at TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- OFFLINE SALES TABLES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offline_sales (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_number         TEXT UNIQUE NOT NULL,
  offline_customer_id INTEGER REFERENCES offline_customers(id),
  customer_name       TEXT,
  customer_phone      TEXT,
  subtotal            INTEGER NOT NULL,
  discount            INTEGER DEFAULT 0,
  total               INTEGER NOT NULL,
  payment_method      TEXT NOT NULL,
  payment_reference   TEXT,
  served_by_staff_id  INTEGER REFERENCES staff(id),
  notes               TEXT,
  is_exchange         INTEGER DEFAULT 0,
  original_bill_number TEXT,
  created_at          TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_offline_sales_date ON offline_sales(created_at);
CREATE INDEX idx_offline_sales_customer ON offline_sales(offline_customer_id);

CREATE TABLE IF NOT EXISTS offline_sale_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id         INTEGER NOT NULL REFERENCES offline_sales(id),
  product_id      INTEGER NOT NULL,
  product_code    TEXT NOT NULL,
  product_name    TEXT NOT NULL,
  color           TEXT,
  size            TEXT NOT NULL,
  quantity        INTEGER NOT NULL,
  unit_price      INTEGER NOT NULL,
  total_price     INTEGER NOT NULL
);

-- ─────────────────────────────────────────────
-- EXCHANGES TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exchanges (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  exchange_number     TEXT UNIQUE NOT NULL,
  source_type         TEXT NOT NULL,
  source_order_id     INTEGER,
  source_sale_id      INTEGER,
  customer_type       TEXT NOT NULL,
  online_customer_id  INTEGER,
  offline_customer_id INTEGER,
  reason              TEXT,
  status              TEXT DEFAULT 'requested',
  new_product_id      INTEGER,
  new_color           TEXT,
  new_size            TEXT,
  new_bill_number     TEXT,
  handled_by_staff_id INTEGER REFERENCES staff(id),
  notes               TEXT,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- OTHER TABLES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  online_customer_id INTEGER NOT NULL REFERENCES online_customers(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wishlist_id INTEGER NOT NULL REFERENCES wishlists(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS online_customer_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  online_customer_id INTEGER NOT NULL REFERENCES online_customers(id),
  label TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  is_default INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  value INTEGER NOT NULL,
  min_order INTEGER DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coupon_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id),
  online_customer_id INTEGER REFERENCES online_customers(id),
  order_id INTEGER REFERENCES online_orders(id),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  online_customer_id INTEGER REFERENCES online_customers(id),
  rating INTEGER,
  comment TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS review_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id INTEGER REFERENCES reviews(id),
  image_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url TEXT,
  title TEXT,
  link TEXT,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT,
  content TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT,
  message TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  staff_id INTEGER,
  action TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS print_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_type TEXT,
  reference_id TEXT,
  printed_by_staff_id INTEGER,
  printed_by_admin_id INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analytics_daily_snapshot (
  date TEXT PRIMARY KEY,
  total_online_sales INTEGER DEFAULT 0,
  total_offline_sales INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0
);

-- Misc tables missing from prompt but likely needed based on prior logic
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE otp_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  purpose TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- ─────────────────────────────────────────────
-- INSERT SETTINGS
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO settings (key, value) VALUES
('free_delivery_threshold', '1599'),
('return_policy', 'exchange_only'),
('exchange_window_days', '7'),
('cod_enabled', 'true'),
('online_payment_only', 'false'),
('currency', 'INR'),
('currency_symbol', '₹'),
('gst_registered', 'true'),
('gst_number', ''),
('store_name', 'Heelsup'),
('contact_person', 'Jay Karwani'),
('store_phone', '078914 70935'),
('store_whatsapp', '078914 70935'),
('store_address', 'Heelsup, 1st B Rd, near Mahaveer Mega Mart, opposite Little Champ, Sardarpura, Jodhpur, Rajasthan 342001'),
('store_city', 'Jodhpur'),
('store_state', 'Rajasthan'),
('store_pincode', '342001'),
('store_logo', '/assets/logo.png'),
('invoice_prefix', 'HU'),
('offline_bill_prefix', 'HU-OFL'),
('min_order_value', '0'),
('delivery_charge', '49'),
('delivery_charge_free_above', '1599');

-- ─────────────────────────────────────────────
-- PRODUCT SEEDING
-- ─────────────────────────────────────────────
INSERT INTO products (id, name, product_code, price, active) VALUES (1, 'Premium Party Heel', '00110', 115000, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (1, 'Black', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (1, 'Black', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (1, 'Black', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (1, 'Black', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (1, 'Cream', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (1, 'Cream', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (1, 'Cream', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (1, 'Cream', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (2, 'Premium Party Heel', '0087', 89900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (2, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (2, 'Nude/Default', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (2, 'Nude/Default', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (3, 'Everyday Comfort Flat', '0068', 65000, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (3, 'White', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (3, 'White', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (3, 'White', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (3, 'White', '41', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (3, 'Cherry', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (3, 'Cherry', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (4, 'Casual Block Heel', '0080', 79900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (4, 'Black', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (4, 'Black', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (4, 'Black', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (4, 'Black', '41', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (4, 'Brown', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (4, 'Brown', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (4, 'Brown', '40', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (5, 'Casual Block Heel', '0084-A', 85000, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (5, 'Cherry', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (5, 'Cherry', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (5, 'Cherry', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (5, 'Cherry', '41', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (5, 'Brown', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (5, 'Brown', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (5, 'Brown', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (6, 'Premium Party Heel', '00110-B', 109900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (6, 'White', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (6, 'White', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (6, 'White', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (6, 'White', '41', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (6, 'Brown', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (6, 'Brown', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (7, 'Casual Block Heel', '0078-A', 75000, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (7, 'Nude/Default', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (7, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (7, 'Nude/Default', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (7, 'Nude/Default', '40', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (8, 'Everyday Comfort Flat', '0058-A', 65000, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (8, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (8, 'Nude/Default', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (8, 'Nude/Default', '40', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (9, 'Everyday Comfort Flat', '0056-A', 54900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (9, 'Black', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (9, 'Black', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (9, 'Black', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (9, 'Black', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (9, 'Cream', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (9, 'Cream', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (9, 'Cream', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (9, 'Cream', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (10, 'Casual Block Heel', '0084-B', 74900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (10, 'Cream', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (10, 'Cream', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (10, 'Cream', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (10, 'Brown', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (10, 'Brown', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (10, 'Brown', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (10, 'Brown', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (11, 'Everyday Comfort Flat', '0056-B', 49900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (11, 'Black', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (11, 'Black', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (11, 'White', '39', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (12, 'Everyday Comfort Flat', '0067-A', 65000, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (12, 'Black', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (12, 'Black', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (12, 'Black', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (12, 'Black', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (12, 'Black', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (12, 'Black', '41', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (12, 'Cherry', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (12, 'Cherry', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (12, 'Cherry', '38', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (13, 'Casual Block Heel', '0084-C', 85000, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (13, 'Black', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (13, 'Black', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (13, 'Black', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (13, 'Black', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (13, 'Black', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (13, 'Brown', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (13, 'Brown', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (13, 'Brown', '40', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (14, 'Casual Block Heel', '0064-A', 69900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (14, 'Nude/Default', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (14, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (14, 'Nude/Default', '39', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (15, 'Everyday Comfort Flat', '0058-B', 54900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (15, 'Nude/Default', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (15, 'Nude/Default', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (15, 'Nude/Default', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (16, 'Casual Block Heel', '0084-D', 85000, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (16, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (16, 'Nude/Default', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (16, 'Nude/Default', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (16, 'Nude/Default', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (17, 'Casual Block Heel', '0078-B', 74900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (17, 'White', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (17, 'White', '41', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (17, 'Cream', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (17, 'Cream', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (17, 'Cream', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (18, 'Casual Block Heel', '0078-C', 79900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (18, 'Nude/Default', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (18, 'Nude/Default', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (18, 'Nude/Default', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (19, 'Premium Party Heel', '0095', 109900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (19, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (19, 'Nude/Default', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (19, 'Nude/Default', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (19, 'Nude/Default', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (20, 'Premium Party Heel', '0094-A', 99500, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (20, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (20, 'Nude/Default', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (20, 'Nude/Default', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (20, 'Nude/Default', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (21, 'Premium Party Heel', '0094-B', 99500, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (21, 'Nude/Default', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (21, 'Nude/Default', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (21, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (21, 'Nude/Default', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (21, 'Nude/Default', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (21, 'Nude/Default', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (22, 'Casual Block Heel', '0064-B', 69900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (22, 'Nude/Default', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (22, 'Nude/Default', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (22, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (22, 'Nude/Default', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (22, 'Nude/Default', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (22, 'Nude/Default', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (23, 'Premium Party Heel', '0097-A', 99500, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (23, 'Nude/Default', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (23, 'Nude/Default', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (23, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (23, 'Nude/Default', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (23, 'Nude/Default', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (23, 'Nude/Default', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (24, 'Casual Block Heel', '0084-E', 79900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (24, 'Nude/Default', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (24, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (24, 'Nude/Default', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (24, 'Nude/Default', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (24, 'Nude/Default', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (25, 'Casual Block Heel', '0067-B', 69900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (25, 'Nude/Default', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (25, 'Nude/Default', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (25, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (25, 'Nude/Default', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (25, 'Nude/Default', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (25, 'Nude/Default', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (26, 'Premium Party Heel', '0092', 89900, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (26, 'Nude/Default', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (26, 'Nude/Default', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (26, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (26, 'Nude/Default', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (26, 'Nude/Default', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (26, 'Nude/Default', '41', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (27, 'Premium Party Heel', '0097-B', 99500, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (27, 'Nude/Default', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (27, 'Nude/Default', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (27, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (27, 'Nude/Default', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (27, 'Nude/Default', '40', 10, 0);
INSERT INTO products (id, name, product_code, price, active) VALUES (28, 'Premium Party Heel', '0093', 99500, 1);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (28, 'Nude/Default', '36', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (28, 'Nude/Default', '37', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (28, 'Nude/Default', '38', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (28, 'Nude/Default', '39', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (28, 'Nude/Default', '40', 10, 0);
INSERT INTO inventory (product_id, color, size, quantity, reserved_quantity) VALUES (28, 'Nude/Default', '41', 10, 0);
