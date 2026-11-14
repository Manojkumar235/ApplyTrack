export function formatAppliedOn(value) {
  if (!value) return "—";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatLocation(value) {
  if (!value?.trim()) return "—";

  return value.trim().replace(/[\p{L}\p{M}]+/gu, (word) => {
    if (word.length <= 3 && word === word.toLocaleUpperCase()) return word;
    const lower = word.toLocaleLowerCase();
    return lower.charAt(0).toLocaleUpperCase() + lower.slice(1);
  });
}
