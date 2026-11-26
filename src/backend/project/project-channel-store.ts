import type { ProjectChannelLink } from "@openbot/contracts/project";
import { databaseRows, requiredNumberColumn, requiredStringColumn } from "../database/database-rows";
import { withTransaction } from "../database/sqlite-transaction";
import type { OpenBotDatabase } from "../openbot-database";

export class ProjectChannelStore {
  constructor(private readonly database: OpenBotDatabase) {}

  listChannelsForProject(projectId: string): ProjectChannelLink[] {
    return databaseRows(
      this.database.connection
        .prepare(
          `SELECT project_id, channel_id, is_default, created_at
           FROM project_channels
           WHERE project_id = ?
           ORDER BY is_default DESC, created_at ASC`,
        )
        .all(projectId),
    ).map((row) => ({
      projectId: requiredStringColumn(row, "project_id"),
      channelId: requiredStringColumn(row, "channel_id"),
      isDefault: requiredNumberColumn(row, "is_default") === 1,
      createdAt: requiredStringColumn(row, "created_at"),
    }));
  }

  attachChannel(
    projectId: string,
    channelId: string,
    isDefault = false,
    now = new Date().toISOString(),
  ): ProjectChannelLink[] {
    const db = this.database.connection;
    withTransaction(db, () => {
      const existing = this.listChannelsForProject(projectId);
      const shouldBeDefault = isDefault || existing.length === 0;
      if (shouldBeDefault) {
        db.prepare("UPDATE project_channels SET is_default = 0 WHERE project_id = ?").run(projectId);
      }
      db.prepare(
        `INSERT INTO project_channels (project_id, channel_id, is_default, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(project_id, channel_id) DO UPDATE SET is_default = CASE
           WHEN excluded.is_default = 1 THEN 1
           ELSE project_channels.is_default
         END`,
      ).run(projectId, channelId, shouldBeDefault ? 1 : 0, now);
    });
    return this.listChannelsForProject(projectId);
  }

  detachChannel(projectId: string, channelId: string): ProjectChannelLink[] {
    const db = this.database.connection;
    withTransaction(db, () => {
      db.prepare("DELETE FROM project_channels WHERE project_id = ? AND channel_id = ?").run(projectId, channelId);
      const remaining = this.listChannelsForProject(projectId);
      if (remaining.length > 0 && !remaining.some((link) => link.isDefault)) {
        const first = remaining[0];
        if (first) {
          db.prepare("UPDATE project_channels SET is_default = 1 WHERE project_id = ? AND channel_id = ?").run(
            projectId,
            first.channelId,
          );
        }
      }
    });
    return this.listChannelsForProject(projectId);
  }

  setDefaultChannel(projectId: string, channelId: string): ProjectChannelLink[] {
    const db = this.database.connection;
    withTransaction(db, () => {
      db.prepare("UPDATE project_channels SET is_default = 0 WHERE project_id = ?").run(projectId);
      db.prepare("UPDATE project_channels SET is_default = 1 WHERE project_id = ? AND channel_id = ?").run(
        projectId,
        channelId,
      );
    });
    return this.listChannelsForProject(projectId);
  }
}
