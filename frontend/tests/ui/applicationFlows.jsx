import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/api/client", () => ({
  AUTH_TOKEN_KEY: "applytrack_access_token",
  AUTH_USER_KEY: "applytrack_user",
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
  applicationsApi: {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  getApiErrorMessage: (error, fallback) =>
    error?.response?.data?.message || fallback,
}));

import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  applicationsApi,
} from "../../src/api/client";
import { AuthProvider } from "../../src/auth/AuthContext";
import App from "../../src/App";

function DashboardNavigationControl() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate("/dashboard")}>
      Open dashboard
    </button>
  );
}

function renderApp(
  path,
  { authenticated = true, showNavigationControl = false } = {},
) {
  if (authenticated) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "test-access-token");
    window.localStorage.setItem(
      AUTH_USER_KEY,
      JSON.stringify({ email: "person@example.com" }),
    );
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        {showNavigationControl && <DashboardNavigationControl />}
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function makeApplication(overrides = {}) {
  return {
    id: 1,
    company: "Example Inc",
    position: "Engineer",
    status: "applied",
    location: "Remote",
    url: null,
    applied_on: null,
    notes: null,
    ...overrides,
  };
}

function metricValue(label) {
  return screen
    .getByText(label)
    .parentElement.querySelector("strong").textContent;
}

describe("frontend edge cases", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    applicationsApi.list.mockResolvedValue({ data: { applications: [] } });
    applicationsApi.create.mockResolvedValue({
      data: { application: makeApplication() },
    });
    applicationsApi.get.mockResolvedValue({
      data: { application: makeApplication() },
    });
    applicationsApi.update.mockResolvedValue({
      data: { application: makeApplication() },
    });
    applicationsApi.delete.mockResolvedValue({ data: null });
  });

  it("renders zero-application dashboard statistics and all status categories", async () => {
    renderApp("/dashboard");

    expect(
      await screen.findByText("No applications yet", {}, { timeout: 5000 }),
    ).toBeTruthy();
    expect(metricValue("Total applications")).toBe("0");
    for (const status of [
      "Saved",
      "Applied",
      "Interviewing",
      "Offer",
      "Rejected",
      "Withdrawn",
    ]) {
      expect(screen.getByText(status)).toBeTruthy();
    }
  });

  it("shows a clear empty state when search returns no results", async () => {
    const user = userEvent.setup();
    applicationsApi.list.mockResolvedValue({
      data: { applications: [makeApplication()] },
    });
    renderApp("/dashboard/applications");

    await screen.findByRole("link", {
      name: "View Example Inc Engineer details",
    });
    await user.type(screen.getByRole("searchbox"), "no such company");

    expect(
      await screen.findByText("No matching applications"),
    ).toBeTruthy();
    expect(
      screen.getByText("Try changing your search or status filter."),
    ).toBeTruthy();
  });

  it("applies search and status filters together", async () => {
    const user = userEvent.setup();
    applicationsApi.list.mockResolvedValue({
      data: {
        applications: [
          makeApplication({
            id: 1,
            company: "Acme",
            location: "Remote",
            status: "applied",
          }),
          makeApplication({
            id: 2,
            company: "Beta",
            location: "Bengaluru",
            status: "withdrawn",
          }),
          makeApplication({
            id: 3,
            company: "Gamma",
            location: "Bengaluru",
            status: "interviewing",
          }),
        ],
      },
    });
    renderApp("/dashboard/applications");

    await screen.findByRole("link", { name: "View Gamma Engineer details" });
    await user.type(screen.getByRole("searchbox"), "bengaluru");
    await user.selectOptions(
      screen.getByLabelText("Filter by status"),
      "interviewing",
    );

    expect(
      screen.getByRole("link", { name: "View Gamma Engineer details" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: "View Beta Engineer details" }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: "View Acme Engineer details" }),
    ).toBeNull();
  });

  it("keeps required application fields empty without submitting", async () => {
    const user = userEvent.setup();
    renderApp("/dashboard/applications/new");

    const company = await screen.findByLabelText("Company");
    const position = screen.getByLabelText("Position");
    expect(company.required).toBe(true);
    expect(position.required).toBe(true);

    await user.click(screen.getByRole("button", { name: "Save application" }));
    expect(applicationsApi.create).not.toHaveBeenCalled();
  });

  it("preserves create form data and allows retry after an API failure", async () => {
    const user = userEvent.setup();
    let createdApplication;
    applicationsApi.get.mockImplementation(async () => ({
      data: { application: createdApplication },
    }));
    applicationsApi.create
      .mockRejectedValueOnce({
        response: {
          data: { message: "Unable to save this application right now." },
        },
      })
      .mockImplementationOnce(async (payload) => {
        createdApplication = makeApplication({ id: 42, ...payload });
        return { data: { application: createdApplication } };
      });
    renderApp("/dashboard/applications/new");

    const company = await screen.findByLabelText("Company");
    const position = screen.getByLabelText("Position");
    await user.type(company, "Northstar Labs");
    await user.type(position, "Product Intern");
    await user.click(screen.getByRole("button", { name: "Save application" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "Unable to save this application right now.",
    );
    expect(company.value).toBe("Northstar Labs");
    expect(position.value).toBe("Product Intern");

    await user.click(screen.getByRole("button", { name: "Save application" }));
    expect(
      await screen.findByRole("heading", { name: "Northstar Labs" }),
    ).toBeTruthy();
    expect(applicationsApi.create).toHaveBeenCalledTimes(2);
  });

  it("preserves application data and allows retry after an update failure", async () => {
    const user = userEvent.setup();
    let persistedApplication = makeApplication({
      id: 42,
      company: "Original Company",
      position: "Product Intern",
      status: "applied",
    });
    applicationsApi.get.mockImplementation(async () => ({
      data: { application: { ...persistedApplication } },
    }));
    applicationsApi.update
      .mockRejectedValueOnce({
        response: {
          data: { message: "Unable to update this application right now." },
        },
      })
      .mockImplementationOnce(async (_id, payload) => {
        persistedApplication = { ...persistedApplication, ...payload };
        return { data: { application: { ...persistedApplication } } };
      });
    renderApp("/dashboard/applications/42/edit");

    const company = await screen.findByLabelText("Company");
    const status = screen.getByLabelText("Status");
    await user.clear(company);
    await user.type(company, "Updated Company");
    await user.selectOptions(status, "interviewing");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "Unable to update this application right now.",
    );
    expect(company.value).toBe("Updated Company");
    expect(status.value).toBe("interviewing");
    expect(persistedApplication).toMatchObject({
      company: "Original Company",
      status: "applied",
    });

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      await screen.findByRole("heading", { name: "Updated Company" }),
    ).toBeTruthy();
    expect(persistedApplication).toMatchObject({
      company: "Updated Company",
      status: "interviewing",
    });
    expect(applicationsApi.update).toHaveBeenCalledTimes(2);
  });

  it("keeps the application visible and allows retry after a delete failure", async () => {
    const user = userEvent.setup();
    applicationsApi.get.mockResolvedValue({
      data: {
        application: makeApplication({
          id: 42,
          company: "Northstar Labs",
          position: "Product Intern",
        }),
      },
    });
    applicationsApi.delete
      .mockRejectedValueOnce({
        response: {
          data: { message: "Unable to delete this application right now." },
        },
      })
      .mockResolvedValueOnce({ data: null });
    renderApp("/dashboard/applications/42");

    expect(
      await screen.findByRole("heading", { name: "Northstar Labs" }),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    let dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(
      (await screen.findByRole("alert")).textContent,
    ).toContain("Unable to delete this application right now.");
    expect(
      screen.getByRole("heading", { name: "Northstar Labs" }),
    ).toBeTruthy();
    expect(applicationsApi.delete).toHaveBeenCalledTimes(1);

    dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(
      await screen.findByRole("heading", { name: "Applications" }),
    ).toBeTruthy();
    expect(applicationsApi.delete).toHaveBeenCalledTimes(2);
  });

  it("displays an API error after applications fail to load", async () => {
    applicationsApi.list.mockRejectedValue({
      response: { data: { message: "Service unavailable" } },
    });
    renderApp("/dashboard");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Service unavailable");
    expect(screen.queryByText("Loading your applications...")).toBeNull();
  });

  it("shows a loading state until the application request completes", async () => {
    let resolveList;
    applicationsApi.list.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );
    renderApp("/dashboard");

    expect(await screen.findByText("Loading your applications...")).toBeTruthy();
    await act(async () => {
      resolveList({ data: { applications: [] } });
    });
    expect(await screen.findByText("No applications yet")).toBeTruthy();
  });

  it("redirects logged-out users and keeps them out after logout", async () => {
    const user = userEvent.setup();
    renderApp("/dashboard", {
      authenticated: true,
      showNavigationControl: true,
    });

    await screen.findByRole("link", { name: "Applications" });
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(
      await screen.findByRole("heading", { name: "Welcome back" }),
    ).toBeTruthy();
    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Open dashboard" }));
    expect(
      await screen.findByRole("heading", { name: "Welcome back" }),
    ).toBeTruthy();
  });

  it("synchronizes dashboard and application list after create, edit, and delete", async () => {
    const user = userEvent.setup();
    let currentApplication = null;
    applicationsApi.create.mockImplementation(async (payload) => {
      currentApplication = makeApplication({
        id: 42,
        company: payload.company,
        position: payload.position,
        status: payload.status,
        location: payload.location,
        url: payload.url,
        applied_on: payload.applied_on,
        notes: payload.notes,
      });
      return { data: { application: currentApplication } };
    });
    applicationsApi.get.mockImplementation(async () => ({
      data: { application: currentApplication },
    }));
    applicationsApi.update.mockImplementation(async (_id, payload) => {
      currentApplication = { ...currentApplication, ...payload };
      return { data: { application: currentApplication } };
    });
    applicationsApi.delete.mockImplementation(async () => {
      currentApplication = null;
      return { data: null };
    });

    renderApp("/dashboard/applications/new");
    await user.type(await screen.findByLabelText("Company"), "Northstar Labs");
    await user.type(screen.getByLabelText("Position"), "Product Intern");
    await user.click(screen.getByRole("button", { name: "Save application" }));

    expect(
      await screen.findByRole("heading", { name: "Northstar Labs" }),
    ).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Overview" }));
    await screen.findByText("Total applications");
    expect(metricValue("Total applications")).toBe("1");
    expect(metricValue("Active applications")).toBe("0");

    await user.click(screen.getByRole("link", { name: "Applications" }));
    const applicationRow = await screen.findByRole("link", {
      name: "View Northstar Labs Product Intern details",
    });
    await user.click(applicationRow);
    await screen.findByRole("heading", { name: "Northstar Labs" });
    await user.click(screen.getByRole("link", { name: "Edit" }));
    await user.selectOptions(
      await screen.findByLabelText("Status"),
      "interviewing",
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByRole("heading", { name: "Northstar Labs" });

    await user.click(screen.getByRole("link", { name: "Overview" }));
    expect(metricValue("Total applications")).toBe("1");
    expect(metricValue("Active applications")).toBe("1");

    await user.click(screen.getByRole("link", { name: "Applications" }));
    await user.click(
      await screen.findByRole("link", {
        name: "View Northstar Labs Product Intern details",
      }),
    );
    await screen.findByRole("heading", { name: "Northstar Labs" });
    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("No applications yet")).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Overview" }));
    expect(metricValue("Total applications")).toBe("0");
    expect(applicationsApi.update).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ status: "interviewing" }),
    );
    await waitFor(() => expect(applicationsApi.delete).toHaveBeenCalledWith(42));
  });
});
