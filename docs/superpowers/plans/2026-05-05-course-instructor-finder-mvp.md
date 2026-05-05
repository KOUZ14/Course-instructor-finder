# Course Instructor Finder MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a student-facing SJSU MVP that predicts likely instructors for a course using static public historical schedule data and transparent evidence.

**Architecture:** Use a Vite React TypeScript app with static JSON data loaded in the browser. Keep domain models, prediction scoring, SJSU fixture normalization, and React UI in separate modules so another school adapter can reuse the same core types later.

**Tech Stack:** Vite, React, TypeScript, Vitest, React Testing Library, Playwright, ESLint, static JSON.

---

## File Structure

- Create `package.json`: scripts, dependencies, and dev tooling.
- Create `index.html`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `.gitignore`: app and tooling configuration.
- Create `src/main.tsx`: React entrypoint.
- Create `src/App.tsx`: page shell that loads data and wires search to prediction results.
- Create `src/App.test.tsx`: UI tests for search, results, and empty states.
- Create `src/styles.css`: app styling.
- Create `src/domain/types.ts`: universal normalized entities and typed result states.
- Create `src/domain/search.ts`: input parsing, validation, and dataset search helpers.
- Create `src/domain/search.test.ts`: tests for validation and query matching.
- Create `src/domain/predictor.ts`: deterministic scoring and confidence calculation.
- Create `src/domain/predictor.test.ts`: tests for score factors, thresholds, and no-data cases.
- Create `src/data/sjsu-sample-dataset.json`: fixture-backed static SJSU dataset.
- Create `src/data/loadDataset.ts`: typed dataset loader.
- Create `src/importers/sjsu/normalize.ts`: adapter-shaped normalization helpers.
- Create `src/importers/sjsu/normalize.test.ts`: tests for SJSU fixture normalization.
- Create `src/importers/sjsu/fixtures/cs-146-schedule.html`: saved SJSU-like schedule fixture for importer tests.
- Create `README.md`: project purpose and verification commands.

## Task 1: Scaffold the TypeScript App

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `.gitignore`
- Modify: `README.md`

- [ ] **Step 1: Write project configuration**

Create `package.json`:

```json
{
  "name": "course-instructor-finder",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint .",
    "e2e": "playwright test"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@playwright/test": "^1.50.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "eslint": "^9.0.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.0",
    "globals": "^15.0.0",
    "jsdom": "^26.0.0",
    "typescript": "^5.8.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Course Instructor Finder</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
});
```

Create `vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
coverage/
playwright-report/
test-results/
.superpowers/
```

- [ ] **Step 2: Create test setup**

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
npm install
```

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 4: Verify installed tool entrypoints**

Run:

```bash
npm exec vite -- --version
npm exec vitest -- --version
```

Expected: both commands print a version and exit successfully.

- [ ] **Step 5: Commit scaffold**

```bash
git add package.json package-lock.json index.html vite.config.ts vitest.config.ts tsconfig.json tsconfig.node.json .gitignore src/test/setup.ts README.md
git commit -m "chore: scaffold course instructor finder app"
```

## Task 2: Add Universal Domain Types and Sample Dataset

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/data/sjsu-sample-dataset.json`
- Create: `src/data/loadDataset.ts`
- Test: `src/data/loadDataset.test.ts`

- [ ] **Step 1: Write the failing dataset loader test**

Create `src/data/loadDataset.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/data/loadDataset.test.ts
```

Expected: FAIL because `loadDataset` and domain types do not exist.

- [ ] **Step 3: Add typed universal entities**

Create `src/domain/types.ts`:

```ts
export type Season = "spring" | "summer" | "fall" | "winter";
export type MeetingMode = "in-person" | "online" | "hybrid" | "unknown";
export type ComponentType = "lecture" | "lab" | "seminar" | "activity" | "unknown";
export type ConfidenceLabel = "High" | "Medium" | "Low";

export interface School {
  id: string;
  name: string;
  sourceAdapter: string;
}

export interface Term {
  id: string;
  schoolId: string;
  code: string;
  label: string;
  year: number;
  season: Season;
}

export interface Course {
  id: string;
  schoolId: string;
  subject: string;
  number: string;
  title: string;
  courseKey: string;
}

export interface Section {
  id: string;
  courseId: string;
  termId: string;
  sectionNumber: string;
  classNumber?: string;
  componentType: ComponentType;
  mode: MeetingMode;
  days: string[];
  startTime?: string;
  endTime?: string;
  location?: string;
}

export interface Instructor {
  id: string;
  schoolId: string;
  displayName: string;
}

export interface TeachingAssignment {
  id: string;
  instructorId: string;
  sectionId: string;
  courseId: string;
  termId: string;
}

export interface CourseDataset {
  schools: School[];
  terms: Term[];
  courses: Course[];
  sections: Section[];
  instructors: Instructor[];
  teachingAssignments: TeachingAssignment[];
}

export interface SearchQuery {
  schoolId: string;
  termId: string;
  subject: string;
  courseNumber: string;
  sectionNumber?: string;
  mode?: MeetingMode;
  days?: string[];
  startTime?: string;
}

export interface EvidenceRow {
  assignmentId: string;
  instructorName: string;
  termLabel: string;
  courseLabel: string;
  sectionNumber: string;
  componentType: ComponentType;
  mode: MeetingMode;
  days: string[];
  startTime?: string;
  endTime?: string;
}

export interface ScoreFactors {
  sameCourse: number;
  recency: number;
  seasonMatch: number;
  componentMatch: number;
  modeMatch: number;
  meetingPatternMatch: number;
}

export interface PredictionResult {
  instructorId: string;
  instructorName: string;
  score: number;
  confidence: ConfidenceLabel;
  factors: ScoreFactors;
  evidence: EvidenceRow[];
}

export type PredictionEmptyReason =
  | "course_not_found"
  | "no_historical_instructor_data"
  | "insufficient_evidence";

export type PredictionResponse =
  | { status: "results"; results: PredictionResult[] }
  | { status: "empty"; reason: PredictionEmptyReason; message: string };
```

- [ ] **Step 4: Add a fixture-backed static dataset**

Create `src/data/sjsu-sample-dataset.json`:

```json
{
  "schools": [
    { "id": "sjsu", "name": "San Jose State University", "sourceAdapter": "sjsu-static-v1" }
  ],
  "terms": [
    { "id": "sjsu-2026-fall", "schoolId": "sjsu", "code": "2268", "label": "Fall 2026", "year": 2026, "season": "fall" },
    { "id": "sjsu-2025-fall", "schoolId": "sjsu", "code": "2258", "label": "Fall 2025", "year": 2025, "season": "fall" },
    { "id": "sjsu-2025-spring", "schoolId": "sjsu", "code": "2252", "label": "Spring 2025", "year": 2025, "season": "spring" },
    { "id": "sjsu-2024-fall", "schoolId": "sjsu", "code": "2248", "label": "Fall 2024", "year": 2024, "season": "fall" }
  ],
  "courses": [
    { "id": "sjsu-cs-146", "schoolId": "sjsu", "subject": "CS", "number": "146", "title": "Data Structures and Algorithms", "courseKey": "CS-146" },
    { "id": "sjsu-cs-151", "schoolId": "sjsu", "subject": "CS", "number": "151", "title": "Object-Oriented Design", "courseKey": "CS-151" }
  ],
  "sections": [
    { "id": "sjsu-cs-146-2025-fall-01", "courseId": "sjsu-cs-146", "termId": "sjsu-2025-fall", "sectionNumber": "01", "classNumber": "48291", "componentType": "lecture", "mode": "in-person", "days": ["M", "W"], "startTime": "09:00", "endTime": "10:15", "location": "MacQuarrie Hall" },
    { "id": "sjsu-cs-146-2025-fall-02", "courseId": "sjsu-cs-146", "termId": "sjsu-2025-fall", "sectionNumber": "02", "classNumber": "48292", "componentType": "lecture", "mode": "online", "days": ["T"], "startTime": "18:00", "endTime": "20:45", "location": "Online" },
    { "id": "sjsu-cs-146-2025-spring-01", "courseId": "sjsu-cs-146", "termId": "sjsu-2025-spring", "sectionNumber": "01", "classNumber": "28291", "componentType": "lecture", "mode": "in-person", "days": ["M", "W"], "startTime": "09:00", "endTime": "10:15", "location": "MacQuarrie Hall" },
    { "id": "sjsu-cs-146-2024-fall-01", "courseId": "sjsu-cs-146", "termId": "sjsu-2024-fall", "sectionNumber": "01", "classNumber": "18291", "componentType": "lecture", "mode": "in-person", "days": ["M", "W"], "startTime": "09:00", "endTime": "10:15", "location": "MacQuarrie Hall" },
    { "id": "sjsu-cs-151-2025-fall-01", "courseId": "sjsu-cs-151", "termId": "sjsu-2025-fall", "sectionNumber": "01", "classNumber": "49291", "componentType": "lecture", "mode": "in-person", "days": ["T", "R"], "startTime": "10:30", "endTime": "11:45", "location": "Duncan Hall" }
  ],
  "instructors": [
    { "id": "sjsu-instructor-taylor-nguyen", "schoolId": "sjsu", "displayName": "Taylor Nguyen" },
    { "id": "sjsu-instructor-rivera-patel", "schoolId": "sjsu", "displayName": "Rivera Patel" },
    { "id": "sjsu-instructor-morgan-lee", "schoolId": "sjsu", "displayName": "Morgan Lee" }
  ],
  "teachingAssignments": [
    { "id": "ta-cs146-fall2025-01", "instructorId": "sjsu-instructor-taylor-nguyen", "sectionId": "sjsu-cs-146-2025-fall-01", "courseId": "sjsu-cs-146", "termId": "sjsu-2025-fall" },
    { "id": "ta-cs146-fall2025-02", "instructorId": "sjsu-instructor-rivera-patel", "sectionId": "sjsu-cs-146-2025-fall-02", "courseId": "sjsu-cs-146", "termId": "sjsu-2025-fall" },
    { "id": "ta-cs146-spring2025-01", "instructorId": "sjsu-instructor-morgan-lee", "sectionId": "sjsu-cs-146-2025-spring-01", "courseId": "sjsu-cs-146", "termId": "sjsu-2025-spring" },
    { "id": "ta-cs146-fall2024-01", "instructorId": "sjsu-instructor-taylor-nguyen", "sectionId": "sjsu-cs-146-2024-fall-01", "courseId": "sjsu-cs-146", "termId": "sjsu-2024-fall" },
    { "id": "ta-cs151-fall2025-01", "instructorId": "sjsu-instructor-morgan-lee", "sectionId": "sjsu-cs-151-2025-fall-01", "courseId": "sjsu-cs-151", "termId": "sjsu-2025-fall" }
  ]
}
```

- [ ] **Step 5: Add the dataset loader**

Create `src/data/loadDataset.ts`:

```ts
import dataset from "./sjsu-sample-dataset.json";
import type { CourseDataset } from "../domain/types";

/**
 * Loads the bundled static course dataset used by the MVP.
 */
export function loadDataset(): CourseDataset {
  return dataset satisfies CourseDataset;
}
```

- [ ] **Step 6: Run the dataset test**

Run:

```bash
npm test -- src/data/loadDataset.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit domain data foundation**

```bash
git add src/domain/types.ts src/data/loadDataset.ts src/data/loadDataset.test.ts src/data/sjsu-sample-dataset.json
git commit -m "feat: add normalized course dataset"
```

## Task 3: Implement Search Validation and Matching

**Files:**
- Create: `src/domain/search.ts`
- Test: `src/domain/search.test.ts`

- [ ] **Step 1: Write failing search tests**

Create `src/domain/search.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { loadDataset } from "../data/loadDataset";
import { findCourse, parseSearchInput } from "./search";

describe("parseSearchInput", () => {
  it("normalizes a valid course-first search", () => {
    const result = parseSearchInput({
      schoolId: "sjsu",
      termId: "sjsu-2026-fall",
      subject: " cs ",
      courseNumber: " 146 ",
      mode: "in-person",
      days: ["M", "W"],
      startTime: "09:00",
    });

    expect(result).toEqual({
      ok: true,
      query: {
        schoolId: "sjsu",
        termId: "sjsu-2026-fall",
        subject: "CS",
        courseNumber: "146",
        mode: "in-person",
        days: ["M", "W"],
        startTime: "09:00",
      },
    });
  });

  it("returns field-specific errors for missing required input", () => {
    const result = parseSearchInput({
      schoolId: "",
      termId: "",
      subject: "",
      courseNumber: "",
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        schoolId: "Choose a school.",
        termId: "Choose a term.",
        subject: "Enter a subject, such as CS.",
        courseNumber: "Enter a course number, such as 146.",
      },
    });
  });
});

describe("findCourse", () => {
  it("finds a course by normalized subject and number", () => {
    const course = findCourse(loadDataset(), "sjsu", "cs", "146");
    expect(course?.id).toBe("sjsu-cs-146");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm test -- src/domain/search.test.ts
```

Expected: FAIL because `search.ts` does not exist.

- [ ] **Step 3: Add search parsing and matching**

Create `src/domain/search.ts`:

```ts
import type { Course, CourseDataset, MeetingMode, SearchQuery } from "./types";

export interface RawSearchInput {
  schoolId: string;
  termId: string;
  subject: string;
  courseNumber: string;
  sectionNumber?: string;
  mode?: MeetingMode | "";
  days?: string[];
  startTime?: string;
}

export interface SearchValidationErrors {
  schoolId?: string;
  termId?: string;
  subject?: string;
  courseNumber?: string;
}

export type SearchParseResult =
  | { ok: true; query: SearchQuery }
  | { ok: false; errors: SearchValidationErrors };

/**
 * Normalizes and validates user-entered course search input.
 */
export function parseSearchInput(input: RawSearchInput): SearchParseResult {
  const schoolId = input.schoolId.trim();
  const termId = input.termId.trim();
  const subject = input.subject.trim().toUpperCase();
  const courseNumber = input.courseNumber.trim().toUpperCase();
  const errors: SearchValidationErrors = {};

  if (schoolId.length === 0) errors.schoolId = "Choose a school.";
  if (termId.length === 0) errors.termId = "Choose a term.";
  if (subject.length === 0) errors.subject = "Enter a subject, such as CS.";
  if (courseNumber.length === 0) errors.courseNumber = "Enter a course number, such as 146.";

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    query: {
      schoolId,
      termId,
      subject,
      courseNumber,
      ...(input.sectionNumber?.trim() ? { sectionNumber: input.sectionNumber.trim() } : {}),
      ...(input.mode ? { mode: input.mode } : {}),
      ...(input.days && input.days.length > 0 ? { days: input.days } : {}),
      ...(input.startTime?.trim() ? { startTime: input.startTime.trim() } : {}),
    },
  };
}

/**
 * Finds a course by school, subject, and number using normalized comparisons.
 */
export function findCourse(
  dataset: CourseDataset,
  schoolId: string,
  subject: string,
  courseNumber: string,
): Course | undefined {
  const normalizedSubject = subject.trim().toUpperCase();
  const normalizedNumber = courseNumber.trim().toUpperCase();

  return dataset.courses.find(
    (course) =>
      course.schoolId === schoolId &&
      course.subject.toUpperCase() === normalizedSubject &&
      course.number.toUpperCase() === normalizedNumber,
  );
}
```

- [ ] **Step 4: Run search tests**

Run:

```bash
npm test -- src/domain/search.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit search helpers**

```bash
git add src/domain/search.ts src/domain/search.test.ts
git commit -m "feat: add course search validation"
```

## Task 4: Implement Deterministic Instructor Prediction

**Files:**
- Create: `src/domain/predictor.ts`
- Test: `src/domain/predictor.test.ts`

- [ ] **Step 1: Write failing predictor tests**

Create `src/domain/predictor.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { loadDataset } from "../data/loadDataset";
import { predictInstructors } from "./predictor";

describe("predictInstructors", () => {
  it("ranks likely instructors with evidence for a course-first SJSU search", () => {
    const response = predictInstructors(loadDataset(), {
      schoolId: "sjsu",
      termId: "sjsu-2026-fall",
      subject: "CS",
      courseNumber: "146",
      mode: "in-person",
      days: ["M", "W"],
      startTime: "09:00",
    });

    expect(response.status).toBe("results");
    if (response.status !== "results") return;

    expect(response.results[0]).toMatchObject({
      instructorName: "Taylor Nguyen",
      confidence: "High",
    });
    expect(response.results[0].evidence).toHaveLength(2);
    expect(response.results[0].score).toBeGreaterThan(response.results[1].score);
  });

  it("returns course_not_found when the course is absent", () => {
    const response = predictInstructors(loadDataset(), {
      schoolId: "sjsu",
      termId: "sjsu-2026-fall",
      subject: "MATH",
      courseNumber: "999",
    });

    expect(response).toEqual({
      status: "empty",
      reason: "course_not_found",
      message: "MATH 999 is not available in the current dataset.",
    });
  });

  it("returns no_historical_instructor_data when no assignments exist", () => {
    const dataset = loadDataset();
    const response = predictInstructors(
      {
        ...dataset,
        teachingAssignments: dataset.teachingAssignments.filter((assignment) => assignment.courseId !== "sjsu-cs-151"),
      },
      {
        schoolId: "sjsu",
        termId: "sjsu-2026-fall",
        subject: "CS",
        courseNumber: "151",
      },
    );

    expect(response).toEqual({
      status: "empty",
      reason: "no_historical_instructor_data",
      message: "CS 151 exists, but there is no historical instructor data for it yet.",
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm test -- src/domain/predictor.test.ts
```

Expected: FAIL because `predictor.ts` does not exist.

- [ ] **Step 3: Add scoring implementation**

Create `src/domain/predictor.ts`:

```ts
import { findCourse } from "./search";
import type {
  CourseDataset,
  EvidenceRow,
  PredictionResponse,
  PredictionResult,
  ScoreFactors,
  SearchQuery,
  TeachingAssignment,
} from "./types";

const MINIMUM_SCORE = 45;

interface AssignmentContext {
  assignment: TeachingAssignment;
  evidence: EvidenceRow;
  termYear: number;
  termSeason: string;
  factors: ScoreFactors;
  score: number;
}

/**
 * Predicts likely instructors from historical teaching assignments.
 */
export function predictInstructors(dataset: CourseDataset, query: SearchQuery): PredictionResponse {
  const course = findCourse(dataset, query.schoolId, query.subject, query.courseNumber);

  if (!course) {
    return {
      status: "empty",
      reason: "course_not_found",
      message: `${query.subject} ${query.courseNumber} is not available in the current dataset.`,
    };
  }

  const assignments = dataset.teachingAssignments.filter((assignment) => assignment.courseId === course.id);

  if (assignments.length === 0) {
    return {
      status: "empty",
      reason: "no_historical_instructor_data",
      message: `${course.subject} ${course.number} exists, but there is no historical instructor data for it yet.`,
    };
  }

  const targetTerm = dataset.terms.find((term) => term.id === query.termId);
  const contexts = assignments
    .map((assignment) => buildAssignmentContext(dataset, assignment, query, targetTerm?.season ?? "fall", targetTerm?.year ?? 2026))
    .filter((context): context is AssignmentContext => context !== undefined);

  const byInstructor = new Map<string, PredictionResult>();

  for (const context of contexts) {
    const instructor = dataset.instructors.find((candidate) => candidate.id === context.assignment.instructorId);
    if (!instructor) continue;

    const existing = byInstructor.get(instructor.id);
    if (!existing) {
      byInstructor.set(instructor.id, {
        instructorId: instructor.id,
        instructorName: instructor.displayName,
        score: context.score,
        confidence: "Low",
        factors: context.factors,
        evidence: [context.evidence],
      });
      continue;
    }

    existing.score += context.score;
    existing.factors = {
      sameCourse: existing.factors.sameCourse + context.factors.sameCourse,
      recency: existing.factors.recency + context.factors.recency,
      seasonMatch: existing.factors.seasonMatch + context.factors.seasonMatch,
      componentMatch: existing.factors.componentMatch + context.factors.componentMatch,
      modeMatch: existing.factors.modeMatch + context.factors.modeMatch,
      meetingPatternMatch: existing.factors.meetingPatternMatch + context.factors.meetingPatternMatch,
    };
    existing.evidence.push(context.evidence);
  }

  const results = [...byInstructor.values()]
    .map((result) => ({ ...result, confidence: confidenceFor(result.score, result.evidence.length) }))
    .filter((result) => result.score >= MINIMUM_SCORE)
    .sort((left, right) => right.score - left.score || left.instructorName.localeCompare(right.instructorName));

  if (results.length === 0) {
    return {
      status: "empty",
      reason: "insufficient_evidence",
      message: `${course.subject} ${course.number} has historical data, but not enough evidence for a reliable prediction.`,
    };
  }

  return { status: "results", results };
}

function buildAssignmentContext(
  dataset: CourseDataset,
  assignment: TeachingAssignment,
  query: SearchQuery,
  targetSeason: string,
  targetYear: number,
): AssignmentContext | undefined {
  const section = dataset.sections.find((candidate) => candidate.id === assignment.sectionId);
  const term = dataset.terms.find((candidate) => candidate.id === assignment.termId);
  const course = dataset.courses.find((candidate) => candidate.id === assignment.courseId);
  const instructor = dataset.instructors.find((candidate) => candidate.id === assignment.instructorId);

  if (!section || !term || !course || !instructor) {
    return undefined;
  }

  const yearsOld = Math.max(0, targetYear - term.year);
  const recency = Math.max(0, 25 - yearsOld * 7);
  const seasonMatch = term.season === targetSeason ? 15 : 0;
  const componentMatch = section.componentType === "lecture" ? 8 : 0;
  const modeMatch = query.mode && section.mode === query.mode ? 12 : 0;
  const meetingPatternMatch =
    query.days && query.days.length > 0 && query.startTime && sameMeetingPattern(section.days, query.days) && section.startTime === query.startTime
      ? 10
      : 0;

  const factors: ScoreFactors = {
    sameCourse: 40,
    recency,
    seasonMatch,
    componentMatch,
    modeMatch,
    meetingPatternMatch,
  };

  const score = Object.values(factors).reduce((sum, value) => sum + value, 0);

  return {
    assignment,
    termYear: term.year,
    termSeason: term.season,
    factors,
    score,
    evidence: {
      assignmentId: assignment.id,
      instructorName: instructor.displayName,
      termLabel: term.label,
      courseLabel: `${course.subject} ${course.number}`,
      sectionNumber: section.sectionNumber,
      componentType: section.componentType,
      mode: section.mode,
      days: section.days,
      startTime: section.startTime,
      endTime: section.endTime,
    },
  };
}

function sameMeetingPattern(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((day) => right.includes(day));
}

function confidenceFor(score: number, evidenceCount: number): "High" | "Medium" | "Low" {
  if (score >= 130 && evidenceCount >= 2) return "High";
  if (score >= 70) return "Medium";
  return "Low";
}
```

- [ ] **Step 4: Run predictor tests**

Run:

```bash
npm test -- src/domain/predictor.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit predictor**

```bash
git add src/domain/predictor.ts src/domain/predictor.test.ts
git commit -m "feat: predict likely instructors"
```

## Task 5: Add SJSU Adapter-Shaped Normalization

**Files:**
- Create: `src/importers/sjsu/fixtures/cs-146-schedule.html`
- Create: `src/importers/sjsu/normalize.ts`
- Test: `src/importers/sjsu/normalize.test.ts`

- [ ] **Step 1: Add a saved schedule fixture**

Create `src/importers/sjsu/fixtures/cs-146-schedule.html`:

```html
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
```

- [ ] **Step 2: Write failing normalization tests**

Create `src/importers/sjsu/normalize.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeSjsuScheduleRows, parseSjsuScheduleHtml } from "./normalize";

describe("parseSjsuScheduleHtml", () => {
  it("extracts schedule rows from a saved SJSU-like table", () => {
    const fixturePath = new URL("./fixtures/cs-146-schedule.html", import.meta.url);
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
```

- [ ] **Step 3: Run normalization tests to verify they fail**

Run:

```bash
npm test -- src/importers/sjsu/normalize.test.ts
```

Expected: FAIL because `normalize.ts` does not exist.

- [ ] **Step 4: Implement SJSU normalization**

Create `src/importers/sjsu/normalize.ts`:

```ts
import type { ComponentType, Course, Instructor, MeetingMode, Section, TeachingAssignment } from "../../domain/types";

export interface SjsuScheduleRow {
  classNumber: string;
  subject: string;
  catalogNumber: string;
  sectionNumber: string;
  title: string;
  component: string;
  mode: string;
  days: string;
  time: string;
  location: string;
  instructor: string;
}

export interface NormalizeSjsuRowsInput {
  schoolId: string;
  termId: string;
  rows: SjsuScheduleRow[];
}

export interface NormalizedSjsuRows {
  courses: Course[];
  sections: Section[];
  instructors: Instructor[];
  teachingAssignments: TeachingAssignment[];
}

/**
 * Parses a saved SJSU-like schedule table into raw schedule rows.
 */
export function parseSjsuScheduleHtml(html: string): SjsuScheduleRow[] {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const rows = [...document.querySelectorAll("tbody tr")];

  return rows.map((row) => {
    const cells = [...row.querySelectorAll("td")].map((cell) => cell.textContent?.trim() ?? "");

    if (cells.length !== 11) {
      throw new Error(`Expected 11 schedule columns, received ${cells.length}.`);
    }

    return {
      classNumber: cells[0],
      subject: cells[1],
      catalogNumber: cells[2],
      sectionNumber: cells[3],
      title: cells[4],
      component: cells[5],
      mode: cells[6],
      days: cells[7],
      time: cells[8],
      location: cells[9],
      instructor: cells[10],
    };
  });
}

/**
 * Converts raw SJSU schedule rows into universal course entities.
 */
export function normalizeSjsuScheduleRows(input: NormalizeSjsuRowsInput): NormalizedSjsuRows {
  const courses = new Map<string, Course>();
  const instructors = new Map<string, Instructor>();
  const sections: Section[] = [];
  const teachingAssignments: TeachingAssignment[] = [];

  for (const row of input.rows) {
    const subject = row.subject.trim().toUpperCase();
    const number = row.catalogNumber.trim().toUpperCase();
    const courseId = `${input.schoolId}-${subject.toLowerCase()}-${number.toLowerCase()}`;
    const courseKey = `${subject}-${number}`;
    const instructorId = `${input.schoolId}-instructor-${slugify(row.instructor)}`;
    const sectionId = `${courseId}-${input.termId.replace(`${input.schoolId}-`, "")}-${row.sectionNumber}`;

    courses.set(courseId, {
      id: courseId,
      schoolId: input.schoolId,
      subject,
      number,
      title: row.title.trim(),
      courseKey,
    });

    instructors.set(instructorId, {
      id: instructorId,
      schoolId: input.schoolId,
      displayName: row.instructor.trim(),
    });

    const [startTime, endTime] = row.time.split("-").map((part) => part.trim());
    sections.push({
      id: sectionId,
      courseId,
      termId: input.termId,
      sectionNumber: row.sectionNumber.trim(),
      classNumber: row.classNumber.trim(),
      componentType: normalizeComponent(row.component),
      mode: normalizeMode(row.mode),
      days: normalizeDays(row.days),
      startTime,
      endTime,
      location: row.location.trim(),
    });

    teachingAssignments.push({
      id: `ta-${sectionId}`,
      instructorId,
      sectionId,
      courseId,
      termId: input.termId,
    });
  }

  return {
    courses: [...courses.values()],
    sections,
    instructors: [...instructors.values()],
    teachingAssignments,
  };
}

function normalizeComponent(component: string): ComponentType {
  const value = component.trim().toLowerCase();
  if (value.includes("lecture")) return "lecture";
  if (value.includes("lab")) return "lab";
  if (value.includes("seminar")) return "seminar";
  if (value.includes("activity")) return "activity";
  return "unknown";
}

function normalizeMode(mode: string): MeetingMode {
  const value = mode.trim().toLowerCase();
  if (value.includes("online")) return "online";
  if (value.includes("hybrid")) return "hybrid";
  if (value.includes("person")) return "in-person";
  return "unknown";
}

function normalizeDays(days: string): string[] {
  const trimmed = days.trim().toUpperCase();
  if (trimmed.length === 0) return [];

  return trimmed.replace("TH", "R").split("");
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
```

- [ ] **Step 5: Run normalization tests**

Run:

```bash
npm test -- src/importers/sjsu/normalize.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit SJSU normalization**

```bash
git add src/importers/sjsu/fixtures/cs-146-schedule.html src/importers/sjsu/normalize.ts src/importers/sjsu/normalize.test.ts
git commit -m "feat: add SJSU schedule normalization"
```

## Task 6: Build the Student Search UI

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.test.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Write failing UI tests**

Create `src/App.test.tsx`:

```tsx
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
    expect(screen.getByText(/Fall 2025/)).toBeInTheDocument();
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
```

- [ ] **Step 2: Run UI tests to verify they fail**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because `App.tsx` does not exist.

- [ ] **Step 3: Add React entrypoint**

Create `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root was not found.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 4: Add the search UI**

Create `src/App.tsx`:

```tsx
import { FormEvent, useMemo, useState } from "react";
import { loadDataset } from "./data/loadDataset";
import { predictInstructors } from "./domain/predictor";
import { parseSearchInput, type SearchValidationErrors } from "./domain/search";
import type { MeetingMode, PredictionResponse } from "./domain/types";

const DEFAULT_TERM_ID = "sjsu-2026-fall";

export default function App() {
  const dataset = useMemo(() => loadDataset(), []);
  const [subject, setSubject] = useState("CS");
  const [courseNumber, setCourseNumber] = useState("146");
  const [mode, setMode] = useState<MeetingMode | "">("in-person");
  const [errors, setErrors] = useState<SearchValidationErrors>({});
  const [response, setResponse] = useState<PredictionResponse | undefined>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseSearchInput({
      schoolId: "sjsu",
      termId: DEFAULT_TERM_ID,
      subject,
      courseNumber,
      mode,
      days: ["M", "W"],
      startTime: "09:00",
    });

    if (!parsed.ok) {
      setErrors(parsed.errors);
      setResponse(undefined);
      return;
    }

    setErrors({});
    setResponse(predictInstructors(dataset, parsed.query));
  }

  return (
    <main className="app-shell">
      <section className="search-panel" aria-labelledby="page-title">
        <p className="eyebrow">San Jose State University MVP</p>
        <h1 id="page-title">Find likely instructors before registration opens.</h1>
        <form className="search-form" onSubmit={handleSubmit}>
          <label>
            School
            <select value="sjsu" disabled>
              <option value="sjsu">San Jose State University</option>
            </select>
          </label>
          <label>
            Term
            <select value={DEFAULT_TERM_ID} disabled>
              <option value={DEFAULT_TERM_ID}>Fall 2026</option>
            </select>
          </label>
          <label>
            Subject
            <input value={subject} onChange={(event) => setSubject(event.target.value)} />
            {errors.subject ? <span className="field-error">{errors.subject}</span> : null}
          </label>
          <label>
            Course number
            <input value={courseNumber} onChange={(event) => setCourseNumber(event.target.value)} />
            {errors.courseNumber ? <span className="field-error">{errors.courseNumber}</span> : null}
          </label>
          <label>
            Mode
            <select value={mode} onChange={(event) => setMode(event.target.value as MeetingMode | "")}>
              <option value="">Any mode</option>
              <option value="in-person">In person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
          <button type="submit">Find likely instructors</button>
        </form>
      </section>

      <section className="results-panel" aria-live="polite">
        {!response ? (
          <p className="empty-state">Search for a course to see likely instructors and the evidence behind each result.</p>
        ) : response.status === "empty" ? (
          <p className="empty-state">{response.message}</p>
        ) : (
          <div className="results-list">
            {response.results.map((result) => (
              <article className="result-card" key={result.instructorId}>
                <div>
                  <h2>{result.instructorName}</h2>
                  <p className="confidence">{result.confidence} confidence</p>
                </div>
                <p>Score: {result.score}</p>
                <h3>Evidence</h3>
                <ul>
                  {result.evidence.map((row) => (
                    <li key={row.assignmentId}>
                      {row.termLabel}: {row.courseLabel} section {row.sectionNumber}, {row.mode}, {row.days.join("")}{" "}
                      {row.startTime}-{row.endTime}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Add responsive styles**

Create `src/styles.css`:

```css
:root {
  color: #17211b;
  background: #f5f7f2;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
}

button,
input,
select {
  font: inherit;
}

.app-shell {
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
  gap: 24px;
  min-height: 100vh;
  padding: 32px;
  box-sizing: border-box;
}

.search-panel,
.results-panel {
  background: #ffffff;
  border: 1px solid #d9dfd2;
  border-radius: 8px;
  padding: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #54615a;
  font-size: 0.84rem;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 24px;
  font-size: clamp(2rem, 4vw, 3.8rem);
  line-height: 1;
}

.search-form {
  display: grid;
  gap: 16px;
}

label {
  display: grid;
  gap: 6px;
  font-weight: 700;
}

input,
select {
  min-height: 44px;
  border: 1px solid #b8c1b3;
  border-radius: 6px;
  padding: 0 12px;
  color: #17211b;
  background: #ffffff;
}

button {
  min-height: 46px;
  border: 0;
  border-radius: 6px;
  padding: 0 16px;
  color: #ffffff;
  background: #1e5b42;
  font-weight: 800;
  cursor: pointer;
}

.field-error {
  color: #a13d2d;
  font-size: 0.9rem;
  font-weight: 600;
}

.empty-state {
  margin: 0;
  color: #54615a;
}

.results-list {
  display: grid;
  gap: 16px;
}

.result-card {
  border: 1px solid #d9dfd2;
  border-radius: 8px;
  padding: 18px;
}

.result-card h2,
.result-card h3 {
  margin: 0 0 8px;
}

.confidence {
  display: inline-flex;
  margin: 0;
  color: #1e5b42;
  font-weight: 800;
}

@media (max-width: 800px) {
  .app-shell {
    grid-template-columns: 1fr;
    padding: 16px;
  }
}
```

- [ ] **Step 6: Run UI tests**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit UI**

```bash
git add src/main.tsx src/App.tsx src/App.test.tsx src/styles.css
git commit -m "feat: add student instructor search UI"
```

## Task 7: Add End-to-End Smoke Test and Documentation

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/search.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Add Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

- [ ] **Step 2: Write the e2e smoke test**

Create `tests/e2e/search.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("student searches CS 146 and sees likely instructors", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Subject").fill("CS");
  await page.getByLabel("Course number").fill("146");
  await page.getByRole("button", { name: "Find likely instructors" }).click();

  await expect(page.getByText("Taylor Nguyen")).toBeVisible();
  await expect(page.getByText("High confidence")).toBeVisible();
  await expect(page.getByText(/Fall 2025/)).toBeVisible();
});
```

- [ ] **Step 3: Update README**

Replace `README.md` with:

````md
# Course Instructor Finder

Course Instructor Finder helps students estimate who is most likely to teach a course when registration lists the instructor as TBA.

The first MVP targets San Jose State University and uses static public historical schedule data. Predictions are based on same-course history, recency, term season, component type, delivery mode, and meeting pattern. Every result includes evidence.

## Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Verify the project:

```bash
npm test
npm run build
npm run e2e
```

## MVP Scope

- Student-facing course-first search.
- SJSU sample static data.
- Deterministic instructor prediction.
- Transparent evidence for each result.
- No ratings, rumors, accounts, or scheduled ingestion in v1.
````

- [ ] **Step 4: Run all verification commands**

Run:

```bash
npm test
npm run build
npm run e2e
```

Expected: all commands exit successfully.

- [ ] **Step 5: Commit documentation and e2e coverage**

```bash
git add playwright.config.ts tests/e2e/search.spec.ts README.md
git commit -m "test: add instructor search smoke coverage"
```

## Task 8: Final Integration Check

**Files:**
- Inspect: all changed files

- [ ] **Step 1: Check worktree status**

Run:

```bash
git status --short
```

Expected: no untracked source files except local environment artifacts intentionally ignored by `.gitignore`.

- [ ] **Step 2: Run final verification**

Run:

```bash
npm test
npm run build
npm run e2e
```

Expected: all commands exit successfully.

- [ ] **Step 3: Review scope against the design spec**

Confirm these items are present:

- Course-first SJSU search.
- Optional mode filter in the UI.
- Universal entities in `src/domain/types.ts`.
- Static SJSU dataset in `src/data/sjsu-sample-dataset.json`.
- Adapter-shaped SJSU normalization in `src/importers/sjsu/normalize.ts`.
- Predictor evidence shown in UI result cards.
- Explicit empty states for missing course and missing historical instructor data.

- [ ] **Step 4: Create final commit if review changes were needed**

If Step 3 required fixes, stage the MVP files that can be affected by the review:

```bash
git add src/domain/types.ts src/domain/search.ts src/domain/predictor.ts src/data/loadDataset.ts src/data/sjsu-sample-dataset.json src/importers/sjsu/normalize.ts src/App.tsx src/styles.css README.md
git commit -m "chore: polish instructor finder MVP"
```

If no fixes were needed, do not create an empty commit.

## Self-Review Notes

- Spec coverage: Tasks 2 through 6 cover normalized entities, static data, search, prediction, evidence, UI, and empty states. Task 5 covers the adapter-shaped SJSU importer boundary. Task 7 covers documented verification.
- Scope: The plan intentionally excludes ratings, accounts, student submissions, scheduled ingestion, and multi-school scraping.
- Type consistency: The types used by `search.ts`, `predictor.ts`, `loadDataset.ts`, and `App.tsx` all come from `src/domain/types.ts`.
- Verification path: `npm test`, `npm run build`, and `npm run e2e` are the final commands.
