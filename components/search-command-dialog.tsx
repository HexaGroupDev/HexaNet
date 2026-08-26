"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Building2,
  FolderKanban,
  LayoutDashboard,
  Settings,
  User,
  UsersRound,
  Workflow,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { createClient } from "@/lib/supabase/client";
import { profilePath } from "@/lib/profiles/profile-path";

const pages = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    icon: FolderKanban,
  },
  {
    label: "Clients",
    href: "/dashboard/clients",
    icon: UsersRound,
  },
  {
    label: "Process",
    href: "/dashboard/process",
    icon: Workflow,
  },
  {
    label: "Wiki",
    href: "/dashboard/wiki",
    icon: BookOpen,
  },
  {
    label: "Community",
    href: "/dashboard/community",
    icon: UsersRound,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
] as const;

type ProjectSearchResult = {
  project_id: string;
  project_name: string;
  project_slug: string;
};

type ClientSearchResult = {
  id: string;
  client_name: string;
  client_slug: string | null;
};

type ProcessSearchResult = {
  id: number;
  process_name: string;
  process_slug: string | null;
};

type ProfileSearchResult = {
  id: string;
  username: string | null;
};

export function SearchCommandDialog({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (href: string) => void;
}) {
  const [projects, setProjects] = useState<ProjectSearchResult[]>([]);
  const [clients, setClients] = useState<ClientSearchResult[]>([]);
  const [processes, setProcesses] = useState<ProcessSearchResult[]>([]);
  const [people, setPeople] = useState<ProfileSearchResult[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;

    let active = true;
    const supabase = createClient();

    async function loadSearchResults() {
      const [projectsResult, clientsResult, processesResult, peopleResult] =
        await Promise.all([
        supabase
          .from("projects")
          .select("project_id, project_name, project_slug")
          .order("project_name"),
        supabase
          .from("clients")
          .select("id, client_name, client_slug")
          .order("client_name"),
        supabase
          .from("processes")
          .select("id, process_name, process_slug")
          .order("process_name"),
        supabase.from("profiles").select("id, username").order("username"),
      ]);

      if (!active) return;

      if (projectsResult.error) {
        console.error(
          "Failed to load projects for search:",
          projectsResult.error.message,
        );
      } else {
        setProjects((projectsResult.data ?? []) as ProjectSearchResult[]);
      }

      if (clientsResult.error) {
        console.error(
          "Failed to load clients for search:",
          clientsResult.error.message,
        );
      } else {
        setClients((clientsResult.data ?? []) as ClientSearchResult[]);
      }

      if (processesResult.error) {
        console.error(
          "Failed to load processes for search:",
          processesResult.error.message,
        );
      } else {
        setProcesses((processesResult.data ?? []) as ProcessSearchResult[]);
      }

      if (peopleResult.error) {
        console.error(
          "Failed to load people for search:",
          peopleResult.error.message,
        );
      } else {
        setPeople((peopleResult.data ?? []) as ProfileSearchResult[]);
      }
    }

    void loadSearchResults();

    return () => {
      active = false;
    };
  }, [open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setSearch("");
    onOpenChange(nextOpen);
  }

  function navigate(href: string) {
    setSearch("");
    onNavigate(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Search"
      description="Search pages across the app."
    >
      <Command>
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search..."
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            {pages.map((page) => (
              <CommandItem
                key={page.href}
                className="cursor-pointer"
                value={page.label}
                onSelect={() => navigate(page.href)}
              >
                <page.icon />
                <span>{page.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          {projects.length > 0 ? (
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.project_id}
                  className="cursor-pointer"
                  value={project.project_name}
                  onSelect={() =>
                    navigate(`/dashboard/projects/${project.project_slug}`)
                  }
                >
                  <FolderKanban />
                  <span>{project.project_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {clients.length > 0 ? (
            <CommandGroup heading="Clients">
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  className="cursor-pointer"
                  value={client.client_name}
                  disabled={!client.client_slug}
                  onSelect={() => {
                    if (client.client_slug) {
                      navigate(
                        `/dashboard/clients/${client.client_slug}`,
                      );
                    }
                  }}
                >
                  <Building2 />
                  <span>{client.client_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {processes.length > 0 ? (
            <CommandGroup heading="Processes">
              {processes.map((process) => (
                <CommandItem
                  key={process.id}
                  className="cursor-pointer"
                  value={process.process_name}
                  disabled={!process.process_slug}
                  onSelect={() => {
                    if (process.process_slug) {
                      navigate(`/dashboard/process/${process.process_slug}`);
                    }
                  }}
                >
                  <Workflow />
                  <span>{process.process_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {people.some((person) => person.username) ? (
            <CommandGroup heading="People">
              {people.flatMap((person) => {
                const name = person.username?.trim();
                if (!name) return [];
                return [
                  <CommandItem
                    key={person.id}
                    className="cursor-pointer"
                    value={name}
                    onSelect={() => navigate(profilePath(name))}
                  >
                    <User />
                    <span>{name}</span>
                  </CommandItem>,
                ];
              })}
            </CommandGroup>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
