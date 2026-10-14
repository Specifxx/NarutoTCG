"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { button } from "@/lib/styles";

type Feedback = { tone: "success" | "error"; message: string };

/**
 * Share via the Web Share sheet where available, falling back to copying the
 * canonical event URL. Results are announced through a polite live region.
 */
export function ShareActions({ path, title, text }: { path: string; title: string; text: string }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const flash = (next: Feedback, didCopy = false) => {
    setFeedback(next);
    setCopied(didCopy);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      setFeedback(null);
      setCopied(false);
    }, 4000);
  };

  const canonicalUrl = () => new URL(path, window.location.origin).toString();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(canonicalUrl());
      flash({ tone: "success", message: "Link copied to clipboard." }, true);
    } catch {
      flash({ tone: "error", message: "Couldn't copy automatically — copy the link from your address bar." });
    }
  }

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: canonicalUrl() });
        return;
      } catch (error) {
        // The user closed the share sheet; nothing to report.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={share} className={button.secondarySm}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share
        </button>
        <button type="button" onClick={copyLink} className={button.secondarySm}>
          {copied ? (
            <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p
        role="status"
        aria-live="polite"
        className={cx(
          "text-xs",
          feedback && "mt-2",
          feedback?.tone === "error" ? "text-rose-300" : "text-emerald-300",
        )}
      >
        {feedback?.message}
      </p>
    </div>
  );
}
