import { Check, TriangleAlert } from "lucide-react";
import { cx } from "@/lib/format";
import { STEPS } from "@/lib/submission";

/**
 * - complete: passed and currently valid
 * - error:    passed or attempted, but something no longer validates
 * - visited:  reached before, never completed
 * - upcoming: not reached yet (not clickable)
 */
export type StepState = "complete" | "current" | "error" | "visited" | "upcoming";

const CIRCLE: Record<StepState, string> = {
  current: "border-chakra-500 bg-chakra-500 text-shadow-950 ring-4 ring-chakra-500/20",
  complete: "border-chakra-500/60 bg-chakra-500/15 text-chakra-400",
  error: "border-amber-400/60 bg-amber-500/10 text-amber-300",
  visited: "border-shadow-500 bg-shadow-800 text-ash-200",
  upcoming: "border-shadow-700 bg-shadow-900 text-ash-400",
};

const STATUS_TEXT: Record<StepState, string> = {
  current: "current step",
  complete: "completed",
  error: "needs attention",
  visited: "not finished",
  upcoming: "not started",
};

/** Progress stepper: an ordered list where visited steps are buttons. */
export function Stepper({
  current,
  states,
  onSelect,
}: {
  current: number;
  states: readonly StepState[];
  onSelect: (index: number) => void;
}) {
  return (
    <nav aria-label="Submission progress">
      <ol className="flex items-start">
        {STEPS.map((step, i) => {
          const state = states[i] ?? "upcoming";
          const clickable = state !== "upcoming" && state !== "current";
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cx(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors",
                  CIRCLE[state],
                )}
              >
                {state === "complete" ? (
                  <Check className="h-4 w-4" />
                ) : state === "error" ? (
                  <TriangleAlert className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                aria-hidden="true"
                className={cx(
                  "mt-2 hidden text-xs font-medium sm:block",
                  state === "current" ? "text-white" : "text-ash-400",
                  clickable && "group-hover:text-ash-200",
                )}
              >
                {step.shortTitle}
              </span>
              <span className="sr-only">
                Step {i + 1}: {step.title}, {STATUS_TEXT[state]}
              </span>
            </>
          );
          return (
            <li
              key={step.id}
              aria-current={i === current ? "step" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center"
            >
              {i > 0 && (
                // Runs from just past the previous circle (and the current step's 4px ring) to just
                // before this one, so it never crosses a circle: every <li> is the same width, so its
                // centre is 50% in and the previous centre 50% before it.
                <span
                  aria-hidden="true"
                  className={cx(
                    "absolute left-[calc(-50%_+_1.5rem)] right-[calc(50%_+_1.5rem)] top-4 h-0.5 -translate-y-1/2 rounded-full",
                    states[i - 1] === "complete" ? "bg-chakra-500/50" : "bg-shadow-700",
                  )}
                />
              )}
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  className="group relative flex flex-col items-center rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chakra-400 focus-visible:ring-offset-2 focus-visible:ring-offset-shadow-900"
                >
                  {content}
                </button>
              ) : (
                <span className="relative flex flex-col items-center px-1">{content}</span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center text-sm text-ash-400 sm:hidden" aria-hidden="true">
        Step {current + 1} of {STEPS.length}: <span className="font-medium text-white">{STEPS[current]?.title}</span>
      </p>
    </nav>
  );
}
