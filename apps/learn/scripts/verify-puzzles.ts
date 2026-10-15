/**
 * Proves every Lethal Puzzle is fair and exact:
 *   1. the stored solution actually wins when replayed, and
 *   2. an exhaustive search finds exactly one winning line, which is that solution.
 *
 * Run: pnpm --filter @naruto-tcg/learn verify:puzzles
 */
import { PUZZLES } from "../content/puzzles";
import { describeAction } from "../lib/game/engine";
import { actionKey, solvePuzzle, startRun, stepRun } from "../lib/game/puzzle";

let failures = 0;

for (const puzzle of PUZZLES) {
  const problems: string[] = [];

  let run = startRun(puzzle);
  for (const [i, step] of puzzle.solution.entries()) {
    const result = stepRun(puzzle, run, step.action);
    if (!result.ok) {
      problems.push(`solution step ${i + 1} is illegal: ${result.reason}`);
      break;
    }
    run = result.run;
  }
  if (!problems.length) {
    if (!run.evaluation) problems.push("solution does not end the Round (missing final pass?)");
    else if (run.evaluation.winner !== "you") problems.push(`solution loses: ${run.evaluation.scoreAfter.you}–${run.evaluation.scoreAfter.opp}`);
  }

  const report = solvePuzzle(puzzle);
  const expected = puzzle.solution.map((s) => actionKey(s.action)).join(" → ");
  const found = report.wins.map((line) => line.map(actionKey).join(" → "));
  if (report.truncated) problems.push(`search truncated after ${report.lines} lines`);
  if (found.length !== 1) problems.push(`expected exactly 1 winning line, found ${found.length}`);
  else if (found[0] !== expected) problems.push(`unique winning line differs from stored solution:\n      found:    ${found[0]}\n      expected: ${expected}`);

  const status = problems.length ? "FAIL" : "PASS";
  console.log(`${status}  ${puzzle.id}  (${report.lines} lines explored, ${found.length} winning)`);
  if (run.evaluation) {
    console.log(`      final score ${run.evaluation.scoreAfter.you}–${run.evaluation.scoreAfter.opp}`);
  }
  for (const line of found.slice(0, 5)) console.log(`      win: ${line}`);
  for (const p of problems) console.log(`      ✗ ${p}`);
  if (problems.length) {
    failures += 1;
    let replay = startRun(puzzle);
    for (const step of puzzle.solution) {
      console.log(`      · ${describeAction(replay.state, step.action, puzzle.cards)}`);
      const r = stepRun(puzzle, replay, step.action);
      if (!r.ok) break;
      replay = r.run;
    }
  }
}

if (failures) {
  console.error(`\n${failures} puzzle(s) failed verification.`);
  process.exit(1);
}
console.log(`\nAll ${PUZZLES.length} puzzle(s) verified: each has exactly one winning line.`);
