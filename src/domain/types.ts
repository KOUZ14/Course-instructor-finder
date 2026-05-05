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
