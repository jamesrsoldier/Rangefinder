"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";
import { useAdminProjects } from "@/hooks/use-admin-data";

interface AdminProject {
  id: string;
  name: string;
  domain: string;
  brandName: string;
  createdAt: string;
  orgName: string | null;
  subscriptionTier: string | null;
  keywordCount: number;
  queryRunCount: number;
  citationCount: number;
  lastRunAt: string | null;
}

export default function AdminProjectsPage() {
  const { data: projects, isLoading, mutate } = useAdminProjects();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function deleteProject(projectId: string) {
    if (!confirm('Delete this project and all its data? This cannot be undone.')) return;
    setLoadingId(projectId);
    try {
      await fetch(`/api/admin/projects/${projectId}`, { method: 'DELETE' });
      mutate();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Projects</h2>
        <p className="text-sm text-muted-foreground">View and manage all projects across organizations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead>Runs</TableHead>
                    <TableHead>Citations</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(projects as AdminProject[] || []).map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell className="text-muted-foreground">{project.domain}</TableCell>
                      <TableCell>{project.orgName || '—'}</TableCell>
                      <TableCell>
                        {project.subscriptionTier ? (
                          <Badge variant={
                            project.subscriptionTier === 'growth' ? 'default' :
                            project.subscriptionTier === 'starter' ? 'secondary' : 'outline'
                          }>
                            {project.subscriptionTier}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{project.keywordCount}</TableCell>
                      <TableCell>{project.queryRunCount}</TableCell>
                      <TableCell>{project.citationCount}</TableCell>
                      <TableCell>
                        {project.lastRunAt
                          ? new Date(project.lastRunAt).toLocaleDateString()
                          : <span className="text-muted-foreground">Never</span>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteProject(project.id)}
                          disabled={loadingId === project.id}
                          title="Delete project"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
