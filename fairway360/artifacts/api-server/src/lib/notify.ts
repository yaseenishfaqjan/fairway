// Create an in-app notification: persist it, ping the user's live SSE bell, and
// best-effort push (Firebase). Channel-agnostic — works with zero external keys
// (in-app bell always works; push fires only if Firebase is configured).

import { db, notifications } from "@workspace/db";
import { publishNotification } from "./realtime";
import { sendToUsers } from "./push";
import { logger } from "./logger";

export interface NotifyInput {
  clubId: string;
  userId: string;
  type?: string;
  title: string;
  body?: string;
  link?: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      clubId: input.clubId,
      userId: input.userId,
      type: input.type ?? "info",
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      read: false,
    });
    publishNotification(input.userId);
    void sendToUsers(input.clubId, [input.userId], {
      title: input.title,
      body: input.body ?? "",
      link: input.link,
    });
  } catch (err) {
    logger.error({ err }, "notify: failed to create notification");
  }
}

/** Fan a notification out to several users in a club. */
export async function notifyMany(
  clubId: string,
  userIds: string[],
  n: Omit<NotifyInput, "clubId" | "userId">,
): Promise<void> {
  await Promise.all(userIds.map((userId) => notify({ clubId, userId, ...n })));
}
