"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import useSWR from "swr";

interface ScanState {
  /** Whether any scan is currently running or pending */
  isScanning: boolean;
  /** Trigger a scan for the current project */
  triggerScan: (projectId: string) => Promise<{ ok: boolean; message: string }>;
  /** Last scan message (success/error feedback) */
  lastMessage: string | null;
}

const ScanContext = createContext<ScanState>({
  isScanning: false,
  triggerScan: async () => ({ ok: false, message: "No context" }),
  lastMessage: null,
});

export function useScanStatus() {
  return useContext(ScanContext);
}

interface QueryRun {
  id: string;
  status: string;
}

const runFetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error: ${r.status}`);
    return r.json();
  });

export function ScanProvider({
  projectId,
  children,
}: {
  projectId: string | null;
  children: React.ReactNode;
}) {
  const { mutate: globalMutate } = useSWRConfig();
  const [scanActive, setScanActive] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const prevRunningRef = useRef(false);

  // Poll recent runs: fast (3s) while scan active, slow (30s) otherwise
  const { data: recentRuns, mutate: mutateRuns } = useSWR<QueryRun[]>(
    projectId ? `/api/projects/${projectId}/monitoring?limit=3` : null,
    runFetcher,
    {
      refreshInterval: scanActive ? 3000 : 30000,
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  );

  const hasRunning = recentRuns?.some(
    (r) => r.status === "running" || r.status === "pending"
  ) ?? false;

  // Detect scan completion: was running → no longer running
  useEffect(() => {
    if (prevRunningRef.current && !hasRunning) {
      // Scan just completed — revalidate all project data
      // Use a regex matcher to revalidate all SWR keys containing the projectId
      globalMutate(
        (key) =>
          typeof key === "string" &&
          projectId !== null &&
          key.includes(`/api/projects/${projectId}`),
        undefined,
        { revalidate: true }
      );
      setScanActive(false);
    }
    prevRunningRef.current = hasRunning;
  }, [hasRunning, globalMutate, projectId]);

  // Also detect if user navigates to dashboard while a scan is already running
  useEffect(() => {
    if (hasRunning && !scanActive) {
      setScanActive(true);
    }
  }, [hasRunning, scanActive]);

  const triggerScan = useCallback(
    async (pid: string) => {
      setScanActive(true);
      setLastMessage(null);

      try {
        const res = await fetch(`/api/projects/${pid}/monitoring`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json();

        if (!res.ok) {
          const msg = data.error || "Failed to trigger scan";
          setLastMessage(msg);
          setScanActive(false);
          return { ok: false, message: msg };
        }

        const msg = `Scan started: ${data.totalKeywords} keywords across ${data.engineTypes.length} engine(s)`;
        setLastMessage(msg);
        mutateRuns();
        return { ok: true, message: msg };
      } catch {
        const msg = "Failed to trigger scan. Is Inngest running?";
        setLastMessage(msg);
        setScanActive(false);
        return { ok: false, message: msg };
      }
    },
    [mutateRuns]
  );

  return (
    <ScanContext.Provider value={{ isScanning: scanActive || hasRunning, triggerScan, lastMessage }}>
      {children}
    </ScanContext.Provider>
  );
}
