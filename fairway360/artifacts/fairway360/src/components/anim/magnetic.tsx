import { type ReactNode, useRef } from "react";
import { motion, useReducedMotion, useSpring } from "framer-motion";

/**
 * Magnetic pull (§8.7). The child translates slightly toward the cursor while
 * hovered and springs back on leave. Pointer-only; renders inert on touch /
 * reduced-motion. Wrap a single CTA/button.
 */
export function Magnetic({
  children,
  className,
  strength = 0.3,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const x = useSpring(0, { stiffness: 180, damping: 15, mass: 0.3 });
  const y = useSpring(0, { stiffness: 180, damping: 15, mass: 0.3 });

  if (reduce) return <span className={className}>{children}</span>;

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * (strength + 0.1));
  }
  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.span
      ref={ref}
      className={className}
      style={{ x, y, display: "inline-block" }}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onPointerDown={reset}
    >
      {children}
    </motion.span>
  );
}
