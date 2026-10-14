"use client";

import type { Decklist } from "@naruto-tcg/types";
import { cx } from "@naruto-tcg/ui";
import { useEffect, useRef, useState, type Ref } from "react";
import { decklistToText } from "@/lib/decks/deck-utils";
import { deckFileName, deckShareCode, priceCheckHref, simulatorHref } from "./deck-export";
import { CheckIcon, CopyIcon, DownloadIcon, ExternalIcon, HandIcon } from "./icons";
import { BUTTON_GHOST, BUTTON_PRIMARY } from "./styles";

/** Clipboard API first, then the hidden-textarea fallback for older or non-secure contexts. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or insecure context: fall through to the legacy path.
  }
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.inset = "0 auto auto 0";
  area.style.opacity = "0";
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    previous?.focus();
  }
}

function downloadText(text: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

type CopyState = "idle" | "copied" | "failed";

/**
 * Deck actions: playtest drawer trigger, copy and download the list, and open it in the
 * Simulator or the price checker. Results are announced in a polite live region.
 */
export function DeckActions({
  deck,
  decklist,
  drawerId,
  playtestOpen,
  playtestRef,
  onPlaytest,
}: {
  deck: { name: string; author: { name: string } };
  decklist: Decklist;
  drawerId: string;
  playtestOpen: boolean;
  playtestRef: Ref<HTMLButtonElement>;
  onPlaytest: () => void;
}) {
  const [copy, setCopy] = useState<CopyState>("idle");
  const [message, setMessage] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const code = deckShareCode(decklist);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const announce = (state: CopyState, text: string) => {
    setCopy(state);
    setMessage(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setCopy("idle");
      setMessage("");
    }, 2500);
  };

  const onCopy = async () => {
    const ok = await copyText(decklistToText(decklist));
    announce(ok ? "copied" : "failed", ok ? "Decklist copied to the clipboard." : "Could not copy. Use Download .txt instead.");
  };

  const onDownload = () => {
    const fileName = deckFileName(deck);
    downloadText(`${decklistToText(decklist)}\n`, fileName);
    announce("idle", `Downloading ${fileName}.`);
  };

  const unavailable = "This list has card ids the other apps cannot read.";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          ref={playtestRef}
          type="button"
          onClick={onPlaytest}
          aria-haspopup="dialog"
          aria-expanded={playtestOpen}
          // The drawer is not in the DOM until first opened; only point at it while it is open.
          aria-controls={playtestOpen ? drawerId : undefined}
          className={BUTTON_PRIMARY}
        >
          <HandIcon />
          Playtest
        </button>
        <button type="button" onClick={onCopy} className={BUTTON_GHOST}>
          {copy === "copied" ? <CheckIcon className="h-4 w-4 text-status-good" /> : <CopyIcon />}
          {copy === "copied" ? "Copied" : "Copy list"}
        </button>
        <button type="button" onClick={onDownload} className={BUTTON_GHOST}>
          <DownloadIcon />
          Download .txt
        </button>
        {code ? (
          <>
            <a href={simulatorHref(code)} className={BUTTON_GHOST}>
              Open in Simulator
              <ExternalIcon className="h-3.5 w-3.5" />
            </a>
            <a href={priceCheckHref(code)} className={BUTTON_GHOST}>
              Price check
              <ExternalIcon className="h-3.5 w-3.5" />
            </a>
          </>
        ) : (
          <>
            <button type="button" disabled title={unavailable} className={BUTTON_GHOST}>
              Open in Simulator
            </button>
            <button type="button" disabled title={unavailable} className={BUTTON_GHOST}>
              Price check
            </button>
          </>
        )}
      </div>
      {!code && <p className="text-xs text-ash-500">{unavailable}</p>}
      <p role="status" aria-live="polite" className={cx("min-h-4 text-xs", copy === "failed" ? "text-ash-100" : "text-ash-400")}>
        {message}
      </p>
    </div>
  );
}
