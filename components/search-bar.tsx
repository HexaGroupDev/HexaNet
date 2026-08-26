"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";

const SearchCommandDialog = dynamic(
  () =>
    import("@/components/search-command-dialog").then(
      (mod) => mod.SearchCommandDialog,
    ),
  { ssr: false },
);

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "size-4"}
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CommandKeyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "size-3"}
      aria-hidden
    >
      <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
    </svg>
  );
}

export default function SearchBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dialogReady, setDialogReady] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsMac(/Mac|iPhone|iPod|iPad/i.test(navigator.userAgent));
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setDialogReady(true);
        setOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function openSearch() {
    setDialogReady(true);
    setOpen(true);
  }

  function goTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button
        variant="ghost"
        onClick={openSearch}
        className="hidden h-8 w-[14rem] p-0 hover:bg-transparent lg:flex"
        aria-label="Open search"
      >
        <InputGroup className="pointer-events-none w-full">
          <InputGroupInput
            readOnly
            tabIndex={-1}
            placeholder="Search..."
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <Kbd>
              {isMac ? <CommandKeyIcon /> : "Ctrl"}K
            </Kbd>
          </InputGroupAddon>
        </InputGroup>
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={openSearch}
        className="lg:hidden"
        aria-label="Open search"
      >
        <SearchIcon />
      </Button>
      {dialogReady ? (
        <SearchCommandDialog
          open={open}
          onOpenChange={setOpen}
          onNavigate={goTo}
        />
      ) : null}
    </>
  );
}
