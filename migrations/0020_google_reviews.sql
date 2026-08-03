-- Migration 0020: Create google_reviews table and seed EXACT Google Reviews
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS google_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_review_id TEXT UNIQUE,
  author_name TEXT NOT NULL,
  author_photo_url TEXT,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  review_date TEXT NOT NULL,
  relative_time_description TEXT,
  merchant_reply TEXT,
  is_featured INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_google_reviews_status ON google_reviews(status);
CREATE INDEX IF NOT EXISTS idx_google_reviews_featured ON google_reviews(is_featured);

-- Seed EXACT Live Google Reviews for Heels Up Jodhpur into google_reviews table
INSERT OR IGNORE INTO google_reviews (google_review_id, author_name, author_photo_url, rating, review_text, review_date, relative_time_description, merchant_reply, is_featured, status, created_at) VALUES
  ('g_rev_001', 'Diya Nihalani', 'https://ui-avatars.com/api/?name=Diya+Nihalani&background=8C6239&color=FFFFFF', 5, 'Very affordable and best designs here.. must visit recommended. Great visit. Cooperative staff and helpful', '2024-08-01', '2 years ago', NULL, 1, 'approved', datetime('now', '-730 days')),
  ('g_rev_002', 'Hitesh Kumar', 'https://ui-avatars.com/api/?name=Hitesh+Kumar&background=4A148C&color=FFFFFF', 5, 'I purchase shoes and heels for my sister she love the product very much ❤comfortable soft and classy shoes and heels you can have here so go ahead do shoping 😁 😚', '2022-08-01', '4 years ago', NULL, 1, 'approved', datetime('now', '-1460 days')),
  ('g_rev_003', 'Hemant Hotchandani', 'https://ui-avatars.com/api/?name=Hemant+Hotchandani&background=1A237E&color=FFFFFF', 5, 'One Stop store for girl''s foot wear', '2024-08-01', '2 years ago', NULL, 1, 'approved', datetime('now', '-730 days')),
  ('g_rev_004', 'Ajayraj Prajapat', 'https://ui-avatars.com/api/?name=Ajayraj+Prajapat&background=E65100&color=FFFFFF', 5, 'Best& primium smrat look shoes and sleeper collaction i like this and bast range i am happy to shoping in heels up 😋', '2022-08-01', '4 years ago', NULL, 1, 'approved', datetime('now', '-1460 days')),
  ('g_rev_005', 'Pratibha Bamaniya', 'https://ui-avatars.com/api/?name=Pratibha+Bamaniya&background=AA00FF&color=FFFFFF', 5, 'Best quality shoes with affordable prices. Highly recommend!', '2023-08-01', '3 years ago', NULL, 1, 'approved', datetime('now', '-1095 days')),
  ('g_rev_006', 'Bhanu pratap', 'https://ui-avatars.com/api/?name=Bhanu+pratap&background=0288D1&color=FFFFFF', 5, 'Very good shop for girls... Highly recommend !', '2024-08-01', 'Edited 2 years ago', NULL, 1, 'approved', datetime('now', '-730 days')),
  ('g_rev_007', 'Kumer Detha', 'https://ui-avatars.com/api/?name=Kumer+Detha&background=795548&color=FFFFFF', 5, 'Good', '2026-01-01', '7 months ago', NULL, 1, 'approved', datetime('now', '-210 days')),
  ('g_rev_008', 'Mitesh Khatri', 'https://ui-avatars.com/api/?name=Mitesh+Khatri&background=BF360C&color=FFFFFF', 5, 'Best and superior quality products on affordable prices.', '2022-08-01', '4 years ago', NULL, 1, 'approved', datetime('now', '-1460 days')),
  ('g_rev_009', 'Rajkumar', 'https://ui-avatars.com/api/?name=Rajkumar&background=00897B&color=FFFFFF', 5, 'Nice shop and Osm collection h', '2025-08-01', 'a year ago', NULL, 1, 'approved', datetime('now', '-365 days')),
  ('g_rev_010', 'Smart techno gaming king', 'https://ui-avatars.com/api/?name=Smart+techno&background=37474F&color=FFFFFF', 5, 'Good collection of footwear Service is Also good .', '2022-08-01', '4 years ago', NULL, 1, 'approved', datetime('now', '-1460 days')),
  ('g_rev_011', 'Reena Rajwani', 'https://ui-avatars.com/api/?name=Reena+Rajwani&background=5E35B1&color=FFFFFF', 5, 'Amazing products and outstanding quality of the products 👌 👌', '2022-08-01', '4 years ago', NULL, 1, 'approved', datetime('now', '-1460 days')),
  ('g_rev_012', 'surbhi chouhan', 'https://ui-avatars.com/api/?name=surbhi+chouhan&background=212121&color=FFFFFF', 5, 'Great service and awesome collection 👌', '2022-08-01', '4 years ago', NULL, 1, 'approved', datetime('now', '-1460 days'));

-- ALSO Seed into product_reviews table for backward compatibility with storefront product_reviews queries
INSERT OR IGNORE INTO product_reviews (id, product_id, user_id, rating, title, body, status, created_at) VALUES
  (9001, 1, 1, 5, 'Google Review by Diya Nihalani', 'Very affordable and best designs here.. must visit recommended. Great visit. Cooperative staff and helpful', 'approved', datetime('now', '-730 days')),
  (9002, 1, 1, 5, 'Google Review by Hitesh Kumar', 'I purchase shoes and heels for my sister she love the product very much ❤comfortable soft and classy shoes and heels you can have here so go ahead do shoping 😁 😚', 'approved', datetime('now', '-1460 days')),
  (9003, 1, 1, 5, 'Google Review by Hemant Hotchandani', 'One Stop store for girl''s foot wear', 'approved', datetime('now', '-730 days')),
  (9004, 1, 1, 5, 'Google Review by Ajayraj Prajapat', 'Best& primium smrat look shoes and sleeper collaction i like this and bast range i am happy to shoping in heels up 😋', 'approved', datetime('now', '-1460 days')),
  (9005, 1, 1, 5, 'Google Review by Pratibha Bamaniya', 'Best quality shoes with affordable prices. Highly recommend!', 'approved', datetime('now', '-1095 days')),
  (9006, 1, 1, 5, 'Google Review by Bhanu pratap', 'Very good shop for girls... Highly recommend !', 'approved', datetime('now', '-730 days')),
  (9007, 1, 1, 5, 'Google Review by Kumer Detha', 'Good', 'approved', datetime('now', '-210 days')),
  (9008, 1, 1, 5, 'Google Review by Mitesh Khatri', 'Best and superior quality products on affordable prices.', 'approved', datetime('now', '-1460 days')),
  (9009, 1, 1, 5, 'Google Review by Rajkumar', 'Nice shop and Osm collection h', 'approved', datetime('now', '-365 days')),
  (9010, 1, 1, 5, 'Google Review by Smart techno gaming king', 'Good collection of footwear Service is Also good .', 'approved', datetime('now', '-1460 days')),
  (9011, 1, 1, 5, 'Google Review by Reena Rajwani', 'Amazing products and outstanding quality of the products 👌 👌', 'approved', datetime('now', '-1460 days')),
  (9012, 1, 1, 5, 'Google Review by surbhi chouhan', 'Great service and awesome collection 👌', 'approved', datetime('now', '-1460 days'));
