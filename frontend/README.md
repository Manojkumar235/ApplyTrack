# ApplyTrack frontend

React, Vite, JavaScript and Tailwind CSS frontend for the ApplyTrack Flask API.

## Local development

1. Install Node.js 18 or newer.
2. From `frontend/`, install dependencies with `npm install`.
3. Copy `.env.example` to `.env`. The default `VITE_API_BASE_URL=/api`
   uses the Vite development proxy to forward requests to Flask at
   `http://127.0.0.1:5000`.
4. Start the Flask API, then run `npm run dev`.

To point directly at a deployed API, set `VITE_API_BASE_URL` to its `/api` URL
and ensure that API allows browser requests from the frontend origin.

## Routes

- `/login` — sign in
- `/register` — create an account
- `/dashboard` — application overview
- `/dashboard/applications` — search and filter applications
- `/dashboard/applications/new` — create an application
- `/dashboard/applications/:applicationId` — view full application details
- `/dashboard/applications/:applicationId/edit` — edit an application

Authentication uses the API's `{ access_token, user }` response. The bearer
token is stored in browser local storage and attached to protected API requests.
