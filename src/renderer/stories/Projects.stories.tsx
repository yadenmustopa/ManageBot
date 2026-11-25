import { onCleanup } from "solid-js";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { ProjectsPage } from "../src/features/projects/ProjectsPage";
import { ProjectsProvider } from "../src/features/projects/project-context";
import { PlatformProvider } from "../src/platform";
import { createMockOpenBot } from "./mock-openbot";

function ProjectsStory() {
  const previousApi = window.openbot;
  const mock = createMockOpenBot({});
  window.openbot = mock.api;
  onCleanup(() => {
    mock.dispose();
    window.openbot = previousApi;
  });
  return (
    <PlatformProvider>
      <div style={{ height: "100vh" }}>
        <ProjectsProvider>
          <ProjectsPage onBack={() => {}} />
        </ProjectsProvider>
      </div>
    </PlatformProvider>
  );
}

const meta = {
  title: "Projects/Projects page",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <ProjectsStory /> };
