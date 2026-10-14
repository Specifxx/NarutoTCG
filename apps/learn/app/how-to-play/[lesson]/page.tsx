import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLesson, LESSONS } from "@/content/lessons";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ lesson: l.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lesson: string }> }): Promise<Metadata> {
  const lesson = getLesson((await params).lesson);
  return { title: lesson ? lesson.title : "Lesson" };
}

export default async function LessonPage({ params }: { params: Promise<{ lesson: string }> }) {
  const lesson = getLesson((await params).lesson);
  if (!lesson) notFound();
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-black text-white">{lesson.title}</h1>
    </section>
  );
}
