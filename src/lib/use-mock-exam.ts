import { useEffect, useRef, useState } from 'preact/hooks';
import type { MutableRef } from 'preact/hooks';

// Drives a native <dialog> from an `open` boolean. showModal() gives a real
// focus trap, initial focus, and Escape handling for free — the browser owns the
// hard parts. The effect only opens/closes to match `open`; the caller wires the
// dialog's onClose/onCancel to flip `open` back so Escape and backdrop dismissal
// stay in sync with React state. Returns the ref to attach to the <dialog>.
export function useModalDialog(open: boolean): MutableRef<HTMLDialogElement | null> {
  const ref = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof element.showModal !== 'function') return;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
  }, [open]);
  return ref;
}

// A wall-clock tick that updates once per second while `active`, used only to
// re-derive the remaining time from `expiresAt - now`. The countdown value is
// never itself persisted: pausing/reopening a tab simply resumes with the true
// remaining time. When inactive the interval is torn down so a finished or
// backgrounded exam does not keep ticking.
export function useSecondTick(active: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

// Whole-percent raw accuracy for display. The engine keeps the raw ratio; all
// rounding happens here in the presentation layer, never in the derive layer.
export function mockExamAccuracyPercent(rawAccuracy: number): number {
  return Math.round(rawAccuracy * 100);
}

export function splitMinutesSeconds(totalSeconds: number): { minutes: number; seconds: number } {
  const clamped = Math.max(0, totalSeconds);
  return { minutes: Math.floor(clamped / 60), seconds: clamped % 60 };
}
