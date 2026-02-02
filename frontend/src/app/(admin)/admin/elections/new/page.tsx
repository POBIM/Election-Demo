"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewElectionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    nameTh: "",
    description: "",
    startDate: "",
    endDate: "",
    hasPartyList: true,
    hasConstituency: true,
    hasReferendum: false,
  });

  if (user?.role !== 'super_admin') {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        <Link href="/admin">
          <Button variant="outline" className="mt-4">กลับหน้าหลัก</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await apiRequest<{ success: boolean; data: { id: string } }>("/elections", {
        data: form,
      });
      
      if (res.success) {
        router.push(`/admin/elections/${res.data.id}`);
      }
    } catch (err: any) {
      setError(err.message || "ไม่สามารถสร้างการเลือกตั้งได้");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/elections" className="text-slate-500 hover:text-slate-700 flex items-center gap-2 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" />
          กลับไปรายการเลือกตั้ง
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">สร้างการเลือกตั้งใหม่</h1>
        <p className="text-slate-500">กรอกข้อมูลเพื่อสร้างการเลือกตั้งใหม่</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ (English)</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="General Election 2028"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ (ภาษาไทย)</label>
            <input
              type="text"
              value={form.nameTh}
              onChange={e => setForm({ ...form, nameTh: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="การเลือกตั้งทั่วไป พ.ศ. 2571"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด</label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="รายละเอียดการเลือกตั้ง..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">วันเริ่มต้น</label>
            <input
              type="date"
              value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">วันสิ้นสุด</label>
            <input
              type="date"
              value={form.endDate}
              onChange={e => setForm({ ...form, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">ประเภทบัตรลงคะแนน</label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={form.hasPartyList}
                onChange={e => setForm({ ...form, hasPartyList: e.target.checked })}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <p className="font-medium text-slate-900">บัตรบัญชีรายชื่อ (Party List)</p>
                <p className="text-sm text-slate-500">เลือกพรรคการเมือง</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={form.hasConstituency}
                onChange={e => setForm({ ...form, hasConstituency: e.target.checked })}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <p className="font-medium text-slate-900">บัตรแบ่งเขต (Constituency)</p>
                <p className="text-sm text-slate-500">เลือกผู้สมัครในเขตเลือกตั้ง</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={form.hasReferendum}
                onChange={e => setForm({ ...form, hasReferendum: e.target.checked })}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <p className="font-medium text-slate-900">ประชามติ (Referendum)</p>
                <p className="text-sm text-slate-500">คำถามประชามติ</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Link href="/admin/elections">
            <Button type="button" variant="outline">ยกเลิก</Button>
          </Link>
          <Button type="submit" disabled={isLoading} className="bg-[#1e293b] hover:bg-[#0f172a]">
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            สร้างการเลือกตั้ง
          </Button>
        </div>
      </form>
    </div>
  );
}
