import { createSignal, onSettled } from "solid-js";
import { createSimpleContext } from "../../simple-context";
import { projectPort } from "./project-port";
import { createProjectsStore } from "./stores/create-projects-store";

// Module-level, like `appSettingsOpen` in settings-context.tsx: Projects is a single app-wide
// overlay, not something nested under a per-server scope (PRD 3.2 "local-first").
const [projectsOpen, setProjectsOpen] = createSignal(false);

const Projects = createSimpleContext({
  name: "Projects",
  init: () => {
    const store = createProjectsStore(projectPort);
    onSettled(() => void store.load());
    return {
      ...store,
      projectsOpen,
      open: () => setProjectsOpen(true),
      close: () => setProjectsOpen(false),
    };
  },
});

export const ProjectsProvider = Projects.provider;
export const useProjects = Projects.use;
