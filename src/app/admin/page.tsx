"use client";

import { Users, Building2, FolderKanban, Search, Activity, Quote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminStats } from "@/hooks/use-admin-data";
import { Skeleton } from "@/components/ui/skeleton";

function StatsCard({ title, value, subtitle, icon: Icon }: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Admin Overview</h2>
          <p className="text-sm text-muted-foreground">System-wide metrics and health</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Admin Overview</h2>
        <p className="text-sm text-muted-foreground">System-wide metrics and health</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Users" value={stats.users} subtitle={`${stats.recentSignups} new this week`} icon={Users} />
        <StatsCard title="Organizations" value={stats.organizations} icon={Building2} />
        <StatsCard title="Projects" value={stats.projects} icon={FolderKanban} />
        <StatsCard title="Active Keywords" value={stats.activeKeywords} icon={Search} />
        <StatsCard title="Query Runs" value={stats.queryRuns} subtitle={`${stats.recentQueryRuns} this week`} icon={Activity} />
        <StatsCard title="Total Citations" value={stats.totalCitations} icon={Quote} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {stats.tierDistribution.map((t: { tier: string; count: number }) => (
              <div key={t.tier} className="flex items-center gap-2">
                <Badge variant={
                  t.tier === 'growth' ? 'default' :
                  t.tier === 'starter' ? 'secondary' : 'outline'
                }>
                  {t.tier}
                </Badge>
                <span className="text-2xl font-bold">{t.count}</span>
                <span className="text-sm text-muted-foreground">org{t.count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
