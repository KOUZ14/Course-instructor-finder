import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("shows likely instructors and evidence for CS 146", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Subject"));
    await user.type(screen.getByLabelText("Subject"), "CS");
    await user.clear(screen.getByLabelText("Course number"));
    await user.type(screen.getByLabelText("Course number"), "146");
    await user.click(screen.getByRole("button", { name: "Find likely instructors" }));

    expect(screen.getByText("Taylor Nguyen")).toBeInTheDocument();
    expect(screen.getByText("High confidence")).toBeInTheDocument();
    expect(screen.getByText("Rivera Patel")).toBeInTheDocument();
    expect(screen.getByText("Fall 2025: CS 146 section 02, online, T 18:00-20:45")).toBeInTheDocument();
    expect(screen.getAllByText(/Fall 2025/)).toHaveLength(2);
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
});
