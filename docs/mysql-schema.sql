CREATE TABLE users (
  id               VARCHAR(36)                    NOT NULL PRIMARY KEY,
  name             VARCHAR(100)                   NOT NULL,
  email            VARCHAR(190)                   NOT NULL UNIQUE,
  password_hash    VARCHAR(255)                   NULL,
  role             VARCHAR(20)                    NOT NULL DEFAULT 'USER',
  status           VARCHAR(12)                    NOT NULL DEFAULT 'ACTIVE',
  suspended_reason VARCHAR(255)                   NULL,
  base_country_code CHAR(2)                       NOT NULL,
  base_currency    ENUM('KRW','JPY','USD','EUR')  NOT NULL,
  profile_photo    LONGTEXT                       NULL,
  has_password     TINYINT(1)                     NOT NULL DEFAULT 0,
  last_login_at    DATETIME                       NULL,
  created_at       DATETIME                       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME                       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_identities (
  id               BIGINT        AUTO_INCREMENT PRIMARY KEY,
  user_id          VARCHAR(36)   NOT NULL,
  provider         ENUM('GOOGLE') NOT NULL,
  provider_user_id VARCHAR(191)  NOT NULL,
  provider_email   VARCHAR(190)  NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_provider_user UNIQUE (provider, provider_user_id),
  CONSTRAINT uq_user_provider UNIQUE (user_id, provider),
  CONSTRAINT fk_identities_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE app_settings (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id       VARCHAR(36)   NOT NULL UNIQUE,
  notifications TINYINT(1)    NOT NULL DEFAULT 1,
  dark_mode     TINYINT(1)    NOT NULL DEFAULT 1,
  theme_color   VARCHAR(20)   NOT NULL DEFAULT 'emerald',
  language      VARCHAR(5)    NOT NULL DEFAULT 'ko',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE community_posts (
  id          VARCHAR(36)                      NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)                      NOT NULL,
  content     LONGTEXT                         NOT NULL,
  category    ENUM('brag','tip','chat')        NOT NULL DEFAULT 'chat',
  image_url   LONGTEXT                         NULL,
  likes_count INT                              NOT NULL DEFAULT 0,
  created_at  DATETIME                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME                         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE post_likes (
  id         BIGINT       AUTO_INCREMENT PRIMARY KEY,
  post_id    VARCHAR(36)  NOT NULL,
  user_id    VARCHAR(36)  NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_post_likes UNIQUE (post_id, user_id),
  INDEX idx_post_likes_post_id (post_id),
  INDEX idx_post_likes_user_id (user_id),
  CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users(id)           ON DELETE CASCADE
);

CREATE TABLE comments (
  id         BIGINT       AUTO_INCREMENT PRIMARY KEY,
  post_id    VARCHAR(36)  NOT NULL,
  user_id    VARCHAR(36)  NOT NULL,
  parent_id  BIGINT       NULL,
  content    TEXT         NOT NULL,
  image_url  LONGTEXT     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_comments_post_id   (post_id),
  INDEX idx_comments_user_id   (user_id),
  INDEX idx_comments_parent_id (parent_id),
  CONSTRAINT fk_comments_post   FOREIGN KEY (post_id)   REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user   FOREIGN KEY (user_id)   REFERENCES users(id)           ON DELETE CASCADE,
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id)        ON DELETE CASCADE
);

CREATE TABLE user_rewards (
  id                    VARCHAR(36)  NOT NULL PRIMARY KEY,
  user_id               VARCHAR(36)  NOT NULL UNIQUE,
  mission_points        INT          NOT NULL DEFAULT 0,
  attendance_days       INT          NOT NULL DEFAULT 0,
  streak_days           INT          NOT NULL DEFAULT 0,
  equipped_character_id INT          NULL,
  equipped_title_id     INT          NULL,
  gacha_pity_count      INT          NOT NULL DEFAULT 0,
  legendary_pity_count  INT          NOT NULL DEFAULT 0,
  total_points_used     INT          NOT NULL DEFAULT 0,
  normal_eggs           INT          NOT NULL DEFAULT 0,
  big_eggs              INT          NOT NULL DEFAULT 0,
  golden_eggs           INT          NOT NULL DEFAULT 0,
  raid_count            INT          NOT NULL DEFAULT 0,
  live_count            INT          NOT NULL DEFAULT 0,
  expedition_count      INT          NOT NULL DEFAULT 0,
  rogue_clears          INT          NOT NULL DEFAULT 0,
  challenge_best        INT          NOT NULL DEFAULT 0,
  last_attendance_date  VARCHAR(10)  NULL,
  month_key             VARCHAR(7)   NULL,
  month_days            INT          NOT NULL DEFAULT 0,
  month_week_rewards    INT          NOT NULL DEFAULT 0,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rewards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
  id         BIGINT       AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  type       VARCHAR(20)  NOT NULL,
  title      VARCHAR(120) NOT NULL,
  body       VARCHAR(255) NOT NULL,
  link       VARCHAR(255) NULL,
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user_read (user_id, is_read),
  INDEX idx_notif_user_created (user_id, created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE push_subscriptions (
  id         BIGINT        AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36)   NOT NULL,
  endpoint   TEXT          NOT NULL,
  p256dh     TEXT          NOT NULL,
  auth       TEXT          NOT NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_push_user_id (user_id),
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE raid_contents (
  id         BIGINT       AUTO_INCREMENT PRIMARY KEY,
  raid_type  INT          NOT NULL,
  text         TEXT         NOT NULL,
  answer       TEXT         NULL,
  active       TINYINT(1)   NOT NULL DEFAULT 1,
  report_count INT          NOT NULL DEFAULT 0,
  created_by   VARCHAR(36)  NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_raid_contents_type (raid_type, active)
);

CREATE TABLE user_titles (
  id         BIGINT       AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  title_id   INT          NOT NULL,
  obtained_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_titles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_title UNIQUE (user_id, title_id),
  INDEX idx_user_titles_user_id (user_id)
);

CREATE TABLE user_characters (
  id           BIGINT       AUTO_INCREMENT PRIMARY KEY,
  user_id      VARCHAR(36)  NOT NULL,
  character_id INT          NOT NULL,
  obtained_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_characters_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_character UNIQUE (user_id, character_id),
  INDEX idx_user_characters_user_id (user_id)
);

CREATE TABLE email_verification_codes (
  id         BIGINT        AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(190)  NOT NULL,
  code       CHAR(6)       NOT NULL,
  purpose    ENUM('SIGNUP','RESET_PASSWORD') NOT NULL,
  expires_at DATETIME      NOT NULL,
  used_at    DATETIME      NULL,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_purpose (email, purpose)
);

CREATE TABLE password_change_history (
  id         BIGINT       AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL UNIQUE,
  changed_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pwhistory_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS arena_decks (
  user_id    VARCHAR(36)  NOT NULL,
  deck_type  VARCHAR(10)  NOT NULL,
  slots      JSON         NOT NULL,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, deck_type),
  CONSTRAINT fk_arena_decks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 가챠/알까기 확률·천장 설정 (싱글턴, id는 항상 1) — 관리자 페이지에서 편집
CREATE TABLE IF NOT EXISTS gacha_config (
  id                       INT      NOT NULL PRIMARY KEY DEFAULT 1,
  gacha_rates              JSON     NOT NULL,
  normal_egg_rates         JSON     NOT NULL,
  big_egg_rates            JSON     NOT NULL,
  golden_egg_rates         JSON     NOT NULL,
  pity_rare_threshold      INT      NOT NULL DEFAULT 9,
  pity_legendary_threshold INT      NOT NULL DEFAULT 79,
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
