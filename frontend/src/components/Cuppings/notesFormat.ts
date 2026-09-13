const TAG_PATTERN = /\s*(\{T:\d+\})/g

/**
 * Storage format keeps `{T:<min>}` tags inline on one line. Display format
 * breaks before each block's opening tag (so it starts a new line) while its
 * closing tag stays at the end of that same line, since tags always come in
 * open/close pairs in the order they were appended.
 */
export function toDisplayNotes(stored: string): string {
  if (!stored) return stored
  let count = 0
  return stored
    .replace(TAG_PATTERN, (_match, tag) => {
      count++
      return count % 2 === 1 ? `\n${tag}` : ` ${tag}`
    })
    .replace(/^\n/, "")
}

function toStorageNotes(display: string): string {
  return display.replace(/\n+(\{T:\d+\})/g, " $1")
}

/**
 * Compares the current (display-format) notes against the baseline that was
 * loaded when the form opened. If the user only appended text after the
 * baseline, that new suffix is wrapped in a fresh `{T:<min>}` pair. Any other
 * edit (changes within previously entered text) is saved as-is.
 */
export function applyNoteTimestamp(
  baselineDisplay: string,
  currentDisplay: string,
  elapsedMinutes: number,
): string {
  if (currentDisplay === baselineDisplay) {
    return toStorageNotes(currentDisplay)
  }

  if (currentDisplay.startsWith(baselineDisplay)) {
    const added = currentDisplay.slice(baselineDisplay.length).trim()
    if (!added) return toStorageNotes(currentDisplay)

    const base = toStorageNotes(baselineDisplay)
    const tag = `{T:${elapsedMinutes}}`
    const block = `${tag} ${added} ${tag}`
    return base ? `${base} ${block}` : block
  }

  return toStorageNotes(currentDisplay)
}
