import { Fragment, type ElementType } from "react";
import { tokenize, type RichToken } from "@/lib/rich-text";
import { KeywordChip } from "./keyword-chip";

function render(tokens: RichToken[], keyPrefix: string) {
  return tokens.map((t, i) => {
    const key = `${keyPrefix}${i}`;
    switch (t.type) {
      case "text":
        return <Fragment key={key}>{t.text}</Fragment>;
      case "bold":
        return (
          <strong key={key} className="font-semibold text-white">
            {render(t.children, `${key}.`)}
          </strong>
        );
      case "keyword":
        return (
          <KeywordChip key={key} query={t.query}>
            {t.label}
          </KeywordChip>
        );
    }
  });
}

/** Renders lesson/puzzle markup: **bold** and [[KEYWORD]] chips with tooltips. */
export function RichText({ text, as: Tag = "span", className }: { text: string; as?: ElementType; className?: string }) {
  return <Tag className={className}>{render(tokenize(text), "")}</Tag>;
}
