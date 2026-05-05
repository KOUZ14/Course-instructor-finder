# Course Instructor Finder MVP Design

## Summary

Course Instructor Finder helps students estimate who is most likely to teach a course when the registration system lists the instructor as TBA. The first release targets San Jose State University and focuses on a student-facing search experience backed by public historical class schedule data.

The MVP answers one core question: given a school, term, course, and optional section details, which instructors are most likely to teach that class, and what public historical evidence supports that prediction?

## Goals

- Let a student search by school, term, subject, and course number.
- Support optional refinements such as section, delivery mode, days, and time when the student has that information.
- Rank likely instructors using public historical schedule patterns only.
- Show confidence and evidence for every prediction.
- Keep the data model universal enough to support schools beyond SJSU later.
- Prefer a simple static-data implementation for v1 so the product behavior can be validated quickly.

## Non-Goals

- Do not scrape or display professor ratings in v1.
- Do not use student-submitted rumors or unverified sightings in v1.
- Do not build account creation, saved schedules, notifications, or registration-planner features in v1.
- Do not require a scheduled ingestion service for the first release.
- Do not present predictions without evidence.

## Product Flow

The primary screen is course-first:

1. Student selects or accepts the default school, initially San Jose State University.
2. Student selects a target term.
3. Student enters a subject and course number, such as `CS 146`.
4. Student may add optional section-level refinements such as section number, online or in-person mode, days, and time.
5. The app returns ranked instructor predictions.
6. Each prediction includes a confidence label and the historical schedule evidence that contributed to the score.

If the app cannot make a reliable prediction, it shows a clear empty state such as "Not enough historical instructor data for this course" instead of inventing a result.

## Data Sources

The first data source is public SJSU class schedule pages. The importer should read saved or fetched schedule pages and normalize them into application-owned data files.

For v1, data refresh can be manual:

1. Run an import script against selected SJSU terms.
2. Normalize the parsed schedule rows.
3. Write static JSON or SQLite data consumed by the app.
4. Run tests against fixed schedule fixtures before accepting the imported dataset.

The importer boundary should be adapter-shaped even though only SJSU is implemented. A future school adapter should be able to output the same normalized entities without changing the prediction or UI layers.

## Normalized Entities

The app should avoid SJSU-specific names in core prediction and UI models.

- `School`: stable school identifier, display name, and adapter metadata.
- `Term`: school, term code, display label, year, and season.
- `Course`: school, subject, course number, title, and normalized course key.
- `Section`: course, term, section identifier, component type, meeting mode, days, times, location, and class number when available.
- `Instructor`: normalized instructor name and optional school-scoped identifier if available.
- `TeachingAssignment`: connection between instructor, section, course, and term.
- `PredictionResult`: instructor, score, confidence label, matched evidence, and scoring factors.

## Prediction Logic

The v1 predictor uses only public historical schedule patterns. It should score instructors with explicit factors:

- Same-course history carries the most weight.
- More recent teaching assignments carry more weight than older assignments.
- Matching term season increases confidence, such as fall-to-fall or spring-to-spring.
- Matching component type increases confidence, such as lecture-to-lecture.
- Matching delivery mode increases confidence, such as online-to-online or in-person-to-in-person.
- Matching meeting days or time range can refine scores when section details are known.

The score should be deterministic and testable. Confidence labels should be derived from score thresholds and evidence count, not from hidden heuristics.

Suggested labels:

- `High`: multiple strong same-course matches, including recent or season-matched evidence.
- `Medium`: at least one same-course match or several weaker related matches.
- `Low`: limited evidence that still meets the minimum threshold.
- No result: evidence does not meet the minimum threshold.

Every result must include the concrete evidence rows that contributed to the prediction, such as past term, section, mode, meeting pattern, and instructor.

## User Interface

The MVP UI contains three primary areas:

- Search form: school, term, subject, course number, and optional section filters.
- Results list: ranked instructors with confidence labels and a short evidence summary.
- Evidence detail: the past terms and sections that contributed to each prediction.

The UI should clearly distinguish between:

- no matching course in the dataset
- matching course with no historical instructor data
- matching course with insufficient evidence for a reliable prediction
- data import or dataset availability problems

## Error Handling

Failures should be explicit and actionable.

- Import failures must report the term and source page that failed.
- Parser failures must identify the row or field that could not be normalized when possible.
- Invalid searches must show validation messages for missing or malformed school, term, subject, or course fields.
- Prediction should return structured empty states rather than throwing generic errors for expected no-data cases.
- Unexpected runtime errors should be logged with enough context to debug the affected query or dataset.

Avoid broad catch blocks that hide malformed data. When recovery is possible, return a typed error or typed empty state.

## Verification Plan

The first implementation should include:

- Importer tests using saved SJSU schedule fixtures.
- Normalization tests for terms, courses, sections, instructors, and teaching assignments.
- Predictor tests covering recency, season matching, mode matching, section refinements, threshold behavior, and empty states.
- UI tests covering course search, ranked results, evidence details, validation messages, and no-data states.
- A manual fixture-backed scenario such as `SJSU CS 146` to verify the end-to-end product behavior.

The verification command should be documented once the project stack is selected. At minimum, the implementation plan must include one test command and one build or type-check command.

## Open Implementation Decisions

The implementation plan should choose the concrete stack and storage format. The design allows either static JSON or SQLite for v1, with a preference for whichever best fits the selected web framework and keeps fixture-backed tests straightforward.

The first implementation should not add scheduled ingestion, user accounts, ratings, or multi-school scraping. Those can be evaluated after the core SJSU search and prediction experience is working with transparent evidence.
