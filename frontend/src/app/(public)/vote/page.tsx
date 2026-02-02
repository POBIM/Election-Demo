"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Election, 
  Party, 
  Candidate, 
  ReferendumQuestion 
} from "../../../../../shared/src/types/election";
import { CastBallotRequest } from "../../../../../shared/src/types/vote";
import { Loader2, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, User, MapPin } from "lucide-react";

const Card = ({ className, children, onClick }: { className?: string; children: React.ReactNode; onClick?: () => void }) => {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn("w-full text-left rounded-xl border bg-card text-card-foreground shadow-sm bg-white outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
      >
        {children}
      </button>
    );
  }
  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm bg-white", className)}>
      {children}
    </div>
  );
};

const CardHeader = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>
);

const CardContent = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("p-6 pt-0", className)}>{children}</div>
);

const Label = ({ className, children, htmlFor }: { className?: string; children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>
    {children}
  </label>
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

const normalizeHexColor = (hexColor: string) => {
  const stripped = hexColor.replace("#", "").trim();
  if (stripped.length === 3) {
    return stripped
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
  }
  if (stripped.length === 6) return stripped;
  return null;
};

const hexToRgb = (hexColor: string) => {
  const normalized = normalizeHexColor(hexColor);
  if (!normalized) return null;
  const numeric = parseInt(normalized, 16);
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
};

const getContrastColor = (hexColor: string): string => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return "white";
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.6 ? "black" : "white";
};

const getDarkerShade = (hexColor: string, amount = 22): string => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return hexColor;
  const clamp = (value: number) => Math.max(0, Math.min(255, value));
  const r = clamp(rgb.r - amount).toString(16).padStart(2, "0");
  const g = clamp(rgb.g - amount).toString(16).padStart(2, "0");
  const b = clamp(rgb.b - amount).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
};

export default function VotePage() {
  const { user, thaidInfo, voterLogin, isLoading: authLoading, logout } = useAuth();
  
  const [step, setStep] = useState(1);
  const [citizenId, setCitizenId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [questions, setQuestions] = useState<ReferendumQuestion[]>([]);
  const [hasVoted, setHasVoted] = useState(false);

  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [partyNoVote, setPartyNoVote] = useState(false);
  const [candidateNoVote, setCandidateNoVote] = useState(false);
  const [referendumVotes, setReferendumVotes] = useState<Record<string, 'APPROVE' | 'DISAPPROVE' | 'ABSTAIN'>>({});
  
  const [receipt, setReceipt] = useState<{ confirmationCode: string; timestamp: string } | null>(null);

  const formatCitizenId = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    const parts = [
      numbers.substring(0, 1),
      numbers.substring(1, 5),
      numbers.substring(5, 10),
      numbers.substring(10, 12),
      numbers.substring(12, 13),
    ].filter((part) => part);
    return parts.join("-");
  };

  const handleCitizenIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCitizenId(e.target.value);
    if (formatted.length <= 17) { 
      setCitizenId(formatted);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const rawId = citizenId.replace(/-/g, "");
    if (rawId.length !== 13) {
      setError("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก");
      return;
    }

    try {
      await voterLogin(rawId);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบเลขบัตรประชาชน");
    }
  };

  useEffect(() => {
    if (user && step === 1) {
      setStep(2);
    }
  }, [user, step]);

  const fetchElections = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiRequest<{ success: boolean; data: Election[] }>("/elections");
      const elections = response.data || [];
      setElections(elections.filter(e => e.status === 'OPEN'));
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถดึงข้อมูลการเลือกตั้งได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 2 && user) {
      fetchElections();
    }
  }, [step, user, fetchElections]);

  const checkVoteStatus = async (electionId: string) => {
    setLoading(true);
    try {
      const response = await apiRequest<{ success: boolean; data: { hasVoted: boolean } }>(`/votes/status/${electionId}`);
      if (response.data?.hasVoted) {
        setHasVoted(true);
        setError("ท่านได้ใช้สิทธิเลือกตั้งในรายการนี้ไปแล้ว");
        return false;
      }
      setHasVoted(false);
      return true;
    } catch (err) {
      console.error(err);
      return true;
    } finally {
      setLoading(false);
    }
  }

  const handleSelectElection = async (election: Election) => {
    setError(null);
    const canVote = await checkVoteStatus(election.id);
    if (!canVote) return;

    setSelectedElection(election);
    setSelectedPartyId(null);
    setSelectedCandidateId(null);
    setPartyNoVote(false);
    setCandidateNoVote(false);
    setReferendumVotes({});
    
    setLoading(true);
    try {
      if (election.hasPartyList) {
        const res = await apiRequest<{ success: boolean; data: Party[] }>(`/parties?electionId=${election.id}`);
        setParties(res.data || []);
      }
      if (election.hasConstituency && user?.eligibleDistrictId) {
        const res = await apiRequest<{ success: boolean; data: Candidate[] }>(`/candidates?electionId=${election.id}&districtId=${user.eligibleDistrictId}`);
        setCandidates(res.data || []);
      }
      if (election.hasReferendum) {
        const res = await apiRequest<{ success: boolean; data: Election & { referendumQuestions: ReferendumQuestion[] } }>(`/elections/${election.id}`);
        if (res.data?.referendumQuestions) {
          setQuestions(res.data.referendumQuestions);
        }
      }

      if (election.hasPartyList) setStep(3);
      else if (election.hasConstituency) setStep(4);
      else if (election.hasReferendum) setStep(5);
      else {
        setError("การเลือกตั้งนี้ไม่มีบัตรลงคะแนน");
      }

    } catch (err) {
      console.error(err);
      setError("ไม่สามารถเตรียมข้อมูลการเลือกตั้งได้");
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (!selectedElection) return;

    if (step === 3) {
      if (selectedElection.hasConstituency) setStep(4);
      else if (selectedElection.hasReferendum) setStep(5);
      else setStep(6);
    } else if (step === 4) {
      if (selectedElection.hasReferendum) setStep(5);
      else setStep(6);
    } else if (step === 5) {
      setStep(6);
    }
  };

  const handlePrevStep = () => {
    if (!selectedElection) return;

    if (step === 6) {
        if (selectedElection.hasReferendum) setStep(5);
        else if (selectedElection.hasConstituency) setStep(4);
        else if (selectedElection.hasPartyList) setStep(3);
        else setStep(2);
    } else if (step === 5) {
      if (selectedElection.hasConstituency) setStep(4);
      else if (selectedElection.hasPartyList) setStep(3);
      else setStep(2);
    } else if (step === 4) {
      if (selectedElection.hasPartyList) setStep(3);
      else setStep(2);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleSubmitVote = async () => {
    if (!selectedElection) return;
    setLoading(true);
    setError(null);

    const payload: CastBallotRequest = {
      electionId: selectedElection.id,
      partyVote: selectedPartyId ? { partyId: selectedPartyId } : undefined,
      constituencyVote: selectedCandidateId ? { candidateId: selectedCandidateId } : undefined,
      referendumVotes: Object.entries(referendumVotes).map(([qId, answer]) => ({
        questionId: qId,
        answer
      }))
    };

    try {
      const res = await apiRequest<{ success: boolean; data: { receipts: { confirmationCode: string }[]; timestamp: string } }>("/votes/cast", {
        data: payload
      });
      setReceipt({
        confirmationCode: res.data.receipts[0]?.confirmationCode || 'N/A',
        timestamp: res.data.timestamp,
      });
      setStep(7);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "ไม่สามารถส่งผลการลงคะแนนได้");
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-lg border-t-4 border-t-[#00247D]">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-[#EF3340] rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md">
              ท
            </div>
            <h1 className="text-2xl font-bold text-slate-800">ระบบเลือกตั้งออนไลน์</h1>
            <p className="text-slate-500">กรุณายืนยันตัวตนด้วยเลขบัตรประชาชน</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="citizenId">เลขบัตรประจำตัวประชาชน</Label>
                <Input
                  id="citizenId"
                  placeholder="X-XXXX-XXXXX-XX-X"
                  value={citizenId}
                  onChange={handleCitizenIdChange}
                  className="text-lg tracking-wider text-center"
                  required
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-[#EF3340] text-sm bg-red-50 p-3 rounded-md">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full bg-[#00247D] hover:bg-[#00247D]/90 text-lg h-12"
                disabled={authLoading}
              >
                {authLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                ตรวจสอบสิทธิ
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 7 && receipt) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-t-4 border-t-green-600">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-sm">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">ลงคะแนนสำเร็จ</h1>
                    <p className="text-slate-500">ขอบคุณที่ใช้สิทธิเลือกตั้ง</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-center border border-slate-200">
                        <p className="text-sm text-slate-500">รหัสยืนยันการลงคะแนน</p>
                        <p className="text-2xl font-mono font-bold text-[#00247D] tracking-wider">{receipt.confirmationCode}</p>
                    </div>
                    <div className="text-center text-sm text-slate-500">
                        เวลาที่ลงคะแนน: {new Date(receipt.timestamp).toLocaleString('th-TH')}
                    </div>
                    <Button 
                        className="w-full bg-slate-800 hover:bg-slate-700" 
                        onClick={() => {
                            setStep(2);
                            setReceipt(null);
                            setSelectedElection(null);
                            setSelectedPartyId(null);
                            setSelectedCandidateId(null);
                            setPartyNoVote(false);
                            setCandidateNoVote(false);
                            setReferendumVotes({});
                            setHasVoted(false);
                            fetchElections(); 
                        }}
                    >
                        กลับสู่หน้าหลัก
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                {step > 2 && (
                    <Button variant="ghost" size="icon" onClick={handlePrevStep}>
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                )}
                <div>
                    <h1 className="text-xl font-bold text-[#00247D]">
                        {selectedElection?.nameTh || "เลือกรายการเลือกตั้ง"}
                    </h1>
                    {selectedElection && (
                        <p className="text-sm text-slate-500">
                            {step === 3 && "บัตรเลือกตั้งแบบบัญชีรายชื่อ"}
                            {step === 4 && "บัตรเลือกตั้งแบบแบ่งเขต"}
                            {step === 5 && "การออกเสียงประชามติ"}
                            {step === 6 && "ตรวจสอบความถูกต้อง"}
                        </p>
                    )}
                </div>
            </div>
            
          <Button variant="outline" size="sm" onClick={() => logout()}>
            ออกจากระบบ
          </Button>
        </div>
        
        {step === 2 && (
          <div className="space-y-6">
            <Card className="border-l-4 border-l-[#EF3340]">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="bg-slate-100 p-3 rounded-full">
                    <User className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">ข้อมูลผู้ใช้สิทธิ</h2>
                    <p className="text-slate-600">{thaidInfo?.titleTh}{thaidInfo?.firstNameTh} {thaidInfo?.lastNameTh}</p>
                    <p className="text-slate-500 text-sm">เลขบัตรประชาชน: {user?.citizenId}</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-[#00247D]">
                        <MapPin size={14} />
                        เขตเลือกตั้ง: {thaidInfo?.eligibleDistrictId} ({thaidInfo?.eligibleProvince})
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <h3 className="text-xl font-bold mt-8 mb-4">รายการเลือกตั้งที่เปิดอยู่</h3>
            {loading ? (
              <div className="text-center py-10"><Loader2 className="animate-spin mx-auto w-8 h-8 text-[#00247D]"/></div>
            ) : elections.length === 0 ? (
              <div className="text-center py-10 text-slate-500">ขณะนี้ไม่มีการเลือกตั้งที่เปิดให้ลงคะแนน</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {elections.map(election => (
                  <Card 
                    key={election.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow hover:border-[#00247D]"
                    onClick={() => handleSelectElection(election)}
                  >
                    <CardHeader>
                      <h4 className="font-bold text-lg">{election.nameTh}</h4>
                      <p className="text-sm text-slate-500">{new Date(election.startDate).toLocaleDateString('th-TH')} - {new Date(election.endDate).toLocaleDateString('th-TH')}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 flex-wrap">
                        {election.hasPartyList && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">บัญชีรายชื่อ</span>}
                        {election.hasConstituency && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">แบ่งเขต</span>}
                        {election.hasReferendum && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">ประชามติ</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
             {error && (
                <div className="flex items-center gap-2 text-[#EF3340] text-sm bg-red-50 p-3 rounded-md mt-4">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
          </div>
        )}

        {step === 3 && (
            <div className="space-y-6">
                <div className="rounded-lg border-4 border-[#C2185B] bg-[#FCE4EC] shadow-md overflow-hidden">
                    <div className="bg-[#FCE4EC] border-b-2 border-[#C2185B]">
                        <div className="flex items-center justify-center gap-3 px-4 py-3">
                            <div className="text-center">
                                <p className="text-base font-bold text-[#6D1036]">บัตรเลือกตั้งสมาชิกสภาผู้แทนราษฎรแบบบัญชีรายชื่อ</p>
                                <p className="text-xs text-[#6D1036] mt-1">ให้ทำเครื่องหมายกากบาท «X» ภายใน "ช่องทำเครื่องหมาย" ไม่เกินหนึ่งหมายเลข</p>
                            </div>
                        </div>
                        <div className="flex border-t-2 border-[#C2185B] text-[10px] font-semibold text-[#6D1036]">
                            <div className="flex-1 flex border-r-4 border-[#C2185B]">
                                <div className="w-14 px-1 py-1.5 text-center border-r border-[#C2185B]">หมายเลข</div>
                                <div className="w-12 px-1 py-1.5 text-center border-r border-[#C2185B]">เครื่องหมาย</div>
                                <div className="flex-1 px-1 py-1.5 text-center border-r border-[#C2185B]">ชื่อพรรคการเมือง</div>
                                <div className="w-14 px-1 py-1.5 text-center">ช่องกา</div>
                            </div>
                            <div className="flex-1 hidden sm:flex">
                                <div className="w-14 px-1 py-1.5 text-center border-r border-[#C2185B]">หมายเลข</div>
                                <div className="w-12 px-1 py-1.5 text-center border-r border-[#C2185B]">เครื่องหมาย</div>
                                <div className="flex-1 px-1 py-1.5 text-center border-r border-[#C2185B]">ชื่อพรรคการเมือง</div>
                                <div className="w-14 px-1 py-1.5 text-center">ช่องกา</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white">
                        {(() => {
                            const half = Math.ceil(parties.length / 2);
                            const leftCol = parties.slice(0, half);
                            const rightCol = parties.slice(half);
                            const rows = Math.max(leftCol.length, rightCol.length);
                            return Array.from({ length: rows }).map((_, idx) => {
                                const leftParty = leftCol[idx];
                                const rightParty = rightCol[idx];
                                const rowKey = leftParty?.id || rightParty?.id || `row-${idx}`;
                                return (
                                    <div key={rowKey} className="flex border-b border-[#C2185B] last:border-b-0">
                                        {leftParty ? (
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedPartyId(leftParty.id); setPartyNoVote(false); }}
                                                className={cn(
                                                    "flex-1 flex items-center border-r-4 border-[#C2185B] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#C2185B] focus-visible:ring-inset",
                                                    selectedPartyId === leftParty.id ? "bg-[#FCE4EC]" : "hover:bg-[#FCE4EC]/40"
                                                )}
                                            >
                                                <div className="w-14 flex items-center justify-center py-1.5 border-r border-[#C2185B] bg-white">
                                                    <span className="text-2xl font-bold text-black">{leftParty.partyNumber}</span>
                                                </div>
                                                <div className="w-12 flex items-center justify-center py-1.5 border-r border-[#C2185B]">
                                                    {leftParty.logoUrl ? (
                                                        <img src={leftParty.logoUrl} alt="" className="w-9 h-9 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: leftParty.color, color: getContrastColor(leftParty.color) }}>
                                                            {leftParty.abbreviation}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 flex items-center px-2 py-1.5 border-r border-[#C2185B]">
                                                    <span className="text-sm font-medium text-slate-800 text-left leading-tight">{leftParty.nameTh}</span>
                                                </div>
                                                <div className="w-14 flex items-center justify-center py-1.5">
                                                    <div className="w-8 h-8 border-2 border-black flex items-center justify-center font-bold text-xl bg-white">
                                                        {selectedPartyId === leftParty.id ? "X" : ""}
                                                    </div>
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="flex-1 border-r-4 border-[#C2185B]" />
                                        )}
                                        {rightParty ? (
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedPartyId(rightParty.id); setPartyNoVote(false); }}
                                                className={cn(
                                                    "flex-1 items-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#C2185B] focus-visible:ring-inset hidden sm:flex",
                                                    selectedPartyId === rightParty.id ? "bg-[#FCE4EC]" : "hover:bg-[#FCE4EC]/40"
                                                )}
                                            >
                                                <div className="w-14 flex items-center justify-center py-1.5 border-r border-[#C2185B] bg-white">
                                                    <span className="text-2xl font-bold text-black">{rightParty.partyNumber}</span>
                                                </div>
                                                <div className="w-12 flex items-center justify-center py-1.5 border-r border-[#C2185B]">
                                                    {rightParty.logoUrl ? (
                                                        <img src={rightParty.logoUrl} alt="" className="w-9 h-9 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: rightParty.color, color: getContrastColor(rightParty.color) }}>
                                                            {rightParty.abbreviation}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 flex items-center px-2 py-1.5 border-r border-[#C2185B]">
                                                    <span className="text-sm font-medium text-slate-800 text-left leading-tight">{rightParty.nameTh}</span>
                                                </div>
                                                <div className="w-14 flex items-center justify-center py-1.5">
                                                    <div className="w-8 h-8 border-2 border-black flex items-center justify-center font-bold text-xl bg-white">
                                                        {selectedPartyId === rightParty.id ? "X" : ""}
                                                    </div>
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="flex-1 hidden sm:block" />
                                        )}
                                    </div>
                                );
                            });
                        })()}
                        {(() => {
                            const half = Math.ceil(parties.length / 2);
                            const rightCol = parties.slice(half);
                            return rightCol.map((party) => (
                                <button
                                    key={`mobile-${party.id}`}
                                    type="button"
                                    onClick={() => { setSelectedPartyId(party.id); setPartyNoVote(false); }}
                                    className={cn(
                                        "flex items-center border-b border-[#C2185B] last:border-b-0 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#C2185B] focus-visible:ring-inset sm:hidden w-full",
                                        selectedPartyId === party.id ? "bg-[#FCE4EC]" : "hover:bg-[#FCE4EC]/40"
                                    )}
                                >
                                    <div className="w-14 flex items-center justify-center py-1.5 border-r border-[#C2185B] bg-white">
                                        <span className="text-2xl font-bold text-black">{party.partyNumber}</span>
                                    </div>
                                    <div className="w-12 flex items-center justify-center py-1.5 border-r border-[#C2185B]">
                                        {party.logoUrl ? (
                                            <img src={party.logoUrl} alt="" className="w-9 h-9 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        ) : (
                                            <div className="w-9 h-9 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: party.color, color: getContrastColor(party.color) }}>
                                                {party.abbreviation}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex items-center px-2 py-1.5 border-r border-[#C2185B]">
                                        <span className="text-sm font-medium text-slate-800 text-left leading-tight">{party.nameTh}</span>
                                    </div>
                                    <div className="w-14 flex items-center justify-center py-1.5">
                                        <div className="w-8 h-8 border-2 border-black flex items-center justify-center font-bold text-xl bg-white">
                                            {selectedPartyId === party.id ? "X" : ""}
                                        </div>
                                    </div>
                                </button>
                            ));
                        })()}
                    </div>
                    <div className="border-t-2 border-[#C2185B] bg-[#FCE4EC] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                        <p className="text-[#6D1036] font-medium">ถ้าไม่ประสงค์เลือกพรรคการเมืองใด</p>
                        <button
                            type="button"
                            onClick={() => { setPartyNoVote(true); setSelectedPartyId(null); }}
                            className={cn(
                                "flex items-center gap-3 text-[#6D1036] font-medium",
                                partyNoVote ? "" : "opacity-80"
                            )}
                        >
                            <span className="text-xs">ให้ทำเครื่องหมายกากบาท X ในช่องนี้</span>
                            <span className="text-xs">►</span>
                            <span className="w-8 h-8 border-2 border-black flex items-center justify-center font-bold text-xl text-black bg-white">
                                {partyNoVote ? "X" : ""}
                            </span>
                        </button>
                    </div>
                </div>
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg md:static md:shadow-none md:border-0 md:bg-transparent md:p-0 mt-8">
                    <Button onClick={handleNextStep} disabled={!selectedPartyId && !partyNoVote} className="w-full md:w-auto bg-[#00247D] hover:bg-[#00247D]/90 h-12 text-lg px-8">
                        ถัดไป <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
                <div className="h-20 md:hidden"></div>
            </div>
        )}

        {step === 4 && (
            <div className="space-y-6">
                <div className="rounded-lg border-4 border-[#2E7D32] bg-[#E8F5E9] shadow-md overflow-hidden">
                    <div className="bg-[#E8F5E9] border-b-2 border-[#2E7D32]">
                        <div className="flex items-center justify-center gap-3 px-4 py-3">
                            <div className="text-center">
                                <p className="text-base font-bold text-[#1B5E20]">บัตรเลือกตั้งสมาชิกสภาผู้แทนราษฎรแบบแบ่งเขตเลือกตั้ง</p>
                                <p className="text-xs text-[#1B5E20] mt-1">ให้ทำเครื่องหมายกากบาท «X» ภายใน "ช่องทำเครื่องหมาย" ไม่เกินหนึ่งหมายเลข</p>
                            </div>
                        </div>
                        <div className="flex border-t-2 border-[#2E7D32] text-[10px] font-semibold text-[#1B5E20]">
                            <div className="flex-1 flex border-r-4 border-[#2E7D32]">
                                <div className="w-12 px-1 py-1.5 text-center border-r border-[#2E7D32]">หมายเลข</div>
                                <div className="w-12 px-1 py-1.5 text-center border-r border-[#2E7D32]">พรรค</div>
                                <div className="flex-1 px-1 py-1.5 text-center border-r border-[#2E7D32]">ชื่อผู้สมัคร</div>
                                <div className="w-14 px-1 py-1.5 text-center">ช่องกา</div>
                            </div>
                            <div className="flex-1 hidden sm:flex">
                                <div className="w-12 px-1 py-1.5 text-center border-r border-[#2E7D32]">หมายเลข</div>
                                <div className="w-12 px-1 py-1.5 text-center border-r border-[#2E7D32]">พรรค</div>
                                <div className="flex-1 px-1 py-1.5 text-center border-r border-[#2E7D32]">ชื่อผู้สมัคร</div>
                                <div className="w-14 px-1 py-1.5 text-center">ช่องกา</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white">
                        {(() => {
                            const half = Math.ceil(candidates.length / 2);
                            const leftCol = candidates.slice(0, half);
                            const rightCol = candidates.slice(half);
                            const rows = Math.max(leftCol.length, rightCol.length);
                            return Array.from({ length: rows }).map((_, idx) => {
                                const leftCandidate = leftCol[idx];
                                const rightCandidate = rightCol[idx];
                                const rowKey = leftCandidate?.id || rightCandidate?.id || `row-${idx}`;
                                return (
                                    <div key={rowKey} className="flex border-b border-[#2E7D32] last:border-b-0">
                                        {leftCandidate ? (
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedCandidateId(leftCandidate.id); setCandidateNoVote(false); }}
                                                className={cn(
                                                    "flex-1 flex items-center border-r-4 border-[#2E7D32] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#2E7D32] focus-visible:ring-inset",
                                                    selectedCandidateId === leftCandidate.id ? "bg-[#E8F5E9]" : "hover:bg-[#E8F5E9]/40"
                                                )}
                                            >
                                                <div className="w-12 flex items-center justify-center py-2 border-r border-[#2E7D32] bg-white">
                                                    <span className="text-2xl font-bold text-black">{leftCandidate.candidateNumber}</span>
                                                </div>
                                                <div className="w-12 flex items-center justify-center py-2 border-r border-[#2E7D32]">
                                                    {leftCandidate.party?.logoUrl ? (
                                                        <img src={leftCandidate.party.logoUrl} alt="" className="w-9 h-9 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: leftCandidate.party?.color || '#ccc', color: getContrastColor(leftCandidate.party?.color || '#ccc') }}>
                                                            {leftCandidate.party?.abbreviation || '-'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 flex flex-col justify-center px-2 py-1.5 border-r border-[#2E7D32]">
                                                    <span className="text-sm font-medium text-slate-800 text-left leading-tight">{leftCandidate.titleTh}{leftCandidate.firstNameTh} {leftCandidate.lastNameTh}</span>
                                                    <span className="text-[10px] text-slate-500 text-left">{leftCandidate.party?.nameTh || 'อิสระ'}</span>
                                                </div>
                                                <div className="w-14 flex items-center justify-center py-2">
                                                    <div className="w-8 h-8 border-2 border-black flex items-center justify-center font-bold text-xl bg-white">
                                                        {selectedCandidateId === leftCandidate.id ? "X" : ""}
                                                    </div>
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="flex-1 border-r-4 border-[#2E7D32]" />
                                        )}
                                        {rightCandidate ? (
                                            <button
                                                type="button"
                                                onClick={() => { setSelectedCandidateId(rightCandidate.id); setCandidateNoVote(false); }}
                                                className={cn(
                                                    "flex-1 items-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#2E7D32] focus-visible:ring-inset hidden sm:flex",
                                                    selectedCandidateId === rightCandidate.id ? "bg-[#E8F5E9]" : "hover:bg-[#E8F5E9]/40"
                                                )}
                                            >
                                                <div className="w-12 flex items-center justify-center py-2 border-r border-[#2E7D32] bg-white">
                                                    <span className="text-2xl font-bold text-black">{rightCandidate.candidateNumber}</span>
                                                </div>
                                                <div className="w-12 flex items-center justify-center py-2 border-r border-[#2E7D32]">
                                                    {rightCandidate.party?.logoUrl ? (
                                                        <img src={rightCandidate.party.logoUrl} alt="" className="w-9 h-9 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: rightCandidate.party?.color || '#ccc', color: getContrastColor(rightCandidate.party?.color || '#ccc') }}>
                                                            {rightCandidate.party?.abbreviation || '-'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 flex flex-col justify-center px-2 py-1.5 border-r border-[#2E7D32]">
                                                    <span className="text-sm font-medium text-slate-800 text-left leading-tight">{rightCandidate.titleTh}{rightCandidate.firstNameTh} {rightCandidate.lastNameTh}</span>
                                                    <span className="text-[10px] text-slate-500 text-left">{rightCandidate.party?.nameTh || 'อิสระ'}</span>
                                                </div>
                                                <div className="w-14 flex items-center justify-center py-2">
                                                    <div className="w-8 h-8 border-2 border-black flex items-center justify-center font-bold text-xl bg-white">
                                                        {selectedCandidateId === rightCandidate.id ? "X" : ""}
                                                    </div>
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="flex-1 hidden sm:block" />
                                        )}
                                    </div>
                                );
                            });
                        })()}
                        {(() => {
                            const half = Math.ceil(candidates.length / 2);
                            const rightCol = candidates.slice(half);
                            return rightCol.map((candidate) => (
                                <button
                                    key={`mobile-${candidate.id}`}
                                    type="button"
                                    onClick={() => { setSelectedCandidateId(candidate.id); setCandidateNoVote(false); }}
                                    className={cn(
                                        "flex items-center border-b border-[#2E7D32] last:border-b-0 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#2E7D32] focus-visible:ring-inset sm:hidden w-full",
                                        selectedCandidateId === candidate.id ? "bg-[#E8F5E9]" : "hover:bg-[#E8F5E9]/40"
                                    )}
                                >
                                    <div className="w-12 flex items-center justify-center py-2 border-r border-[#2E7D32] bg-white">
                                        <span className="text-2xl font-bold text-black">{candidate.candidateNumber}</span>
                                    </div>
                                    <div className="w-12 flex items-center justify-center py-2 border-r border-[#2E7D32]">
                                        {candidate.party?.logoUrl ? (
                                            <img src={candidate.party.logoUrl} alt="" className="w-9 h-9 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                        ) : (
                                            <div className="w-9 h-9 rounded flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: candidate.party?.color || '#ccc', color: getContrastColor(candidate.party?.color || '#ccc') }}>
                                                {candidate.party?.abbreviation || '-'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center px-2 py-1.5 border-r border-[#2E7D32]">
                                        <span className="text-sm font-medium text-slate-800 text-left leading-tight">{candidate.titleTh}{candidate.firstNameTh} {candidate.lastNameTh}</span>
                                        <span className="text-[10px] text-slate-500 text-left">{candidate.party?.nameTh || 'อิสระ'}</span>
                                    </div>
                                    <div className="w-14 flex items-center justify-center py-2">
                                        <div className="w-8 h-8 border-2 border-black flex items-center justify-center font-bold text-xl bg-white">
                                            {selectedCandidateId === candidate.id ? "X" : ""}
                                        </div>
                                    </div>
                                </button>
                            ));
                        })()}
                    </div>
                    <div className="border-t-2 border-[#2E7D32] bg-[#E8F5E9] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                        <p className="text-[#1B5E20] font-medium">ถ้าไม่ประสงค์เลือกผู้สมัครผู้ใด</p>
                        <button
                            type="button"
                            onClick={() => { setCandidateNoVote(true); setSelectedCandidateId(null); }}
                            className={cn(
                                "flex items-center gap-3 text-[#1B5E20] font-medium",
                                candidateNoVote ? "" : "opacity-80"
                            )}
                        >
                            <span className="text-xs">ให้ทำเครื่องหมายกากบาท X ในช่องนี้</span>
                            <span className="text-xs">►</span>
                            <span className="w-8 h-8 border-2 border-black flex items-center justify-center font-bold text-xl text-black bg-white">
                                {candidateNoVote ? "X" : ""}
                            </span>
                        </button>
                    </div>
                </div>
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg md:static md:shadow-none md:border-0 md:bg-transparent md:p-0 mt-8">
                    <Button onClick={handleNextStep} disabled={!selectedCandidateId && !candidateNoVote} className="w-full md:w-auto bg-[#00247D] hover:bg-[#00247D]/90 h-12 text-lg px-8">
                        ถัดไป <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
                <div className="h-20 md:hidden"></div>
            </div>
        )}

        {step === 5 && (
            <div className="space-y-8">
                {questions.map((question, idx) => (
                    <div key={question.id} className="rounded-lg border-2 border-[#F9A825] bg-white shadow-md overflow-hidden">
                        <div className="border-b-2 border-[#F9A825] bg-[#FFFDE7]">
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="text-2xl">🦅</div>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-semibold text-[#7C5A10]">บัตรออกเสียงประชามติ</p>
                                    <p className="text-xs text-[#7C5A10]">โปรดทำเครื่องหมายกากบาท X ในช่องทำเครื่องหมายเพียงเครื่องหมายเดียว</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="space-y-2">
                                <p className="text-slate-900 text-sm font-semibold">ประเด็น "{question.questionTh}"</p>
                                {question.descriptionTh && <p className="text-slate-600 text-sm">{question.descriptionTh}</p>}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {['APPROVE', 'DISAPPROVE'].map((option) => (
                                    <button
                                        type="button"
                                        key={option}
                                        onClick={() => setReferendumVotes(prev => ({ ...prev, [question.id]: option as any }))}
                                        className={cn(
                                            "w-full border-2 border-[#F9A825] bg-white p-6 sm:p-8 text-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#F9A825] focus-visible:ring-offset-2",
                                            referendumVotes[question.id] === option ? "bg-[#FFF8E1]" : "hover:bg-[#FFFDE7]"
                                        )}
                                    >
                                        <div className="text-lg font-semibold text-[#7C5A10]">
                                            {option === 'APPROVE' ? "เห็นชอบ" : "ไม่เห็นชอบ"}
                                        </div>
                                        <div className="mt-4 flex items-center justify-center">
                                            <div className="w-10 h-10 border-2 border-black flex items-center justify-center font-bold text-black">
                                                {referendumVotes[question.id] === option ? "X" : ""}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="text-center text-xs text-[#7C5A10]">◄──── ช่องทำเครื่องหมาย ────►</div>
                        </div>
                        <div className="border-t-2 border-[#F9A825] px-4 py-3 flex items-center justify-between text-sm">
                            <p className="text-[#7C5A10]">ถ้าไม่ประสงค์จะแสดงความคิดเห็นให้ทำเครื่องหมายกากบาท X ในช่อง</p>
                            <button
                                type="button"
                                onClick={() => setReferendumVotes(prev => ({ ...prev, [question.id]: 'ABSTAIN' }))}
                                className="flex items-center gap-2 text-[#7C5A10]"
                            >
                                <span className="text-xs">►</span>
                                <span className="w-7 h-7 border-2 border-black flex items-center justify-center font-bold text-black bg-white">
                                    {referendumVotes[question.id] === 'ABSTAIN' ? "X" : ""}
                                </span>
                                <span className="text-xs">ไม่แสดงความคิดเห็น</span>
                            </button>
                        </div>
                    </div>
                ))}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg md:static md:shadow-none md:border-0 md:bg-transparent md:p-0 mt-8">
                    <Button 
                        onClick={handleNextStep} 
                        disabled={questions.some(q => !referendumVotes[q.id])} 
                        className="w-full md:w-auto bg-[#00247D] hover:bg-[#00247D]/90 h-12 text-lg px-8"
                    >
                        ถัดไป <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
                <div className="h-20 md:hidden"></div>
            </div>
        )}

        {step === 6 && (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-center text-slate-800">ตรวจสอบความถูกต้อง</h2>
                
                {selectedElection?.hasPartyList && (
                    <div className="rounded-2xl border-2 border-[#C2185B] bg-[#FCE4EC] overflow-hidden">
                        <div className="bg-[#C2185B] text-white px-4 py-2 text-sm font-bold">บัตรเลือกตั้งแบบบัญชีรายชื่อ</div>
                        <div className="p-4">
                            {selectedPartyId ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full border-2 border-[#C2185B] bg-white flex items-center justify-center text-[#C2185B] font-bold text-sm">
                                        {parties.find(p => p.id === selectedPartyId)?.partyNumber}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{parties.find(p => p.id === selectedPartyId)?.nameTh}</div>
                                        <div className="text-xs text-[#6D1036]">เลือกแล้ว</div>
                                    </div>
                                </div>
                            ) : partyNoVote ? (
                                <span className="text-[#6D1036] font-semibold">ไม่เลือกบัญชีรายชื่อของพรรคการเมืองใด</span>
                            ) : <span className="text-red-500">ยังไม่ได้เลือก</span>}
                        </div>
                    </div>
                )}

                {selectedElection?.hasConstituency && (
                    <div className="rounded-2xl border-2 border-[#2E7D32] bg-[#E8F5E9] overflow-hidden">
                        <div className="bg-[#2E7D32] text-white px-4 py-2 text-sm font-bold">บัตรเลือกตั้งแบบแบ่งเขต</div>
                        <div className="p-4">
                            {selectedCandidateId ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full border-2 border-[#2E7D32] bg-white flex items-center justify-center text-[#1B5E20] font-bold text-sm">
                                        {candidates.find(c => c.id === selectedCandidateId)?.candidateNumber}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">
                                            {candidates.find(c => c.id === selectedCandidateId)?.titleTh}
                                            {candidates.find(c => c.id === selectedCandidateId)?.firstNameTh} {candidates.find(c => c.id === selectedCandidateId)?.lastNameTh}
                                        </div>
                                        <div className="text-sm text-slate-600">{candidates.find(c => c.id === selectedCandidateId)?.party?.nameTh}</div>
                                    </div>
                                </div>
                            ) : candidateNoVote ? (
                                <span className="text-[#1B5E20] font-semibold">ไม่เลือกผู้สมัครผู้ใด</span>
                            ) : <span className="text-red-500">ยังไม่ได้เลือก</span>}
                        </div>
                    </div>
                )}

                {selectedElection?.hasReferendum && Object.keys(referendumVotes).length > 0 && (
                     <div className="rounded-2xl border-2 border-[#F9A825] bg-[#FFFDE7] overflow-hidden">
                        <div className="bg-[#F9A825] text-white px-4 py-2 text-sm font-bold">การออกเสียงประชามติ</div>
                        <div className="p-4 space-y-2">
                           {questions.map((q, idx) => (
                               <div key={q.id} className="flex justify-between items-center border-b border-[#F9A825]/30 last:border-0 py-2">
                                   <span className="text-sm text-slate-700">ข้อที่ {idx + 1}</span>
                                    <span className="font-bold text-[#7C5A10]">
                                        {referendumVotes[q.id] === 'APPROVE' && "เห็นชอบ"}
                                        {referendumVotes[q.id] === 'DISAPPROVE' && "ไม่เห็นชอบ"}
                                        {referendumVotes[q.id] === 'ABSTAIN' && "ไม่แสดงความคิดเห็น"}
                                    </span>
                                </div>
                            ))}
                        </div>
                     </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 text-[#EF3340] text-sm bg-red-50 p-3 rounded-md">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg md:static md:shadow-none md:border-0 md:bg-transparent md:p-0 mt-8">
                    <Button onClick={handleSubmitVote} disabled={loading} className="w-full bg-[#00247D] hover:bg-[#00247D]/90 h-14 text-xl shadow-lg">
                        {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
                        ยืนยันการลงคะแนน
                    </Button>
                </div>
                <div className="h-20 md:hidden"></div>
            </div>
        )}

      </div>
    </div>
  );
}
