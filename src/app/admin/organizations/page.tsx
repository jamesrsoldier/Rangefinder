"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";
import { useAdminOrganizations } from "@/hooks/use-admin-data";

interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  createdAt: string;
  memberCount: number;
  projectCount: number;
  ownerEmail: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
}

export default function AdminOrganizationsPage() {
  const { data: orgs, isLoading, mutate } = useAdminOrganizations();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function changeTier(orgId: string, tier: string) {
    setLoadingId(orgId);
    try {
      await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionTier: tier }),
      });
      mutate();
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteOrg(orgId: string) {
    if (!confirm('Delete this organization and all its projects? This cannot be undone.')) return;
    setLoadingId(orgId);
    try {
      await fetch(`/api/admin/organizations/${orgId}`, { method: 'DELETE' });
      mutate();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Organizations</h2>
        <p className="text-sm text-muted-foreground">Manage organizations and subscription tiers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Organizations</CardTitle>
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
                    <TableHead>Organization</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(orgs as AdminOrg[] || []).map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>
                        {org.ownerEmail || <span className="text-muted-foreground">Unknown</span>}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={org.subscriptionTier}
                          onValueChange={(v) => changeTier(org.id, v)}
                          disabled={loadingId === org.id}
                        >
                          <SelectTrigger className="w-[100px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">free</SelectItem>
                            <SelectItem value="starter">starter</SelectItem>
                            <SelectItem value="growth">growth</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={org.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                          {org.subscriptionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{org.memberCount}</TableCell>
                      <TableCell>{org.projectCount}</TableCell>
                      <TableCell>{new Date(org.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteOrg(org.id)}
                          disabled={loadingId === org.id}
                          title="Delete organization"
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
