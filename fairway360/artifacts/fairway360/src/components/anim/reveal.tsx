import { type ReactNode, createElement } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { DUR, EASE, STAGGER, revealInitial, type RevealVariant } from "@/lib/motion";

type Tag = "div" | "section" | "span" | "h1" | "h2" | "h3" | "p" | "li" | "ul";

const MOTION: Record<string, ReturnType<typeof motionTag>> = {};
function motionTag(tag: Tag) {
  return (motion as unknown as Record<string, typeof motion.div>)[tag];
}
function m(tag: Tag) {
  return (MOTION[tag] ??= motionTag(tag));
}

/**
 * Block reveal (§7.2). Fades + translates a block into view once. Falls back to
 * a plain element under reduced-motion.
 */
export function Reveal({
  children,
  variant = "up",
  delay = 0,
  amount = 0.2,
  as = "div",
  className,
}: {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  amount?: number;
  as?: Tag;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return createElement(as, { className }, children);
  const Comp = m(as);
  return (
    <Comp
      className={className}
      initial={revealInitial(variant)}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount }}
      transition={{ duration: DUR.reveal, ease: EASE.reveal, delay }}
    >
      {children}
    </Comp>
  );
}

/**
 * Word cascade (§7.1 / §5.3). Splits a plain-text string into words that rise,
 * fade, and untwist in reading order. Use only for plain strings — for headings
 * that contain gradient/colored sub-spans, use <Reveal> instead.
 */
export function RevealText({
  children,
  as = "span",
  className,
  delay = 0,
  amount = 0.3,
}: {
  children: string;
  as?: Tag;
  className?: string;
  delay?: number;
  amount?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return createElement(as, { className }, children);

  const words = children.split(" ");
  const Comp = m(as);
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: STAGGER.word, delayChildren: delay } },
  };
  const word: Variants = {
    hidden: { opacity: 0, y: "0.7em", rotate: 2 },
    show: { opacity: 1, y: 0, rotate: 0, transition: { duration: DUR.word, ease: EASE.word } },
  };

  return (
    <Comp
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {words.map((w, i) => (
        <span
          key={i}
          style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}
        >
          <motion.span variants={word} style={{ display: "inline-block", willChange: "transform" }}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Comp>
  );
}
