import {
  type AdvanceCodingWorkflowInput,
  type CodingWorkflowRun,
  type CodingWorkflowStep,
  createCodingWorkflowRunId,
  type StartCodingWorkflowInput,
} from "@openbot/contracts/project";
import type { DevelopmentTaskStore } from "./development-task-store";

export class CodingWorkflowError extends Error {}

const DEFAULT_MAX_REVIEW_ITERATIONS = 3;

const NEXT_STEP: Record<CodingWorkflowStep, CodingWorkflowStep | null> = {
  plan: "worktree",
  worktree: "implement",
  implement: "test",
  test: "review",
  review: "approval",
  approval: null,
};

export class CodingWorkflowStore {
  private readonly runs = new Map<string, CodingWorkflowRun>();

  constructor(private readonly tasks: DevelopmentTaskStore) {}

  startRun(input: StartCodingWorkflowInput, now = new Date().toISOString()): CodingWorkflowRun {
    const task = this.tasks.requireTask(input.taskId);
    if (!task.repositoryId) {
      throw new CodingWorkflowError("Task must belong to a repository before starting a coding workflow.");
    }
    const maxReviewIterations = input.maxReviewIterations ?? DEFAULT_MAX_REVIEW_ITERATIONS;
    const run: CodingWorkflowRun = {
      id: createCodingWorkflowRunId(),
      taskId: task.id,
      projectId: task.projectId,
      repositoryId: task.repositoryId,
      worktreeId: task.worktreeId,
      currentStep: "plan",
      status: "running",
      reviewIteration: 0,
      maxReviewIterations,
      logs: [`[${now}] Started workflow at step plan for repository ${task.repositoryId}`],
      failureReason: null,
      createdAt: now,
      updatedAt: now,
    };
    this.runs.set(run.id, run);
    this.tasks.updateTask({ taskId: task.id, status: "planning" }, now);
    return structuredClone(run);
  }

  listRunsForProject(projectId: string): CodingWorkflowRun[] {
    return [...this.runs.values()].filter((run) => run.projectId === projectId).map((run) => structuredClone(run));
  }

  advanceRun(input: AdvanceCodingWorkflowInput, now = new Date().toISOString()): CodingWorkflowRun {
    const current = this.runs.get(input.runId);
    if (!current) throw new CodingWorkflowError("Coding workflow run not found.");
    if (current.status === "completed" || current.status === "failed" || current.status === "cancelled") {
      throw new CodingWorkflowError(`Cannot advance a ${current.status} workflow run.`);
    }

    const logs = [...current.logs];
    if (input.note) logs.push(`[${now}] ${current.currentStep}: ${input.note}`);

    if (current.currentStep === "test" && input.testsPassed === false) {
      const failed: CodingWorkflowRun = {
        ...current,
        status: "failed",
        failureReason: input.note ?? "Tests failed.",
        logs: [...logs, `[${now}] Tests failed. Blocking task.`],
        updatedAt: now,
      };
      this.runs.set(failed.id, failed);
      this.tasks.updateTask({ taskId: failed.taskId, status: "blocked", blockerReason: failed.failureReason }, now);
      return structuredClone(failed);
    }

    if (current.currentStep === "review" && input.reviewPassed === false) {
      const nextIteration = current.reviewIteration + 1;
      if (nextIteration >= current.maxReviewIterations) {
        const failed: CodingWorkflowRun = {
          ...current,
          reviewIteration: nextIteration,
          status: "failed",
          failureReason: "Maximum review iterations reached.",
          logs: [...logs, `[${now}] Review loop limit (${current.maxReviewIterations}) reached.`],
          updatedAt: now,
        };
        this.runs.set(failed.id, failed);
        this.tasks.updateTask({ taskId: failed.taskId, status: "changes-requested" }, now);
        return structuredClone(failed);
      }
      const looped: CodingWorkflowRun = {
        ...current,
        currentStep: "implement",
        status: "running",
        reviewIteration: nextIteration,
        logs: [
          ...logs,
          `[${now}] Review requested changes (iteration ${nextIteration}/${current.maxReviewIterations}).`,
        ],
        updatedAt: now,
      };
      this.runs.set(looped.id, looped);
      this.tasks.updateTask({ taskId: looped.taskId, status: "changes-requested" }, now);
      return structuredClone(looped);
    }

    if (current.currentStep === "approval") {
      if (input.approved === false) {
        const rejected: CodingWorkflowRun = {
          ...current,
          status: "failed",
          failureReason: input.note ?? "Human approval rejected.",
          logs: [...logs, `[${now}] Protected action rejected by human.`],
          updatedAt: now,
        };
        this.runs.set(rejected.id, rejected);
        this.tasks.updateTask(
          { taskId: rejected.taskId, status: "blocked", blockerReason: rejected.failureReason },
          now,
        );
        return structuredClone(rejected);
      }
      if (input.approved === true) {
        const completed: CodingWorkflowRun = {
          ...current,
          status: "completed",
          logs: [...logs, `[${now}] Approved and completed.`],
          updatedAt: now,
        };
        this.runs.set(completed.id, completed);
        this.tasks.updateTask({ taskId: completed.taskId, status: "ready-to-merge" }, now);
        return structuredClone(completed);
      }
      return structuredClone(current);
    }

    const nextStep = NEXT_STEP[current.currentStep];
    if (!nextStep) return structuredClone(current);

    const nextStatus = nextStep === "approval" ? "awaiting-approval" : "running";
    const updated: CodingWorkflowRun = {
      ...current,
      currentStep: nextStep,
      status: nextStatus,
      logs: [...logs, `[${now}] Moved to step ${nextStep}.`],
      updatedAt: now,
    };
    this.runs.set(updated.id, updated);
    if (nextStep === "implement") this.tasks.updateTask({ taskId: updated.taskId, status: "in-progress" }, now);
    if (nextStep === "test") this.tasks.updateTask({ taskId: updated.taskId, status: "testing" }, now);
    if (nextStep === "review") this.tasks.updateTask({ taskId: updated.taskId, status: "in-review" }, now);
    return structuredClone(updated);
  }

  cancelRun(runId: string, now = new Date().toISOString()): CodingWorkflowRun {
    const current = this.runs.get(runId);
    if (!current) throw new CodingWorkflowError("Coding workflow run not found.");
    const cancelled: CodingWorkflowRun = {
      ...current,
      status: "cancelled",
      logs: [...current.logs, `[${now}] Cancelled.`],
      updatedAt: now,
    };
    this.runs.set(cancelled.id, cancelled);
    return structuredClone(cancelled);
  }
}
