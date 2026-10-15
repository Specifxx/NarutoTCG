"use client";

import { cx } from "@naruto-tcg/ui";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { getCard } from "@/lib/data/cards";
import { matchCardOptions, type CardOption } from "./decks";
import { MAX_CARD_FILTERS } from "./params";
import { FIELD, FIELD_LABEL, FOCUS_RING } from "./styles";

const MAX_SUGGESTIONS = 8;

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className={className}>
      <path d="m3 3 6 6M9 3 3 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Card filter: an ARIA combobox that suggests card names as you type (Enter or click adds a
 * chip) plus the removable chips. Decks must contain every selected card.
 */
export function CardCombobox({
  options,
  selected,
  onChange,
}: {
  options: CardOption[];
  selected: string[];
  /** Absent until the directory is interactive; the control renders disabled. */
  onChange?: (cardIds: string[]) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const full = selected.length >= MAX_CARD_FILTERS;

  const names = useMemo(() => new Map(options.map((option) => [option.id, option.name])), [options]);
  const matches = useMemo(
    () => (open && !full ? matchCardOptions(options, text, selected, MAX_SUGGESTIONS) : []),
    [open, full, options, text, selected],
  );
  const activeIndex = matches.length === 0 ? -1 : Math.min(active, matches.length - 1);
  const listboxId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const showList = open && matches.length > 0;
  const message = !open
    ? null
    : full
      ? `Up to ${MAX_CARD_FILTERS} cards. Remove one to add another.`
      : matches.length === 0 && text.trim() !== ""
        ? `No cards match “${text.trim()}”`
        : null;

  useEffect(() => {
    if (showList && activeIndex >= 0) document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [id, showList, activeIndex]);

  const nameOf = (cardId: string) => names.get(cardId) ?? getCard(cardId)?.name ?? cardId;

  const add = (cardId: string) => {
    onChange?.([...selected, cardId]);
    setText("");
    setOpen(false);
    setActive(0);
    inputRef.current?.focus();
  };

  const remove = (cardId: string) => {
    onChange?.(selected.filter((selectedId) => selectedId !== cardId));
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActive(0);
        } else if (matches.length > 0) {
          setActive((activeIndex + 1) % matches.length);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (open && matches.length > 0) setActive((activeIndex - 1 + matches.length) % matches.length);
        break;
      case "Enter":
        // Never submit the surrounding search form from here.
        event.preventDefault();
        if (showList && activeIndex >= 0) add(matches[activeIndex]!.id);
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        } else if (text) {
          event.preventDefault();
          setText("");
        }
        break;
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-1 sm:w-72">
      <label htmlFor={`${id}-input`} className={FIELD_LABEL}>
        Contains cards
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-describedby={`${id}-hint`}
          autoComplete="off"
          spellCheck={false}
          disabled={!onChange}
          value={text}
          placeholder="Type a card name"
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
          className={cx(FIELD, "w-full")}
        />
        <span id={`${id}-hint`} className="sr-only">
          Decks must contain every selected card. Use the arrow keys to browse suggestions and Enter to add one.
        </span>
        {/* Pressing inside the popup (options or its scrollbar) must not blur the input. */}
        <div
          onMouseDown={(event) => event.preventDefault()}
          className={cx(
            "absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-shadow-600 bg-shadow-800 shadow-lg shadow-black/50",
            !showList && !message && "hidden",
          )}
        >
          <ul id={listboxId} role="listbox" aria-label="Card suggestions" className={cx("max-h-80 overflow-y-auto", showList && "py-1")}>
            {matches.map((option, index) => (
              <li
                key={option.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                onMouseMove={() => index !== activeIndex && setActive(index)}
                onClick={() => add(option.id)}
                className={cx(
                  "flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-sm",
                  index === activeIndex ? "bg-shadow-600 text-white" : "text-ash-200",
                )}
              >
                <span className="min-w-0 truncate">{option.name}</span>
                {/* ash-400 drops below 4.5:1 on the highlighted row's shadow-600, so the active id lightens. */}
                <span className={cx("shrink-0 font-mono text-[11px]", index === activeIndex ? "text-ash-300" : "text-ash-400")}>
                  {option.id}
                </span>
              </li>
            ))}
          </ul>
          {message && (
            <p role="status" className="px-3 py-2 text-sm text-ash-400">
              {message}
            </p>
          )}
        </div>
      </div>
      {selected.length > 0 && (
        <ul aria-label="Selected cards" className="mt-1 flex flex-wrap gap-1.5">
          {selected.map((cardId) => (
            <li
              key={cardId}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-chakra-600 bg-shadow-800 py-0.5 pr-0.5 pl-2.5 text-xs font-medium text-ash-100"
            >
              <span className="truncate">{nameOf(cardId)}</span>
              <button
                type="button"
                onClick={() => remove(cardId)}
                disabled={!onChange}
                aria-label={`Remove ${nameOf(cardId)}`}
                className={cx("grid h-5 w-5 shrink-0 place-items-center rounded-full text-ash-300 hover:bg-shadow-600 hover:text-white", FOCUS_RING)}
              >
                <CloseIcon className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
