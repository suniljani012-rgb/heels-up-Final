-- ============================================================
-- HeelsUp Migration 0025 — Admin Panel Product Enhancements
-- Run: npx wrangler d1 execute heelsup-live --file=migrations/0025_admin_panel_enhancements.sql
-- ============================================================
-- Adds structured variant/costing fields to products, supplier
-- tracking, product attribute overrides, and a per-size stock
-- audit trail. Adapted to the LIVE schema (products.category is
-- TEXT; product_size_stock / inventory_log / audit_log already exist).
-- ============================================================

-- ============================================================
-- PRODUCTS — Add structured variant & costing fields
-- ============================================================
ALTER TABLE products ADD COLUMN color TEXT;
ALTER TABLE products ADD COLUMN material TEXT;
ALTER TABLE products ADD COLUMN heel_height TEXT;
ALTER TABLE products ADD COLUMN width_option TEXT;
ALTER TABLE products ADD COLUMN cost_price REAL;
ALTER TABLE products ADD COLUMN supplier_id INTEGER;
ALTER TABLE products ADD COLUMN tags_json TEXT DEFAULT '[]';
ALTER TABLE products ADD COLUMN seo_keywords TEXT;
ALTER TABLE products ADD COLUMN detailed_description TEXT;
ALTER TABLE products ADD COLUMN updated_by INTEGER;

CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_active_updated ON products(active, updated_at);

-- ============================================================
-- SUPPLIERS — Cost/margin tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gstin TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active);

-- ============================================================
-- PRODUCT ATTRIBUTES — color/material/heel-height overrides
-- ============================================================
CREATE TABLE IF NOT EXISTS product_attributes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  attribute_name TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(product_id, attribute_name),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_attributes_product ON product_attributes(product_id);

-- ============================================================
-- STOCK AUDIT — per-size change history
-- (complements the aggregate inventory_log table)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  size_label TEXT,
  quantity_before INTEGER NOT NULL DEFAULT 0,
  quantity_change INTEGER NOT NULL DEFAULT 0,
  quantity_after INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_stock_audit_product ON stock_audit_log(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_audit_created ON stock_audit_log(created_at);

-- ============================================================
-- AUDIT LOG — store structured change diff for mutations
-- (entity/entity_id already exist; changes_json is new)
-- ============================================================
ALTER TABLE audit_log ADD COLUMN changes_json TEXT;
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);