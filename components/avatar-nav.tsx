"use client";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "./ui/button";

function menuLinks(profileHref: string): {
  label: string;
  href: string;
  icon: ReactNode;
}[] {
  return [
    {
      label: "Profile",
      href: profileHref,
      icon: <User />,
    },
    {
      label: "Settings",
      href: profileHref,
      icon: <Settings />,
    },
  ];
}

type AvatarNavProps = {
  avatarUrl: string | null;
  avatarInitials: string;
  username: string | null;
  email: string | null;
  profileHref: string;
};

export function AvatarNav({
  avatarUrl,
  avatarInitials,
  username,
  email,
  profileHref,
}: AvatarNavProps) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar className="hover:cursor-pointer">
          {avatarUrl ? (
            <AvatarImage
              src={avatarUrl}
              alt="Profile avatar"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <AvatarFallback>{avatarInitials}</AvatarFallback>
          <AvatarBadge>
            <ChevronDown />
          </AvatarBadge>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56 rounded-xl">
        <div className="p-2">
          <div className="flex flex-col p-2">
            <p className="text-md truncate">
              {username ?? email ?? "Unnamed user"}
            </p>
            {username && email ? (
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            ) : null}
          </div>
          <DropdownMenuGroup>
            {menuLinks(profileHref).map((item) => (
              <DropdownMenuItem
                key={item.label}
                className="hover:cursor-pointer py-2"
                onClick={() => {
                  router.push(item.href);
                }}
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </div>
        <DropdownMenuSeparator />
        <Button
          className="w-full hover:cursor-pointer text-destructive"
          variant="ghost"
          onClick={() => {
            void logout();
          }}
        >
          <LogOut />
          Log out
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
