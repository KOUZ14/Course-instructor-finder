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
