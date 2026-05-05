import { describe, expect, it } from "vitest";
import { buildSjsuDatasetFromHtmlFiles } from "./dataset";

describe("buildSjsuDatasetFromHtmlFiles", () => {
  it("combines multiple term HTML files into one validated course dataset", () => {
    const dataset = buildSjsuDatasetFromHtmlFiles([
      {
        filePath: "fall-2025.html",
        html: scheduleHtml({
          classNumber: "48291",
          section: "CS 146 (Section 01)",
          instructor: "Taylor Nguyen",
        }),
        term: { year: 2025, season: "fall" },
      },
      {
        filePath: "spring-2025.html",
        html: scheduleHtml({
          classNumber: "28291",
          section: "CS 146 (Section 01)",
          instructor: "Morgan Lee",
        }),
        term: { year: 2025, season: "spring" },
      },
    ]);

    expect(dataset.schools).toEqual([
      { id: "sjsu", name: "San Jose State University", sourceAdapter: "sjsu-static-v1" },
    ]);
    expect(dataset.terms.map((term) => term.id)).toEqual(["sjsu-2026-fall", "sjsu-2025-fall", "sjsu-2025-spring"]);
    expect(dataset.courses).toHaveLength(1);
    expect(dataset.sections).toHaveLength(2);
    expect(dataset.instructors.map((instructor) => instructor.displayName).sort()).toEqual([
      "Morgan Lee",
      "Taylor Nguyen",
    ]);
    expect(dataset.teachingAssignments).toHaveLength(2);
  });

  it("keeps Fall 2026 as a target term even when only historical HTML is imported", () => {
    const dataset = buildSjsuDatasetFromHtmlFiles([
      {
        filePath: "spring-2026.html",
        html: scheduleHtml({
          classNumber: "28291",
          section: "CS 146 (Section 01)",
          instructor: "Morgan Lee",
        }),
        term: { year: 2026, season: "spring" },
      },
    ]);

    expect(dataset.terms).toContainEqual({
      id: "sjsu-2026-fall",
      schoolId: "sjsu",
      code: "2268",
      label: "Fall 2026",
      year: 2026,
      season: "fall",
    });
  });

  it("allows course titles to change across imported terms for the same course id", () => {
    const dataset = buildSjsuDatasetFromHtmlFiles([
      {
        filePath: "fall-2025.html",
        html: scheduleHtml({
          classNumber: "48291",
          section: "ADV 123 (Section 01)",
          instructor: "Taylor Nguyen",
          title: "Introduction to Branded Content",
        }),
        term: { year: 2025, season: "fall" },
      },
      {
        filePath: "fall-2024.html",
        html: scheduleHtml({
          classNumber: "38291",
          section: "ADV 123 (Section 01)",
          instructor: "Taylor Nguyen",
          title: "Content Strategy",
        }),
        term: { year: 2024, season: "fall" },
      },
    ]);

    expect(dataset.courses.filter((course) => course.id === "sjsu-adv-123")).toHaveLength(1);
    expect(dataset.sections).toHaveLength(2);
    expect(dataset.teachingAssignments).toHaveLength(2);
  });

  it("allows instructor display names to vary slightly for the same instructor id", () => {
    const dataset = buildSjsuDatasetFromHtmlFiles([
      {
        filePath: "fall-2025.html",
        html: scheduleHtml({
          classNumber: "48291",
          section: "CS 146 (Section 01)",
          instructor: "Ali Guarneros Luna",
        }),
        term: { year: 2025, season: "fall" },
      },
      {
        filePath: "fall-2024.html",
        html: scheduleHtml({
          classNumber: "38291",
          section: "CS 146 (Section 02)",
          instructor: "Ali Guarneros-Luna",
        }),
        term: { year: 2024, season: "fall" },
      },
    ]);

    expect(dataset.instructors.filter((instructor) => instructor.id === "sjsu-instructor-ali-guarneros-luna")).toHaveLength(1);
    expect(dataset.teachingAssignments).toHaveLength(2);
  });

  it("skips imported schedule pages whose class table has no rows", () => {
    const dataset = buildSjsuDatasetFromHtmlFiles([
      {
        filePath: "summer-2020.html",
        html: emptyScheduleHtml(),
        term: { year: 2020, season: "summer" },
      },
    ]);

    expect(dataset.terms.map((term) => term.id)).toEqual(["sjsu-2026-fall", "sjsu-2020-summer"]);
    expect(dataset.courses).toHaveLength(0);
    expect(dataset.sections).toHaveLength(0);
    expect(dataset.teachingAssignments).toHaveLength(0);
  });
});

function scheduleHtml({
  classNumber,
  section,
  instructor,
  title = "Data Structures and Algorithms",
}: {
  classNumber: string;
  section: string;
  instructor: string;
  title?: string;
}): string {
  return `
    <table>
      <thead>
        <tr>
          <th>Section</th>
          <th>Class Number</th>
          <th>Mode of Instruction</th>
          <th>Course Title</th>
          <th>Satisfies</th>
          <th>Units</th>
          <th>Type</th>
          <th>Days</th>
          <th>Times</th>
          <th>Instructor</th>
          <th>Location</th>
          <th>Dates</th>
          <th>Open Seats</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${section}</td>
          <td>${classNumber}</td>
          <td>In Person</td>
          <td>${title}</td>
          <td></td>
          <td>3.0</td>
          <td>LEC</td>
          <td>MW</td>
          <td>09:00AM-10:15AM</td>
          <td>${instructor}</td>
          <td>MacQuarrie Hall</td>
          <td>08/19/25-12/07/25</td>
          <td>37</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  `;
}

function emptyScheduleHtml(): string {
  return `
    <table>
      <thead>
        <tr>
          <th>Section</th>
          <th>Class Number</th>
          <th>Mode of Instruction</th>
          <th>Course Title</th>
          <th>Satisfies</th>
          <th>Units</th>
          <th>Type</th>
          <th>Days</th>
          <th>Times</th>
          <th>Instructor</th>
          <th>Location</th>
          <th>Dates</th>
          <th>Open Seats</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;
}
