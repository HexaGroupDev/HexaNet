"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  collectProcessLabels,
  filterProcessesByLabels,
  type ProcessOption,
} from "@/lib/processes/process";

export function useFilteredProcesses(processes: ProcessOption[]) {
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const labels = useMemo(() => collectProcessLabels(processes), [processes]);
  const filtered = useMemo(
    () => filterProcessesByLabels(processes, selectedLabels),
    [processes, selectedLabels],
  );

  return { labels, selectedLabels, setSelectedLabels, filtered };
}

export function ProcessLabelFilter({
  labels,
  selectedLabels,
  onSelectedLabelsChange,
}: {
  labels: string[];
  selectedLabels: string[];
  onSelectedLabelsChange: (labels: string[]) => void;
}) {
  function toggleLabel(label: string, checked: boolean) {
    if (checked) {
      if (selectedLabels.some((item) => item.toLowerCase() === label.toLowerCase())) {
        return;
      }
      onSelectedLabelsChange([...selectedLabels, label]);
      return;
    }

    onSelectedLabelsChange(
      selectedLabels.filter((item) => item.toLowerCase() !== label.toLowerCase()),
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant={selectedLabels.length > 0 ? "secondary" : "ghost"}
            aria-label="Filter by labels"
          />
        }
      >
        <Filter />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Labels</DropdownMenuLabel>
          {labels.length === 0 ? (
            <DropdownMenuItem disabled>No labels yet</DropdownMenuItem>
          ) : (
            labels.map((label) => {
              const checked = selectedLabels.some(
                (item) => item.toLowerCase() === label.toLowerCase(),
              );
              return (
                <DropdownMenuCheckboxItem
                  key={label}
                  checked={checked}
                  onCheckedChange={(next) => toggleLabel(label, next)}
                >
                  {label}
                </DropdownMenuCheckboxItem>
              );
            })
          )}
        </DropdownMenuGroup>
        {selectedLabels.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelectedLabelsChange([])}>
              Clear filters
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
