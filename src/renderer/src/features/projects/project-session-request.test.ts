import { describe, expect, it } from "vitest";
import { consumePendingRepositorySession, requestRepositorySession } from "./project-session-request";

// No `createRoot` here: the module's signal has no owner (it is a module-level singleton, like
// `projectsOpen` in `project-context.tsx`), and in real use both functions are always called from
// an event handler (a click), never from inside a synchronous computation — so there is nothing to
// dispose and wrapping these calls in a root would only trigger Solid's `REACTIVE_WRITE_IN_OWNED_SCOPE`
// diagnostic for an ownership relationship this module doesn't actually have.
describe("project-session-request", () => {
  it("returns null when nothing was requested", () => {
    expect(consumePendingRepositorySession()).toBeNull();
  });

  it("returns the requested repository exactly once, then null again", () => {
    requestRepositorySession("project-1", "repository-1");
    expect(consumePendingRepositorySession()).toEqual({ projectId: "project-1", repositoryId: "repository-1" });
    expect(consumePendingRepositorySession()).toBeNull();
  });

  it("a later request replaces an unconsumed earlier one", () => {
    requestRepositorySession("project-1", "repository-1");
    requestRepositorySession("project-2", "repository-2");
    expect(consumePendingRepositorySession()).toEqual({ projectId: "project-2", repositoryId: "repository-2" });
  });
});
