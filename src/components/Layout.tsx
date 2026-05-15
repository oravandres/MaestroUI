import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { LoadingState } from "@/components/common/LoadingState";
import { RouteErrorBoundary } from "@/components/common/RouteErrorBoundary";

export function Layout() {
  const location = useLocation();
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <Header />
        <RouteErrorBoundary key={location.pathname}>
          <Suspense fallback={<LoadingState label="Loading page" />}>
            <Outlet />
          </Suspense>
        </RouteErrorBoundary>
      </main>
    </div>
  );
}
