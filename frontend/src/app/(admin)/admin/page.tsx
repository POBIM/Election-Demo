"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Vote, Users, Activity, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Election {
  id: string;
  title: string;
  status: string;
  description?: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const data = await apiRequest<Election[]>("/elections", { headers: headers as HeadersInit });
      
      if (Array.isArray(data)) {
        setElections(data);
      } else if ((data as any).data && Array.isArray((data as any).data)) {
        setElections((data as any).data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const totalElections = elections.length;
  const activeElections = elections.filter(e => e.status === 'open' || e.status === 'published').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ภาพรวมระบบ</h1>
          <p className="text-slate-500">ยินดีต้อนรับ, {user?.name}</p>
        </div>
        {user?.role === 'super_admin' && (
          <Link href="/admin/elections">
            <Button className="bg-[#1e293b] text-white hover:bg-[#0f172a]">
              <Plus className="w-4 h-4 mr-2" />
              สร้างการเลือกตั้งใหม่
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard 
          title="การเลือกตั้งทั้งหมด" 
          value={totalElections} 
          icon={Vote}
          className="bg-blue-500"
        />
        <StatsCard 
          title="กำลังดำเนินการ" 
          value={activeElections} 
          icon={Activity}
          className="bg-emerald-500"
        />
        <StatsCard 
          title="ผู้ใช้งาน" 
          value="-" 
          icon={Users}
          className="bg-orange-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">รายการเลือกตั้งล่าสุด</h2>
        </div>
        <div className="divide-y divide-slate-100">
           {isLoading ? (
             <div className="p-8 text-center text-slate-500">กำลังโหลด...</div>
           ) : elections.length === 0 ? (
             <div className="p-8 text-center text-slate-500">ไม่มีข้อมูลการเลือกตั้ง</div>
           ) : (
             elections.slice(0, 5).map(election => (
               <div key={election.id} className="p-4 hover:bg-slate-50 flex items-center justify-between transition-colors">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                     <Vote className="w-5 h-5" />
                   </div>
                   <div>
                     <p className="font-medium text-slate-900">{election.title}</p>
                     <p className="text-xs text-slate-500 capitalize">{election.status}</p>
                   </div>
                 </div>
                 <Link href={`/admin/elections/${election.id}`}>
                   <Button variant="outline" size="sm">จัดการ</Button>
                 </Link>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, className }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-md", className)}>
         <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  )
}
