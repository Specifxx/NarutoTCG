/** Joins truthy class names. */
export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");
