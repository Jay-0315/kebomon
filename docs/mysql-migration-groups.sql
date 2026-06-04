ALTER TABLE user_rewards
  ADD COLUMN legendary_pity_count INT NOT NULL DEFAULT 0 AFTER gacha_pity_count;

ALTER TABLE user_rewards
  ADD COLUMN total_points_used INT NOT NULL DEFAULT 0 AFTER legendary_pity_count;

ALTER TABLE expenses
  ADD COLUMN group_id VARCHAR(36) NULL AFTER group_name,
  ADD INDEX idx_expenses_group_id (group_id);

CREATE TABLE groups (
  id              VARCHAR(36)  PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  invite_code     VARCHAR(8)   NOT NULL,
  host_user_id    VARCHAR(36)  NOT NULL,
  is_public       TINYINT(1)   NOT NULL DEFAULT 0,
  code_expires_at DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_groups_invite_code UNIQUE (invite_code),
  INDEX idx_groups_host_user_id (host_user_id),
  CONSTRAINT fk_groups_host FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE group_members (
  id        BIGINT      AUTO_INCREMENT PRIMARY KEY,
  group_id  VARCHAR(36) NOT NULL,
  user_id   VARCHAR(36) NOT NULL,
  joined_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_group_members UNIQUE (group_id, user_id),
  INDEX idx_group_members_group_id (group_id),
  INDEX idx_group_members_user_id (user_id),
  CONSTRAINT fk_group_members_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_group_members_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

CREATE TABLE group_join_requests (
  id         BIGINT      AUTO_INCREMENT PRIMARY KEY,
  group_id   VARCHAR(36) NOT NULL,
  user_id    VARCHAR(36) NOT NULL,
  status     ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_group_join_requests_group_id (group_id),
  INDEX idx_group_join_requests_user_id (user_id),
  CONSTRAINT fk_join_requests_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_join_requests_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL;
