"use client";

import { useMemo, useState } from "react";
import { AddWiki } from "@/components/wiki_components/add-wiki";
import { WikiList } from "@/components/wiki_components/wiki-list";
import { ProcessLabelFilter } from "@/components/process_components/process-label-filter";
import {
  collectWikiLabels,
  filterWikiByLabels,
  type WikiEntry,
} from "@/lib/wiki/wiki";

export function WikiBrowser({
  entries,
  error,
}: {
  entries: WikiEntry[];
  error?: string | null;
}) {
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const labels = useMemo(() => collectWikiLabels(entries), [entries]);
  const filtered = useMemo(
    () => filterWikiByLabels(entries, selectedLabels),
    [entries, selectedLabels],
  );

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1>Wiki</h1>
        <div>
          <ProcessLabelFilter
            labels={labels}
            selectedLabels={selectedLabels}
            onSelectedLabelsChange={setSelectedLabels}
          />
          <AddWiki entries={entries} />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-muted-foreground">
          Could not load wiki entries. {error}
        </p>
      ) : selectedLabels.length > 0 && filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No wiki entries match the selected labels.
        </p>
      ) : (
        <WikiList entries={filtered} allEntries={entries} />
      )}
    </div>
  );
}
