import { Plus, X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { cx } from "@/lib/format";
import { chip, field } from "@/lib/styles";
import { isValidTag, LIMITS, normalizeTag, TAG_SUGGESTIONS } from "@/lib/submission";
import { controlProps, FieldError, FieldHint, OptionalTag } from "./fields";

const PATH = "event.tags";

/**
 * Free-form tags: type and press Enter or comma to add, Backspace on an empty
 * input removes the last one. Tags are normalised to "lowercase-hyphenated".
 */
export function TagsInput({
  tags,
  onChange,
  error,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  error?: string;
}) {
  const [text, setText] = useState("");
  const [localError, setLocalError] = useState<string>();
  const full = tags.length >= LIMITS.tags.max;
  const shownError = localError ?? error;
  const props = controlProps(PATH, shownError, true);

  function add(raw: string): boolean {
    const tag = normalizeTag(raw);
    if (!tag) return false;
    if (!isValidTag(tag)) {
      setLocalError(`Tags need ${LIMITS.tags.min}–${LIMITS.tags.maxLength} letters or numbers.`);
      return false;
    }
    if (tags.includes(tag)) {
      setLocalError(`“${tag}” is already added.`);
      return false;
    }
    if (full) {
      setLocalError(`You can add up to ${LIMITS.tags.max} tags.`);
      return false;
    }
    onChange([...tags, tag]);
    setLocalError(undefined);
    return true;
  }

  function commit() {
    // Pasted "a, b, c" adds each part.
    const parts = text.split(",").filter((p) => p.trim());
    const rejected = parts.filter((p) => !add(p));
    setText(rejected.join(", "));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && text === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  const suggestions = TAG_SUGGESTIONS.filter((t) => !tags.includes(t)).slice(0, 6);

  return (
    <div className="min-w-0">
      <label htmlFor={props.id} className={field.label}>
        Tags
        <OptionalTag />
      </label>
      <FieldHint path={PATH}>
        Help players filter: press Enter or comma after each tag. {tags.length}/{LIMITS.tags.max} used.
      </FieldHint>

      <div
        className={cx(
          "mt-2 flex flex-wrap items-center gap-1.5 rounded-md border bg-shadow-900 px-2 py-1.5 transition-colors focus-within:border-chakra-500 focus-within:ring-2 focus-within:ring-chakra-500/30",
          shownError ? "border-rose-400/70" : "border-shadow-700 hover:border-shadow-500",
        )}
      >
        <ul className={cx("flex flex-wrap gap-1.5", tags.length === 0 && "hidden")} aria-label="Added tags">
          {tags.map((tag) => (
            <li key={tag} className="inline-flex items-center gap-1 rounded-full border border-chakra-500/40 bg-chakra-500/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-chakra-400">
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-chakra-400 transition-colors hover:bg-chakra-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <input
          {...props}
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setLocalError(undefined);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => text.trim() && commit()}
          disabled={full}
          placeholder={full ? "Tag limit reached" : tags.length ? "Add another…" : "e.g. beginner-friendly"}
          autoComplete="off"
          enterKeyHint="done"
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-ash-200 placeholder:text-ash-400/60 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      <FieldError path={PATH} error={shownError} />

      {suggestions.length > 0 && !full && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ash-400">Suggestions:</span>
          {suggestions.map((tag) => (
            <button key={tag} type="button" onClick={() => add(tag)} className={chip(false)}>
              <Plus className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">Add tag </span>
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
