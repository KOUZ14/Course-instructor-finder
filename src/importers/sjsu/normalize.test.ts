import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SjsuScheduleRow } from "./normalize";
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

  it("extracts rows from the official SJSU schedule table shape", () => {
    const html = `
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
            <td>CS 146 (Section 01)</td>
            <td>48291</td>
            <td>In Person</td>
            <td>Data Structures and Algorithms</td>
            <td></td>
            <td>3.0</td>
            <td>LEC</td>
            <td>MW</td>
            <td>09:00AM-10:15AM</td>
            <td>Taylor Nguyen</td>
            <td>MacQuarrie Hall</td>
            <td>08/19/26-12/07/26</td>
            <td>37</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    `;

    expect(parseSjsuScheduleHtml(html)).toEqual([
      {
        classNumber: "48291",
        subject: "CS",
        catalogNumber: "146",
        sectionNumber: "01",
        title: "Data Structures and Algorithms",
        component: "LEC",
        mode: "In Person",
        days: "MW",
        time: "09:00AM-10:15AM",
        location: "MacQuarrie Hall",
        instructor: "Taylor Nguyen",
      },
    ]);
  });

  it("extracts rows with compact official section labels", () => {
    const html = `
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
            <td>CHAD 196Sec 01</td>
            <td>48291</td>
            <td>In Person</td>
            <td>Field Experience</td>
            <td></td>
            <td>3.0</td>
            <td>LEC</td>
            <td>MW</td>
            <td>09:00AM-10:15AM</td>
            <td>Taylor Nguyen</td>
            <td>SH 100</td>
            <td>08/19/26-12/07/26</td>
            <td>37</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    `;

    expect(parseSjsuScheduleHtml(html)[0]).toMatchObject({
      subject: "CHAD",
      catalogNumber: "196",
      sectionNumber: "01",
    });
  });

  it("extracts older official rows that omit the satisfies cell", () => {
    const html = `
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
            <td>AAS 33A (Section 01)</td>
            <td>10016</td>
            <td>In Person</td>
            <td>Asian Americans in U.S. History I</td>
            <td>3.0</td>
            <td>LEC</td>
            <td>MTWRF</td>
            <td>09:00AM-12:10PM</td>
            <td>Soo Choi</td>
            <td>CL316</td>
            <td>01/02/20-01/17/20</td>
            <td>1</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    `;

    expect(parseSjsuScheduleHtml(html)[0]).toMatchObject({
      component: "LEC",
      days: "MTWRF",
      time: "09:00AM-12:10PM",
      instructor: "Soo Choi",
      location: "CL316",
    });
  });

  it("skips official one-cell note rows between class rows", () => {
    const html = `
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
            <td>CS 146 (Section 80)</td>
            <td>48291</td>
            <td>Fully Online</td>
            <td>Data Structures and Algorithms</td>
            <td></td>
            <td>3.0</td>
            <td>LEC</td>
            <td>TBA</td>
            <td>TBA</td>
            <td>Staff</td>
            <td>ONLINE</td>
            <td>08/19/26-12/07/26</td>
            <td>37</td>
            <td></td>
          </tr>
          <tr>
            <td colspan="14">FULLY ONLINE - NO designated day/time meetings (TBA).</td>
          </tr>
        </tbody>
      </table>
    `;

    expect(parseSjsuScheduleHtml(html)).toHaveLength(1);
  });

  it("throws an explicit error when no schedule table rows exist", () => {
    expect(() => parseSjsuScheduleHtml("<main>No schedule here</main>")).toThrow(
      "Expected an SJSU schedule table with rows, but none were found.",
    );
  });

  it("throws an explicit error when schedule headers do not match the expected shape", () => {
    const html = `
      <table>
        <thead><tr><th>Class Nbr</th><th>Subject</th></tr></thead>
        <tbody><tr><td>48291</td><td>CS</td></tr></tbody>
      </table>
    `;

    expect(() => parseSjsuScheduleHtml(html)).toThrow(
      "Expected SJSU schedule headers Class Nbr, Subject, Catalog, Section, Title, Component, Mode, Days, Time, Location, Instructor.",
    );
  });

  it("ignores unrelated tables and parses only the schedule table", () => {
    const html = `
      <table>
        <thead><tr><th>Label</th></tr></thead>
        <tbody><tr><td>Not a schedule row</td></tr></tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>Class Nbr</th>
            <th>Subject</th>
            <th>Catalog</th>
            <th>Section</th>
            <th>Title</th>
            <th>Component</th>
            <th>Mode</th>
            <th>Days</th>
            <th>Time</th>
            <th>Location</th>
            <th>Instructor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>48291</td>
            <td>CS</td>
            <td>146</td>
            <td>01</td>
            <td>Data Structures and Algorithms</td>
            <td>Lecture</td>
            <td>In Person</td>
            <td>MW</td>
            <td>09:00-10:15</td>
            <td>MacQuarrie Hall</td>
            <td>Taylor Nguyen</td>
          </tr>
        </tbody>
      </table>
    `;

    expect(parseSjsuScheduleHtml(html)).toHaveLength(1);
  });

  it("throws an explicit error for a headerless 11-cell table", () => {
    const html = `
      <table>
        <tbody>
          <tr>
            <td>48291</td>
            <td>CS</td>
            <td>146</td>
            <td>01</td>
            <td>Data Structures and Algorithms</td>
            <td>Lecture</td>
            <td>In Person</td>
            <td>MW</td>
            <td>09:00-10:15</td>
            <td>MacQuarrie Hall</td>
            <td>Taylor Nguyen</td>
          </tr>
        </tbody>
      </table>
    `;

    expect(() => parseSjsuScheduleHtml(html)).toThrow(
      "Expected an SJSU schedule table with headers Class Nbr, Subject, Catalog, Section, Title, Component, Mode, Days, Time, Location, Instructor.",
    );
  });

  it("throws an explicit error when a schedule row has the wrong column count", () => {
    const html = `
      <table>
        <thead>
          <tr>
            <th>Class Nbr</th>
            <th>Subject</th>
            <th>Catalog</th>
            <th>Section</th>
            <th>Title</th>
            <th>Component</th>
            <th>Mode</th>
            <th>Days</th>
            <th>Time</th>
            <th>Location</th>
            <th>Instructor</th>
          </tr>
        </thead>
        <tbody><tr><td>48291</td><td>CS</td></tr></tbody>
      </table>
    `;

    expect(() => parseSjsuScheduleHtml(html)).toThrow("Expected 11 schedule columns, received 2.");
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

  it.each([
    ["MW", ["M", "W"]],
    ["M W", ["M", "W"]],
    ["TuTh", ["T", "R"]],
    ["TR", ["T", "R"]],
    ["TR TBA", ["T", "R"]],
  ])("normalizes day format %s", (days, expectedDays) => {
    const normalized = normalizeSjsuScheduleRows({
      schoolId: "sjsu",
      termId: "sjsu-2025-fall",
      rows: [scheduleRow({ days })],
    });

    expect(normalized.sections[0].days).toEqual(expectedDays);
  });

  it("throws an explicit error for invalid day values", () => {
    expect(() =>
      normalizeSjsuScheduleRows({
        schoolId: "sjsu",
        termId: "sjsu-2025-fall",
        rows: [scheduleRow({ days: "MX" })],
      }),
    ).toThrow('Unsupported SJSU day value "MX".');
  });

  it("normalizes AM/PM meeting times to 24-hour HH:mm values", () => {
    const normalized = normalizeSjsuScheduleRows({
      schoolId: "sjsu",
      termId: "sjsu-2025-fall",
      rows: [scheduleRow({ time: "9:00 AM - 10:15 AM" })],
    });

    expect(normalized.sections[0]).toMatchObject({
      startTime: "09:00",
      endTime: "10:15",
    });
  });

  it("supports en dash and em dash meeting time separators", () => {
    const normalized = normalizeSjsuScheduleRows({
      schoolId: "sjsu",
      termId: "sjsu-2025-fall",
      rows: [scheduleRow({ time: "09:00—10:15" })],
    });

    expect(normalized.sections[0]).toMatchObject({
      startTime: "09:00",
      endTime: "10:15",
    });
  });

  it("throws an explicit error for malformed meeting times", () => {
    expect(() =>
      normalizeSjsuScheduleRows({
        schoolId: "sjsu",
        termId: "sjsu-2025-fall",
        rows: [scheduleRow({ time: "09:00-" })],
      }),
    ).toThrow('Unsupported SJSU meeting time "09:00-".');
  });

  it.each(["", "TBA", "Staff"])("omits placeholder instructor %s and its teaching assignment", (instructor) => {
    const normalized = normalizeSjsuScheduleRows({
      schoolId: "sjsu",
      termId: "sjsu-2025-fall",
      rows: [scheduleRow({ instructor })],
    });

    expect(normalized.courses).toHaveLength(1);
    expect(normalized.sections).toHaveLength(1);
    expect(normalized.instructors).toHaveLength(0);
    expect(normalized.teachingAssignments).toHaveLength(0);
  });

  it("de-dupes courses and instructors across schedule rows", () => {
    const normalized = normalizeSjsuScheduleRows({
      schoolId: "sjsu",
      termId: "sjsu-2025-fall",
      rows: [
        scheduleRow({ classNumber: "48291", sectionNumber: "01" }),
        scheduleRow({ classNumber: "48292", sectionNumber: "02" }),
      ],
    });

    expect(normalized.courses).toHaveLength(1);
    expect(normalized.instructors).toHaveLength(1);
    expect(normalized.sections).toHaveLength(2);
    expect(normalized.teachingAssignments).toHaveLength(2);
  });

  it("uses class number in section ids to preserve duplicate displayed section numbers", () => {
    const normalized = normalizeSjsuScheduleRows({
      schoolId: "sjsu",
      termId: "sjsu-2023-summer",
      rows: [
        scheduleRow({ classNumber: "30358", sectionNumber: "01" }),
        scheduleRow({ classNumber: "31417", sectionNumber: "01" }),
      ],
    });

    expect(normalized.sections.map((section) => section.id)).toEqual([
      "sjsu-cs-146-2023-summer-01-30358",
      "sjsu-cs-146-2023-summer-01-31417",
    ]);
  });

  it("prefers hybrid mode when mode text also contains online", () => {
    const normalized = normalizeSjsuScheduleRows({
      schoolId: "sjsu",
      termId: "sjsu-2025-fall",
      rows: [scheduleRow({ mode: "Hybrid Online" })],
    });

    expect(normalized.sections[0].mode).toBe("hybrid");
  });

  it("normalizes TBA meeting values to an empty meeting pattern", () => {
    const normalized = normalizeSjsuScheduleRows({
      schoolId: "sjsu",
      termId: "sjsu-2025-fall",
      rows: [scheduleRow({ days: "TBA", time: "TBA", mode: "Fully Online" })],
    });

    expect(normalized.sections[0]).toMatchObject({
      mode: "online",
      days: [],
      startTime: undefined,
      endTime: undefined,
    });
  });

  it("normalizes repeated TBA meeting time values to an empty time range", () => {
    const normalized = normalizeSjsuScheduleRows({
      schoolId: "sjsu",
      termId: "sjsu-2026-spring",
      rows: [scheduleRow({ days: "TBA TBA", time: "TBA  TBA   TBA  TBA", mode: "Fully Online" })],
    });

    expect(normalized.sections[0]).toMatchObject({
      days: [],
      startTime: undefined,
      endTime: undefined,
    });
  });

  it("normalizes repeated TBA meeting values with day labels to an empty time range", () => {
    const normalized = normalizeSjsuScheduleRows({
      schoolId: "sjsu",
      termId: "sjsu-2026-winter",
      rows: [scheduleRow({ days: "M TBA", time: "M  TBA   TBA  TBA", mode: "Hybrid" })],
    });

    expect(normalized.sections[0]).toMatchObject({
      days: ["M"],
      startTime: undefined,
      endTime: undefined,
    });
  });

  it("normalizes dash meeting time values to an empty time range", () => {
    const normalized = normalizeSjsuScheduleRows({
      schoolId: "sjsu",
      termId: "sjsu-2020-winter",
      rows: [scheduleRow({ days: "", time: "-", mode: "Fully Online" })],
    });

    expect(normalized.sections[0]).toMatchObject({
      days: [],
      startTime: undefined,
      endTime: undefined,
    });
  });

  it("normalizes repeated hybrid meeting-pattern cells from official SJSU rows", () => {
    const normalized = normalizeSjsuScheduleRows({
      schoolId: "sjsu",
      termId: "sjsu-2026-spring",
      rows: [
        scheduleRow({
          days: "T  T",
          time: "T  06:00PM-08:45PM   T  06:00PM-08:45PM",
          instructor: "Douglas Williams / Douglas Williams",
          mode: "Hybrid",
        }),
      ],
    });

    expect(normalized.sections[0]).toMatchObject({
      mode: "hybrid",
      days: ["T"],
      startTime: "18:00",
      endTime: "20:45",
    });
    expect(normalized.instructors[0].displayName).toBe("Douglas Williams");
  });
});

function scheduleRow(overrides: Partial<SjsuScheduleRow> = {}): SjsuScheduleRow {
  return {
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
    ...overrides,
  };
}
