import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Terms of Use · HexaNet",
  description:
    "Terms of use and privacy policy for HexaNet, including how its TikTok integration handles TikTok data.",
};

export default function TermsPage() {
  return (
    <div className="relative min-h-svh">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-5">
        <ThemeToggle />
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-col px-6 py-16 sm:py-24">
        <Link href="/" className="mb-10 inline-flex w-fit items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.svg"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 object-contain dark:invert"
          />
          <span className="text-sm font-medium tracking-tight">HexaNet</span>
        </Link>

        <h1 className="translate-x-0 text-4xl">Terms of Use</h1>

        <div className="mt-8 space-y-5 text-[15px] leading-7">
          <p>
            HexaNet is an internal platform for HexaGroup. It is provided for
            company use.
          </p>
          <p>
            Access to HexaNet is restricted to authorized employees. Only people
            who have been granted an account may sign in and use the platform.
          </p>
          <p>
            HexaNet&apos;s TikTok integration displays content from authorized
            company accounts. Those posts are shown inside the platform for
            employees who are signed in.
          </p>
        </div>

        <h2
          id="privacy"
          className="mt-16 translate-x-0 border-t pt-16 text-4xl"
        >
          Privacy Policy
        </h2>

        <div className="mt-8 space-y-5 text-[15px] leading-7">
          <p>
            HexaNet&apos;s TikTok integration displays posts from authorized
            company accounts on the internal dashboard. It does not connect
            personal TikTok accounts, and it does not ask anyone to sign in
            with TikTok.
          </p>
          <p>
            For each configured company account, HexaNet reads the publicly
            available latest post. It stores the account name and handle, the
            caption, the publish date, the link to the post, and a copy of the
            video and cover image. TikTok&apos;s own media links expire, so
            HexaNet keeps those copies in order to play the post inside the
            dashboard.
          </p>
          <p>
            HexaNet does not collect TikTok passwords, direct messages,
            follower lists, comments, or like counts. To access authorized
            company accounts, HexaNet securely stores TikTok OAuth access and
            refresh tokens on its backend. These credentials are not accessible
            to employees through the dashboard and are used only to retrieve
            authorized content. It does not post, comment, or message on
            TikTok, and it does not sell this content or share it with
            advertisers.
          </p>
          <p>
            Saved posts are refreshed from the company account about every
            twelve hours. They are displayed on the HexaNet dashboard, which
            only signed-in employees can open.
          </p>
        </div>
      </main>
    </div>
  );
}
