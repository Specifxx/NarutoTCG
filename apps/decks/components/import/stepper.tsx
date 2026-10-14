import { cx } from "@naruto-tcg/ui";
import { CheckIcon } from "./icons";
import { FOCUS_RING } from "./styles";
import { STEP_LABEL, type StepId } from "./wizard-state";

/** Ordered step list; finished steps are buttons back to themselves, the current one is aria-current. */
export function Stepper({ steps, current, onSelect }: { steps: StepId[]; current: StepId; onSelect: (step: StepId) => void }) {
  const currentIndex = steps.indexOf(current);
  return (
    <nav aria-label="Import steps">
      <ol className="flex items-center gap-1.5 xl:gap-2">
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const isCurrent = index === currentIndex;
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  done && "border-chakra-500 bg-chakra-500 text-shadow-950",
                  isCurrent && "border-chakra-400 bg-shadow-800 text-chakra-300",
                  !done && !isCurrent && "border-shadow-600 text-ash-500",
                )}
              >
                {done ? <CheckIcon className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={cx(
                  "whitespace-nowrap text-sm font-medium",
                  isCurrent ? "text-white" : done ? "text-ash-200" : "text-ash-500",
                  isCurrent ? "sr-only sm:not-sr-only" : "sr-only xl:not-sr-only",
                )}
              >
                <span className="sr-only">Step {index + 1}: </span>
                {STEP_LABEL[step]}
                {done && <span className="sr-only"> (done, go back to this step)</span>}
              </span>
            </>
          );
          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className={cx("flex min-w-0 items-center gap-1.5 xl:gap-2", index < steps.length - 1 && "flex-1")}
            >
              {done ? (
                <button
                  type="button"
                  onClick={() => onSelect(step)}
                  className={cx("flex items-center gap-2 rounded-full pr-1 transition hover:text-chakra-300", FOCUS_RING)}
                >
                  {content}
                </button>
              ) : (
                <span className="flex items-center gap-2">{content}</span>
              )}
              {index < steps.length - 1 && (
                <span aria-hidden="true" className={cx("h-px min-w-3 flex-1", done ? "bg-chakra-600" : "bg-shadow-600")} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
