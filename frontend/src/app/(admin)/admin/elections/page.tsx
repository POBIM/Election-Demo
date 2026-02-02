"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Vote, Plus, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Election {
  id: string;
  title: string;
  status: string;
  createdAt?: string;
}

export default function ElectionsPage() {
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

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">จัดการการเลือกตั้ง</h1>
          <p className="text-slate-500">รายการเลือกตั้งทั้งหมดในระบบ</p>
        </div>
        {user?.role === 'super_admin' && (
           <Button className="bg-[#1e293b] text-white hover:bg-[#0f172a]">
              <Plus className="w-4 h-4 mr-2" />
              สร้างการเลือกตั้ง
           </Button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-4 border-b border-slate-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="ค้นหาการเลือกตั้ง..." 
                 className="pl-9 h-9 w-full rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
               />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
               <Filter className="w-4 h-4" />
               ตัวกรอง
            </Button>
         </div>

         <div className="overflow-x-auto">
           <table className="w-full text-sm text-left">
             <thead className="bg-slate-50 text-slate-500 font-medium">
               <tr>
                 <th className="px-6 py-4">ชื่อการเลือกตั้ง</th>
                 <th className="px-6 py-4">สถานะ</th>
                 <th className="px-6 py-4">วันที่สร้าง</th>
                 <th className="px-6 py-4 text-right">จัดการ</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {isLoading ? (
                 <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">กำลังโหลด...</td></tr>
               ) : elections.length === 0 ? (
                 <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">ไม่พบข้อมูล</td></tr>
               ) : (
                 elections.map(election => (
                   <tr key={election.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-6 py-4 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                             <Vote className="w-4 h-4" />
                           </div>
                           {election.title}
                        </div>
                     </td>
                     <td className="px-6 py-4">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                         ${election.status === 'open' ? 'bg-green-100 text-green-800' : 
                           election.status === 'closed' ? 'bg-red-100 text-red-800' : 
                           'bg-slate-100 text-slate-800'}`}>
                         {election.status}
                       </span>
                     </td>
                     <td className="px-6 py-4 text-slate-500">
                       {election.createdAt ? new Date(election.createdAt).toLocaleDateString('th-TH') : '-'}
                     </td>
                     <td className="px-6 py-4 text-right">
                       <Link href={`/admin/elections/${election.id}`}>
                         <Button variant="ghost" size="sm">รายละเอียด</Button>
                       </Link>
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
         </div>
      </div>
    </div>
  )
}
