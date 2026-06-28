// In-process pub/sub for live order updates, broadcast per club over SSE.
// Single-instance only; swap the EventEmitter for Redis pub/sub to scale out.

import { EventEmitter } from "node:events";
import type { Response } from "express";

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export type OrderEvent = {
  type: "order.created" | "order.updated";
  orderId: string;
};

const channel = (clubId: string): string => `orders:${clubId}`;

export function publishOrderEvent(clubId: string, ev: OrderEvent): void {
  emitter.emit(channel(clubId), ev);
}

/** Stream a club's order events to an SSE response. Returns an unsubscribe fn. */
export function subscribeOrders(clubId: string, res: Response): () => void {
  const ch = channel(clubId);
  const listener = (ev: OrderEvent): void => {
    res.write(`event: ${ev.type}\n`);
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  };
  emitter.on(ch, listener);
  return () => emitter.off(ch, listener);
}

// ── Department-channel chat events ──────────────────────────────────────────
export type ChannelEvent = {
  type: "channel.message";
  channelId: string;
  messageId: string;
};

const chatTopic = (clubId: string): string => `chat:${clubId}`;

export function publishChannelEvent(clubId: string, ev: ChannelEvent): void {
  emitter.emit(chatTopic(clubId), ev);
}

/** Stream a club's channel-chat events to an SSE response. Returns unsubscribe. */
export function subscribeChannels(clubId: string, res: Response): () => void {
  const ch = chatTopic(clubId);
  const listener = (ev: ChannelEvent): void => {
    res.write(`event: ${ev.type}\n`);
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  };
  emitter.on(ch, listener);
  return () => emitter.off(ch, listener);
}

// ── Per-user in-app notifications ───────────────────────────────────────────
export type NotificationEvent = { type: "notification" };

const notifTopic = (userId: string): string => `notif:${userId}`;

export function publishNotification(userId: string): void {
  emitter.emit(notifTopic(userId), { type: "notification" } as NotificationEvent);
}

/** Stream a single user's notification pings to an SSE response. */
export function subscribeNotifications(userId: string, res: Response): () => void {
  const ch = notifTopic(userId);
  const listener = (ev: NotificationEvent): void => {
    res.write(`event: ${ev.type}\n`);
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  };
  emitter.on(ch, listener);
  return () => emitter.off(ch, listener);
}
