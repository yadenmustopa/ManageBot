import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runCauseEffect } from "../effect-boundary";
import { OpenBotDatabase } from "../openbot-database";
import { ProjectChannelStore } from "./project-channel-store";
import { ProjectStore } from "./project-store";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("ProjectChannelStore", () => {
  it("attaches, sets default, and detaches channels for a project", async () => {
    const root = await mkdtemp(join(tmpdir(), "openbot-project-channels-"));
    roots.push(root);
    const database = new OpenBotDatabase(root);
    await runCauseEffect(database.initialize());
    const projects = new ProjectStore(database);
    const projectChannels = new ProjectChannelStore(database);
    const workspace = projects.ensureDefaultWorkspace();
    const project = projects.createProject({ workspaceId: workspace.id, name: "Channel Project" });

    database.connection
      .prepare("INSERT INTO projection_channels (channel_id, channel_json) VALUES (?, ?)")
      .run("ch-1", JSON.stringify({ id: "ch-1", name: "general" }));
    database.connection
      .prepare("INSERT INTO projection_channels (channel_id, channel_json) VALUES (?, ?)")
      .run("ch-2", JSON.stringify({ id: "ch-2", name: "dev" }));

    const afterFirst = projectChannels.attachChannel(project.id, "ch-1");
    expect(afterFirst).toHaveLength(1);
    expect(afterFirst[0]?.isDefault).toBe(true);

    const afterSecond = projectChannels.attachChannel(project.id, "ch-2");
    expect(afterSecond).toHaveLength(2);
    expect(afterSecond.find((c) => c.channelId === "ch-2")?.isDefault).toBe(false);

    const afterDefault = projectChannels.setDefaultChannel(project.id, "ch-2");
    expect(afterDefault.find((c) => c.channelId === "ch-2")?.isDefault).toBe(true);
    expect(afterDefault.find((c) => c.channelId === "ch-1")?.isDefault).toBe(false);

    const afterDetach = projectChannels.detachChannel(project.id, "ch-2");
    expect(afterDetach).toHaveLength(1);
    expect(afterDetach[0]?.channelId).toBe("ch-1");
    expect(afterDetach[0]?.isDefault).toBe(true);
  });
});
