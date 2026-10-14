import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Tournament } from "@naruto-tcg/types";
import type { EventMetaInput } from "../types";

/** A downloadable TO template from public/templates. */
export function readTemplate(name: string): string {
  return readFileSync(fileURLToPath(new URL(`../../../public/templates/${name}`, import.meta.url)), "utf8");
}

/** A test fixture from this folder. */
export function readFixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./${name}`, import.meta.url)), "utf8");
}

export const templateMeta = (): EventMetaInput => JSON.parse(readTemplate("event-meta-template.json")) as EventMetaInput;

export const templateTournament = (): Tournament => JSON.parse(readTemplate("tournament-template.json")) as Tournament;
