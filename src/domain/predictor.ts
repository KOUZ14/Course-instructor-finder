import { findCourse } from "./search";
import type {
  CourseDataset,
  EvidenceRow,
  PredictionResponse,
  PredictionResult,
  ScoreFactors,
  SearchQuery,
  Season,
  TeachingAssignment,
} from "./types";

const MINIMUM_SCORE = 45;

interface AssignmentContext {
  assignment: TeachingAssignment;
  evidence: EvidenceRow;
  factors: ScoreFactors;
  score: number;
}

/**
 * Predicts likely instructors from historical teaching assignments.
 */
export function predictInstructors(dataset: CourseDataset, query: SearchQuery): PredictionResponse {
  const targetTerm = dataset.terms.find((term) => term.id === query.termId && term.schoolId === query.schoolId);
  if (!targetTerm) {
    throw new Error(`Target term ${query.termId} is not available in the dataset.`);
  }

  const course = findCourse(dataset, query.schoolId, query.subject, query.courseNumber);

  if (!course) {
    return {
      status: "empty",
      reason: "course_not_found",
      message: `${query.subject} ${query.courseNumber} is not available in the current dataset.`,
    };
  }

  const assignments = dataset.teachingAssignments.filter((assignment) => assignmentBelongsToCourse(dataset, assignment, course.id));

  if (assignments.length === 0) {
    return {
      status: "empty",
      reason: "no_historical_instructor_data",
      message: `${course.subject} ${course.number} exists, but there is no historical instructor data for it yet.`,
    };
  }

  const contexts = assignments.map((assignment) =>
    buildAssignmentContext(dataset, assignment, query, targetTerm.season, targetTerm.year),
  );

  const byInstructor = new Map<string, PredictionResult>();

  for (const context of contexts) {
    const existing = byInstructor.get(context.assignment.instructorId);
    if (!existing) {
      byInstructor.set(context.assignment.instructorId, {
        instructorId: context.assignment.instructorId,
        instructorName: context.evidence.instructorName,
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
  targetSeason: Season,
  targetYear: number,
): AssignmentContext {
  const section = dataset.sections.find((candidate) => candidate.id === assignment.sectionId);
  const term = dataset.terms.find((candidate) => candidate.id === assignment.termId);
  const course = dataset.courses.find((candidate) => candidate.id === assignment.courseId);
  const instructor = dataset.instructors.find((candidate) => candidate.id === assignment.instructorId);

  if (!section) throw new Error(`Assignment ${assignment.id} references missing section ${assignment.sectionId}.`);
  if (!term) throw new Error(`Assignment ${assignment.id} references missing term ${assignment.termId}.`);
  if (!course) throw new Error(`Assignment ${assignment.id} references missing course ${assignment.courseId}.`);
  if (!instructor) {
    throw new Error(`Assignment ${assignment.id} references missing instructor ${assignment.instructorId}.`);
  }

  if (section.courseId !== assignment.courseId) {
    throw new Error(
      `Assignment ${assignment.id} references section ${section.id} with courseId ${section.courseId}, but assignment courseId is ${assignment.courseId}.`,
    );
  }

  if (section.termId !== assignment.termId) {
    throw new Error(
      `Assignment ${assignment.id} references section ${section.id} with termId ${section.termId}, but assignment termId is ${assignment.termId}.`,
    );
  }

  if (course.schoolId !== term.schoolId) {
    throw new Error(
      `Assignment ${assignment.id} references course ${course.id} from school ${course.schoolId} and term ${term.id} from school ${term.schoolId}.`,
    );
  }

  if (course.schoolId !== instructor.schoolId) {
    throw new Error(
      `Assignment ${assignment.id} references course ${course.id} from school ${course.schoolId} and instructor ${instructor.id} from school ${instructor.schoolId}.`,
    );
  }

  const yearsOld = Math.max(0, targetYear - term.year);
  const recency = Math.max(0, 25 - yearsOld * 7);
  const seasonMatch = term.season === targetSeason ? 15 : 0;
  const componentMatch = section.componentType === "lecture" ? 8 : 0;
  const modeMatch = query.mode && section.mode === query.mode ? 12 : 0;
  const meetingPatternMatch =
    query.days &&
    query.days.length > 0 &&
    query.startTime &&
    sameMeetingPattern(section.days, query.days) &&
    section.startTime === query.startTime
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
      days: [...section.days],
      startTime: section.startTime,
      endTime: section.endTime,
    },
  };
}

function assignmentBelongsToCourse(
  dataset: CourseDataset,
  assignment: TeachingAssignment,
  courseId: string,
): boolean {
  if (assignment.courseId === courseId) {
    return true;
  }

  const section = dataset.sections.find((candidate) => candidate.id === assignment.sectionId);

  return section?.courseId === courseId;
}

function sameMeetingPattern(left: string[], right: string[]): boolean {
  const leftDays = normalizedDaySet(left);
  const rightDays = normalizedDaySet(right);

  if (!leftDays || !rightDays || leftDays.size !== rightDays.size) {
    return false;
  }

  return [...leftDays].every((day) => rightDays.has(day));
}

function normalizedDaySet(days: string[]): Set<string> | undefined {
  const normalizedDays = days.map((day) => day.trim().toUpperCase()).filter((day) => day.length > 0);
  const uniqueDays = new Set(normalizedDays);

  if (uniqueDays.size !== normalizedDays.length) {
    return undefined;
  }

  return uniqueDays;
}

function confidenceFor(score: number, evidenceCount: number): "High" | "Medium" | "Low" {
  if (score >= 130 && evidenceCount >= 2) return "High";
  if (score >= 70) return "Medium";
  return "Low";
}
