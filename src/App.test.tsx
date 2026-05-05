import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as predictor from "./domain/predictor";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
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
});
