"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import useSWR from "swr";
import type { ProjectResponse } from "@/types";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error: ${r.status}`);
    return r.json();
  });

const PROJECT_STORAGE_KEY = "rangefinder-last-project-id";

export function useProject() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data: projects, isLoading: isLoadingProjects, error: projectsError } = useSWR<ProjectResponse[]>(
    "/api/projects",
    fetcher
  );

  const projectIdFromUrl = searchParams.get("projectId");
  const storedProjectId = typeof window !== "undefined" ? localStorage.getItem(PROJECT_STORAGE_KEY) : null;

  // Track whether a stored project was invalidated so we can fall back
  const [invalidatedStoredId, setInvalidatedStoredId] = useState<string | null>(null);

  // If the stored ID was invalidated, skip it during project resolution
  const effectiveStoredId = storedProjectId === invalidatedStoredId ? null : storedProjectId;

  // Validate stored project ID against the loaded project list
  const validatedProjectId = (() => {
    const candidate = projectIdFromUrl || effectiveStoredId || null;
    // If we have the project list and a candidate, verify it exists in the list
    if (candidate && projects && projects.length > 0) {
      const found = projects.find((p) => p.id === candidate);
      if (!found) {
        // Stored/URL project doesn't belong to this user — fall back
        return projects[0]?.id || null;
      }
    }
    return candidate || projects?.[0]?.id || null;
  })();

  const { data: project, isLoading: isLoadingProject, error: projectError } = useSWR<ProjectResponse>(
    validatedProjectId ? `/api/projects/${validatedProjectId}` : null,
    fetcher
  );

  // If fetching the selected project fails (403/404), clear localStorage and invalidate
  useEffect(() => {
    if (projectError && validatedProjectId && typeof window !== "undefined") {
      localStorage.removeItem(PROJECT_STORAGE_KEY);
      setInvalidatedStoredId(validatedProjectId);
    }
  }, [projectError, validatedProjectId]);

  // Persist valid project ID to localStorage
  useEffect(() => {
    if (validatedProjectId && !projectError && typeof window !== "undefined") {
      localStorage.setItem(PROJECT_STORAGE_KEY, validatedProjectId);
    }
  }, [validatedProjectId, projectError]);

  const setProject = useCallback(
    (newProjectId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("projectId", newProjectId);
      router.replace(`${pathname}?${params.toString()}`);
      if (typeof window !== "undefined") {
        localStorage.setItem(PROJECT_STORAGE_KEY, newProjectId);
      }
      setInvalidatedStoredId(null);
    },
    [router, pathname, searchParams]
  );

  return {
    project: project || null,
    projects: projects || [],
    projectId: validatedProjectId,
    isLoading: isLoadingProjects || isLoadingProject,
    error: projectsError || (projectError && !invalidatedStoredId ? projectError : null),
    setProject,
  };
}
