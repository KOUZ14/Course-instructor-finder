import { readFileSync, writeFileSync } from "node:fs";

const DEFAULT_DATASET_PATH = "src/data/sjsu-sample-dataset.json";

const inputPath = process.argv[2] ?? DEFAULT_DATASET_PATH;
const outputPath = process.argv[3] ?? inputPath;

const dataset = JSON.parse(readFileSync(inputPath, "utf8"));
const placeholderInstructorIds = new Set(
  dataset.instructors
    .filter((instructor) => isPlaceholderInstructor(instructor.displayName))
    .map((instructor) => instructor.id),
);

dataset.instructors = dataset.instructors.filter((instructor) => !placeholderInstructorIds.has(instructor.id));
dataset.teachingAssignments = dataset.teachingAssignments.filter(
  (assignment) => !placeholderInstructorIds.has(assignment.instructorId),
);

writeFileSync(outputPath, `${JSON.stringify(dataset)}\n`);

console.log(
  `Prepared ${outputPath}: ${dataset.terms.length} terms, ${dataset.courses.length} courses, ` +
    `${dataset.sections.length} sections, ${dataset.instructors.length} instructors, ` +
    `${dataset.teachingAssignments.length} teaching assignments.`,
);

function isPlaceholderInstructor(value) {
  const normalized = value
    .trim()
    .replace(/\s*\/+\s*$/g, "")
    .toLowerCase();

  return normalized === "" || normalized === "tba" || normalized === "staff";
}
