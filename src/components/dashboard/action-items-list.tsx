"use client";

import { useState } from "react";
import { Check, X, Sparkles, Cpu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ActionItemResponse } from "@/types";

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-100 text-red-700 border-red-200" },
  high: { label: "High", className: "bg-orange-100 text-orange-700 border-orange-200" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { label: "Low", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

interface ActionItemsListProps {
  items: ActionItemResponse[];
  onDismiss: (id: string) => void;
  onComplete: (id: string) => void;
  isUpdating: string | null;
}

export function ActionItemsList({ items, onDismiss, onComplete, isUpdating }: ActionItemsListProps) {
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filtered = priorityFilter === "all"
    ? items
    : items.filter(item => item.priority === priorityFilter);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Prioritized Action Items</CardTitle>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {items.length === 0
              ? "No action items yet. Run a scan to generate recommendations."
              : "No items match the selected filter."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">Priority</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Keyword</TableHead>
                <TableHead className="text-right w-[80px]">Impact</TableHead>
                <TableHead className="hidden sm:table-cell w-[70px]">Source</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", PRIORITY_CONFIG[item.priority]?.className)}
                    >
                      {PRIORITY_CONFIG[item.priority]?.label ?? item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {item.keyword ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-medium text-emerald-600">
                      +{(item.estimatedImpact ?? 0).toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {item.source === "ai_powered" ? (
                      <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    ) : (
                      <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onComplete(item.id)}
                        disabled={isUpdating === item.id}
                        title="Mark complete"
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onDismiss(item.id)}
                        disabled={isUpdating === item.id}
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
