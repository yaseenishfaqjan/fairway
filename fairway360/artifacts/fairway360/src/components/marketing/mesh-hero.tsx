import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * §5.1 — living mesh gradient. Four soft color blobs drift on independent
 * sine/cosine paths and blend additively for slow, premium depth. Canvas + one
 * rAF, DPR capped at 1.5, paused off-screen, single static frame under
 * reduced-motion. Purely decorative (absolutely positioned by the parent).
 */
export function MeshHero({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const c = cv.getContext("2d");
    if (!c) return;
    const canvas: HTMLCanvasElement = cv;
    const ctx: CanvasRenderingContext2D = c;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const blobs = [
      { col: "26,122,74", x: 0.3, y: 0.3, ax: 0.18, ay: 0.12, sx: 0.013, sy: 0.017, r: 0.55 },
      { col: "34,185,140", x: 0.72, y: 0.34, ax: 0.15, ay: 0.16, sx: 0.017, sy: 0.011, r: 0.5 },
      { col: "212,175,80", x: 0.62, y: 0.72, ax: 0.16, ay: 0.14, sx: 0.011, sy: 0.015, r: 0.45 },
      { col: "12,80,52", x: 0.34, y: 0.66, ax: 0.14, ay: 0.13, sx: 0.015, sy: 0.012, r: 0.62 },
    ];

    function resize() {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function draw(t: number) {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        const cx = (b.x + Math.sin(t * b.sx) * b.ax) * w;
        const cy = (b.y + Math.cos(t * b.sy) * b.ay) * h;
        const rad = b.r * Math.min(w, h);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `rgba(${b.col},0.5)`);
        g.addColorStop(1, `rgba(${b.col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

    if (reduce) {
      draw(0);
      return () => ro.disconnect();
    }

    let raf = 0;
    let t = 0;
    let running = true;
    function loop() {
      if (!running) {
        raf = 0;
        return;
      }
      t += 1;
      draw(t);
      raf = requestAnimationFrame(loop);
    }
    const io = new IntersectionObserver(
      ([e]) => {
        running = e.isIntersecting;
        if (running && !raf) loop();
      },
      { threshold: 0 },
    );
    io.observe(canvas);
    loop();

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [reduce]);

  return <canvas ref={ref} aria-hidden className={className} style={{ display: "block", width: "100%", height: "100%" }} />;
}
