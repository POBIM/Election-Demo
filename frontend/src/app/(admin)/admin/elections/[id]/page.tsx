"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Play, Square, Ban, Plus, Pencil, Trash2, 
  RefreshCw, Filter, Users, Building2, BarChart3, Vote, Check, X, Search
} from "lucide-react";
import Link from "next/link";

interface Election {
  id: string;
  title?: string;
  name?: string;
  nameTh?: string;
  description?: string;
  status: string;
  createdAt?: string;
  hasReferendum?: boolean;
  hasPartyList?: boolean;
  hasConstituency?: boolean;
  referendumQuestions?: ReferendumQuestion[];
}

interface ReferendumQuestion {
  id: string;
  questionNumber: number;
  questionTh: string;
  questionEn?: string;
  descriptionTh?: string;
}

interface Party {
  id: string;
  electionId: string;
  partyNumber: number;
  name: string;
  nameTh: string;
  abbreviation?: string;
  color?: string;
  logoUrl?: string;
}

interface Candidate {
  id: string;
  candidateNumber: number;
  titleTh: string;
  firstNameTh: string;
  lastNameTh: string;
  partyId?: string;
  districtId?: string;
  party?: Party;
  district?: { id: string; nameTh: string; province?: { id: string; nameTh: string; } };
}

interface Province {
  id: string;
  nameTh: string;
  regionId?: string;
}

interface District {
  id: string;
  nameTh: string;
  zoneNumber: number;
  provinceId: string;
}

interface PartyResult {
  partyId: string;
  partyName: string;
  partyNameTh: string;
  partyColor?: string;
  voteCount: number;
  percentage: number;
}

interface ReferendumResult {
  questionId: string;
  questionText: string;
  approveCount: number;
  disapproveCount: number;
  abstainCount: number;
  approvePercentage: number;
  disapprovePercentage: number;
  result: string;
}

interface ResultsData {
  totalEligibleVoters: number;
  totalVotesCast: number;
  turnoutPercentage: number;
  partyListResults: PartyResult[];
  referendumResults?: ReferendumResult[];
}

export default function ElectionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const [election, setElection] = useState<Election | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [parties, setParties] = useState<Party[]>([]);
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [partyForm, setPartyForm] = useState({ partyNumber: 0, name: "", nameTh: "", abbreviation: "", color: "#000000" });

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [candidateForm, setCandidateForm] = useState({ 
    candidateNumber: 0, titleTh: "", firstNameTh: "", lastNameTh: "", partyId: "" 
  });

  const [results, setResults] = useState<ResultsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [formLoading, setFormLoading] = useState(false);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchElection = useCallback(async () => {
    try {
      const res = await apiRequest<{success: boolean, data: Election}>(`/elections/${id}`, { headers: getHeaders() as HeadersInit });
      if (res && res.data) setElection(res.data);
    } catch (e) {
      console.error("Fetch election failed", e);
    } finally {
      setIsLoading(false);
    }
  }, [id, getHeaders]);

  const fetchParties = useCallback(async () => {
    try {
      const res = await apiRequest<{data: Party[]}>(`/parties?electionId=${id}`, { headers: getHeaders() as HeadersInit });
      if (res && res.data) setParties(res.data);
      else if (Array.isArray(res)) setParties(res);
    } catch (e) {
      console.error("Fetch parties failed", e);
    }
  }, [id, getHeaders]);

  const fetchProvinces = useCallback(async () => {
    try {
      const res = await apiRequest<{data: Province[]}>(`/geo/provinces`, { headers: getHeaders() as HeadersInit });
      if (res && res.data) setProvinces(res.data);
    } catch (e) {
      console.error("Fetch provinces failed", e);
    }
  }, [getHeaders]);

  const fetchDistricts = useCallback(async (provinceId: string) => {
    try {
      const res = await apiRequest<{data: District[]}>(`/geo/districts?provinceId=${provinceId}`, { headers: getHeaders() as HeadersInit });
      if (res && res.data) setDistricts(res.data);
    } catch (e) {
      console.error("Fetch districts failed", e);
    }
  }, [getHeaders]);

  const fetchCandidates = useCallback(async (districtId: string) => {
    try {
      const res = await apiRequest<{data: Candidate[]}>(`/candidates?electionId=${id}&districtId=${districtId}`, { headers: getHeaders() as HeadersInit });
      if (res && res.data) {
        setCandidates(res.data.sort((a, b) => a.candidateNumber - b.candidateNumber));
      }
    } catch (e) {
      console.error("Fetch candidates failed", e);
    }
  }, [id, getHeaders]);

  const fetchResults = useCallback(async () => {
    try {
      const res = await apiRequest<{success: boolean, data: ResultsData}>(`/results/${id}`, { headers: getHeaders() as HeadersInit });
      if (res && res.data) {
        setResults(res.data);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.error("Fetch results failed", e);
    }
  }, [id, getHeaders]);

  useEffect(() => {
    if (id) {
      fetchElection();
      fetchParties();
      fetchProvinces();
    }
  }, [id, fetchElection, fetchParties, fetchProvinces]);

  useEffect(() => {
    if (activeTab === 'results') {
      fetchResults();
      const interval = setInterval(fetchResults, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchResults]);

  useEffect(() => {
    if (selectedDistrict) {
      fetchCandidates(selectedDistrict);
    } else {
      setCandidates([]);
    }
  }, [selectedDistrict, fetchCandidates]);

  const handleStatusChange = async (newStatus: string) => {
     if (!election) return;
     if (!confirm(`คุณต้องการเปลี่ยนสถานะเป็น ${newStatus} ใช่หรือไม่?`)) return;
     
     try {
       await apiRequest(`/elections/${election.id}`, {
         method: "PATCH",
         headers: getHeaders() as HeadersInit,
         data: { status: newStatus }
       });
       setElection({ ...election, status: newStatus });
     } catch (error) {
       console.error("Failed to update status", error);
       alert("ไม่สามารถเปลี่ยนสถานะได้");
     }
  };

  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingParty) {
        await apiRequest(`/parties/${editingParty.id}`, {
          method: "PATCH",
          headers: getHeaders() as HeadersInit,
          data: partyForm
        });
      } else {
        await apiRequest(`/parties`, {
          method: "POST",
          headers: getHeaders() as HeadersInit,
          data: { ...partyForm, electionId: id }
        });
      }
      setIsPartyModalOpen(false);
      fetchParties();
      alert(editingParty ? "แก้ไขพรรคสำเร็จ" : "เพิ่มพรรคสำเร็จ");
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteParty = async (partyId: string) => {
    if (!confirm("คุณต้องการลบพรรคนี้ใช่หรือไม่?")) return;
    try {
      await apiRequest(`/parties/${partyId}`, {
        method: "DELETE",
        headers: getHeaders() as HeadersInit
      });
      fetchParties();
    } catch (error) {
      alert("ไม่สามารถลบข้อมูลได้");
    }
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistrict) {
      alert("กรุณาเลือกเขตก่อน");
      return;
    }
    setFormLoading(true);
    try {
      if (editingCandidate) {
        await apiRequest(`/candidates/${editingCandidate.id}`, {
          method: "PATCH",
          headers: getHeaders() as HeadersInit,
          data: candidateForm
        });
      } else {
        await apiRequest(`/candidates`, {
          method: "POST",
          headers: getHeaders() as HeadersInit,
          data: { ...candidateForm, electionId: id, districtId: selectedDistrict }
        });
      }
      setIsCandidateModalOpen(false);
      fetchCandidates(selectedDistrict);
      alert(editingCandidate ? "แก้ไขผู้สมัครสำเร็จ" : "เพิ่มผู้สมัครสำเร็จ");
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm("คุณต้องการลบผู้สมัครนี้ใช่หรือไม่?")) return;
    try {
      await apiRequest(`/candidates/${candidateId}`, {
        method: "DELETE",
        headers: getHeaders() as HeadersInit
      });
      if (selectedDistrict) fetchCandidates(selectedDistrict);
    } catch (error) {
      alert("ไม่สามารถลบข้อมูลได้");
    }
  };

  const canEdit = user?.role === 'super_admin';
  const canEditCandidate = ['super_admin', 'regional_admin', 'province_admin'].includes(user?.role || '');

  if (isLoading) return <div className="flex h-screen items-center justify-center text-slate-500">กำลังโหลด...</div>;
  if (!election) return <div className="flex h-screen items-center justify-center text-slate-500">ไม่พบข้อมูลการเลือกตั้ง</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
       <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
             <Link href="/admin/elections">
               <Button variant="ghost" size="icon" className="hover:bg-slate-100"><ArrowLeft className="w-5 h-5 text-slate-600" /></Button>
             </Link>
             <div>
               <h1 className="text-2xl font-bold text-[#1e293b]">{election.nameTh || election.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide
                    ${election.status?.toUpperCase() === 'OPEN' ? 'bg-green-100 text-green-700 border border-green-200' : 
                      election.status?.toUpperCase() === 'CLOSED' ? 'bg-red-100 text-red-700 border border-red-200' : 
                      'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                    {election.status || 'DRAFT'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ID: {election.id}</span>
                </div>
              </div>
           </div>
           <div className="flex items-center gap-2">
              {user?.role === 'super_admin' && (
                <>
                  {election.status?.toUpperCase() === 'DRAFT' && (
                    <Button onClick={() => handleStatusChange('OPEN')} className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                      <Play className="w-4 h-4 mr-2" /> เปิดรับสมัคร
                    </Button>
                  )}
                  {election.status?.toUpperCase() === 'OPEN' && (
                    <Button onClick={() => handleStatusChange('CLOSED')} variant="destructive" className="shadow-sm">
                      <Square className="w-4 h-4 mr-2" /> ปิดรับสมัคร
                    </Button>
                  )}
                  {election.status?.toUpperCase() !== 'CLOSED' && election.status?.toUpperCase() !== 'DRAFT' && election.status?.toUpperCase() !== 'OPEN' && (
                     <Button onClick={() => handleStatusChange('CLOSED')} variant="destructive">
                       <Ban className="w-4 h-4 mr-2" /> ยุติการเลือกตั้ง
                     </Button>
                  )}
                </>
              )}
           </div>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
         <nav className="flex overflow-x-auto border-b border-slate-100">
           {[
             { id: 'overview', label: 'ข้อมูลทั่วไป', icon: Building2 },
             { id: 'parties', label: 'พรรคการเมือง', icon: Users },
             { id: 'candidates', label: 'ผู้สมัคร', icon: Search },
             { id: 'referendum', label: 'ประชามติ', icon: Vote },
             { id: 'results', label: 'ผลคะแนน', icon: BarChart3 },
           ].map((tab) => (
             <button
               key={tab.id}
               type="button"
               onClick={() => setActiveTab(tab.id)}
               className={`
                 flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap
                 ${activeTab === tab.id 
                   ? 'border-[#fbbf24] text-[#1e293b] bg-slate-50' 
                   : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'}
               `}
             >
               <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-[#fbbf24]' : 'text-slate-400'}`} />
               {tab.label}
             </button>
           ))}
         </nav>

         <div className="p-6 min-h-[500px]">
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                 <div>
                    <h3 className="text-lg font-bold text-[#1e293b] mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#fbbf24]" /> รายละเอียดการเลือกตั้ง
                    </h3>
                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-slate-700 leading-relaxed text-lg">{election.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <div className="p-5 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                     <h3 className="text-sm font-medium text-slate-500 mb-2">ประเภทการเลือกตั้ง</h3>
                     <div className="flex flex-wrap gap-2">
                       {election.hasPartyList && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md">บัญชีรายชื่อ</span>}
                       {election.hasConstituency && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md">แบ่งเขต</span>}
                       {election.hasReferendum && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-md">ประชามติ</span>}
                     </div>
                   </div>
                   <div className="p-5 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                     <h3 className="text-sm font-medium text-slate-500 mb-2">วันที่สร้าง</h3>
                     <p className="text-[#1e293b] font-semibold">{election.createdAt ? new Date(election.createdAt).toLocaleDateString('th-TH', { dateStyle: 'long' }) : '-'}</p>
                   </div>
                   <div className="p-5 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                     <h3 className="text-sm font-medium text-slate-500 mb-2">ผู้สร้าง</h3>
                     <p className="text-[#1e293b] font-semibold">System Admin</p>
                   </div>
                 </div>
              </div>
            )}

            {activeTab === 'parties' && (
               <div className="space-y-6 animate-in fade-in duration-300">
                 <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-[#1e293b]">รายชื่อพรรคการเมือง ({parties.length})</h3>
                    {canEdit && (
                      <Button onClick={() => {
                        setEditingParty(null);
                        setPartyForm({ partyNumber: parties.length + 1, name: "", nameTh: "", abbreviation: "", color: "#1e293b" });
                        setIsPartyModalOpen(true);
                      }} className="bg-[#1e293b] hover:bg-slate-800 text-white">
                        <Plus className="w-4 h-4 mr-2" /> เพิ่มพรรค
                      </Button>
                    )}
                 </div>

                 <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-medium">
                       <tr>
                         <th className="px-6 py-4 w-20 text-center">#</th>
                         <th className="px-6 py-4 w-20">สีพรรค</th>
                         <th className="px-6 py-4">ชื่อพรรค</th>
                         <th className="px-6 py-4">ตัวย่อ</th>
                         <th className="px-6 py-4 text-right">จัดการ</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 bg-white">
                       {parties.map((party) => (
                         <tr key={party.id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-6 py-4 text-center font-bold text-slate-400">{party.partyNumber}</td>
                           <td className="px-6 py-4">
                             <div className="w-6 h-6 rounded-full shadow-sm border border-slate-200" style={{ backgroundColor: party.color }}></div>
                           </td>
                           <td className="px-6 py-4">
                             <div className="font-semibold text-[#1e293b]">{party.nameTh}</div>
                             <div className="text-xs text-slate-400">{party.name}</div>
                           </td>
                           <td className="px-6 py-4 font-mono text-slate-600">{party.abbreviation || '-'}</td>
                           <td className="px-6 py-4 text-right">
                             {canEdit && (
                               <div className="flex items-center justify-end gap-2">
                                 <Button variant="ghost" size="icon" onClick={() => {
                                   setEditingParty(party);
                                   setPartyForm({
                                     partyNumber: party.partyNumber,
                                     name: party.name,
                                     nameTh: party.nameTh,
                                     abbreviation: party.abbreviation || "",
                                     color: party.color || "#000000"
                                   });
                                   setIsPartyModalOpen(true);
                                 }}>
                                   <Pencil className="w-4 h-4 text-slate-500 hover:text-[#fbbf24]" />
                                 </Button>
                                 <Button variant="ghost" size="icon" onClick={() => handleDeleteParty(party.id)}>
                                   <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-500" />
                                 </Button>
                               </div>
                             )}
                           </td>
                         </tr>
                       ))}
                       {parties.length === 0 && (
                         <tr>
                           <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                             ไม่พบข้อมูลพรรคการเมือง
                           </td>
                         </tr>
                       )}
                     </tbody>
                   </table>
                 </div>
               </div>
            )}

            {activeTab === 'candidates' && (
               <div className="space-y-6 animate-in fade-in duration-300">
                 <div className="flex flex-col md:flex-row gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="flex-1 block">
                      <span className="block text-sm font-medium text-slate-700 mb-1">จังหวัด</span>
                      <select 
                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#fbbf24] focus:ring focus:ring-[#fbbf24]/20 p-2"
                        value={selectedProvince}
                        onChange={(e) => {
                          setSelectedProvince(e.target.value);
                          setSelectedDistrict("");
                          if (e.target.value) fetchDistricts(e.target.value);
                          else setDistricts([]);
                        }}
                      >
                        <option value="">-- เลือกจังหวัด --</option>
                        {provinces.map(p => <option key={p.id} value={p.id}>{p.nameTh}</option>)}
                      </select>
                    </label>
                    <label className="flex-1 block">
                      <span className="block text-sm font-medium text-slate-700 mb-1">เขตเลือกตั้ง</span>
                      <select 
                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#fbbf24] focus:ring focus:ring-[#fbbf24]/20 p-2"
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        disabled={!selectedProvince}
                      >
                        <option value="">-- เลือกเขต --</option>
                        {districts.map(d => <option key={d.id} value={d.id}>{d.nameTh}</option>)}
                      </select>
                    </label>
                 </div>

                 {selectedDistrict ? (
                   <>
                      <div className="flex justify-between items-center">
                          <h3 className="text-lg font-bold text-[#1e293b]">ผู้สมัครในเขต ({candidates.length})</h3>
                          {canEditCandidate && (
                            <Button onClick={() => {
                              setEditingCandidate(null);
                              setCandidateForm({ candidateNumber: candidates.length + 1, titleTh: "นาย", firstNameTh: "", lastNameTh: "", partyId: "" });
                              setIsCandidateModalOpen(true);
                            }} className="bg-[#1e293b] hover:bg-slate-800 text-white">
                              <Plus className="w-4 h-4 mr-2" /> เพิ่มผู้สมัคร
                            </Button>
                          )}
                      </div>

                      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                              <th className="px-6 py-4 w-20 text-center">หมายเลข</th>
                              <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                              <th className="px-6 py-4">พรรค</th>
                              <th className="px-6 py-4 text-right">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {candidates.map((candidate) => (
                              <tr key={candidate.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-center">
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1e293b] text-white font-bold text-sm">
                                    {candidate.candidateNumber}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-[#1e293b]">
                                  {candidate.titleTh}{candidate.firstNameTh} {candidate.lastNameTh}
                                </td>
                                <td className="px-6 py-4">
                                  {candidate.party ? (
                                    <div className="flex items-center gap-2">
                                      {candidate.party.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: candidate.party.color }}></div>}
                                      <span>{candidate.party.nameTh}</span>
                                    </div>
                                  ) : <span className="text-slate-400">ไม่สังกัดพรรค</span>}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {canEditCandidate && (
                                    <div className="flex items-center justify-end gap-2">
                                      <Button variant="ghost" size="icon" onClick={() => {
                                        setEditingCandidate(candidate);
                                        setCandidateForm({
                                          candidateNumber: candidate.candidateNumber,
                                          titleTh: candidate.titleTh,
                                          firstNameTh: candidate.firstNameTh,
                                          lastNameTh: candidate.lastNameTh,
                                          partyId: candidate.partyId || candidate.party?.id || ""
                                        });
                                        setIsCandidateModalOpen(true);
                                      }}>
                                        <Pencil className="w-4 h-4 text-slate-500 hover:text-[#fbbf24]" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCandidate(candidate.id)}>
                                        <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-500" />
                                      </Button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {candidates.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                  ยังไม่มีผู้สมัครในเขตนี้
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                   </>
                 ) : (
                   <div className="flex flex-col items-center justify-center h-48 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                     <Search className="w-10 h-10 mb-2 opacity-20" />
                     <p>กรุณาเลือกจังหวัดและเขตเลือกตั้ง</p>
                   </div>
                 )}
               </div>
            )}

            {activeTab === 'referendum' && (
               <div className="space-y-6 animate-in fade-in duration-300">
                 {election.hasReferendum ? (
                    <div className="space-y-4">
                       {election.referendumQuestions && election.referendumQuestions.length > 0 ? (
                         election.referendumQuestions.map((ref: ReferendumQuestion) => (
                          <div key={ref.id} className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-[#1e293b] mb-2">คำถามที่ {ref.questionNumber}: {ref.questionTh}</h3>
                            <p className="text-slate-600 mb-4">{ref.descriptionTh}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-slate-500">ไม่พบข้อมูลคำถามประชามติ (หรือกำลังโหลด)</p>
                          <div className="mt-4 p-4 max-w-lg mx-auto bg-white rounded border border-slate-200 text-left">
                            <h4 className="font-semibold text-[#1e293b]">ตัวอย่างการแสดงผล (Mockup)</h4>
                            <p className="text-slate-600 mt-1">ท่านเห็นชอบหรือไม่กับร่างรัฐธรรมนูญแห่งราชอาณาจักรไทย พุทธศักราช ...</p>
                          </div>
                        </div>
                      )}
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                     <Ban className="w-12 h-12 mb-2 opacity-20" />
                     <p>การเลือกตั้งนี้ไม่มีการลงมติประชามติ</p>
                   </div>
                 )}
               </div>
            )}

            {activeTab === 'results' && (
               <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-[#1e293b]">ผลคะแนนอย่างไม่เป็นทางการ</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <RefreshCw className="w-3 h-3" />
                      อัปเดตล่าสุด: {lastUpdated ? lastUpdated.toLocaleTimeString('th-TH') : '-'}
                    </div>
                  </div>

                  {results ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 bg-[#1e293b] rounded-xl text-white shadow-lg">
                          <h4 className="text-slate-300 text-sm font-medium mb-1">ผู้มาใช้สิทธิ์ทั้งหมด</h4>
                          <div className="text-3xl font-bold">{results.totalVotesCast.toLocaleString()}</div>
                          <div className="text-xs text-slate-400 mt-1">จาก {results.totalEligibleVoters.toLocaleString()} คน</div>
                          
                          <div className="mt-4 w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#fbbf24] h-full rounded-full" 
                              style={{ width: `${results.turnoutPercentage}%` }}
                            ></div>
                          </div>
                          <div className="text-right text-xs text-[#fbbf24] mt-1">{results.turnoutPercentage.toFixed(2)}%</div>
                        </div>
                        
                        <div className="md:col-span-2 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                           <h4 className="text-[#1e293b] font-bold mb-4">สรุปผลคะแนนบัญชีรายชื่อ</h4>
                           <div className="space-y-3">
                             {results.partyListResults.slice(0, 5).map((party, idx) => (
                               <div key={party.partyId} className="flex items-center gap-4">
                                  <div className="w-8 text-sm font-bold text-slate-400">#{idx + 1}</div>
                                  <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="font-semibold text-[#1e293b]">{party.partyNameTh}</span>
                                      <span className="text-slate-600">{party.voteCount.toLocaleString()} คะแนน ({party.percentage.toFixed(2)}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full transition-all duration-500" 
                                        style={{ 
                                          width: `${party.percentage}%`, 
                                          backgroundColor: party.partyColor || '#1e293b' 
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                               </div>
                             ))}
                           </div>
                        </div>
                      </div>

                      {results.referendumResults && results.referendumResults.length > 0 && (
                        <div className="mt-8">
                           <h4 className="text-[#1e293b] font-bold mb-4">ผลการลงประชามติ</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {results.referendumResults.map((ref) => {
                                const total = ref.approveCount + ref.disapproveCount + ref.abstainCount;
                                return (
                                <div key={ref.questionId} className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                                  <h5 className="font-medium text-[#1e293b] mb-4">{ref.questionText}</h5>
                                  <div className="flex items-center justify-center gap-8 mb-4">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-green-600">{ref.approvePercentage.toFixed(1)}%</div>
                                      <div className="text-xs text-slate-500">เห็นชอบ ({ref.approveCount.toLocaleString()})</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-red-600">{ref.disapprovePercentage.toFixed(1)}%</div>
                                      <div className="text-xs text-slate-500">ไม่เห็นชอบ ({ref.disapproveCount.toLocaleString()})</div>
                                    </div>
                                  </div>
                                  <div className="w-full flex h-4 rounded-full overflow-hidden">
                                    <div className="bg-green-500 h-full" style={{ width: `${ref.approvePercentage}%` }}></div>
                                    <div className="bg-red-500 h-full" style={{ width: `${ref.disapprovePercentage}%` }}></div>
                                    <div className="bg-slate-300 h-full" style={{ width: `${total > 0 ? (ref.abstainCount / total) * 100 : 0}%` }}></div>
                                  </div>
                                  <div className="text-center mt-2 text-sm">
                                    <span className={`font-bold ${ref.result === 'APPROVED' ? 'text-green-600' : ref.result === 'DISAPPROVED' ? 'text-red-600' : 'text-slate-500'}`}>
                                      {ref.result === 'APPROVED' ? 'ผ่านความเห็นชอบ' : ref.result === 'DISAPPROVED' ? 'ไม่ผ่านความเห็นชอบ' : 'เสมอ'}
                                    </span>
                                  </div>
                                </div>
                              )})}
                           </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">
                      <BarChart3 className="w-10 h-10 mb-2 opacity-20" />
                      <p>ไม่มีข้อมูลผลคะแนน</p>
                    </div>
                  )}
               </div>
            )}
         </div>
       </div>

       {isPartyModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-[#1e293b]">{editingParty ? 'แก้ไขพรรค' : 'เพิ่มพรรคใหม่'}</h3>
               <button type="button" onClick={() => setIsPartyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                 <X className="w-5 h-5" />
               </button>
             </div>
             <form onSubmit={handleSaveParty} className="p-6 space-y-4">
                <label className="block">
                   <span className="block text-sm font-medium text-slate-700 mb-1">ชื่อพรรค (ไทย) *</span>
                   <input 
                      type="text" 
                      required
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#fbbf24] focus:ring focus:ring-[#fbbf24]/20 p-2"
                      value={partyForm.nameTh}
                      onChange={e => setPartyForm({...partyForm, nameTh: e.target.value})}
                   />
                </label>
                <label className="block">
                   <span className="block text-sm font-medium text-slate-700 mb-1">ชื่อพรรค (อังกฤษ)</span>
                   <input 
                      type="text" 
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#fbbf24] focus:ring focus:ring-[#fbbf24]/20 p-2"
                      value={partyForm.name}
                      onChange={e => setPartyForm({...partyForm, name: e.target.value})}
                   />
                </label>
                <div className="flex gap-4">
                  <label className="flex-1 block">
                     <span className="block text-sm font-medium text-slate-700 mb-1">ตัวย่อ</span>
                     <input 
                        type="text" 
                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#fbbf24] focus:ring focus:ring-[#fbbf24]/20 p-2 uppercase"
                        value={partyForm.abbreviation}
                        onChange={e => setPartyForm({...partyForm, abbreviation: e.target.value})}
                     />
                  </label>
                  <label className="w-24 block">
                     <span className="block text-sm font-medium text-slate-700 mb-1">หมายเลข</span>
                     <input 
                        type="number" 
                        required
                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#fbbf24] focus:ring focus:ring-[#fbbf24]/20 p-2"
                        value={partyForm.partyNumber}
                        onChange={e => setPartyForm({...partyForm, partyNumber: parseInt(e.target.value)})}
                     />
                  </label>
                </div>
                <div>
                   <span className="block text-sm font-medium text-slate-700 mb-1">สีประจำพรรค</span>
                   <label className="flex items-center gap-3">
                     <input 
                        type="color" 
                        className="w-12 h-12 rounded-lg border border-slate-200 cursor-pointer p-1"
                        value={partyForm.color}
                        onChange={e => setPartyForm({...partyForm, color: e.target.value})}
                     />
                     <span className="text-slate-500 text-sm font-mono uppercase">{partyForm.color}</span>
                   </label>
                </div>
                <div className="pt-4 flex justify-end gap-2">
                   <Button type="button" variant="outline" onClick={() => setIsPartyModalOpen(false)}>ยกเลิก</Button>
                   <Button type="submit" disabled={formLoading} className="bg-[#1e293b] hover:bg-slate-800 text-white">
                      {formLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                   </Button>
                </div>
             </form>
           </div>
         </div>
       )}

       {isCandidateModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-[#1e293b]">{editingCandidate ? 'แก้ไขผู้สมัคร' : 'เพิ่มผู้สมัครใหม่'}</h3>
               <button type="button" onClick={() => setIsCandidateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                 <X className="w-5 h-5" />
               </button>
             </div>
             <form onSubmit={handleSaveCandidate} className="p-6 space-y-4">
                <div className="flex gap-4">
                   <label className="w-24 block">
                     <span className="block text-sm font-medium text-slate-700 mb-1">คำนำหน้า</span>
                     <input 
                        type="text" 
                        required
                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#fbbf24] focus:ring focus:ring-[#fbbf24]/20 p-2"
                        value={candidateForm.titleTh}
                        onChange={e => setCandidateForm({...candidateForm, titleTh: e.target.value})}
                     />
                   </label>
                   <label className="flex-1 block">
                     <span className="block text-sm font-medium text-slate-700 mb-1">ชื่อจริง *</span>
                     <input 
                        type="text" 
                        required
                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#fbbf24] focus:ring focus:ring-[#fbbf24]/20 p-2"
                        value={candidateForm.firstNameTh}
                        onChange={e => setCandidateForm({...candidateForm, firstNameTh: e.target.value})}
                     />
                   </label>
                </div>
                <label className="block">
                   <span className="block text-sm font-medium text-slate-700 mb-1">นามสกุล *</span>
                   <input 
                      type="text" 
                      required
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#fbbf24] focus:ring focus:ring-[#fbbf24]/20 p-2"
                      value={candidateForm.lastNameTh}
                      onChange={e => setCandidateForm({...candidateForm, lastNameTh: e.target.value})}
                   />
                </label>
                <div className="flex gap-4">
                   <label className="flex-1 block">
                     <span className="block text-sm font-medium text-slate-700 mb-1">สังกัดพรรค</span>
                     <select
                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#fbbf24] focus:ring focus:ring-[#fbbf24]/20 p-2"
                        value={candidateForm.partyId}
                        onChange={e => setCandidateForm({...candidateForm, partyId: e.target.value})}
                        required
                     >
                       <option value="">-- เลือกพรรค --</option>
                       {parties.map(p => <option key={p.id} value={p.id}>{p.nameTh}</option>)}
                     </select>
                   </label>
                   <label className="w-24 block">
                     <span className="block text-sm font-medium text-slate-700 mb-1">หมายเลข</span>
                     <input 
                        type="number" 
                        required
                        className="w-full rounded-md border-slate-300 shadow-sm focus:border-[#fbbf24] focus:ring focus:ring-[#fbbf24]/20 p-2"
                        value={candidateForm.candidateNumber}
                        onChange={e => setCandidateForm({...candidateForm, candidateNumber: parseInt(e.target.value)})}
                     />
                   </label>
                </div>
                
                <div className="pt-4 flex justify-end gap-2">
                   <Button type="button" variant="outline" onClick={() => setIsCandidateModalOpen(false)}>ยกเลิก</Button>
                   <Button type="submit" disabled={formLoading} className="bg-[#1e293b] hover:bg-slate-800 text-white">
                      {formLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                   </Button>
                </div>
             </form>
           </div>
         </div>
       )}
    </div>
  )
}
