import assert from "node:assert/strict";
import test from "node:test";
import {
  APPLICATION_EDITABLE_FIELDS,
  toApplicationPayload,
} from "../src/api/applicationPayload.js";

test("application payload excludes record IDs and other server fields", () => {
  const payload = toApplicationPayload({
    id: 42,
    user_id: 7,
    company: "Example Labs",
    position: "Product Intern",
    status: "applied",
    location: "Bengaluru",
    url: null,
    applied_on: "2026-11-14",
    notes: "Follow up next week",
  });

  assert.deepEqual(Object.keys(payload), APPLICATION_EDITABLE_FIELDS);
  assert.equal("id" in payload, false);
  assert.equal("user_id" in payload, false);
  assert.equal(payload.company, "Example Labs");
});
