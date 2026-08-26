import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { WikiBrowser } from "@/components/wiki_components/wiki-browser";
import { toWikiEntry } from "@/lib/wiki/wiki";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Wiki() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wiki")
    .select("id, wiki_question, wiki_answer, wiki_labels")
    .order("created_at", { ascending: true });

  const entries = (data ?? []).map(toWikiEntry);

  return (
    <main className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/dashboard" />}>
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Wiki</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <WikiBrowser entries={entries} error={error?.message ?? null} />
      </div>
    </main>
  );
}
