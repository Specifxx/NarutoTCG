import { getArchetype } from "@/lib/data/archetypes";

/** Display name of an archetype (full), falling back to its id. */
export function archetypeName(archetypeId: string): string {
  return getArchetype(archetypeId)?.name ?? archetypeId;
}
