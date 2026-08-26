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
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1>Processes</h1>
        <div>
          <ProcessLabelFilter
            labels={labels}
            selectedLabels={selectedLabels}
            onSelectedLabelsChange={setSelectedLabels}
          />
          <AddProcess processes={processes} />
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
