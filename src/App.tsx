import { type FormEvent, useMemo, useState } from "react";
import { loadDataset } from "./data/loadDataset";
import { predictInstructors } from "./domain/predictor";
import { parseSearchInput, type SearchValidationErrors } from "./domain/search";
import type { EvidenceRow, MeetingMode, PredictionResponse, ScoreFactors } from "./domain/types";

const DEFAULT_SCHOOL_ID = "sjsu";
const DEFAULT_TERM_ID = "sjsu-2026-fall";
const GENERIC_PREDICTION_ERROR = "We could not generate a prediction right now. Please try again later.";
const dayOptions = ["M", "T", "W", "R", "F"] as const;
const seasonSortOrder = new Map([
  ["winter", 1],
  ["spring", 2],
  ["summer", 3],
  ["fall", 4],
]);

const meetingModeOptions: { value: MeetingMode | ""; label: string }[] = [
  { value: "", label: "Any mode" },
  { value: "in-person", label: "In person" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

const coursePresets = [
  { subject: "CS", courseNumber: "146", label: "CS 146" },
  { subject: "CS", courseNumber: "157A", label: "CS 157A" },
  { subject: "CS", courseNumber: "151", label: "CS 151" },
] as const;

const selectableMeetingModes = new Set<MeetingMode>(["in-person", "online", "hybrid", "unknown"]);
const factorLabels: Record<keyof ScoreFactors, string> = {
  sameCourse: "Same course",
  recency: "Recent history",
  seasonMatch: "Same season",
  componentMatch: "Component",
  modeMatch: "Format",
  meetingPatternMatch: "Schedule fit",
};

/**
 * Renders the student-facing course search and instructor prediction results.
 */
export default function App() {
  const dataset = useMemo(() => loadDataset(), []);
  const termOptions = useMemo(
    () =>
      dataset.terms
        .filter((term) => term.schoolId === DEFAULT_SCHOOL_ID)
        .sort(
          (left, right) =>
            right.year - left.year ||
            (seasonSortOrder.get(right.season) ?? 0) - (seasonSortOrder.get(left.season) ?? 0),
        ),
    [dataset.terms],
  );
  const [subject, setSubject] = useState("CS");
  const [courseNumber, setCourseNumber] = useState("146");
  const [termId, setTermId] = useState(DEFAULT_TERM_ID);
  const [mode, setMode] = useState<MeetingMode | "">("in-person");
  const [selectedDays, setSelectedDays] = useState<string[]>(["M", "W"]);
  const [startTime, setStartTime] = useState("09:00");
  const [errors, setErrors] = useState<SearchValidationErrors>({});
  const [response, setResponse] = useState<PredictionResponse | undefined>();
  const [predictionError, setPredictionError] = useState<string | undefined>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = parseSearchInput({
      schoolId: DEFAULT_SCHOOL_ID,
      termId,
      subject,
      courseNumber,
      mode,
      days: selectedDays,
      startTime,
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
    } catch {
      setResponse(undefined);
      setPredictionError(formatPredictionError());
    }
  }

  return (
    <main className="app-shell">
      <section className="hero-panel reveal-block" aria-labelledby="page-title">
        <nav className="nav-island" aria-label="Product">
          <span className="brand-mark">CIF</span>
          <span>Course Instructor Finder</span>
        </nav>

        <div className="hero-copy">
          <h1 id="page-title">Find likely instructors before registration.</h1>
          <p className="intro-copy">
            Search a course and compare the historical evidence behind each prediction. Currently supports San Jose
            State University (SJSU) only.
          </p>
        </div>
      </section>

      <div className={`workbench ${response || predictionError ? "workbench-has-output" : ""}`}>
        <section className="search-panel reveal-block" aria-labelledby="search-title">
          <div className="panel-shell">
            <div className="panel-core">
              <div className="panel-heading">
                <p className="panel-eyebrow">Class lookup</p>
                <h2 id="search-title">Start with the course</h2>
                <p>Use a preset or type your class, then add the meeting pattern if you know it.</p>
              </div>

              <form className="search-form" onSubmit={handleSubmit}>
                <label className="form-field optional-mobile-field">
                  <span>Term</span>
                  <select value={termId} onChange={(event) => setTermId(event.target.value)}>
                    {termOptions.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="course-row">
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
                </div>

                <div className="preset-row optional-mobile-field" aria-label="Popular course presets">
                  {coursePresets.map((preset) => (
                    <button
                      className="preset-chip"
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setSubject(preset.subject);
                        setCourseNumber(preset.courseNumber);
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <label className="form-field optional-mobile-field">
                  <span>Mode</span>
                  <select value={mode} onChange={(event) => setMode(parseModeSelectValue(event.target.value))}>
                    {meetingModeOptions.map((option) => (
                      <option key={option.value || "any"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset className="form-field day-field optional-mobile-field">
                  <legend>Meeting days</legend>
                  <div className="day-options">
                    {dayOptions.map((day) => (
                      <label className="day-option" key={day}>
                        <input
                          checked={selectedDays.includes(day)}
                          type="checkbox"
                          value={day}
                          onChange={() => setSelectedDays(toggleDay(selectedDays, day))}
                        />
                        <span>{day}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="form-field optional-mobile-field">
                  <span>Start time</span>
                  <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                </label>

                <button className="primary-action" type="submit">
                  <span>Find likely instructors</span>
                  <span aria-hidden="true" className="button-orbit">
                    →
                  </span>
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="results-panel reveal-block" aria-live="polite" aria-label="Prediction results">
          <div className="panel-shell results-shell">
            <div className="panel-core results-core">
              <ResultsContent predictionError={predictionError} response={response} />
            </div>
          </div>
        </section>
      </div>
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
      <div className="empty-state error-state" role="alert">
        <p className="panel-eyebrow">Prediction unavailable</p>
        <h2>Something blocked this search.</h2>
        <p>{predictionError}</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="empty-state">
        <p className="panel-eyebrow">Ready when you are</p>
        <h2>Search results will land here.</h2>
        <p>Run a course search to see likely instructors, confidence, score factors, and the evidence behind each result.</p>
      </div>
    );
  }

  if (response.status === "empty") {
    return (
      <div className="empty-state">
        <p className="panel-eyebrow">No match</p>
        <h2>No prediction available yet.</h2>
        <p>{response.message}</p>
      </div>
    );
  }

  return (
    <div className="results-list">
      <div className="results-summary">
        <div>
          <p className="panel-eyebrow">Best bets</p>
          <h2>{response.results.length} possible instructor{response.results.length === 1 ? "" : "s"}</h2>
        </div>
        <p>Ranked by course history, recency, format, and meeting-pattern fit.</p>
      </div>

      {response.results.map((result, index) => (
        <article className={`result-card ${index === 0 ? "top-result" : ""}`} key={result.instructorId}>
          <div className="result-header">
            <div>
              {index === 0 ? <p className="result-rank">Most likely</p> : null}
              <h2>{result.instructorName}</h2>
              <p className={`confidence confidence-${result.confidence.toLowerCase()}`}>{result.confidence} confidence</p>
            </div>
            <p className="score">Score: {result.score}</p>
          </div>

          <div className="factor-list" aria-label={`Score factors for ${result.instructorName}`}>
            {formatScoreFactors(result.factors).map((factor) => (
              <span key={factor.label}>
                {factor.label}: {factor.value}
              </span>
            ))}
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
 * Converts score factors into labeled, whole-number chips for quick scanning.
 */
function formatScoreFactors(factors: ScoreFactors): { label: string; value: number }[] {
  return Object.entries(factors).map(([key, value]) => ({
    label: factorLabels[key as keyof ScoreFactors],
    value,
  }));
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

function toggleDay(days: string[], day: string): string[] {
  if (days.includes(day)) {
    return days.filter((candidate) => candidate !== day);
  }

  return [...days, day].sort((left, right) => dayOptions.indexOf(left as (typeof dayOptions)[number]) - dayOptions.indexOf(right as (typeof dayOptions)[number]));
}

/**
 * Formats unknown predictor failures for explicit user-facing display.
 */
function formatPredictionError(): string {
  return GENERIC_PREDICTION_ERROR;
}
