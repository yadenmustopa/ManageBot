import {
  type CreateDevelopmentTaskInput,
  type DevelopmentTaskDependencyInput,
  type DevelopmentTaskIdInput,
  type ProjectIdInput,
  parseCreateDevelopmentTaskInput,
  parseDevelopmentTaskDependencyInput,
  parseDevelopmentTaskIdInput,
  parseProjectIdInput,
  parseUpdateDevelopmentTaskInput,
  type UpdateDevelopmentTaskInput,
} from "@openbot/contracts/project";
import { sourceText } from "@openbot/i18n/source";
import type { DevelopmentTaskStore } from "../../backend/project/development-task-store";
import { type IpcGroupHandlers, payloadHandler } from "./define-ipc-group";

function validInput<T>(parse: (input: unknown) => T | null) {
  return (input: unknown): T => {
    const parsed = parse(input);
    if (!parsed) throw new Error(sourceText("error.billing.invalidRequest"));
    return parsed;
  };
}

export interface DevelopmentTaskIpcDependencies {
  developmentTasks: DevelopmentTaskStore;
}

export function developmentTaskIpcHandlers({
  developmentTasks,
}: DevelopmentTaskIpcDependencies): Pick<IpcGroupHandlers, "developmentTasks"> {
  return {
    developmentTasks: {
      create: payloadHandler(validInput(parseCreateDevelopmentTaskInput), (input: CreateDevelopmentTaskInput) =>
        developmentTasks.createTask(input),
      ),
      listForProject: payloadHandler(validInput(parseProjectIdInput), ({ projectId }: ProjectIdInput) =>
        developmentTasks.listTasksForProject(projectId),
      ),
      get: payloadHandler(validInput(parseDevelopmentTaskIdInput), ({ taskId }: DevelopmentTaskIdInput) =>
        developmentTasks.getTask(taskId),
      ),
      update: payloadHandler(validInput(parseUpdateDevelopmentTaskInput), (input: UpdateDevelopmentTaskInput) =>
        developmentTasks.updateTask(input),
      ),
      archive: payloadHandler(validInput(parseDevelopmentTaskIdInput), ({ taskId }: DevelopmentTaskIdInput) =>
        developmentTasks.archiveTask(taskId),
      ),
      addDependency: payloadHandler(
        validInput(parseDevelopmentTaskDependencyInput),
        ({ taskId, dependsOnTaskId }: DevelopmentTaskDependencyInput) =>
          developmentTasks.addDependency(taskId, dependsOnTaskId),
      ),
      removeDependency: payloadHandler(
        validInput(parseDevelopmentTaskDependencyInput),
        ({ taskId, dependsOnTaskId }: DevelopmentTaskDependencyInput) =>
          developmentTasks.removeDependency(taskId, dependsOnTaskId),
      ),
      listDependencies: payloadHandler(validInput(parseDevelopmentTaskIdInput), ({ taskId }: DevelopmentTaskIdInput) =>
        developmentTasks.listDependencies(taskId),
      ),
    },
  };
}
