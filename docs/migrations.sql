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

-- ============================================================
-- Migration: Add expedition_count and rogue_clears columns
-- Applied: 2026-06-10
-- ============================================================
ALTER TABLE user_rewards
  ADD COLUMN expedition_count INT NOT NULL DEFAULT 0 AFTER live_count,
  ADD COLUMN rogue_clears     INT NOT NULL DEFAULT 0 AFTER expedition_count;

-- ============================================================
-- Migration: Remove auto_backup column
-- Applied: 2026-06-10
-- ============================================================
ALTER TABLE app_settings
  DROP COLUMN auto_backup;

-- notifications 테이블에 i18n 번역 키 컬럼 추가
-- 클라이언트에서 이 키를 사용해 언어 변경 시 알림을 재번역합니다

ALTER TABLE `notifications`
  ADD COLUMN `title_key` VARCHAR(80) NULL AFTER `body`,
  ADD COLUMN `body_key`  VARCHAR(80) NULL AFTER `title_key`;

-- ============================================================
-- Migration: Add arena_decks table (콜로세움 공격/방어 덱)
-- Applied: 2026-06-30
-- ============================================================
CREATE TABLE IF NOT EXISTS arena_decks (
  user_id    VARCHAR(36)  NOT NULL,
  deck_type  VARCHAR(10)  NOT NULL,
  slots      JSON         NOT NULL,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, deck_type),
  CONSTRAINT fk_arena_decks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- ============================================================
-- Migration: Add arena_attack_logs table (복수 시스템)
-- Applied: 2026-07-02
-- ============================================================
CREATE TABLE IF NOT EXISTS arena_attack_logs (
  id            BIGINT       NOT NULL AUTO_INCREMENT,
  attacker_id   VARCHAR(36)  NOT NULL,
  defender_id   VARCHAR(36)  NOT NULL,
  attacker_won  TINYINT(1)   NOT NULL DEFAULT 0,
  points_delta  INT          NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_aal_defender  (defender_id, created_at DESC),
  INDEX idx_aal_attacker  (attacker_id, created_at DESC),
  CONSTRAINT fk_aal_attacker FOREIGN KEY (attacker_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_aal_defender FOREIGN KEY (defender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- Migration: Add arena tickets (server-authoritative) + dex milestone tracking
-- Applied: 2026-07-09
-- ============================================================
ALTER TABLE user_rewards
  ADD COLUMN arena_tickets          INT      NOT NULL DEFAULT 5 AFTER challenge_best,
  ADD COLUMN arena_ticket_regen_at  DATETIME NULL     AFTER arena_tickets,
  ADD COLUMN arena_ticket_date      VARCHAR(10) NULL  AFTER arena_ticket_regen_at,
  ADD COLUMN dex_milestone_best     INT      NOT NULL DEFAULT 0 AFTER arena_ticket_date;

-- ============================================================
-- Migration: Add duel_stats table (1:1 카드 대전 전적/랭킹)
-- Applied: 2026-07-09
-- ============================================================
CREATE TABLE IF NOT EXISTS duel_stats (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL UNIQUE,
  wins        INT          NOT NULL DEFAULT 0,
  losses      INT          NOT NULL DEFAULT 0,
  win_streak  INT          NOT NULL DEFAULT 0,
  best_streak INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_duel_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- Migration: Add expeditions table (원정 서버 상태 추적 — 보상 위조 방지)
-- Applied: 2026-07-09
-- ============================================================
CREATE TABLE IF NOT EXISTS expeditions (
  id                VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id           VARCHAR(36)  NOT NULL UNIQUE,
  region_id         VARCHAR(20)  NOT NULL,
  party_ids         JSON         NOT NULL,
  start_time        DATETIME     NOT NULL,
  duration_hours    INT          NOT NULL,
  event_template_id VARCHAR(20)  NULL,
  event_bonus_mult  FLOAT        NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_expeditions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- Migration: Add active_run_started_at (로그라이크/도전 진행시간 검증용)
-- Applied: 2026-07-09
-- ============================================================
ALTER TABLE user_rewards
  ADD COLUMN active_run_started_at DATETIME NULL AFTER arena_ticket_date;
