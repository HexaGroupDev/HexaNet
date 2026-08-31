"use client";

import Script from "next/script";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

function processEmbeds() {
  window.instgrm?.Embeds.process();
}

export function InstagramEmbed({
  permalink,
  active,
  handle,
  label,
}: {
  permalink: string;
  active: boolean;
  handle: string | null;
  label: string;
}) {
  useEffect(() => {
    if (!active) return;
    processEmbeds();
  }, [active, permalink]);

  return (
    <Card
      className={cn(
        "relative mx-auto aspect-[9/16] h-[24rem] overflow-hidden border bg-white py-0",
        !active && "bg-muted",
      )}
    >
      {active ? (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 w-[min(100%,326px)] -translate-x-1/2 -translate-y-1/2">
            <blockquote
              className="instagram-media !m-0 w-full !min-w-0 !max-w-none !border-0 !shadow-none"
              data-instgrm-permalink={permalink}
              data-instgrm-version="14"
              style={{
                background: "transparent",
                margin: 0,
                padding: 0,
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
              }}
            />
          </div>
          <Script
            src="https://www.instagram.com/embed.js"
            strategy="lazyOnload"
            onLoad={processEmbeds}
          />
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="font-medium">{label}</p>
          {handle ? (
            <p className="text-sm text-muted-foreground">@{handle}</p>
          ) : null}
        </div>
      )}
    </Card>
  );
}
