import type { OpenBotMigration } from "./migration";

const PROJECT_CHANNELS_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS project_channels (
    project_id TEXT NOT NULL REFERENCES projection_projects(project_id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL REFERENCES projection_channels(channel_id) ON DELETE CASCADE,
    is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0, 1)),
    created_at TEXT NOT NULL,
    PRIMARY KEY (project_id, channel_id)
  );
  CREATE INDEX IF NOT EXISTS project_channels_channel ON project_channels(channel_id);
`;

export const PROJECT_CHANNELS_TABLES_AFTER_MIGRATION: Record<string, never[]> = {
  project_channels: [],
};

export const migration: OpenBotMigration = {
  version: 75,
  name: "project-channels",
  up: (db) => db.exec(PROJECT_CHANNELS_SCHEMA_SQL),
};
