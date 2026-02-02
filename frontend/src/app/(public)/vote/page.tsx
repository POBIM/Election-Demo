"use client";

import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    if (step === 2 && user) {
      fetchElections();
    }
  }, [step, user]);

  const fetchElections = async () => {
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
  };

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
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-blue-800 text-sm">
                    กรุณาเลือกพรรคการเมืองที่ท่านต้องการลงคะแนนให้ (เลือกได้ 1 หมายเลข)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {parties.map(party => (
                        <button 
                            type="button"
                            key={party.id}
                            onClick={() => setSelectedPartyId(party.id)}
                            className={cn(
                                "w-full cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center transition-all bg-white hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                selectedPartyId === party.id 
                                    ? "border-[#00247D] bg-blue-50 ring-2 ring-offset-2 ring-[#00247D]" 
                                    : "border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold mb-3" style={{ color: party.color }}>
                                {party.partyNumber}
                            </div>
                            <h3 className="font-bold text-center text-slate-800 leading-tight">{party.nameTh}</h3>
                            <p className="text-xs text-slate-500 mt-1">{party.abbreviation}</p>
                        </button>
                    ))}
                </div>
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg md:static md:shadow-none md:border-0 md:bg-transparent md:p-0 mt-8">
                    <Button onClick={handleNextStep} disabled={!selectedPartyId} className="w-full md:w-auto bg-[#00247D] hover:bg-[#00247D]/90 h-12 text-lg px-8">
                        ถัดไป <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
                <div className="h-20 md:hidden"></div>
            </div>
        )}

        {step === 4 && (
            <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-800 text-sm">
                    กรุณาเลือกผู้สมัครในเขตเลือกตั้งของท่าน (เลือกได้ 1 หมายเลข)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {candidates.map(candidate => (
                        <button 
                            type="button"
                            key={candidate.id}
                            onClick={() => setSelectedCandidateId(candidate.id)}
                            className={cn(
                                "w-full cursor-pointer rounded-xl border-2 p-4 flex items-center gap-4 transition-all bg-white hover:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                selectedCandidateId === candidate.id 
                                    ? "border-[#EF3340] bg-red-50 ring-2 ring-offset-2 ring-[#EF3340]" 
                                    : "border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-800">
                                {candidate.candidateNumber}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{candidate.titleTh}{candidate.firstNameTh} {candidate.lastNameTh}</h3>
                                <p className="text-sm text-slate-500">{candidate.party?.nameTh || "ไม่สังกัดพรรค"}</p>
                            </div>
                        </button>
                    ))}
                </div>
                 <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg md:static md:shadow-none md:border-0 md:bg-transparent md:p-0 mt-8">
                    <Button onClick={handleNextStep} disabled={!selectedCandidateId} className="w-full md:w-auto bg-[#00247D] hover:bg-[#00247D]/90 h-12 text-lg px-8">
                        ถัดไป <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
                <div className="h-20 md:hidden"></div>
            </div>
        )}

        {step === 5 && (
            <div className="space-y-8">
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-green-800 text-sm">
                    กรุณาลงความคิดเห็นในประเด็นคำถามประชามติ
                </div>
                {questions.map((question, idx) => (
                    <Card key={question.id}>
                        <CardHeader>
                            <h3 className="font-bold text-lg">คำถามที่ {idx + 1}</h3>
                            <p className="text-slate-800 text-lg">{question.questionTh}</p>
                            {question.descriptionTh && <p className="text-slate-500 text-sm">{question.descriptionTh}</p>}
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {['APPROVE', 'DISAPPROVE', 'ABSTAIN'].map((option) => (
                                <button 
                                    type="button"
                                    key={option}
                                    onClick={() => setReferendumVotes(prev => ({ ...prev, [question.id]: option as any }))}
                                    className={cn(
                                        "w-full flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                        referendumVotes[question.id] === option 
                                            ? "border-[#00247D] bg-blue-50 text-[#00247D] font-bold" 
                                            : "border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center",
                                        referendumVotes[question.id] === option ? "border-[#00247D]" : "border-slate-300"
                                    )}>
                                        {referendumVotes[question.id] === option && <div className="w-2.5 h-2.5 rounded-full bg-[#00247D]" />}
                                    </div>
                                    {option === 'APPROVE' && "เห็นชอบ"}
                                    {option === 'DISAPPROVE' && "ไม่เห็นชอบ"}
                                    {option === 'ABSTAIN' && "งดออกเสียง"}
                                </button>
                            ))}
                        </CardContent>
                    </Card>
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
                    <Card>
                        <CardHeader className="pb-2"><h3 className="font-bold text-slate-500 text-sm uppercase">บัตรเลือกตั้งแบบบัญชีรายชื่อ</h3></CardHeader>
                        <CardContent>
                            {selectedPartyId ? (
                                <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-lg">
                                        {parties.find(p => p.id === selectedPartyId)?.partyNumber}
                                    </div>
                                    <span className="text-lg font-bold">{parties.find(p => p.id === selectedPartyId)?.nameTh}</span>
                                </div>
                            ) : <span className="text-red-500">ยังไม่ได้เลือก</span>}
                        </CardContent>
                    </Card>
                )}

                {selectedElection?.hasConstituency && (
                    <Card>
                        <CardHeader className="pb-2"><h3 className="font-bold text-slate-500 text-sm uppercase">บัตรเลือกตั้งแบบแบ่งเขต</h3></CardHeader>
                        <CardContent>
                            {selectedCandidateId ? (
                                <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-800 font-bold text-lg">
                                        {candidates.find(c => c.id === selectedCandidateId)?.candidateNumber}
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold">
                                            {candidates.find(c => c.id === selectedCandidateId)?.titleTh}
                                            {candidates.find(c => c.id === selectedCandidateId)?.firstNameTh} {candidates.find(c => c.id === selectedCandidateId)?.lastNameTh}
                                        </div>
                                        <div className="text-sm text-slate-500">{candidates.find(c => c.id === selectedCandidateId)?.party?.nameTh}</div>
                                    </div>
                                </div>
                            ) : <span className="text-red-500">ยังไม่ได้เลือก</span>}
                        </CardContent>
                    </Card>
                )}

                {selectedElection?.hasReferendum && Object.keys(referendumVotes).length > 0 && (
                     <Card>
                        <CardHeader className="pb-2"><h3 className="font-bold text-slate-500 text-sm uppercase">การออกเสียงประชามติ</h3></CardHeader>
                        <CardContent className="space-y-2">
                           {questions.map((q, idx) => (
                               <div key={q.id} className="flex justify-between items-center border-b last:border-0 py-2">
                                   <span className="text-sm text-slate-600">ข้อที่ {idx + 1}</span>
                                   <span className="font-bold text-[#00247D]">
                                       {referendumVotes[q.id] === 'APPROVE' && "เห็นชอบ"}
                                       {referendumVotes[q.id] === 'DISAPPROVE' && "ไม่เห็นชอบ"}
                                       {referendumVotes[q.id] === 'ABSTAIN' && "งดออกเสียง"}
                                   </span>
                               </div>
                           ))}
                        </CardContent>
                    </Card>
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
