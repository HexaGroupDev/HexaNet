"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CircleAlert, X } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FLASH_ALERT_COOKIE } from "@/lib/alerts/constants";

const AUTO_DISMISS_MS = 8000;

type ScreenAlertContextValue = {
  show: (message: string) => void;
};

const ScreenAlertContext = createContext<ScreenAlertContextValue | null>(null);

function readFlashCookie() {
  if (typeof document === "undefined") return null;

  const prefix = `${FLASH_ALERT_COOKIE}=`;
  const pair = document.cookie.split("; ").find((row) => row.startsWith(prefix));
  if (!pair) return null;

  const raw = pair.slice(prefix.length);
  document.cookie = `${FLASH_ALERT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;

  try {
    return decodeURIComponent(raw.replace(/\+/g, " ")).trim() || null;
  } catch {
    return raw.replace(/\+/g, " ").trim() || null;
  }
}

export function ScreenAlertProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback((next: string) => {
    const text = next.trim();
    if (!text) return;
    setMessage(text);
  }, []);

  useEffect(() => {
    const fromCookie = readFlashCookie();
    if (fromCookie) setMessage(fromCookie);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ScreenAlertContext.Provider value={value}>
      {children}
      {message ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <Alert
            variant="destructive"
            className="pointer-events-auto w-full max-w-md border-destructive/30 shadow-lg"
          >
            <CircleAlert />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
            <AlertAction>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Dismiss"
                onClick={() => setMessage(null)}
              >
                <X />
              </Button>
            </AlertAction>
          </Alert>
        </div>
      ) : null}
    </ScreenAlertContext.Provider>
  );
}

export function useScreenAlert() {
  const context = useContext(ScreenAlertContext);
  if (!context) {
    throw new Error("useScreenAlert must be used within ScreenAlertProvider");
  }
  return context;
}
