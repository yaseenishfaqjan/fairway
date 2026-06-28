// Shared motion tokens (§2 of the animation spec). Reference these everywhere
// so motion reads as one system. Presentation-only — never gates app logic.

export const EASE = {
  reveal: [0.2, 0.7, 0.2, 1] as const,
  word: [0.2, 0.8, 0.2, 1] as const,
  soft: "easeInOut" as const,
};

export const DUR = {
  hover: 0.2,
  micro: 0.35,
  word: 0.55,
  reveal: 0.8,
  count: 1.5,
};

export const STAGGER = {
  word: 0.04, // 40ms per word
  list: 0.11, // 110ms per row
  block: 0.08, // 80/160/240ms siblings
};

export const DIST = {
  reveal: 30, // translateY px
  side: 42, // ±x slide px
  scaleFrom: 0.92,
};

// Block-reveal variants keyed by direction.
export type RevealVariant = "up" | "left" | "right" | "scale";

export function revealInitial(variant: RevealVariant) {
  switch (variant) {
    case "left":
      return { opacity: 0, x: -DIST.side };
    case "right":
      return { opacity: 0, x: DIST.side };
    case "scale":
      return { opacity: 0, scale: DIST.scaleFrom };
    default:
      return { opacity: 0, y: DIST.reveal };
  }
}
