import { PageHeader } from "@openbot/ui/features/window/PageHeader";
import { useText } from "@openbot/ui/text";
import { createPageHeaderFrame } from "../window/page-header-frame";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { CreateWorktreeDialog } from "./CreateWorktreeDialog";
import { ImportRepositoryDialog } from "./ImportRepositoryDialog";
import { ProjectDashboard } from "./ProjectDashboard";
import { ProjectSidebar } from "./ProjectSidebar";
import { RemoveWorktreeDialog } from "./RemoveWorktreeDialog";

export function ProjectsPage(props: { onBack: () => void }) {
  const { t } = useText();
  const frame = createPageHeaderFrame();

  return (
    <div class="project-window-page">
      <PageHeader title={t("project.page.label")} onBack={props.onBack} frame={frame()} />
      <div class="project-page-body">
        <ProjectSidebar />
        <ProjectDashboard />
      </div>
      <CreateProjectDialog />
      <ImportRepositoryDialog />
      <CreateWorktreeDialog />
      <RemoveWorktreeDialog />
      <CreateTaskDialog />
    </div>
  );
}
