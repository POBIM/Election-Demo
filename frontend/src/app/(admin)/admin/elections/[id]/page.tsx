"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Square, Ban } from "lucide-react";
import Link from "next/link";

interface Election {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt?: string;
}

export default function ElectionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const [election, setElection] = useState<Election | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      try {
        const data = await apiRequest<Election>(`/elections/${id}`, { headers: headers as HeadersInit });
        if (data && data.id) {
          setElection(data);
          return;
        }
      } catch (e) {
        const list = await apiRequest<Election[]>("/elections", { headers: headers as HeadersInit });
        const found = Array.isArray(list) ? list.find(e => e.id === id) : (list as any).data?.find((e: Election) => e.id === id);
        if (found) setElection(found);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStatusChange = async (newStatus: string) => {
     if (!election) return;
     try {
       const token = localStorage.getItem("auth_token");
       const headers = token ? { Authorization: `Bearer ${token}` } : {};
       
       await apiRequest(`/elections/${election.id}`, {
         method: "PATCH",
         headers: headers as HeadersInit,
         data: { status: newStatus }
       });
       
       setElection({ ...election, status: newStatus });
     } catch (error) {
       console.error("Failed to update status", error);
       alert("ไม่สามารถเปลี่ยนสถานะได้");
     }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">กำลังโหลด...</div>;
  if (!election) return <div className="p-8 text-center text-slate-500">ไม่พบข้อมูลการเลือกตั้ง</div>;

  return (
    <div className="space-y-6">
       <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
             <Link href="/admin/elections">
               <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
             </Link>
             <div>
               <h1 className="text-2xl font-bold text-slate-900">{election.title}</h1>
               <div className="flex items-center gap-2 mt-1">
                 <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize
                   ${election.status === 'open' ? 'bg-green-100 text-green-800' : 
                     election.status === 'closed' ? 'bg-red-100 text-red-800' : 
                     'bg-slate-100 text-slate-800'}`}>
                   {election.status}
                 </span>
                 <span className="text-xs text-slate-400">ID: {election.id}</span>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
             {user?.role === 'super_admin' && (
               <>
                 {election.status === 'draft' && (
                   <Button onClick={() => handleStatusChange('open')} className="bg-green-600 hover:bg-green-700 text-white">
                     <Play className="w-4 h-4 mr-2" /> เปิดรับสมัคร
                   </Button>
                 )}
                 {election.status === 'open' && (
                   <Button onClick={() => handleStatusChange('closed')} variant="destructive">
                     <Square className="w-4 h-4 mr-2" /> ปิดรับสมัคร
                   </Button>
                 )}
                  {election.status !== 'closed' && election.status !== 'draft' && election.status !== 'open' && (
                   <Button onClick={() => handleStatusChange('closed')} variant="destructive">
                     <Ban className="w-4 h-4 mr-2" /> ยุติการเลือกตั้ง
                   </Button>
                 )}
               </>
             )}
          </div>
       </div>

       <div className="border-b border-slate-200">
         <nav className="-mb-px flex space-x-8 overflow-x-auto">
           {['overview', 'parties', 'candidates', 'results'].map((tab) => (
             <button
               key={tab}
               type="button"
               onClick={() => setActiveTab(tab)}
               className={`
                 whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
                 ${activeTab === tab 
                   ? 'border-[#1e293b] text-[#1e293b]' 
                   : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
               `}
             >
               {tab === 'overview' && 'ข้อมูลทั่วไป'}
               {tab === 'parties' && 'พรรคการเมือง'}
               {tab === 'candidates' && 'ผู้สมัคร'}
               {tab === 'results' && 'ผลคะแนน'}
             </button>
           ))}
         </nav>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 min-h-[400px]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
               <div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">รายละเอียด</h3>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-slate-700">{election.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <h3 className="text-sm font-medium text-slate-500 mb-1">วันที่สร้าง</h3>
                   <p className="text-slate-900">{election.createdAt ? new Date(election.createdAt).toLocaleDateString('th-TH') : '-'}</p>
                 </div>
                 <div>
                   <h3 className="text-sm font-medium text-slate-500 mb-1">แก้ไขล่าสุด</h3>
                   <p className="text-slate-900">-</p>
                 </div>
               </div>
            </div>
          )}
          {activeTab === 'parties' && (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <Ban className="w-12 h-12 mb-2 opacity-20" />
               <p>ส่วนจัดการพรรคการเมือง (อยู่ระหว่างพัฒนา)</p>
             </div>
          )}
          {activeTab === 'candidates' && (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <Ban className="w-12 h-12 mb-2 opacity-20" />
               <p>ส่วนจัดการผู้สมัคร (อยู่ระหว่างพัฒนา)</p>
             </div>
          )}
          {activeTab === 'results' && (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400">
               <Ban className="w-12 h-12 mb-2 opacity-20" />
               <p>ยังไม่มีผลคะแนน (อยู่ระหว่างพัฒนา)</p>
             </div>
          )}
       </div>
    </div>
  )
}
