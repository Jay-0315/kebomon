-- 2026-05-26일자 버전기준

ALTER TABLE users
  ADD COLUMN profile_photo LONGTEXT NULL;

ALTER TABLE user_rewards
  ADD COLUMN legendary_pity_count INT NOT NULL DEFAULT 0 AFTER gacha_pity_count;


CREATE TABLE post_likes (
  id         BIGINT      AUTO_INCREMENT PRIMARY KEY,
  post_id    VARCHAR(36) NOT NULL,
  user_id    VARCHAR(36) NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_post_likes UNIQUE (post_id, user_id),
  INDEX idx_post_likes_post_id (post_id),
  INDEX idx_post_likes_user_id (user_id),
  CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id)         ON DELETE CASCADE
);

-- 2026-05-27: 설정 themeColor/language 추가
ALTER TABLE app_settings
  ADD COLUMN theme_color VARCHAR(20) NOT NULL DEFAULT 'emerald' AFTER auto_backup,
  ADD COLUMN language    VARCHAR(5)  NOT NULL DEFAULT 'ko'      AFTER theme_color;

-- 2026-05-28: 출석 로그인 기준 처리용 last_login_at 추가
ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL;

-- 2026-06-01: 비밀번호 보유 여부 컬럼 추가
ALTER TABLE users ADD COLUMN has_password TINYINT(1) NOT NULL DEFAULT 0;
-- 기존 password_hash 가진 유저를 has_password=1로 업데이트
UPDATE users SET has_password = 1 WHERE password_hash IS NOT NULL;

-- 2026-06-01: 비밀번호 변경 이력 테이블 추가
CREATE TABLE password_change_history (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(36) NOT NULL UNIQUE,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pwhistory_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2026-06-01: 이메일 인증번호 테이블 추가
CREATE TABLE email_verification_codes (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(190) NOT NULL,
  code       CHAR(6) NOT NULL,
  purpose    ENUM('SIGNUP', 'RESET_PASSWORD') NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_purpose (email, purpose)
);
