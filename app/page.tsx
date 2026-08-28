import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_58%)]"
      />

      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-5">
        <ThemeToggle />
      </div>

      <main className="relative z-10 flex max-w-lg flex-col items-center text-center">
        {/* Local SVG: plain img avoids next/image optimizer overhead */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon.svg"
          alt=""
          width={48}
          height={48}
          className="mb-6 h-12 w-12 object-contain dark:invert"
        />
        <h1 className="translate-x-0 text-balance">HexaNet</h1>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/auth/sign-up"
            className={cn(buttonVariants({ size: "lg" }), "h-10 min-w-28 px-5")}
          >
            Sign up
          </Link>
          <Link
            href="/auth/login"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-10 min-w-28 px-5",
            )}
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
