# Course Instructor Finder

Course Instructor Finder helps students estimate who is most likely to teach a course when registration lists the instructor as TBA.

The first MVP targets San Jose State University and uses static public historical schedule data. Predictions are based on same-course history, recency, term season, component type, delivery mode, and meeting pattern. Every result includes evidence.

Predictions are estimates from historical public schedule patterns. They are not official instructor assignments, guarantees, or advising guidance.

## Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

## Deploy to Railway

This project is configured for Railway with `railway.json`.

1. Push the repository to GitHub.
2. In Railway, create a new project from the GitHub repository.
3. Railway will run `npm run build` and then `npm run start`.
4. Generate a public domain from the Railway service settings.

The production server serves the built Vite app from `dist/` and listens on Railway's `PORT` environment variable.

## Import SJSU Schedule Data

Save official SJSU class schedule HTML files in `data/raw/sjsu` with term names:

```text
data/raw/sjsu/fall-2026.html
data/raw/sjsu/spring-2026.html
data/raw/sjsu/fall-2025.html
```

Then generate the static dataset used by the app:

```bash
npm run import:sjsu
npm run prepare:public-data
```

You can also pass explicit files and a custom output path:

```bash
npm run import:sjsu -- data/raw/sjsu/fall-2025.html data/raw/sjsu/spring-2025.html --out src/data/sjsu-sample-dataset.json
```

The importer expects filenames like `fall-2025.html` or `2025-fall.html` so it can derive the term. It skips placeholder instructors such as `TBA` and `Staff`.

Verify the project:

```bash
npm test
npm run lint
npm run build
npm run e2e
```

For fresh environments, install Playwright browsers before running e2e tests:

```bash
npx playwright install
```

## MVP Scope

- Student-facing course-first search.
- SJSU sample static data.
- Deterministic instructor prediction.
- Transparent evidence for each result.
- No ratings, rumors, accounts, or scheduled ingestion in v1.
