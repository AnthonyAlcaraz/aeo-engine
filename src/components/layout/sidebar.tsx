"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Radar,
  LayoutDashboard,
  Building2,
  Search,
  FileText,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Brand Kit", icon: Building2, href: "/brand" },
  { label: "Probes", icon: Search, href: "/probes" },
  { label: "Content", icon: FileText, href: "/content" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col bg-gray-900 text-gray-100">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-gray-800 px-6 py-5">
        <Radar className="h-6 w-6 text-blue-400" />
        <span className="text-lg font-bold tracking-tight">AEO Engine</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Cost footer */}
      <div className="border-t border-gray-800 px-6 py-4">
        <p className="text-xs text-gray-500">Today&apos;s usage</p>
        <p className="text-sm font-semibold text-gray-300">Cost: $0.00 today</p>
      </div>
    </aside>
  );
}
