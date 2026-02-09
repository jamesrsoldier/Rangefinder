"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, ShieldOff, Trash2 } from "lucide-react";
import { useAdminUsers } from "@/hooks/use-admin-data";

interface AdminUser {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
  createdAt: string;
  orgName: string | null;
  subscriptionTier: string | null;
  orgRole: string | null;
}

export default function AdminUsersPage() {
  const { data: users, isLoading, mutate } = useAdminUsers();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggleAdmin(userId: string, currentIsAdmin: boolean) {
    setLoadingId(userId);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: !currentIsAdmin }),
      });
      mutate();
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    setLoadingId(userId);
    try {
      await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      mutate();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Users</h2>
        <p className="text-sm text-muted-foreground">Manage all registered users</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
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
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users as AdminUser[] || []).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {user.firstName || user.lastName
                            ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                            : 'No name'}
                          {user.isAdmin && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Admin</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.orgName || <span className="text-muted-foreground">None</span>}</TableCell>
                      <TableCell>
                        {user.subscriptionTier ? (
                          <Badge variant={
                            user.subscriptionTier === 'growth' ? 'default' :
                            user.subscriptionTier === 'starter' ? 'secondary' : 'outline'
                          }>
                            {user.subscriptionTier}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{user.orgRole || '—'}</TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleAdmin(user.id, user.isAdmin)}
                            disabled={loadingId === user.id}
                            title={user.isAdmin ? 'Remove admin' : 'Make admin'}
                          >
                            {user.isAdmin ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteUser(user.id)}
                            disabled={loadingId === user.id}
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
