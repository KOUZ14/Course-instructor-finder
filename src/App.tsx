import { type FormEvent, useMemo, useState } from "react";
import { loadDataset } from "./data/loadDataset";
import { predictInstructors } from "./domain/predictor";
import { parseSearchInput, type SearchValidationErrors } from "./domain/search";
import type { EvidenceRow, MeetingMode, PredictionResponse } from "./domain/types";

const DEFAULT_SCHOOL_ID = "sjsu";
const DEFAULT_TERM_ID = "sjsu-2026-fall";
const DEFAULT_DAYS = ["M", "W"];
const DEFAULT_START_TIME = "09:00";
const GENERIC_PREDICTION_ERROR = "We could not generate a prediction right now. Please try again later.";

const meetingModeOptions: { value: MeetingMode | ""; label: string }[] = [
  { value: "", label: "Any mode" },
  { value: "in-person", label: "In person" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

const selectableMeetingModes = new Set<MeetingMode>(["in-person", "online", "hybrid", "unknown"]);

/**
 * Renders the student-facing course search and instructor prediction results.
 */
export default function App() {
  const dataset = useMemo(() => loadDataset(), []);
  const [subject, setSubject] = useState("CS");
  const [courseNumber, setCourseNumber] = useState("146");
  const [mode, setMode] = useState<MeetingMode | "">("in-person");
  const [errors, setErrors] = useState<SearchValidationErrors>({});
  const [response, setResponse] = useState<PredictionResponse | undefined>();
  const [predictionError, setPredictionError] = useState<string | undefined>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = parseSearchInput({
      schoolId: DEFAULT_SCHOOL_ID,
      termId: DEFAULT_TERM_ID,
      subject,
      courseNumber,
      mode,
      days: DEFAULT_DAYS,
      startTime: DEFAULT_START_TIME,
    });

    if (!parsed.ok) {
      setErrors(parsed.errors);
      setResponse(undefined);
      setPredictionError(undefined);
      return;
    }

    setErrors({});
    setPredictionError(undefined);

    try {
      setResponse(predictInstructors(dataset, parsed.query));
    } catch (error: unknown) {
      setResponse(undefined);
      setPredictionError(formatPredictionError(error));
    }
  }

  return (
    <main className="app-shell">
      <section className="search-panel" aria-labelledby="page-title">
        <p className="app-kicker">San Jose State University MVP</p>
        <h1 id="page-title">Find likely instructors before registration opens.</h1>
        <p className="intro-copy">
          Search the current public sample dataset for historical teaching patterns and transparent evidence.
        </p>

        <form className="search-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>School</span>
            <select value={DEFAULT_SCHOOL_ID} disabled>
              <option value={DEFAULT_SCHOOL_ID}>San Jose State University</option>
            </select>
          </label>

          <label className="form-field">
            <span>Term</span>
            <select value={DEFAULT_TERM_ID} disabled>
              <option value={DEFAULT_TERM_ID}>Fall 2026</option>
            </select>
          </label>

          <label className="form-field">
            <span>Subject</span>
            <input
              aria-describedby={errors.subject ? "subject-error" : undefined}
              aria-invalid={Boolean(errors.subject)}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
            {errors.subject ? (
              <span className="field-error" id="subject-error" role="alert">
                {errors.subject}
              </span>
            ) : null}
          </label>

          <label className="form-field">
            <span>Course number</span>
            <input
              aria-describedby={errors.courseNumber ? "course-number-error" : undefined}
              aria-invalid={Boolean(errors.courseNumber)}
              value={courseNumber}
              onChange={(event) => setCourseNumber(event.target.value)}
            />
            {errors.courseNumber ? (
              <span className="field-error" id="course-number-error" role="alert">
                {errors.courseNumber}
              </span>
            ) : null}
          </label>

          <label className="form-field">
            <span>Mode</span>
            <select value={mode} onChange={(event) => setMode(parseModeSelectValue(event.target.value))}>
              {meetingModeOptions.map((option) => (
                <option key={option.value || "any"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit">Find likely instructors</button>
        </form>
      </section>

      <section className="results-panel" aria-live="polite" aria-label="Prediction results">
        <ResultsContent predictionError={predictionError} response={response} />
      </section>
    </main>
  );
}

/**
 * Renders the result list or the appropriate empty state for the current search.
 */
function ResultsContent({
  predictionError,
  response,
}: {
  predictionError: string | undefined;
  response: PredictionResponse | undefined;
}) {
  if (predictionError) {
    return (
      <p className="empty-state error-state" role="alert">
        {predictionError}
      </p>
    );
  }

  if (!response) {
    return (
      <p className="empty-state">Search for a course to see likely instructors and the evidence behind each result.</p>
    );
  }

  if (response.status === "empty") {
    return <p className="empty-state">{response.message}</p>;
  }

  return (
    <div className="results-list">
      {response.results.map((result) => (
        <article className="result-card" key={result.instructorId}>
          <div className="result-header">
            <div>
              <h2>{result.instructorName}</h2>
              <p className="confidence">{result.confidence} confidence</p>
            </div>
            <p className="score">Score: {result.score}</p>
          </div>

          <h3>Evidence</h3>
          <ul className="evidence-list">
            {result.evidence.map((row) => (
              <li key={row.assignmentId}>{formatEvidence(row)}</li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

/**
 * Formats an evidence row as a compact, scannable sentence.
 */
function formatEvidence(row: EvidenceRow): string {
  const days = row.days.length > 0 ? row.days.join("") : "days unavailable";
  const timeRange = formatTimeRange(row.startTime, row.endTime);

  return `${row.termLabel}: ${row.courseLabel} section ${row.sectionNumber}, ${row.mode}, ${days}${timeRange}`;
}

/**
 * Formats optional meeting times without leaking undefined values into the UI.
 */
function formatTimeRange(startTime: string | undefined, endTime: string | undefined): string {
  if (!startTime && !endTime) return "";
  if (startTime && endTime) return ` ${startTime}-${endTime}`;
  if (startTime) return ` starts ${startTime}`;

  return ` ends ${endTime}`;
}

/**
 * Parses the mode select's string value into the domain meeting-mode type.
 */
function parseModeSelectValue(value: string): MeetingMode | "" {
  if (value === "" || isMeetingMode(value)) {
    return value;
  }

  throw new Error(`Unexpected meeting mode selected: ${value}`);
}

function isMeetingMode(value: string): value is MeetingMode {
  return selectableMeetingModes.has(value as MeetingMode);
}

/**
 * Formats unknown predictor failures for explicit user-facing display.
 */
function formatPredictionError(error: unknown): string {
  if (error instanceof Error) {
    return `We could not generate a prediction right now. ${error.message}`;
  }

  return GENERIC_PREDICTION_ERROR;
}
