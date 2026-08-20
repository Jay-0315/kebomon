-- Normalize points ledger metadata and add singleton cron execution tracking.
-- Safe to run once on databases that do not already have these columns/table.

ALTER TABLE `points_ledger`
  ADD COLUMN `source` VARCHAR(40) NULL,
  ADD COLUMN `source_id` VARCHAR(120) NULL,
  ADD COLUMN `idempotency_key` VARCHAR(160) NULL;

CREATE INDEX `points_ledger_source_source_id_idx`
  ON `points_ledger` (`source`, `source_id`);

CREATE UNIQUE INDEX `points_ledger_idempotency_key_key`
  ON `points_ledger` (`idempotency_key`);

CREATE TABLE `job_executions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `job_key` VARCHAR(80) NOT NULL,
  `window_key` VARCHAR(80) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finished_at` DATETIME(3) NULL,
  `error_message` VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `job_executions_job_key_window_key_key` (`job_key`, `window_key`),
  INDEX `job_executions_job_key_started_at_idx` (`job_key`, `started_at` DESC)
);
