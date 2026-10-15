"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

/** A number that springs to its new value. */
export function AnimatedNumber({
  value,
  className,
  stiffness = 160,
  damping = 22,
}: {
  value: number;
  className?: string;
  stiffness?: number;
  damping?: number;
}) {
  const spring = useSpring(value, { stiffness, damping });
  const rounded = useTransform(spring, (v) => Math.round(v).toString());
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  return <motion.span className={className}>{rounded}</motion.span>;
}
