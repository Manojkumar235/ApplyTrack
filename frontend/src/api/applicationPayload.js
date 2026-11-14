export const APPLICATION_EDITABLE_FIELDS = [
  "company",
  "position",
  "status",
  "location",
  "url",
  "applied_on",
  "notes",
];

export function toApplicationPayload(application) {
  return APPLICATION_EDITABLE_FIELDS.reduce((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(application, field)) {
      payload[field] = application[field];
    }
    return payload;
  }, {});
}
