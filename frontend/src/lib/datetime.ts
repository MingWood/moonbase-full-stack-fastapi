export function formatEpochMs(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function formatEpochMsDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { dateStyle: "medium" })
}
