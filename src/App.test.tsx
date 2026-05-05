import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as predictor from "./domain/predictor";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  it("states that the current dataset only supports SJSU", () => {
    render(<App />);

    expect(screen.getByText(/Currently supports San Jose State University \(SJSU\) only\./)).toBeInTheDocument();
  });

  it("shows likely instructors and evidence for CS 146", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Subject"));
    await user.type(screen.getByLabelText("Subject"), "CS");
    await user.clear(screen.getByLabelText("Course number"));
    await user.type(screen.getByLabelText("Course number"), "146");
    await user.click(screen.getByRole("button", { name: "Find likely instructors" }));

    expect(screen.getByText("David Taylor")).toBeInTheDocument();
    expect(screen.getAllByText("High confidence").length).toBeGreaterThan(0);
    expect(screen.getByText("Ben Poon")).toBeInTheDocument();
    expect(screen.getByText("Spring 2026: CS 146 section 02, in-person, MW 09:00-10:15")).toBeInTheDocument();
    expect(screen.getAllByText(/Spring 2026/).length).toBeGreaterThan(0);
  });

  it("uses schedule-derived facts without exposing unfinished grade or review features", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Find likely instructors" }));

    expect(screen.getAllByText("Schedule-derived").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Imported SJSU instructor record").length).toBeGreaterThan(0);
    expect(screen.queryByText("Student Reviews")).not.toBeInTheDocument();
    expect(screen.queryByText("Grade Distribution")).not.toBeInTheDocument();
    expect(screen.queryByText(/reviews\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/would take again/)).not.toBeInTheDocument();
  });

  it("shows validation messages when required fields are blank", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Subject"));
    await user.clear(screen.getByLabelText("Course number"));
    await user.click(screen.getByRole("button", { name: "Find likely instructors" }));

    expect(screen.getByText("Enter a subject, such as CS.")).toBeInTheDocument();
    expect(screen.getByText("Enter a course number, such as 146.")).toBeInTheDocument();
  });

  it("shows an explicit empty state for an unknown course", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Subject"));
    await user.type(screen.getByLabelText("Subject"), "MATH");
    await user.clear(screen.getByLabelText("Course number"));
    await user.type(screen.getByLabelText("Course number"), "999");
    await user.click(screen.getByRole("button", { name: "Find likely instructors" }));

    expect(screen.getByText("MATH 999 is not available in the current dataset.")).toBeInTheDocument();
  });

  it("shows an explicit prediction error and clears stale results", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Find likely instructors" }));
    expect(screen.getByText("David Taylor")).toBeInTheDocument();

    vi.spyOn(predictor, "predictInstructors").mockImplementationOnce(() => {
      throw new Error("Target term sjsu-2026-fall is not available in the dataset.");
    });

    await user.click(screen.getByRole("button", { name: "Find likely instructors" }));

    expect(
      screen.getByText("We could not generate a prediction right now. Please try again later."),
    ).toBeInTheDocument();
    expect(screen.queryByText("David Taylor")).not.toBeInTheDocument();
  });

  it("searches from the global search box and opens an instructor profile", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Global search"), "David Taylor");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("heading", { name: "Instructor Profile: David Taylor" })).toBeInTheDocument();
    expect(screen.getByText("Historical teaching evidence")).toBeInTheDocument();
    expect(screen.getByText("Coming soon. Student reviews are not available from the imported SJSU class schedules.")).toBeInTheDocument();
    expect(screen.getByText("Coming soon. Grade distribution data is not imported yet.")).toBeInTheDocument();
  });

  it("applies filters and clears them without hiding explicit errors", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Find likely instructors" }));
    expect(screen.getByText("David Taylor")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Minimum schedule confidence"));
    await user.type(screen.getByLabelText("Minimum schedule confidence"), "99");
    await user.click(screen.getByRole("button", { name: "Apply Filters" }));

    expect(screen.getByText(/No instructors match the active filters/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear all filters" }));

    expect(screen.getByText("David Taylor")).toBeInTheDocument();
  });

  it("sorts results and switches between list and grid result layouts", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Find likely instructors" }));
    await user.selectOptions(screen.getByLabelText("Sort by"), "scheduleFit");

    const cards = screen.getAllByRole("article");
    expect(cards[0]).toHaveTextContent(/Schedule Fit/);

    await user.click(screen.getByRole("button", { name: "Grid view" }));
    expect(screen.getByRole("button", { name: "Grid view" })).toHaveClass("cif-view-btn--active");

    await user.click(screen.getByRole("button", { name: "List view" }));
    expect(screen.getByRole("button", { name: "List view" })).toHaveClass("cif-view-btn--active");
  });

  it("opens section detail and match score explanations", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Find likely instructors" }));
    await user.click(screen.getAllByRole("button", { name: /View all sections/ })[0]);

    expect(screen.getByRole("heading", { name: /Sections for/ })).toBeInTheDocument();
    expect(screen.getByText("Meeting pattern")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    await user.click(screen.getByRole("button", { name: /How is this calculated/ }));

    expect(screen.getByRole("heading", { name: "Match Score" })).toBeInTheDocument();
    expect(screen.getByText("Same course")).toBeInTheDocument();
  });

  it("does not expose dead account, saved, or directory navigation", () => {
    render(<App />);

    expect(screen.queryByRole("button", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Courses" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instructors" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Saved" })).not.toBeInTheDocument();
    expect(screen.queryByText("SJSU Student")).not.toBeInTheDocument();
  });
});
