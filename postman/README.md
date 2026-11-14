# ApplyTrack Postman tests

Import `ApplyTrack API.postman_collection.json` and
`ApplyTrack Local.postman_environment.json` into Postman, then select the
**ApplyTrack Local** environment.

Set `user_password` to a test-only password that is 8–128 characters long.
Set `invalid_password` to any value; it is paired with the nonexistent
`invalid_email` to exercise failed login. These templates contain no real
credentials. The collection creates uniquely named test accounts using
Postman's `{{$guid}}` dynamic variable, so runs can be repeated without email
collisions. Its requests create and delete a test application, but leave the
test accounts in the configured database because the API has no user-delete
route. The final request deletes the application. Remove generated
`applytrack-*@example.test` accounts from a test database separately if full
account cleanup is needed; do not run broad cleanup against a production
database.

Set `base_url` to the running Flask server if it is not
`http://127.0.0.1:5000`, then run the collection in order:

1. Root API information
2. Health check
3. Register first user
4. Login first user
5. Register second user
6. Login second user
7. Create application as the first user
8. List applications as the first user
9. Get application by ID as the first user
10. Update application as the first user
11. Invalid-credential and unauthenticated-request tests
12. Cross-user access-control checks
13. Delete the application as its owner

The registration scripts clear stale state, and successful logins save JWTs to
`access_token` and `other_access_token`. Application creation saves its ID to
`application_id` before any request uses that ID. Do not manually run requests
out of order: a path with an unresolved `{{application_id}}` does not match the
integer-ID route and returns 404, whereas a valid ID without a JWT returns 401.
The collection asserts that another user receives `404 Not Found` when trying
to get, update, or delete the record, and confirms the owner can still read it.

## Routes covered

These are the explicitly declared Flask routes (Flask may also provide implicit
`HEAD` and `OPTIONS` handlers):

| Method | Path |
|---|---|
| GET | `/` |
| GET | `/api/health` |
| POST | `/api/auth/register` |
| POST | `/api/auth/login` |
| GET | `/api/applications` |
| POST | `/api/applications` |
| GET | `/api/applications/<int:application_id>` |
| PATCH | `/api/applications/<int:application_id>` |
| DELETE | `/api/applications/<int:application_id>` |

`application_id` in the environment is filled from the create response. The
collection uses only these implemented routes and methods.
