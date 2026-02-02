"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Vote, Users, Activity, Plus, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Election {
  id: string;
  name: string;
  nameTh: string;
  status: string;
  startDate: string;
  endDate: string;
  _count?: {
    parties: number;
    candidates: number;
  };
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
      const res = await apiRequest<{ success: boolean; data: Election[] }>("/elections");
      setElections(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const totalElections = elections.length;
  const activeElections = elections.filter(e => e.status === 'OPEN').length;
  const totalParties = elections.reduce((sum, e) => sum + (e._count?.parties || 0), 0);
  const totalCandidates = elections.reduce((sum, e) => sum + (e._count?.candidates || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">เปิดลงคะแนน</span>;
      case 'CLOSED':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">ปิดแล้ว</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">ร่าง</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ภาพรวมระบบ</h1>
          <p className="text-slate-500">ยินดีต้อนรับ, {user?.name} ({user?.role})</p>
        </div>
        {user?.role === 'super_admin' && (
          <Link href="/admin/elections/new">
            <Button className="bg-[#1e293b] text-white hover:bg-[#0f172a]">
              <Plus className="w-4 h-4 mr-2" />
              สร้างการเลือกตั้งใหม่
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard 
          title="การเลือกตั้งทั้งหมด" 
          value={totalElections} 
          icon={Vote}
          color="bg-blue-500"
        />
        <StatsCard 
          title="กำลังเปิดลงคะแนน" 
          value={activeElections} 
          icon={Activity}
          color="bg-green-500"
        />
        <StatsCard 
          title="พรรคการเมือง" 
          value={totalParties} 
          icon={Users}
          color="bg-purple-500"
        />
        <StatsCard 
          title="ผู้สมัครทั้งหมด" 
          value={totalCandidates} 
          icon={Users}
          color="bg-orange-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">รายการเลือกตั้ง</h2>
          <Link href="/admin/elections" className="text-sm text-blue-600 hover:underline flex items-center">
            ดูทั้งหมด <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">กำลังโหลด...</div>
        ) : elections.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Vote className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>ยังไม่มีการเลือกตั้ง</p>
            {user?.role === 'super_admin' && (
              <Link href="/admin/elections/new">
                <Button className="mt-4" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  สร้างการเลือกตั้งใหม่
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {elections.map(election => (
              <Link 
                key={election.id} 
                href={`/admin/elections/${election.id}`}
                className="p-4 hover:bg-slate-50 flex items-center justify-between transition-colors block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
                    <Vote className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{election.nameTh}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(election.startDate).toLocaleDateString('th-TH')}
                      </span>
                      <span>{election._count?.parties || 0} พรรค</span>
                      <span>{election._count?.candidates || 0} ผู้สมัคร</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(election.status)}
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-white shadow-sm", color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
