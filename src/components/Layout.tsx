import { Suspense } from "react";
import { Outlet } from "react-router";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { LoadingState } from "@/components/common/LoadingState";

export function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <Header />
        <Suspense fallback={<LoadingState label="Loading page" />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
