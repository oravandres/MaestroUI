import { Outlet } from "react-router";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <Header />
        <Outlet />
      </main>
    </div>
  );
}
