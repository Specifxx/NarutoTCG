import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/lesson-player";
import { toLessonSummary } from "@/components/lesson/lesson-summary";
import { getLesson, lessonKeys, lessonNeighbors, LESSONS } from "@/content/lessons";
import { plainText } from "@/lib/rich-text";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ lesson: l.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lesson: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).lesson);
  if (!lesson) return { title: "Lesson" };
  return { title: lesson.title, description: plainText(lesson.summary) };
}

export default async function LessonPage({ params }: { params: Promise<{ lesson: string }> }) {
  const lesson = getLesson((await params).lesson);
  if (!lesson) notFound();
  const { prev, next } = lessonNeighbors(lesson.id);
  return (
    <LessonPlayer
      lesson={lesson}
      keys={lessonKeys(lesson.id)}
      total={LESSONS.length}
      prev={prev ? toLessonSummary(prev) : undefined}
      next={next ? toLessonSummary(next) : undefined}
    />
  );
}
