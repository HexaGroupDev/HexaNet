import { AuthButton } from "@/components/auth-button";
import { NavLinks } from "@/components/nav-links";
import SearchBar from "@/components/search-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Suspense } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section suppressHydrationWarning className="min-h-screen flex flex-col items-center">
      <nav className="w-full fixed flex justify-center z-10 border-b bg-background border-b-foreground/10 h-16 mb-10">
        <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
          <Link href="/dashboard" className="flex gap-1 items-center">
            {/* Local SVG: plain img avoids next/image optimizer overhead */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon.svg"
              alt="HexaSite icon"
              width={20}
              height={20}
              className="h-5 w-5 object-contain dark:invert"
            />
            <p className="font-bold">Dashboard</p>
          </Link>
          <div className="flex items-center gap-2">
            <NavLinks />
            <Separator orientation="vertical" className="mx-2 my-2 sm:inline hidden" />
            <SearchBar />
            <ThemeToggle />
            <Suspense
              fallback={
                <Skeleton className="size-7 rounded-full" aria-hidden />
              }
            >
              <AuthButton />
            </Suspense>
          </div>
        </div>
      </nav>
      <div className="flex-1 mt-[100px] flex flex-col gap-20 w-full md:px-20 max-w-7xl p-5 px-4">
        {children}
      </div>
    </section>
  );
}
