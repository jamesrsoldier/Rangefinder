"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";
import { FileText, Download, Copy, Loader2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminProjects } from "@/hooks/use-admin-data";

interface AdminProject {
  id: string;
  name: string;
  domain: string;
  orgName: string | null;
  subscriptionTier: string | null;
}

function dateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export default function AdminReportsPage() {
  const { data: projects, isLoading: projectsLoading } = useAdminProjects();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [fromDate, setFromDate] = useState(dateStr(subDays(new Date(), 30)));
  const [toDate, setToDate] = useState(dateStr(new Date()));
  const [report, setReport] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function generateReport() {
    if (!selectedProjectId) return;
    setGenerating(true);
    setError("");
    setReport("");
    try {
      const res = await fetch(
        `/api/admin/reports/${selectedProjectId}?from=${fromDate}&to=${toDate}`
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }
      const markdown = await res.text();
      setReport(markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadReport() {
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const project = (projects as AdminProject[] || []).find(
      (p) => p.id === selectedProjectId
    );
    const safeName = (project?.name ?? "project")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();
    a.href = url;
    a.download = `report-${safeName}-${fromDate}-to-${toDate}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Project Reports</h2>
        <p className="text-sm text-muted-foreground">
          Generate AI-readable reports for any project. Copy and paste into an AI
          assistant for analysis and action plans.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Project</label>
            {projectsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select a project...</option>
                {(projects as AdminProject[] || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.domain}
                    {p.orgName ? ` (${p.orgName})` : ""}
                    {p.subscriptionTier ? ` [${p.subscriptionTier}]` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date Range */}
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <Button
              onClick={generateReport}
              disabled={!selectedProjectId || generating}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-error/20 bg-error-muted p-3 text-sm text-error">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Output */}
      {report && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle>Report Preview</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-success" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadReport}>
                <Download className="mr-2 h-4 w-4" />
                Download .md
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/50 p-4 text-xs font-mono leading-relaxed">
              {report}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
