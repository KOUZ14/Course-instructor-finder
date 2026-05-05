import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeSjsuScheduleRows, parseSjsuScheduleHtml } from "./normalize";

describe("parseSjsuScheduleHtml", () => {
  it("extracts schedule rows from a saved SJSU-like table", () => {
    const fixturePath = join(process.cwd(), "src/importers/sjsu/fixtures/cs-146-schedule.html");
    const html = readFileSync(fixturePath, "utf8");
    const rows = parseSjsuScheduleHtml(html);

    expect(rows).toEqual([
      {
        classNumber: "48291",
        subject: "CS",
        catalogNumber: "146",
        sectionNumber: "01",
        title: "Data Structures and Algorithms",
        component: "Lecture",
        mode: "In Person",
        days: "MW",
        time: "09:00-10:15",
        location: "MacQuarrie Hall",
        instructor: "Taylor Nguyen",
      },
    ]);
  });
});

describe("normalizeSjsuScheduleRows", () => {
  it("normalizes rows into universal entities", () => {
    const normalized = normalizeSjsuScheduleRows({
      schoolId: "sjsu",
      termId: "sjsu-2025-fall",
      rows: [
        {
          classNumber: "48291",
          subject: "CS",
          catalogNumber: "146",
          sectionNumber: "01",
          title: "Data Structures and Algorithms",
          component: "Lecture",
          mode: "In Person",
          days: "MW",
          time: "09:00-10:15",
          location: "MacQuarrie Hall",
          instructor: "Taylor Nguyen",
        },
      ],
    });

    expect(normalized.courses[0]).toMatchObject({
      id: "sjsu-cs-146",
      subject: "CS",
      number: "146",
      courseKey: "CS-146",
    });
    expect(normalized.sections[0]).toMatchObject({
      componentType: "lecture",
      mode: "in-person",
      days: ["M", "W"],
      startTime: "09:00",
      endTime: "10:15",
    });
    expect(normalized.instructors[0].displayName).toBe("Taylor Nguyen");
    expect(normalized.teachingAssignments[0].courseId).toBe("sjsu-cs-146");
  });
});
