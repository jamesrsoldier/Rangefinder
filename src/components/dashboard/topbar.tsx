"use client";

import { Bell, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useProject } from "@/hooks/use-project";
import { useDateRange } from "@/hooks/use-date-range";
import { useAlertEvents } from "@/hooks/use-dashboard-data";
import { MobileSidebar } from "./mobile-sidebar";

const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

function MockUserButton() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
      <User className="h-4 w-4" />
    </div>
  );
}

function RealUserButton() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { UserButton } = require("@clerk/nextjs");
  return <UserButton afterSignOutUrl="/" />;
}

export function Topbar() {
  const { projects, projectId, setProject } = useProject();
  const { from, to, setRange } = useDateRange();
  const { data: alerts } = useAlertEvents(projectId, true);
  const unreadCount = alerts?.filter((a) => !a.isRead).length ?? 0;

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <MobileSidebar />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 items-center gap-4">
        <Select value={projectId || ""} onValueChange={setProject}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="hidden sm:block">
          <DateRangePicker from={from} to={to} onChange={setRange} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
        {isMockMode ? <MockUserButton /> : <RealUserButton />}
      </div>
    </header>
  );
}
