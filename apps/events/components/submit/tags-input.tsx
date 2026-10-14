import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cx } from "@/lib/format";
import { chip, field } from "@/lib/styles";
import { isValidTag, LIMITS, normalizeTag, TAG_SUGGESTIONS } from "@/lib/submission";
import { controlProps, FieldError, FieldHint, OptionalTag } from "./fields";

const PATH = "event.tags";

/** `current` with `raw` appended as a tag, or why it can't be added. */
function withTag(raw: string, current: readonly string[]): { tags: string[] } | { error: string } {
  const tag = normalizeTag(raw);
  if (!isValidTag(tag)) return { error: `Tags need ${LIMITS.tags.min}–${LIMITS.tags.maxLength} letters or numbers.` };
  if (current.includes(tag)) return { error: `“${tag}” is already added.` };
  if (current.length >= LIMITS.tags.max) return { error: `You can add up to ${LIMITS.tags.max} tags.` };
  return { tags: [...current, tag] };
}

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
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** Position of a just-removed tag, so focus can move to its neighbour's remove button. */
  const refocusAt = useRef<number | null>(null);
  const full = tags.length >= LIMITS.tags.max;
  const shownError = localError ?? error;
  const props = controlProps(PATH, shownError, true);

  // A remove button unmounts itself: move focus to the next one, or back to the input.
  useEffect(() => {
    const index = refocusAt.current;
    if (index === null) return;
    refocusAt.current = null;
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("button");
    const target = buttons?.length ? buttons[Math.min(index, buttons.length - 1)] : null;
    (target ?? inputRef.current)?.focus();
  }, [tags]);

  function commit() {
    // Pasted "a, b, c" adds every part in a single change; the props don't update mid-handler.
    let next = tags;
    let firstError: string | undefined;
    const rejected: string[] = [];
    for (const part of text.split(",")) {
      if (!part.trim()) continue;
      const result = withTag(part, next);
      if ("tags" in result) {
        next = result.tags;
      } else {
        rejected.push(part.trim());
        firstError ??= result.error;
      }
    }
    const added = next.length - tags.length;
    if (added > 0) onChange(next);
    const addedText = added === 0 ? "" : added === 1 ? `Added tag ${next[next.length - 1]}.` : `Added ${added} tags.`;
    // The error text isn't a live region, so announce it with the result (e.g. at the tag limit).
    if (addedText || firstError) setAnnouncement([addedText, firstError].filter(Boolean).join(" "));
    setLocalError(firstError);
    setText(rejected.join(", "));
  }

  function addSuggestion(tag: string) {
    const result = withTag(tag, tags);
    if ("tags" in result) {
      onChange(result.tags);
      setLocalError(undefined);
      setAnnouncement(`Added tag ${tag}.`);
    } else {
      setLocalError(result.error);
      setAnnouncement(result.error);
    }
    // The chip disappears once added; keep focus in the field.
    inputRef.current?.focus();
  }

  function remove(tag: string, { refocus }: { refocus: boolean }) {
    if (refocus) refocusAt.current = tags.indexOf(tag);
    onChange(tags.filter((t) => t !== tag));
    setLocalError(undefined);
    setAnnouncement(`Removed tag ${tag}.`);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && text === "" && tags.length > 0) {
      remove(tags[tags.length - 1], { refocus: false });
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
        <ul ref={listRef} className={cx("flex flex-wrap gap-1.5", tags.length === 0 && "hidden")} aria-label="Added tags">
          {tags.map((tag) => (
            <li key={tag} className="inline-flex items-center gap-1 rounded-full border border-chakra-500/40 bg-chakra-500/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-chakra-400">
              {tag}
              <button
                type="button"
                onClick={() => remove(tag, { refocus: true })}
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
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setLocalError(undefined);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => text.trim() && commit()}
          placeholder={full ? "Tag limit reached" : tags.length ? "Add another…" : "e.g. beginner-friendly"}
          autoComplete="off"
          enterKeyHint="done"
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-ash-200 placeholder:text-ash-400 focus:outline-none"
        />
      </div>
      <FieldError path={PATH} error={shownError} />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {suggestions.length > 0 && !full && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ash-400">Suggestions:</span>
          {suggestions.map((tag) => (
            <button key={tag} type="button" onClick={() => addSuggestion(tag)} className={chip(false)}>
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
