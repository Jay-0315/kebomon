-- ============================================================
-- Migration: Remove expenses/groups feature, add push_subscriptions
-- Applied: 2026-06-08
-- ============================================================

-- 1. Drop removed tables (FK 의존 순서 — 자식 먼저)
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS group_join_requests;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS `groups`;

SET FOREIGN_KEY_CHECKS = 1;

-- 2. Add push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         BIGINT        AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36)   NOT NULL,
  endpoint   TEXT          NOT NULL,
  p256dh     TEXT          NOT NULL,
  auth       TEXT          NOT NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_push_user_id (user_id),
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
