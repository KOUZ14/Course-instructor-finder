import { type FormEvent, type KeyboardEvent, useMemo, useState } from "react";
import { loadDataset } from "./data/loadDataset";
import { predictInstructors } from "./domain/predictor";
import { parseSearchInput, type SearchValidationErrors } from "./domain/search";
import type {
  Course,
  CourseDataset,
  EvidenceRow,
  Instructor,
  MeetingMode,
  PredictionResponse,
  PredictionResult,
  ScoreFactors,
  TeachingAssignment,
} from "./domain/types";

const DEFAULT_SCHOOL_ID = "sjsu";
const DEFAULT_TERM_ID = "sjsu-2026-fall";
const GENERIC_PREDICTION_ERROR = "We could not generate a prediction right now. Please try again later.";

const seasonSortOrder = new Map([
  ["winter", 1],
  ["spring", 2],
  ["summer", 3],
  ["fall", 4],
]);

const coursePresets = [
  { subject: "CS", courseNumber: "146", label: "CS 146" },
  { subject: "CS", courseNumber: "157A", label: "CS 157A" },
  { subject: "CS", courseNumber: "151", label: "CS 151" },
  { subject: "CS", courseNumber: "149", label: "CS 149" },
  { subject: "CS", courseNumber: "152", label: "CS 152" },
] as const;

const factorLabels: Record<keyof ScoreFactors, string> = {
  sameCourse: "Same course",
  recency: "Recent history",
  seasonMatch: "Same season",
  componentMatch: "Component",
  modeMatch: "Format",
  meetingPatternMatch: "Schedule fit",
};

type SortKey = "scheduleFit" | "history" | "recent" | "name";
type ModalState =
  | { kind: "profile"; result: PredictionResult }
  | { kind: "sections"; result: PredictionResult }
  | { kind: "score"; result: PredictionResult }
  | undefined;

interface DisplayData {
  scheduleConfidence: number;
  evidenceCount: number;
  recentTermLabel: string;
  formatSummary: string;
  scheduleFitLabel: string;
  scheduleFitColor: string;
  evidenceSummary: string;
}

interface ActiveFilters {
  minScheduleConfidence: number;
  morningOnly: boolean;
}

interface InstructorViewModel {
  result: PredictionResult;
  display: DisplayData;
  matchScore: number;
}

interface DatasetIndexes {
  coursesById: Map<string, Course>;
  instructorsById: Map<string, Instructor>;
  sectionsById: Map<string, CourseDataset["sections"][number]>;
  termsById: Map<string, CourseDataset["terms"][number]>;
  assignmentsByInstructorId: Map<string, TeachingAssignment[]>;
}

const emptyFilters: ActiveFilters = {
  minScheduleConfidence: 0,
  morningOnly: false,
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = ["#3B82F6", "#8B5CF6", "#EC4899", "#0891B2", "#059669", "#D97706", "#DC2626"];

function getAvatarColor(id: string): string {
  return AVATAR_COLORS[hashStr(id) % AVATAR_COLORS.length];
}

function buildDisplayData(result: PredictionResult): DisplayData {
  const scheduleConfidence = Math.min(98, Math.max(50, Math.round(50 + Math.min(result.score, 170) / 170 * 48)));
  const recentTermLabel = result.evidence[0]?.termLabel ?? "No historical term";
  const modes = [...new Set(result.evidence.map((row) => row.mode))].filter((mode) => mode !== "unknown");
  const formatSummary = modes.length > 0 ? modes.join(", ") : "Format varies";
  const scheduleFitLabel =
    result.confidence === "High" ? "Strong schedule fit" : result.confidence === "Medium" ? "Moderate schedule fit" : "Limited schedule fit";
  const scheduleFitColor = result.confidence === "High" ? "#059669" : result.confidence === "Medium" ? "#D97706" : "#DC2626";
  const evidenceSummary =
    result.evidence.length > 0
      ? `${result.instructorName} appears in ${result.evidence.length} imported SJSU schedule record${result.evidence.length === 1 ? "" : "s"}, most recently ${recentTermLabel}.`
      : `${result.instructorName} is in the imported instructor directory, but no schedule evidence is attached yet.`;

  return {
    scheduleConfidence,
    evidenceCount: result.evidence.length,
    recentTermLabel,
    formatSummary,
    scheduleFitLabel,
    scheduleFitColor,
    evidenceSummary,
  };
}

function buildIndexes(dataset: CourseDataset): DatasetIndexes {
  const assignmentsByInstructorId = new Map<string, TeachingAssignment[]>();
  for (const assignment of dataset.teachingAssignments) {
    const existing = assignmentsByInstructorId.get(assignment.instructorId) ?? [];
    existing.push(assignment);
    assignmentsByInstructorId.set(assignment.instructorId, existing);
  }

  return {
    coursesById: new Map(dataset.courses.map((course) => [course.id, course])),
    instructorsById: new Map(dataset.instructors.map((instructor) => [instructor.id, instructor])),
    sectionsById: new Map(dataset.sections.map((section) => [section.id, section])),
    termsById: new Map(dataset.terms.map((term) => [term.id, term])),
    assignmentsByInstructorId,
  };
}

function buildInstructorResultFromDataset(indexes: DatasetIndexes, instructor: Instructor): PredictionResult {
  const assignments = indexes.assignmentsByInstructorId.get(instructor.id) ?? [];
  const evidence = assignments.flatMap((assignment): EvidenceRow[] => {
    const section = indexes.sectionsById.get(assignment.sectionId);
    const term = indexes.termsById.get(assignment.termId);
    const course = indexes.coursesById.get(assignment.courseId);
    if (!section || !term || !course) return [];

    return [
      {
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
    ];
  });

  const score = Math.min(180, 60 + evidence.length * 8);
  const factors: ScoreFactors = {
    sameCourse: Math.min(40, evidence.length * 4),
    recency: Math.min(25, evidence.length * 3),
    seasonMatch: 10,
    componentMatch: 8,
    modeMatch: 8,
    meetingPatternMatch: 5,
  };

  return {
    instructorId: instructor.id,
    instructorName: instructor.displayName,
    score,
    confidence: evidence.length >= 5 ? "High" : evidence.length >= 2 ? "Medium" : "Low",
    factors,
    evidence,
  };
}

function formatEvidence(row: EvidenceRow): string {
  const days = row.days.length > 0 ? row.days.join("") : "days unavailable";
  const timeRange = formatTimeRange(row.startTime, row.endTime);
  return `${row.termLabel}: ${row.courseLabel} section ${row.sectionNumber}, ${row.mode}, ${days}${timeRange}`;
}

function formatTimeRange(startTime: string | undefined, endTime: string | undefined): string {
  if (!startTime && !endTime) return "";
  if (startTime && endTime) return ` ${startTime}-${endTime}`;
  if (startTime) return ` starts ${startTime}`;
  return ` ends ${endTime}`;
}

function formatDisplayTime(t: string | undefined): string {
  if (!t) return "TBA";
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatScoreFactors(factors: ScoreFactors): { label: string; value: number }[] {
  return Object.entries(factors).map(([key, value]) => ({
    label: factorLabels[key as keyof ScoreFactors],
    value,
  }));
}

function parseModeSelectValue(value: string): MeetingMode | "" {
  if (value === "" || isMeetingMode(value)) return value;
  throw new Error(`Unexpected meeting mode: ${value}`);
}

function isMeetingMode(value: string): value is MeetingMode {
  return new Set<string>(["in-person", "online", "hybrid", "unknown"]).has(value);
}

function toViewModel(result: PredictionResult): InstructorViewModel {
  const display = buildDisplayData(result);
  return {
    result,
    display,
    matchScore: display.scheduleConfidence,
  };
}

function morningMatches(result: PredictionResult, morningOnly: boolean): boolean {
  if (!morningOnly) return true;
  return result.evidence.some((row) => {
    if (!row.startTime) return false;
    return Number(row.startTime.split(":")[0]) < 12;
  });
}

function applyFilters(viewModels: InstructorViewModel[], filters: ActiveFilters): InstructorViewModel[] {
  return viewModels.filter(
    ({ result, display }) =>
      display.scheduleConfidence >= filters.minScheduleConfidence && morningMatches(result, filters.morningOnly),
  );
}

function sortViewModels(viewModels: InstructorViewModel[], sortKey: SortKey): InstructorViewModel[] {
  const sorted = [...viewModels];
  sorted.sort((left, right) => {
    if (sortKey === "history") return right.display.evidenceCount - left.display.evidenceCount || right.result.score - left.result.score;
    if (sortKey === "recent") return left.display.recentTermLabel.localeCompare(right.display.recentTermLabel);
    if (sortKey === "name") return left.result.instructorName.localeCompare(right.result.instructorName);
    return right.display.scheduleConfidence - left.display.scheduleConfidence || right.result.score - left.result.score;
  });
  return sorted;
}

function findCourseByQuery(dataset: CourseDataset, query: string): Course | undefined {
  const normalized = query.trim().toLowerCase();
  const courseCode = normalized.match(/^([a-z]+)\s*-?\s*([0-9][a-z0-9]*)$/i);
  if (courseCode) {
    const [, subject, number] = courseCode;
    return dataset.courses.find(
      (course) => course.subject.toLowerCase() === subject.toLowerCase() && course.number.toLowerCase() === number.toLowerCase(),
    );
  }

  return dataset.courses.find((course) => {
    const code = `${course.subject} ${course.number}`.toLowerCase();
    return code.includes(normalized) || course.title.toLowerCase().includes(normalized);
  });
}

export default function App() {
  const dataset = useMemo(() => loadDataset(), []);
  const indexes = useMemo(() => buildIndexes(dataset), [dataset]);
  const termOptions = useMemo(
    () =>
      dataset.terms
        .filter((t) => t.schoolId === DEFAULT_SCHOOL_ID)
        .sort((a, b) => b.year - a.year || (seasonSortOrder.get(b.season) ?? 0) - (seasonSortOrder.get(a.season) ?? 0)),
    [dataset.terms],
  );

  const [subject, setSubject] = useState("CS");
  const [courseNumber, setCourseNumber] = useState("146");
  const [termId, setTermId] = useState(DEFAULT_TERM_ID);
  const [mode, setMode] = useState<MeetingMode | "">("in-person");
  const [selectedDays] = useState<string[]>(["M", "W"]);
  const [startTime] = useState("09:00");
  const [errors, setErrors] = useState<SearchValidationErrors>({});
  const [response, setResponse] = useState<PredictionResponse | undefined>();
  const [predictionError, setPredictionError] = useState<string | undefined>();
  const [draftFilters, setDraftFilters] = useState<ActiveFilters>({
    minScheduleConfidence: 0,
    morningOnly: false,
  });
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(emptyFilters);
  const [sortKey, setSortKey] = useState<SortKey>("scheduleFit");
  const [gridView, setGridView] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [modal, setModal] = useState<ModalState>();

  function runSearch(nextSubject = subject, nextCourseNumber = courseNumber) {
    const parsed = parseSearchInput({
      schoolId: DEFAULT_SCHOOL_ID,
      termId,
      subject: nextSubject,
      courseNumber: nextCourseNumber,
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
      setPredictionError(GENERIC_PREDICTION_ERROR);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch();
  }

  function handleGlobalSearch(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    const query = globalQuery.trim();
    if (!query) return;

    const instructor = dataset.instructors.find((item) => item.displayName.toLowerCase().includes(query.toLowerCase()));
    if (instructor) {
      setModal({ kind: "profile", result: buildInstructorResultFromDataset(indexes, instructor) });
      return;
    }

    const course = findCourseByQuery(dataset, query);
    if (course) {
      setSubject(course.subject);
      setCourseNumber(course.number);
      runSearch(course.subject, course.number);
      return;
    }

    setResponse(undefined);
    setPredictionError(`No matching course or instructor found for "${query}".`);
  }

  const baseResultViewModels = response?.status === "results" ? response.results.map(toViewModel) : [];
  const filteredResultViewModels = sortViewModels(applyFilters(baseResultViewModels, activeFilters), sortKey);
  const topResult = filteredResultViewModels[0]?.result;

  return (
    <div className="cif-layout">
      <header className="cif-topnav">
        <div className="cif-topnav-brand">
          <span className="cif-brand-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3L1 9l11 6 11-6-11-6zM1 9v6m11 0v6M5 11.5v5.5l7 4 7-4V11.5" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="cif-brand-name">Course Instructor Finder</span>
        </div>
        <label className="cif-topnav-search">
          <span className="sr-only">Global search</span>
          <svg className="cif-nav-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="8" stroke="#9CA3AF" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            aria-label="Global search"
            className="cif-global-search-input"
            value={globalQuery}
            onChange={(event) => setGlobalQuery(event.target.value)}
            onKeyDown={handleGlobalSearch}
            placeholder="Search by course code, course name, or instructor"
          />
        </label>
      </header>

      <div className="cif-body">
        <FilterSidebar
          termId={termId}
          termOptions={termOptions}
          setTermId={setTermId}
          draftFilters={draftFilters}
          setDraftFilters={setDraftFilters}
          applyFilters={() => setActiveFilters(draftFilters)}
          clearFilters={() => {
            setDraftFilters(emptyFilters);
            setActiveFilters(emptyFilters);
          }}
        />

        <main className="cif-main">
          <SearchView
            subject={subject}
            courseNumber={courseNumber}
            mode={mode}
            errors={errors}
            response={response}
            predictionError={predictionError}
            resultViewModels={filteredResultViewModels}
            gridView={gridView}
            sortKey={sortKey}
            setSubject={setSubject}
            setCourseNumber={setCourseNumber}
            setMode={setMode}
            setSortKey={setSortKey}
            setGridView={setGridView}
            runSearch={handleSubmit}
            setPreset={(preset) => {
              setSubject(preset.subject);
              setCourseNumber(preset.courseNumber);
            }}
            openModal={setModal}
          />

          <Footer />
        </main>

        <aside className="cif-rec-panel" aria-label="Recommended instructor">
          <RecommendedPanel
            topResult={topResult}
            openModal={setModal}
          />
        </aside>
      </div>

      {modal && <AppModal modal={modal} close={() => setModal(undefined)} />}
    </div>
  );
}

function FilterSidebar({
  termId,
  termOptions,
  setTermId,
  draftFilters,
  setDraftFilters,
  applyFilters,
  clearFilters,
}: {
  termId: string;
  termOptions: CourseDataset["terms"];
  setTermId: (termId: string) => void;
  draftFilters: ActiveFilters;
  setDraftFilters: (filters: ActiveFilters) => void;
  applyFilters: () => void;
  clearFilters: () => void;
}) {
  return (
    <aside className="cif-filter-sidebar" aria-label="Filters">
      <div className="cif-filter-header">
        <h2 className="cif-filter-title">Filters</h2>
        <button className="cif-clear-all" type="button" onClick={clearFilters} aria-label="Clear all filters">Clear all</button>
      </div>

      <div className="cif-filter-section">
        <label className="cif-filter-label" htmlFor="filter-term">Quarter / Semester</label>
        <select id="filter-term" className="cif-filter-select" value={termId} onChange={(e) => setTermId(e.target.value)}>
          {termOptions.map((term) => (
            <option key={term.id} value={term.id}>{term.label}</option>
          ))}
        </select>
      </div>

      <div className="cif-filter-section">
        <div className="cif-filter-label-row">
          <label className="cif-filter-label" htmlFor="minimum-schedule-confidence">Schedule Confidence</label>
          <span className="cif-filter-badge">{draftFilters.minScheduleConfidence}%+</span>
        </div>
        <input
          id="minimum-schedule-confidence"
          aria-label="Minimum schedule confidence"
          type="number"
          className="cif-filter-number"
          min="0"
          max="100"
          step="1"
          value={draftFilters.minScheduleConfidence}
          onChange={(event) => {
            const next = Number(event.target.value);
            setDraftFilters({ ...draftFilters, minScheduleConfidence: Number.isFinite(next) ? next : 0 });
          }}
        />
        <input
          type="range"
          className="cif-rating-slider"
          min="0"
          max="100"
          step="1"
          value={draftFilters.minScheduleConfidence}
          aria-label="Minimum schedule confidence slider"
          onChange={(event) => setDraftFilters({ ...draftFilters, minScheduleConfidence: Number(event.target.value) })}
        />
        <div className="cif-slider-labels"><span>0%</span><span>50%</span><span>100%</span></div>
      </div>

      <div className="cif-filter-section">
        <span className="cif-filter-label">Time Preference</span>
        <label className="cif-checkbox-item">
          <input
            type="checkbox"
            checked={draftFilters.morningOnly}
            onChange={(event) => setDraftFilters({ ...draftFilters, morningOnly: event.target.checked })}
          />
          Morning Classes
        </label>
      </div>

      <button className="cif-apply-btn" type="button" onClick={applyFilters}>Apply Filters</button>
    </aside>
  );
}

function SearchView({
  subject,
  courseNumber,
  mode,
  errors,
  response,
  predictionError,
  resultViewModels,
  gridView,
  sortKey,
  setSubject,
  setCourseNumber,
  setMode,
  setSortKey,
  setGridView,
  runSearch,
  setPreset,
  openModal,
}: {
  subject: string;
  courseNumber: string;
  mode: MeetingMode | "";
  errors: SearchValidationErrors;
  response: PredictionResponse | undefined;
  predictionError: string | undefined;
  resultViewModels: InstructorViewModel[];
  gridView: boolean;
  sortKey: SortKey;
  setSubject: (value: string) => void;
  setCourseNumber: (value: string) => void;
  setMode: (value: MeetingMode | "") => void;
  setSortKey: (value: SortKey) => void;
  setGridView: (value: boolean) => void;
  runSearch: (event: FormEvent<HTMLFormElement>) => void;
  setPreset: (preset: { subject: string; courseNumber: string }) => void;
  openModal: (modal: ModalState) => void;
}) {
  const resultsCount = resultViewModels.length;

  return (
    <>
      <section className="cif-hero" aria-labelledby="cif-hero-title">
        <div className="cif-hero-content">
          <div className="cif-hero-text">
            <h1 id="cif-hero-title" className="cif-hero-heading">Find the right instructor.</h1>
            <p className="cif-hero-subheading"><span className="cif-hero-highlight">Succeed</span> in your classes.</p>
            <p className="cif-hero-desc">Public schedule history. Transparent predictions. Smarter choices.</p>
            <p className="cif-sjsu-note">Currently supports San Jose State University (SJSU) only.</p>
          </div>
          <div className="cif-hero-illustration" aria-hidden="true">
            <svg width="160" height="140" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="80" cy="70" r="60" fill="#EFF6FF" opacity="0.6"/>
              <path d="M80 30L30 55l50 27 50-27-50-27z" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="2"/>
              <path d="M30 55v28M80 82v28M130 55v28" stroke="#93C5FD" strokeWidth="2"/>
              <path d="M112 102l4 4 8-8" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <form className="cif-search-form" onSubmit={runSearch}>
          <label className="sr-only" htmlFor="subject">Subject</label>
          <label className="sr-only" htmlFor="course-number">Course number</label>
          <label className="sr-only" htmlFor="meeting-mode">Meeting mode</label>
          <div className="cif-search-bar">
            <input
              id="subject"
              className="cif-subject-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="CS"
              aria-describedby={errors.subject ? "subject-error" : undefined}
              aria-invalid={Boolean(errors.subject)}
            />
            <span className="cif-search-divider" aria-hidden="true" />
            <input
              id="course-number"
              className="cif-coursenr-input"
              value={courseNumber}
              onChange={(e) => setCourseNumber(e.target.value)}
              placeholder="146"
              aria-describedby={errors.courseNumber ? "course-number-error" : undefined}
              aria-invalid={Boolean(errors.courseNumber)}
            />
            <select id="meeting-mode" className="cif-mode-select" value={mode} onChange={(event) => setMode(parseModeSelectValue(event.target.value))}>
              <option value="">Any format</option>
              <option value="in-person">In person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <button className="cif-search-submit" type="submit" aria-label="Find likely instructors">Search</button>
          </div>
          {errors.subject && <span id="subject-error" role="alert" className="cif-field-error">{errors.subject}</span>}
          {errors.courseNumber && <span id="course-number-error" role="alert" className="cif-field-error">{errors.courseNumber}</span>}
        </form>

        <div className="cif-popular-row">
          <span className="cif-popular-label">Popular:</span>
          {coursePresets.map((p) => (
            <button key={p.label} type="button" className="cif-popular-chip" onClick={() => setPreset(p)}>{p.label}</button>
          ))}
        </div>
      </section>

      {(response || predictionError) && (
        <div className="cif-results-area">
          <div className="cif-results-bar">
            <p className="cif-results-count">
              {response?.status === "results"
                ? `Showing ${resultsCount} instructor${resultsCount === 1 ? "" : "s"} for ${subject.toUpperCase()} ${courseNumber.toUpperCase()}`
                : predictionError ? "Search results" : "No instructors found"}
            </p>
            {response?.status === "results" && (
              <div className="cif-results-controls">
                <select className="cif-sort-select" aria-label="Sort by" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                  <option value="scheduleFit">Sort by: Schedule Fit</option>
                  <option value="history">Sort by: Historical Sections</option>
                  <option value="recent">Sort by: Recent Term</option>
                  <option value="name">Sort by: Instructor Name</option>
                </select>
                <div className="cif-view-toggle" role="group" aria-label="View">
                  <button className={`cif-view-btn${!gridView ? " cif-view-btn--active" : ""}`} type="button" aria-label="List view" onClick={() => setGridView(false)}>List</button>
                  <button className={`cif-view-btn${gridView ? " cif-view-btn--active" : ""}`} type="button" aria-label="Grid view" onClick={() => setGridView(true)}>Grid</button>
                </div>
              </div>
            )}
          </div>

          <ResultsContent
            predictionError={predictionError}
            response={response}
            subject={subject}
            courseNumber={courseNumber}
            resultViewModels={resultViewModels}
            gridView={gridView}
            openModal={openModal}
          />
        </div>
      )}
    </>
  );
}

function ResultsContent({
  predictionError,
  response,
  subject,
  courseNumber,
  resultViewModels,
  gridView,
  openModal,
}: {
  predictionError: string | undefined;
  response: PredictionResponse | undefined;
  subject: string;
  courseNumber: string;
  resultViewModels: InstructorViewModel[];
  gridView: boolean;
  openModal: (modal: ModalState) => void;
}) {
  if (predictionError) {
    return (
      <div className="cif-empty-state" role="alert">
        <h3>Something blocked this search.</h3>
        <p>{predictionError}</p>
      </div>
    );
  }

  if (!response) return null;

  if (response.status === "empty") {
    return (
      <div className="cif-empty-state">
        <h3>No prediction available yet.</h3>
        <p>{response.message}</p>
      </div>
    );
  }

  if (resultViewModels.length === 0) {
    return (
      <div className="cif-empty-state">
        <h3>No instructors match the active filters.</h3>
        <p>Clear filters or lower the schedule-confidence threshold to see more options for {subject.toUpperCase()} {courseNumber.toUpperCase()}.</p>
      </div>
    );
  }

  return (
    <div className={`cif-instructor-list${gridView ? " cif-instructor-list--grid" : ""}`}>
      {resultViewModels.map((viewModel, index) => (
        <InstructorCard
          key={viewModel.result.instructorId}
          viewModel={viewModel}
          rank={index}
          openModal={openModal}
        />
      ))}
    </div>
  );
}

function InstructorCard({
  viewModel,
  rank,
  openModal,
}: {
  viewModel: InstructorViewModel;
  rank: number;
  openModal: (modal: ModalState) => void;
}) {
  const { result, display, matchScore } = viewModel;
  const initials = getInitials(result.instructorName);
  const avatarColor = getAvatarColor(result.instructorId);
  const isTop = rank === 0;

  return (
    <article className={`cif-instructor-card${isTop ? " cif-instructor-card--top" : ""}`}>
      <div className="cif-card-main">
        <div className="cif-card-left">
          <div className="cif-avatar" style={{ background: avatarColor }} aria-hidden="true">{initials}</div>
          {isTop && <span className="cif-most-popular">Best Match</span>}
        </div>

        <div className="cif-card-info">
          <div className="cif-card-name-row">
            <h3 className="cif-instructor-name">{result.instructorName}</h3>
            <span className={`cif-confidence cif-confidence--${result.confidence.toLowerCase()}`}>{result.confidence} confidence</span>
          </div>
          <p className="cif-instructor-title">Imported SJSU instructor record</p>
          <div className="cif-rating-row">
            <span className="cif-source-pill">Schedule-derived</span>
            <span className="cif-rating-num">{display.evidenceCount} historical sections</span>
          </div>
          <p className="cif-match-inline">{matchScore}% schedule confidence</p>
        </div>

        <div className="cif-card-metrics">
          <div className="cif-metric-block">
            <span className="cif-metric-label">Schedule Fit</span>
            <span className="cif-difficulty-num" style={{ color: display.scheduleFitColor }}>{display.scheduleConfidence}%</span>
            <span className="cif-difficulty-label" style={{ color: display.scheduleFitColor }}>{display.scheduleFitLabel}</span>
          </div>

          <div className="cif-metric-block">
            <span className="cif-metric-label">Sections</span>
            <span className="cif-sections-count">{Math.min(result.evidence.length, 3)} sections</span>
            <div className="cif-sections-list">
              {result.evidence.slice(0, 3).map((ev) => (
                <div key={ev.assignmentId} className="cif-section-row">
                  <span>{ev.days.join("/") || "TBA"}</span>
                  <span>{formatDisplayTime(ev.startTime)}</span>
                </div>
              ))}
            </div>
            <button type="button" className="cif-view-all-sections" onClick={() => openModal({ kind: "sections", result })}>View all sections</button>
          </div>
        </div>
      </div>

      <div className="cif-ai-summary">
        <div className="cif-ai-summary-header"><span className="cif-ai-label">Evidence Summary</span></div>
        <p className="cif-ai-text">{display.evidenceSummary}</p>
      </div>

      <div className="cif-card-actions">
        <button type="button" className="cif-secondary-action" onClick={() => openModal({ kind: "profile", result })}>View Full Profile</button>
        <button
          type="button"
          className="cif-secondary-action"
          aria-label={`Open score details for ${result.instructorName}`}
          onClick={() => openModal({ kind: "score", result })}
        >
          Score details
        </button>
      </div>

      <ul className="cif-evidence-list sr-only">
        {result.evidence.map((row) => <li key={row.assignmentId}>{formatEvidence(row)}</li>)}
      </ul>
    </article>
  );
}

function RecommendedPanel({
  topResult,
  openModal,
}: {
  topResult: PredictionResult | undefined;
  openModal: (modal: ModalState) => void;
}) {
  if (!topResult) {
    return (
      <div className="cif-rec-empty">
        <p className="cif-rec-empty-text">Search for a course to see the recommended instructor</p>
      </div>
    );
  }

  const viewModel = toViewModel(topResult);
  const { display, matchScore } = viewModel;
  const initials = getInitials(topResult.instructorName);
  const avatarColor = getAvatarColor(topResult.instructorId);
  const reasons = [
    `${display.evidenceCount} imported schedule records for this instructor`,
    `Most recent evidence: ${display.recentTermLabel}`,
    `Observed format: ${display.formatSummary}`,
    `${display.scheduleConfidence}% schedule-confidence score`,
  ];

  return (
    <div className="cif-rec-content">
      <div className="cif-rec-header"><span>Recommended Instructor</span></div>
      <div className="cif-rec-profile">
        <div className="cif-rec-avatar-wrap">
          <div className="cif-rec-avatar" style={{ background: avatarColor }}>{initials}</div>
        </div>
        <h3 className="cif-rec-name">Recommended: {topResult.instructorName}</h3>
        <div className="cif-rec-rating"><span className="cif-rec-star">*</span><span>{display.evidenceCount} historical sections</span></div>
        <span className="cif-rec-badge">Best Schedule Match</span>
      </div>
      <div className="cif-rec-reasons">
        <p className="cif-rec-reasons-label">Why we recommend {topResult.instructorName.split(" ")[0]}</p>
        <ul className="cif-rec-reason-list">
          {reasons.map((reason) => <li key={reason} className="cif-rec-reason-item">{reason}</li>)}
        </ul>
      </div>
      <button className="cif-rec-profile-btn" type="button" onClick={() => openModal({ kind: "profile", result: topResult })}>View Full Profile</button>
      <div className="cif-rec-match-score">
        <div className="cif-rec-match-header"><span>Match Score</span></div>
        <div className="cif-match-row">
          <div className="cif-donut-wrap" aria-label={`${matchScore}% match`}><span className="cif-donut-text">{matchScore}%</span></div>
          <div className="cif-match-text">
            <p className="cif-match-desc">Based only on imported SJSU schedule evidence.</p>
            <button className="cif-match-link" type="button" onClick={() => openModal({ kind: "score", result: topResult })}>How is this calculated?</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppModal({ modal, close }: { modal: Exclude<ModalState, undefined>; close: () => void }) {
  const display = buildDisplayData(modal.result);
  return (
    <div className="cif-modal-backdrop" role="presentation">
      <section className="cif-modal" role="dialog" aria-modal="true">
        <button type="button" className="cif-modal-close" aria-label="Close dialog" onClick={close}>Close</button>
        {modal.kind === "profile" && (
          <>
            <h1>Instructor Profile: {modal.result.instructorName}</h1>
            <p>
              Imported SJSU instructor record. {display.evidenceCount} imported historical schedule record
              {display.evidenceCount === 1 ? "" : "s"}; most recent evidence is {display.recentTermLabel}.
            </p>
            <h2>Historical teaching evidence</h2>
            <EvidenceList evidence={modal.result.evidence} />
            <h2>Student reviews</h2>
            <p>Coming soon. Student reviews are not available from the imported SJSU class schedules.</p>
            <h2>Grade distribution</h2>
            <p>Coming soon. Grade distribution data is not imported yet.</p>
          </>
        )}
        {modal.kind === "sections" && (
          <>
            <h1>Sections for {modal.result.instructorName}</h1>
            <p>Meeting pattern</p>
            <EvidenceList evidence={modal.result.evidence} />
          </>
        )}
        {modal.kind === "score" && (
          <>
            <h1>Match Score</h1>
            <p>This deterministic score combines schedule evidence, recency, season fit, format, and meeting-pattern similarity.</p>
            <div className="cif-factor-list">
              {formatScoreFactors(modal.result.factors).map((factor) => (
                <span key={factor.label} className="cif-factor-chip">
                  <strong>{factor.label}</strong>
                  <span>{factor.value}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function EvidenceList({ evidence }: { evidence: EvidenceRow[] }) {
  if (evidence.length === 0) return <p>No historical sections are available for this instructor yet.</p>;
  return (
    <ul className="cif-modal-list">
      {evidence.map((row) => <li key={row.assignmentId}>{formatEvidence(row)}</li>)}
    </ul>
  );
}

function Footer() {
  return (
    <footer className="cif-footer">
      <p className="cif-footer-copy">(c) 2024 Course Instructor Finder. Schedule evidence comes from public university data.</p>
    </footer>
  );
}
