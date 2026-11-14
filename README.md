# ApplyTrack API

ApplyTrack is a Flask REST API for account authentication and tracking job and
internship applications, with a React frontend in `frontend/`.

## Architecture

- `app/__init__.py` provides the application factory and central error handling.
- `app/api/` contains versionable REST endpoint modules and request validation.
- `app/models/` contains SQLAlchemy entities.
- `app/extensions.py` defines unbound Flask extensions, initialized by the factory.
- `wsgi.py` exposes the app to Flask CLI and WSGI servers.

PostgreSQL is the configured runtime database; database credentials and signing
keys come from environment variables. SQLite is used only by the isolated test
suite. Flask-Migrate is wired into the factory, and generated migration scripts
should be checked into source control.

## Local setup

Use Python 3.10 or newer. Create and activate a virtual environment.
1. Install dependencies with `pip install -r requirements-dev.txt`.
2. Copy `.env.example` to `.env`, set distinct random `SECRET_KEY` and
   `JWT_SECRET_KEY` values, and provide a PostgreSQL `DATABASE_URL`.
3. Create the PostgreSQL database, then generate and apply the initial
   migration:

   ```powershell
   flask --app wsgi db init
   flask --app wsgi db migrate -m "Initial schema"
   flask --app wsgi db upgrade
   ```

4. Start the development server with `flask --app wsgi run`.

The application loads the project-root `.env` through `python-dotenv`; existing
process environment variables take precedence. Do not use development or
example secrets in production.

## Production deployment

The backend expects these environment variables in the production service:

- `APP_ENV=production`
- `SECRET_KEY` and `JWT_SECRET_KEY`: separate, long, randomly generated values.
- `DATABASE_URL`: PostgreSQL connection URL. The application normalizes
  `postgres://`, `postgresql://`, and other PostgreSQL driver URLs to psycopg 3.
- `CORS_ALLOWED_ORIGINS`: comma-separated, exact frontend origins, with no
  paths or wildcard. For example, use the origin of your own deployed frontend.
- `PORT`: supplied by the hosting service and used by the WSGI start command.

Do not set `FLASK_DEBUG=1` in production. Production configuration forces
Flask debug mode off and requires an explicit CORS allowlist and separate
signing keys. Do not commit `.env` files or put backend secrets in frontend
build variables.

Install backend and production WSGI dependencies with
`pip install -r requirements-production.txt`. Gunicorn is intentionally kept
out of the local development requirements. Apply reviewed database migrations
as a release step before starting the service:

```sh
flask --app wsgi db upgrade
```

Use this production WSGI start command:

```sh
gunicorn --bind 0.0.0.0:$PORT wsgi:app
```

For Cloudflare Pages, configure the frontend root directory as `frontend`, the
build command as `npm run build`, and the output directory as `dist`. Set
`VITE_API_BASE_URL` in the Pages build environment to the deployed API base URL
ending in `/api`; this value is embedded in the public frontend bundle. Local
development continues to use `/api` through the Vite proxy.

## API

The root endpoint returns the API identity and runtime status. Application and
authentication endpoints are under `/api`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | API identity and runtime status |

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/auth/register` | Create an account and return a JWT |
| POST | `/auth/login` | Authenticate and return a JWT |
| GET | `/applications` | List the authenticated user's applications |
| POST | `/applications` | Create an application |
| GET | `/applications/<id>` | Read an application owned by the user |
| PATCH | `/applications/<id>` | Update an application owned by the user |
| DELETE | `/applications/<id>` | Delete an application owned by the user |

Protected endpoints require `Authorization: Bearer <access_token>`. Application
statuses are `saved`, `applied`, `interviewing`, `offer`, `rejected`, and
`withdrawn`. Dates use `YYYY-MM-DD`.

## Tests

Run `pytest`. Tests use an in-memory SQLite database and do not require a
PostgreSQL server.
