import { describe, expect, it } from "vitest";
import { defaultSsl } from "../db";

describe("defaultSsl", () => {
  it.each([
    ["postgres://u:p@aws-0-eu-west-1.pooler.supabase.com:6543/postgres", "require"],
    ["postgres://u:p@db.example.internal:5432/app", "require"],
    ["postgres://u:p@localhost:5432/app", undefined],
    ["postgres://u:p@127.0.0.1/app", undefined],
    ["postgres://u:p@[::1]/app", undefined],
    ["postgres://u:p@db.example.internal/app?sslmode=disable", undefined],
    ["postgres://u:p@db.example.internal/app?sslmode=verify-full", undefined],
    ["not a url", undefined],
  ])("%s → %s", (url, expected) => {
    expect(defaultSsl(url)).toBe(expected);
  });
});
