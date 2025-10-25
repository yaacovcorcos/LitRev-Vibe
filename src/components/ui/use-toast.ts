type ToastVariant = "default" | "destructive";

export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastSubscriber = (options: ToastOptions) => void;

const subscribers = new Set<ToastSubscriber>();

export function subscribeToToasts(callback: ToastSubscriber) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function emitToast(options: ToastOptions) {
  subscribers.forEach((subscriber) => subscriber(options));

  if (typeof window !== "undefined") {
    const event = new CustomEvent<ToastOptions>("litrev:toast", { detail: options });
    window.dispatchEvent(event);
  }

  if (process.env.NODE_ENV !== "production") {
    const channel = options.variant === "destructive" ? console.warn : console.info;
    channel(`[toast] ${options.title ?? ""}`.trim(), options.description ?? "");
  }
}

export function toast(options: ToastOptions) {
  emitToast(options);
}

export function useToast() {
  return {
    toast,
  };
}

export type { ToastVariant };
