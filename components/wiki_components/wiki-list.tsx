"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { AddWiki } from "@/components/wiki_components/add-wiki";
import { WikiSettings } from "@/components/wiki_components/wiki-settings";
import type { WikiEntry } from "@/lib/wiki/wiki";
import { BookOpen } from "lucide-react";

export function WikiList({
  entries,
  allEntries,
}: {
  entries: WikiEntry[];
  allEntries: WikiEntry[];
}) {
  if (entries.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpen />
          </EmptyMedia>
          <EmptyTitle>No Wiki Entries Yet</EmptyTitle>
          <EmptyDescription>
            You haven&apos;t added any wiki entries yet. Get started by creating
            the first one.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          <AddWiki trigger="Create Wiki Entry" entries={allEntries} />
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Accordion>
      {entries.map((entry) => (
        <AccordionItem key={entry.id} value={String(entry.id)}>
          <div className="flex items-center">
            <AccordionTrigger>
              {entry.wiki_question}
              {entry.wiki_labels.map((label) => (
                <Badge key={label}>{label}</Badge>
              ))}
            </AccordionTrigger>
            <div className="shrink-0 pr-2">
              <WikiSettings entry={entry} entries={allEntries} />
            </div>
          </div>
          <AccordionContent className="whitespace-pre-wrap">
            {entry.wiki_answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
