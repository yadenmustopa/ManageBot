import type { OpenBotDevelopmentTask } from "@openbot/contracts/project";
import type { DevelopmentTaskStore } from "./development-task-store";

export interface CrossRepoSummary {
  parentTask: OpenBotDevelopmentTask;
  subtasks: OpenBotDevelopmentTask[];
  completedCount: number;
  blockedCount: number;
  mergeOrder: string[];
  allSubtasksDone: boolean;
}

function topologicalMergeOrder(tasks: DevelopmentTaskStore, subtasks: OpenBotDevelopmentTask[]): string[] {
  const byId = new Map(subtasks.map((task) => [task.id, task]));
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(taskId: string) {
    if (visited.has(taskId)) return;
    visited.add(taskId);
    for (const depId of tasks.listDependencies(taskId)) {
      if (byId.has(depId)) visit(depId);
    }
    order.push(taskId);
  }

  for (const task of subtasks) {
    visit(task.id);
  }
  return order;
}

export function summarizeCrossRepoTask(tasks: DevelopmentTaskStore, parentTaskId: string): CrossRepoSummary {
  const parentTask = tasks.requireTask(parentTaskId);
  const subtasks = tasks
    .listTasksForProject(parentTask.projectId)
    .filter((task) => task.parentTaskId === parentTask.id);
  const completedCount = subtasks.filter((task) => task.status === "done" || task.status === "ready-to-merge").length;
  const blockedCount = subtasks.filter((task) => task.status === "blocked").length;
  const mergeOrder = topologicalMergeOrder(tasks, subtasks);
  return {
    parentTask,
    subtasks,
    completedCount,
    blockedCount,
    mergeOrder,
    allSubtasksDone: subtasks.length > 0 && completedCount === subtasks.length,
  };
}
