import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import { subscribeOrders, subscribeChannels } from "../lib/realtime";

const router: IRouter = Router();

// SSE stream of live order events for the authenticated user's club. The F&B
// board subscribes via the browser's native EventSource (same-origin cookies).
router.get("/realtime/orders", requireAuth, (req, res) => {
  const { clubId } = req.auth!;

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  res.write("event: ready\ndata: {}\n\n");

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);
  const unsubscribe = subscribeOrders(clubId, res);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});

// SSE stream of live department-channel chat events for the user's club.
router.get("/realtime/channels", requireAuth, (req, res) => {
  const { clubId } = req.auth!;

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  res.write("event: ready\ndata: {}\n\n");

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);
  const unsubscribe = subscribeChannels(clubId, res);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});

export default router;
