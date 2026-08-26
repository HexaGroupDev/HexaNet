"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { label: "Projects", href: "/dashboard/projects" },
  { label: "Clients", href: "/dashboard/clients" },
  { label: "Process", href: "/dashboard/process" },
  { label: "Wiki", href: "/dashboard/wiki" },
  { label: "Community", href: "/dashboard/community" },
  { label: "News", href: "/dashboard/news" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <ul className="text-sm sm:flex gap-5 hidden">
      {navigationItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <li key={item.href} className="group flex flex-col ">
            <Link href={item.href}>{item.label}</Link>
            <div
              className={`
                h-px
                w-full
                origin-left
                bg-primary
                transition-transform
                duration-200
                ${isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}
            `}
            />{" "}
          </li>
        );
      })}
    </ul>
  );
}
