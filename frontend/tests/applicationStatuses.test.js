import assert from "node:assert/strict";
import test from "node:test";
import {
  APPLICATION_STATUSES,
  filterApplications,
  getApplicationStatusChartData,
  getApplicationStatusCounts,
} from "../src/utils/applicationStatuses.js";

const expectedStatuses = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
];

test("application statuses retain the required order and labels", () => {
  assert.deepEqual(
    APPLICATION_STATUSES.map(({ value }) => value),
    expectedStatuses,
  );
  assert.deepEqual(
    APPLICATION_STATUSES.map(({ label }) => label),
    ["Saved", "Applied", "Interviewing", "Offer", "Rejected", "Withdrawn"],
  );
  assert.equal(
    APPLICATION_STATUSES.find(({ value }) => value === "withdrawn").color,
    "#475569",
  );
});

test("status counts include zero-count categories and track records dynamically", () => {
  const counts = getApplicationStatusCounts([
    { status: "saved" },
    { status: "withdrawn" },
    { status: "withdrawn" },
  ]);

  assert.deepEqual(Object.keys(counts), expectedStatuses);
  assert.deepEqual(Object.values(counts), [1, 0, 0, 0, 0, 2]);
});

test("dashboard chart data contains every status in order, including zeros", () => {
  const chartData = getApplicationStatusChartData(
    getApplicationStatusCounts([{ status: "withdrawn" }]),
  );

  assert.deepEqual(
    chartData.map(({ status }) => status),
    expectedStatuses,
  );
  assert.deepEqual(
    chartData.map(({ value }) => value),
    [0, 0, 0, 0, 0, 1],
  );
  assert.equal(chartData.at(-1).color, "#475569");
});

test("application filters return withdrawn records", () => {
  const applications = [
    { company: "Northstar", position: "Intern", location: "Remote", status: "saved" },
    { company: "Orbit", position: "Designer", location: "Bengaluru", status: "withdrawn" },
  ];

  assert.deepEqual(filterApplications(applications, "", "withdrawn"), [
    applications[1],
  ]);
  assert.deepEqual(filterApplications(applications, "bengaluru", "withdrawn"), [
    applications[1],
  ]);
});
