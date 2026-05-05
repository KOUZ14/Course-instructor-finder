import { describe, expect, it } from "vitest";
import { loadDataset } from "./loadDataset";

describe("loadDataset", () => {
  it("loads the bundled SJSU sample dataset with universal entities", () => {
    const dataset = loadDataset();

    expect(dataset.schools).toEqual([
      { id: "sjsu", name: "San Jose State University", sourceAdapter: "sjsu-static-v1" },
    ]);
    expect(dataset.courses.some((course) => course.subject === "CS" && course.number === "146")).toBe(true);
    expect(dataset.teachingAssignments.length).toBeGreaterThan(0);
  });
});
