import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { enablePush, pushConfigured } from "@/lib/push-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * "Enable notifications" affordance. Renders nothing unless the server reports a
 * Firebase web config, so it's dormant until push is set up.
 */
export function EnablePushButton({ className }: { className?: string }) {
  const { toast } = useToast();
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    pushConfigured().then(setAvailable).catch(() => setAvailable(false));
  }, []);

  if (!available || done) return null;

  async function go() {
    setBusy(true);
    try {
      await enablePush();
      setDone(true);
      toast({ title: "Notifications on", description: "You'll get push alerts on this device." });
    } catch (e) {
      toast({ title: "Couldn't enable notifications", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      onClick={go}
      disabled={busy}
      variant="outline"
      className={className}
      data-testid="button-enable-push"
    >
      {done ? <Check className="mr-1.5 h-4 w-4" /> : <Bell className="mr-1.5 h-4 w-4" />}
      {busy ? "Enabling…" : "Enable notifications"}
    </Button>
  );
}
