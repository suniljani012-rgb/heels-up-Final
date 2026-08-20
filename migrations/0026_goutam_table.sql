-- ============================================================
-- HeelsUp Migration 0026 — Goutam Table
-- ============================================================

CREATE TABLE IF NOT EXISTS goutam (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  user_id INTEGER NOT NULL,
  password_hash TEXT NOT NULL,
  heading TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_goutam_user_id ON goutam(user_id);
CREATE INDEX idx_goutam_created_at ON goutam(created_at);