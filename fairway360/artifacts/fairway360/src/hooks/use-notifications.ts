import { useCallback, useEffect, useState } from "react";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  time: string;
}

/**
 * Live in-app notifications for the signed-in user: loads the recent feed,
 * refreshes on a server-sent ping, and supports mark-read (optimistic).
 */
export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/me/notifications");
      if (!r.ok) return;
      const d = (await r.json()) as { items: AppNotification[]; unread: number };
      setItems(d.items ?? []);
      setUnread(d.unread ?? 0);
    } catch {
      /* offline / not authed — ignore */
    }
  }, []);

  useEffect(() => {
    load();
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/realtime/notifications");
      es.addEventListener("notification", () => void load());
    } catch {
      /* SSE unsupported — feed still loads on mount */
    }
    return () => es?.close();
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await fetch(`/api/me/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      /* ignore */
    }
  }, []);

  const markAll = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await fetch("/api/me/notifications/read-all", { method: "POST" });
    } catch {
      /* ignore */
    }
  }, []);

  return { items, unread, markRead, markAll };
}
