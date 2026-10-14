/** Props every lesson mini-widget receives from the lesson player. */
export interface WidgetProps {
  /** Call when the learner finishes the widget's challenge. Safe to call repeatedly. */
  onComplete: () => void;
  /** True if the learner has completed this widget before (XP already awarded). */
  completed: boolean;
}
