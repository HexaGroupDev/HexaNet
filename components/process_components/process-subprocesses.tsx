"use client";

import { ProcessCards } from "@/components/process_components/process-cards";
import {
  ProcessLabelFilter,
  useFilteredProcesses,
} from "@/components/process_components/process-label-filter";
import type { ProcessOption } from "@/lib/processes/process";

export function ProcessSubprocesses({
  descendants,
  processOptions,
}: {
  descendants: ProcessOption[];
  processOptions: ProcessOption[];
}) {
  const { labels, selectedLabels, setSelectedLabels, filtered } =
    useFilteredProcesses(descendants);

  if (descendants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No sub-processes yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2>Sub-processes</h2>
        <ProcessLabelFilter
          labels={labels}
          selectedLabels={selectedLabels}
          onSelectedLabelsChange={setSelectedLabels}
        />
      </div>
      {selectedLabels.length > 0 && filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No processes match the selected labels.
        </p>
      ) : (
        <ProcessCards processes={filtered} processOptions={processOptions} />
      )}
    </div>
  );
}
