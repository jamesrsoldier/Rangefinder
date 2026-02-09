import { Suspense } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center border-b bg-background px-6">
          <h1 className="text-lg font-semibold">Administration</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Suspense>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
