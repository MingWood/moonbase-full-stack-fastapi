import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"

import { cn } from "@/lib/utils"

const TAG_CLASS =
  "align-super text-[0.65em] leading-none text-muted-foreground mx-0.5"
const BLOCK_BASE_CLASS = "rounded px-1"
// Cycles per timed section, in order: red, orange, yellow, cream, light
// blue, darker blue, then repeats.
const BLOCK_COLOR_CLASSES = [
  "bg-red-100/70 dark:bg-red-950/40",
  "bg-orange-100/70 dark:bg-orange-950/40",
  "bg-yellow-100/70 dark:bg-yellow-950/40",
  "bg-yellow-50/80 dark:bg-yellow-900/20",
  "bg-sky-100/70 dark:bg-sky-950/40",
  "bg-blue-200/70 dark:bg-blue-900/50",
]

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

// Each saved block is a single line shaped like `{T:0} text {T:0}`. Lines
// matching that shape get a highlighted background with small, raised tags;
// anything else (freshly typed text with no tags yet) renders as plain text.
function renderNotesHtml(display: string): string {
  if (!display) return ""
  let blockIndex = 0
  return display
    .split("\n")
    .map((line) => {
      const match = line.match(/^\{T:(\d+)\}(.*)\{T:\1\}$/)
      if (!match) return escapeHtml(line)
      const [, min, inner] = match
      const colorClass =
        BLOCK_COLOR_CLASSES[blockIndex % BLOCK_COLOR_CLASSES.length]
      blockIndex++
      // contenteditable=false makes each tag an atomic chip: the caret can't
      // land inside it, so newly typed text can't inherit its tiny/raised
      // styling the way it could when the tag was just a plain inline span.
      const tag = `<span contenteditable="false" class="${TAG_CLASS}">{T:${min}}</span>`
      return `<span class="${colorClass} ${BLOCK_BASE_CLASS}">${tag}${escapeHtml(inner)}${tag}</span>`
    })
    .join("<br>")
}

function extractPlainText(node: Node): string {
  let text = ""
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent ?? ""
    } else if (child.nodeName === "BR") {
      text += "\n"
    } else if (child.nodeName === "DIV" || child.nodeName === "P") {
      // Block-level line break the browser inserts on Enter.
      if (text && !text.endsWith("\n")) text += "\n"
      text += extractPlainText(child)
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      // Inline element (our tag/background spans) -- stays on the same line.
      text += extractPlainText(child)
    }
  }
  return text
}

export interface NotesEditorHandle {
  setDisplayValue: (value: string) => void
}

export const NotesEditor = forwardRef<
  NotesEditorHandle,
  {
    id?: string
    defaultValue: string
    onChange: (value: string) => void
    placeholder?: string
  }
>(function NotesEditor({ id, defaultValue, onChange, placeholder }, ref) {
  const divRef = useRef<HTMLDivElement>(null)
  const [isEmpty, setIsEmpty] = useState(defaultValue.length === 0)

  useImperativeHandle(ref, () => ({
    setDisplayValue(value: string) {
      if (divRef.current) {
        divRef.current.innerHTML = renderNotesHtml(value)
      }
      setIsEmpty(value.length === 0)
    },
  }))

  // The parent re-syncs content imperatively via the ref whenever the form
  // resets; re-running this on every defaultValue change would clobber the
  // user's cursor mid-edit, so it only runs once on mount.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only paint
  useEffect(() => {
    if (divRef.current) {
      divRef.current.innerHTML = renderNotesHtml(defaultValue)
    }
  }, [])

  return (
    // biome-ignore lint/a11y/useSemanticElements: contentEditable div renders inline highlighted tag spans a native input/textarea can't support
    <div
      ref={divRef}
      id={id}
      contentEditable
      suppressContentEditableWarning
      tabIndex={0}
      role="textbox"
      aria-multiline="true"
      data-placeholder={placeholder}
      onInput={(e) => {
        const text = extractPlainText(e.currentTarget)
        setIsEmpty(text.length === 0)
        onChange(text)
      }}
      className={cn(
        "border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 min-h-32 w-full rounded-md border bg-transparent px-3 py-2 text-base whitespace-pre-wrap break-words shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] md:text-sm",
        isEmpty &&
          "before:content-[attr(data-placeholder)] before:text-muted-foreground",
      )}
    />
  )
})
