"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Vote, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
      กำลังโหลดข้อมูล...
    </div>;
  }

  if (!user) {
    return null; 
  }

  const navItems = [
    { name: "ภาพรวม", href: "/admin", icon: LayoutDashboard },
    { name: "การเลือกตั้ง", href: "/admin/elections", icon: Vote },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {isSidebarOpen && (
        <button 
          type="button"
          className="fixed inset-0 bg-black/50 z-40 lg:hidden cursor-default"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1e293b] text-white transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col shadow-xl",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#fbbf24]">
               <Vote className="w-5 h-5" />
             </div>
             <div>
               <h1 className="font-bold text-sm">ระบบเลือกตั้ง</h1>
               <p className="text-xs text-slate-400">สำหรับเจ้าหน้าที่</p>
             </div>
           </div>
           <button 
             type="button"
             onClick={() => setIsSidebarOpen(false)}
             className="lg:hidden text-slate-400 hover:text-white"
           >
             <X className="w-5 h-5" />
           </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive 
                    ? "bg-[#fbbf24] text-[#1e293b] font-medium" 
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
                onClick={() => setIsSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-white/5">
             <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-medium">
               {(user.name?.[0] || 'U').toUpperCase()}
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-sm font-medium truncate">{user.name || user.email}</p>
               <p className="text-xs text-slate-400 truncate capitalize">{user.role?.replace('_', ' ')}</p>
             </div>
          </div>
          <button 
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8">
           <div className="flex items-center gap-4">
             <button 
               type="button"
               className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-md"
               onClick={() => setIsSidebarOpen(true)}
             >
               <Menu className="w-5 h-5" />
             </button>
             <div className="hidden sm:flex items-center text-sm text-slate-500">
                <Link href="/admin" className="font-medium text-slate-900 hover:underline">หน้าหลัก</Link>
                {pathname !== '/admin' && (
                  <>
                    <ChevronRight className="w-4 h-4 mx-2" />
                    <span className="capitalize text-slate-600">
                      {pathname.includes('/elections') ? 'การเลือกตั้ง' : pathname.split('/').pop()}
                    </span>
                  </>
                )}
             </div>
           </div>
           
           <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-xs text-slate-500">วันที่</p>
               <p className="text-sm font-medium text-slate-700">{new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric'})}</p>
             </div>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
