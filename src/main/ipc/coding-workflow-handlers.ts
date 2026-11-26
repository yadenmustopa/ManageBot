import {
  type AdvanceCodingWorkflowInput,
  type CodingWorkflowRunIdInput,
  type ProjectIdInput,
  parseAdvanceCodingWorkflowInput,
  parseCodingWorkflowRunIdInput,
  parseProjectIdInput,
  parseStartCodingWorkflowInput,
  type StartCodingWorkflowInput,
} from "@openbot/contracts/project";
import { sourceText } from "@openbot/i18n/source";
import type { CodingWorkflowStore } from "../../backend/project/coding-workflow-store";
import { type IpcGroupHandlers, payloadHandler } from "./define-ipc-group";

function validInput<T>(parse: (input: unknown) => T | null) {
  return (input: unknown): T => {
    const parsed = parse(input);
    if (!parsed) throw new Error(sourceText("error.billing.invalidRequest"));
    return parsed;
  };
}

export interface CodingWorkflowIpcDependencies {
  codingWorkflows: CodingWorkflowStore;
}

export function codingWorkflowIpcHandlers({
  codingWorkflows,
}: CodingWorkflowIpcDependencies): Pick<IpcGroupHandlers, "codingWorkflows"> {
  return {
    codingWorkflows: {
      start: payloadHandler(validInput(parseStartCodingWorkflowInput), (input: StartCodingWorkflowInput) =>
        codingWorkflows.startRun(input),
      ),
      listForProject: payloadHandler(validInput(parseProjectIdInput), ({ projectId }: ProjectIdInput) =>
        codingWorkflows.listRunsForProject(projectId),
      ),
      advance: payloadHandler(validInput(parseAdvanceCodingWorkflowInput), (input: AdvanceCodingWorkflowInput) =>
        codingWorkflows.advanceRun(input),
      ),
      cancel: payloadHandler(validInput(parseCodingWorkflowRunIdInput), ({ runId }: CodingWorkflowRunIdInput) =>
        codingWorkflows.cancelRun(runId),
      ),
    },
  };
}
