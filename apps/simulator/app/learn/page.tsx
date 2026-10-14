import type { Metadata } from "next";
import { RulesGuide } from "@/components/learn/RulesGuide";

export const metadata: Metadata = { title: "Learn" };

export default function LearnPage() {
  return <RulesGuide />;
}
