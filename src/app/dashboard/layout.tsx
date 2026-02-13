import { Suspense } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { ScanAwareWrapper } from "@/components/dashboard/scan-aware-wrapper";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Suspense>
          <Topbar />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Suspense>
            <ScanAwareWrapper>{children}</ScanAwareWrapper>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
