"use client";

import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, TrendingUp, TrendingDown, Plus, Minus, Users, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AlertEventResponse, AlertType } from "@/types";

const alertIcons: Record<AlertType, React.ReactNode> = {
  visibility_drop: <TrendingDown className="h-4 w-4 text-error" />,
  visibility_increase: <TrendingUp className="h-4 w-4 text-success" />,
  new_citation: <Plus className="h-4 w-4 text-success" />,
  lost_citation: <Minus className="h-4 w-4 text-error" />,
  competitor_change: <Users className="h-4 w-4 text-warning" />,
  negative_sentiment: <MessageSquare className="h-4 w-4 text-error" />,
};

interface AlertFeedProps {
  alerts: AlertEventResponse[];
}

export function AlertFeed({ alerts }: AlertFeedProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Recent Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent alerts</p>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-3 rounded-md p-2 text-sm",
                  !alert.isRead && "bg-muted/50"
                )}
              >
                <div className="mt-0.5">
                  {alertIcons[alert.alertType] || <AlertTriangle className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
