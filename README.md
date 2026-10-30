# Academix
Verified academic social network: college hubs, major explorer, peer mentorship booking, Q&amp;A inbox, and an AI admissions advisor. React + TypeScript + Vite.

## Authentication

`npm run dev` starts the Vite app and its local authentication API. The API stores accounts in `server/data/users.json` (ignored by Git) and stores salted scrypt password hashes. New passwords must be at least 12 characters and include a letter, a number, an uppercase letter, and a special character. Any valid email address is accepted; `.edu` is not required. Student / scholar and faculty / representative accounts can optionally request Gold verification using either an institutional `.edu` email or an appropriate student, faculty, or work ID (PDF, JPG, or PNG, up to 5 MB). Requests are marked pending review and do not grant a verified badge automatically; accounts without a verification request remain unverified.

Identity documents are stored separately in `server/data/verification-documents` under generated filenames with restrictive file permissions. This demo does not include an administrator review or document deletion interface; production deployments must add access-controlled review, retention, and deletion workflows before collecting real identity documents. The browser receives an HTTP-only, SameSite session cookie; production deployments must serve the app and `/api/auth` over HTTPS and use persistent, access-controlled storage for account data, identity documents, and sessions.

For a production deployment, run `node server/auth.mjs` as the API service and route `/api/auth` to it from the same origin as the frontend. Set `NODE_ENV=production` so session cookies use the Secure flag. The included API is a small single-process service; its sessions are held in memory and clear when it restarts, so a production multi-instance deployment should replace that session store with a shared persistent store.

## Find students

The Make Connections page searches discoverable accounts through `GET /api/people`. Search filters are combined with AND across fields; multiple values within a field are ORed. University and major IDs are normalized slugs from `data/universities.txt` and `data/majors.txt` (for example, `baku-higher-oil-school-bhos` and `computer-engineering`). University search also recognizes the aliases BHOS, BANM, and ADA.

Example request:

```http
GET /api/people?roles=student&universities=baku-higher-oil-school-bhos&majors=computer-engineering&years=2&interests=Mathematics%20%26%20Statistics&sort=best-match&cursor=0
```

Example response:

```json
{
  "items": [
    {
      "id": "public-account-id",
      "name": "Student Name",
      "avatar": "",
      "role": "student",
      "universityId": "baku-higher-oil-school-bhos",
      "university": "Baku Higher Oil School (BHOS)",
      "universityShortName": "BHOS (BANM)",
      "majorId": "computer-engineering",
      "major": "Computer Engineering",
      "year": 2,
      "programmeDurationYears": 4,
      "degreeLevel": "bachelors",
      "sharedInterests": ["Mathematics & Statistics"],
      "openToMessages": true,
      "openToMentoring": false,
      "verified": false
    }
  ],
  "total": 42,
  "nextCursor": "20",
  "facets": {
    "universities": [
      { "id": "baku-higher-oil-school-bhos", "name": "Baku Higher Oil School (BHOS)", "shortName": "BHOS (BANM)", "count": 42 }
    ],
    "majors": [
      { "id": "computer-engineering", "name": "Computer Engineering", "count": 42 }
    ],
    "years": [
      { "id": "2", "count": 42 }
    ]
  }
}
```

The accepted parameters are `roles`, `universities`, `majors`, `years`, `levels`, `interests`, `graduationYears`, `intakeYears`, `languages`, `location`, `q`, `sort`, and `cursor`. Repeated or comma-separated values are supported. Each catalog ID is checked against its catalog; lists are bounded (roles 3, universities/majors 10, years 6, degree levels 3, interests 30, graduation/intake years 10, and languages 20), `q` and `location` are limited to 100 characters, and sort values are allowlisted. Results are paginated in batches of 20.

Accounts persist in the existing `server/data/users.json` JSON store, not a relational database. Profile records now optionally include `universityId`, `majorId`, `degreeLevel`, `programmeDurationYears`, `enrollmentYear`, `expectedGraduationYear`, and `yearOfStudyOverride`, plus `discoverable`, `showUniversityInSearch`, and `showYearInSearch` privacy choices. University/major IDs are backfilled when the server loads older records. Study year is calculated from enrollment year and the current academic year (which rolls over in September), capped at programme length; an override is supported for exceptions. A discoverable scholar must complete their university, major, enrollment year, and programme length.

The API builds in-memory university, major, and enrollment-year indexes from opted-in profiles at startup and refreshes them after profile updates. These indexes are appropriate for the included single-process JSON demo; a production relational database should use persistent indexes on `universityId`, `majorId`, and `enrollmentYear`. People search excludes the viewer and non-discoverable accounts and returns no email address. University and study year are omitted when their visibility settings are off. `GET /api/people/:id` provides the same public profile fields for a discoverable profile.
