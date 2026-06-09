# Waygood Study Abroad Backend Assignment

This is my MERN backend submission for the Waygood study-abroad internship assignment. The project keeps the original Express/Mongoose structure and completes the required API flows without adding unnecessary architecture.

## Setup

```bash
npm install
cd backend
copy .env.example .env
npm run seed
npm run dev
```

On macOS or Linux, use `cp .env.example .env`.

The backend runs on `http://localhost:4000` by default.

## Environment Variables

`backend/.env.example` contains the expected values:

```text
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/waygood-evaluation
JWT_SECRET=replace-with-a-long-secret
JWT_EXPIRES_IN=1d
CACHE_TTL_SECONDS=300
REDIS_URL=
OPENAI_API_KEY=
```

`REDIS_URL` and `OPENAI_API_KEY` are left unused because this submission uses a simple in-memory cache and does not add an AI feature.

## Architecture Overview

- `backend/src/app.js` wires Express middleware and route groups.
- `backend/src/routes` keeps the API routes grouped by feature.
- `backend/src/controllers` handles request validation and responses.
- `backend/src/services` contains reusable logic for caching and recommendations.
- `backend/src/models` contains Mongoose schemas and indexes.
- `backend/src/data/seedData.js` contains sample universities, programs, students, and applications.

The frontend is still a lightweight React shell for assignment context.

## Completed API Areas

- Authentication: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Discovery: `GET /api/universities`, `GET /api/universities/popular`, `GET /api/programs`
- Recommendations: `GET /api/recommendations/:studentId`
- Applications: `GET /api/applications`, `POST /api/applications`, `PATCH /api/applications/:id/status`
- Dashboard: `GET /api/dashboard/overview`

API responses follow the assignment style:

```json
{
  "success": true,
  "data": []
}
```

Paginated discovery endpoints return:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "pages": 0
  }
}
```

## Authentication

Passwords are hashed through the existing `Student` model pre-save hook using bcrypt. Login and register return a JWT signed with `JWT_SECRET`. The protected `GET /api/auth/me`, `POST /api/applications`, and `PATCH /api/applications/:id/status` routes use the existing auth middleware.

Supported roles:

- `student`
- `counselor`

Application status updates (`PATCH /api/applications/:id/status`) are restricted to users with the `counselor` role.

## Recommendation Engine

Recommendations use a MongoDB aggregation pipeline. The score is based on:

- `+40` preferred country match
- `+25` field of interest match
- `+20` budget match
- `+10` preferred intake match
- `+15` IELTS requirement match

Each result returns the program, university, score, and a short explanation.

## Application Workflow

The application lifecycle is:

```text
applied -> reviewed -> accepted
applied -> reviewed -> rejected
```

Duplicate applications are blocked by both controller validation and a unique MongoDB index on student, program, and intake.

Each status change is stored in `timeline` with:

- `status`
- `note`
- `changedBy`
- `changedAt`

## Caching

I used the in-memory cache helper to cache two main areas:
- Popular universities list
- Dashboard overview analytics

The cache has a TTL configured via `CACHE_TTL_SECONDS`. When a new application is created or updated, the dashboard cache is automatically cleared so the metrics remain accurate.

## Indexing

I added indexes on:
- `University`: country, popularScore, and a text index for basic name/city search.
- `Program`: country, degreeLevel, field, and tuitionFeeUsd to speed up discovery and recommendation filters.
- `Application`: student, program, intake, and status.

A unique compound index `(student, program, intake)` was also added to prevent duplicate applications.


## Seed Data

Run:

```bash
cd backend
npm run seed
```

Sample credentials:

- `aarav@example.com` / `Candidate123!`
- `sara@example.com` / `Candidate123!`
- `counselor@example.com` / `Candidate123!`

## Testing

Tests use Jest, Supertest, and an in-memory MongoDB server.

```bash
cd backend
npm test
```

Covered flows:

- register user
- login user
- duplicate registration edge case
- recommendation endpoint
- duplicate application prevention

## Assumptions

- Student and counselor accounts can both authenticate through the same `Student` model because the starter already stores roles there.
- Application statuses were aligned to the assignment wording instead of keeping the starter's longer CRM-style status list.
- University discovery can use program filters like intake, degree level, and budget by first finding matching programs and then returning their universities.

## Current Limitation

The in-memory cache is fine for this assignment and local review, but it would reset on server restart and would not be shared across multiple server instances.
