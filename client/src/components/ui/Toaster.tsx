import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useUiStore, type ToastVariant } from '@/stores/ui';

const icon: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const accent: Record<ToastVariant, string> = {
  success: 'text-fairway-400',
  error: 'text-red-400',
  info: 'text-sky-400',
};

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = icon[t.variant];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              className="card pointer-events-auto flex items-start gap-3 px-4 py-3"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${accent[t.variant]}`} />
              <p className="flex-1 text-sm text-night-100">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-night-500 hover:text-night-200"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
