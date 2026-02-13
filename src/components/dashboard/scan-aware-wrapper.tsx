"use client";

import { useProject } from "@/hooks/use-project";
import { ScanProvider } from "@/hooks/use-scan-status";

export function ScanAwareWrapper({ children }: { children: React.ReactNode }) {
  const { projectId } = useProject();
  return <ScanProvider projectId={projectId}>{children}</ScanProvider>;
}
