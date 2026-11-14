export const APPLICATION_STATUSES = [
  { value: "saved", label: "Saved", color: "#8b9bb4" },
  { value: "applied", label: "Applied", color: "#4778e6" },
  { value: "interviewing", label: "Interviewing", color: "#8a63d2" },
  { value: "offer", label: "Offer", color: "#1d9a74" },
  { value: "rejected", label: "Rejected", color: "#d56b73" },
  { value: "withdrawn", label: "Withdrawn", color: "#475569" },
];

export function getApplicationStatusCounts(applications) {
  const counts = Object.fromEntries(
    APPLICATION_STATUSES.map(({ value }) => [value, 0]),
  );

  for (const application of applications) {
    if (Object.hasOwn(counts, application.status)) {
      counts[application.status] += 1;
    }
  }

  return counts;
}

export function getApplicationStatusChartData(counts) {
  return APPLICATION_STATUSES.map(({ value, label, color }) => ({
    status: value,
    name: label,
    color,
    value: counts[value] || 0,
  }));
}

export function filterApplications(applications, query = "", status = "all") {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return applications.filter((application) => {
    const matchesStatus = status === "all" || application.status === status;
    const matchesQuery =
      !normalizedQuery ||
      application.company.toLocaleLowerCase().includes(normalizedQuery) ||
      application.position.toLocaleLowerCase().includes(normalizedQuery) ||
      (application.location || "")
        .toLocaleLowerCase()
        .includes(normalizedQuery);

    return matchesStatus && matchesQuery;
  });
}
