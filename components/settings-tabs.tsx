"use client";

import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SettingsTab = "account" | "details" | "appearance";

const TAB_FROM_QUERY: Record<string, SettingsTab> = {
  account: "account",
  details: "details",
  appearance: "appearance",
  customization: "appearance",
};

function resolveSettingsTab(tab: string | null | undefined): SettingsTab {
  if (!tab) return "account";
  return TAB_FROM_QUERY[tab] ?? "account";
}

function tabToQuery(tab: SettingsTab): string {
  if (tab === "account") return "";
  return `?tab=${tab}`;
}

export function SettingsTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = resolveSettingsTab(searchParams.get("tab"));

  return (
    <Tabs
      value={tab}
      onValueChange={(next) => {
        const nextTab = next as SettingsTab;
        router.replace(`${pathname}${tabToQuery(nextTab)}`, { scroll: false });
      }}
    >
      <TabsList variant="line">
        <TabsTrigger value="account" className="hover:cursor-pointer">
          Account
        </TabsTrigger>
        <TabsTrigger value="details" className="hover:cursor-pointer">
          Details
        </TabsTrigger>
        <TabsTrigger value="appearance" className="hover:cursor-pointer">
          Appearance
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <Card>
          <CardHeader>Manage your Account</CardHeader>
        </Card>
      </TabsContent>
      <TabsContent value="details">
        <Card>
          <CardHeader>See Account Details</CardHeader>
        </Card>
      </TabsContent>
      <TabsContent value="appearance">
        <Card>
          <CardHeader>Customize your Experience</CardHeader>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
