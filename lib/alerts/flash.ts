import { NextResponse } from "next/server";
import { FLASH_ALERT_COOKIE } from "@/lib/alerts/constants";

const MAX_ALERT_LENGTH = 300;

export function normalizeAlertMessage(value: string) {
  let text = value.trim();
  try {
    text = decodeURIComponent(text.replace(/\+/g, " ")).trim();
  } catch {
    text = value.replace(/\+/g, " ").trim();
  }

  if (
    /flow_state_already_used/i.test(text) ||
    /already been used/i.test(text)
  ) {
    return "Sign-in could not be completed. Please try again.";
  }

  if (text.length > MAX_ALERT_LENGTH) {
    return `${text.slice(0, MAX_ALERT_LENGTH).trim()}…`;
  }

  return text;
}

export function applyFlashAlert(response: NextResponse, message: string) {
  const text = normalizeAlertMessage(message);
  if (!text) return response;

  response.cookies.set(FLASH_ALERT_COOKIE, text, {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
  });
  return response;
}

export function redirectWithFlash(url: string, message: string) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  return applyFlashAlert(response, message);
}
