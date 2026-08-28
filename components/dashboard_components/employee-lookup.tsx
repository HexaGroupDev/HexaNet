"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/client";
import { profilePath } from "@/lib/profiles/profile-path";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 7;

type Employee = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  teamRole: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function compareEmployees(a: Employee, b: Employee) {
  const roleA = a.teamRole?.toLowerCase() ?? "";
  const roleB = b.teamRole?.toLowerCase() ?? "";
  if (!a.teamRole && b.teamRole) return 1;
  if (a.teamRole && !b.teamRole) return -1;
  const roleCmp = roleA.localeCompare(roleB);
  if (roleCmp !== 0) return roleCmp;
  return (a.username ?? "").localeCompare(b.username ?? "", undefined, {
    sensitivity: "base",
  });
}

function pageItems(current: number, total: number) {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < total - 1) items.push("ellipsis");
  items.push(total);
  return items;
}

function EmployeeRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg px-1 py-2">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function EmployeeLookupSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="flex flex-col">
        {Array.from({ length: PAGE_SIZE }, (_, index) => (
          <EmployeeRowSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export function EmployeeLookup() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function loadEmployees() {
      const { data: profiles, error: loadError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, team_role")
        .order("team_role", { ascending: true, nullsFirst: false })
        .order("username", { ascending: true });

      if (!active) return;

      if (loadError) {
        console.error("Failed to load employees:", loadError.message);
        setError(loadError.message);
        setEmployees([]);
        setLoading(false);
        return;
      }

      setError(null);
      setLoading(false);
      setEmployees(
        (profiles ?? []).map((profile) => ({
          id: profile.id,
          username:
            typeof profile.username === "string" && profile.username.trim() !== ""
              ? profile.username.trim()
              : null,
          avatarUrl:
            typeof profile.avatar_url === "string" &&
            profile.avatar_url.trim() !== ""
              ? profile.avatar_url.trim()
              : null,
          teamRole:
            typeof profile.team_role === "string" && profile.team_role.trim() !== ""
              ? profile.team_role.trim()
              : null,
        })),
      );
    }

    void loadEmployees();
    return () => {
      active = false;
    };
  }, []);

  const people = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? employees.filter((employee) => {
          const name = (employee.username ?? "").toLowerCase();
          const role = (employee.teamRole ?? "").toLowerCase();
          return name.includes(needle) || role.includes(needle);
        })
      : employees;
    return [...filtered].sort(compareEmployees);
  }, [employees, query]);

  const pageCount = Math.max(1, Math.ceil(people.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedPeople = people.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const showPagination = people.length > PAGE_SIZE;

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  if (error) {
    return (
      <p className="px-1 py-3 text-sm text-muted-foreground">
        Could not load employees. {error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="Search employees or roles..."
          aria-label="Search employees or roles"
        />
      </InputGroup>
      <div className="flex flex-col">
        {loading ? (
          Array.from({ length: PAGE_SIZE }, (_, index) => (
            <EmployeeRowSkeleton key={index} />
          ))
        ) : people.length === 0 ? (
          <p className="px-1 py-3 text-sm text-muted-foreground">
            {employees.length === 0
              ? "No teammates yet."
              : "No employees match that search."}
          </p>
        ) : (
          pagedPeople.map((employee) => {
            const name = employee.username ?? "Unnamed";
            const href = employee.username
              ? profilePath(employee.username)
              : null;
            const rowClassName =
              "flex items-center gap-3 rounded-lg px-1 py-2";
            const inner = (
              <>
                <Avatar size="sm">
                  {employee.avatarUrl ? (
                    <AvatarImage src={employee.avatarUrl} alt={name} />
                  ) : null}
                  <AvatarFallback>{initials(name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{name}</p>
                  {employee.teamRole ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {employee.teamRole}
                    </p>
                  ) : null}
                </div>
              </>
            );

            return href ? (
              <Link
                key={employee.id}
                href={href}
                className={`${rowClassName} hover:bg-muted/60`}
              >
                {inner}
              </Link>
            ) : (
              <div key={employee.id} className={rowClassName}>
                {inner}
              </div>
            );
          })
        )}
      </div>
      {showPagination ? (
        <Pagination className="mx-0">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                text=""
                size="icon-xs"
                className="pl-0!"
                disabled={currentPage <= 1}
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setPage((current) => Math.max(1, current - 1));
                }}
              />
            </PaginationItem>
            {pageItems(currentPage, pageCount).map((item, index) =>
              item === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis className="size-6" />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    size="icon-xs"
                    isActive={item === currentPage}
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setPage(item);
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                text=""
                size="icon-xs"
                className="pr-0!"
                disabled={currentPage >= pageCount}
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setPage((current) => Math.min(pageCount, current + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
