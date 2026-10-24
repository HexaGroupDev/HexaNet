"use client";

import { AddProcess } from "@/components/process_components/add-process";
import { ProcessCards } from "@/components/process_components/process-cards";
import {
  ProcessLabelFilter,
  useFilteredProcesses,
} from "@/components/process_components/process-label-filter";
import type { ProcessOption } from "@/lib/processes/process";

export function ProcessBrowser({
  processes,
  error,
}: {
  processes: ProcessOption[];
  error?: string | null;
}) {
  const { labels, selectedLabels, setSelectedLabels, filtered } =
    useFilteredProcesses(processes);

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1>Processes</h1>
        <div className="flex shrink-0 items-center gap-1">
          <ProcessLabelFilter
            labels={labels}
            selectedLabels={selectedLabels}
            onSelectedLabelsChange={setSelectedLabels}
          />
          <AddProcess processes={processes} ariaLabel="Add process" />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-muted-foreground">
          Could not load processes. {error}
        </p>
      ) : selectedLabels.length > 0 && filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No processes match the selected labels.
        </p>
      ) : (
        <ProcessCards processes={filtered} processOptions={processes} />
      )}
    </div>
  );
}
