import { useEffect, useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

/**
 * Ambient backdrop (§4.1–4.3): aurora drift + faint grid + static grain, fixed
 * behind page content. The CSS loops are frozen by the global reduced-motion
 * block, so this stays calm for users who opt out.
 */
export function Ambient() {
  return (
    <>
      <div className="fw-aurora" aria-hidden />
      <div className="fw-grid" aria-hidden />
      <div className="fw-grain" aria-hidden />
    </>
  );
}

/**
 * Cursor spotlight (§4.4): a soft light tracks the pointer. Desktop pointer
 * only; skipped on touch and under reduced-motion. Coalesces moves into one rAF.
 */
export function CursorSpotlight() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let mx = 0;
    let my = 0;
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--mx", `${mx}px`);
        el.style.setProperty("--my", `${my}px`);
        el.setAttribute("data-active", "true");
        raf = 0;
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduce]);

  if (reduce) return null;
  return <div ref={ref} className="fw-spotlight" aria-hidden />;
}

/**
 * Scroll-progress bar (§4.5): fills left→right with scroll fraction.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.2 });
  return <motion.div className="fw-progress" style={{ scaleX }} aria-hidden />;
}
