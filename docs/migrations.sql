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

-- ============================================================
-- Migration: Add battle_stats table
-- Applied: 2026-06-08
-- ============================================================
CREATE TABLE IF NOT EXISTS battle_stats (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL UNIQUE,
  tier_points INT           NOT NULL DEFAULT 0,
  wins        INT           NOT NULL DEFAULT 0,
  losses      INT           NOT NULL DEFAULT 0,
  win_streak  INT           NOT NULL DEFAULT 0,
  best_streak INT           NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_battle_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- Migration: Add enhancement_stones and enhancement_level columns
-- Applied: 2026-06-08
-- ============================================================
ALTER TABLE user_rewards
  ADD COLUMN enhancement_stones INT NOT NULL DEFAULT 0 AFTER golden_eggs;

ALTER TABLE user_characters
  ADD COLUMN enhancement_level INT NOT NULL DEFAULT 0 AFTER obtained_at;
