'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSSE } from '@/hooks/useSSE';
import { apiRequest } from '@/lib/api';
import { Loader2, RefreshCw, Wifi, WifiOff, Check, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('th-TH').format(num);
}

function formatPercent(num: number): string {
  return new Intl.NumberFormat('th-TH', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(num / 100);
}

interface PartyListResult {
  partyId: string;
  partyName: string;
  partyNameTh?: string;
  partyColor: string;
  voteCount: number;
  percentage: number;
}

interface ReferendumResult {
  questionId: string;
  questionText: string;
  approveCount: number;
  disapproveCount: number;
  abstainCount: number;
  approvePercentage?: number;
  disapprovePercentage?: number;
  result?: string;
}

// REST API response (from /results/:electionId)
interface RestResultsData {
  electionId: string;
  electionName: string;
  status: string;
  lastUpdated: string;
  totalEligibleVoters: number;
  totalVotesCast: number;
  turnoutPercentage: number;
  partyListResults: PartyListResult[];
  referendumResults: ReferendumResult[];
}

// SSE snapshot data structure (from stream)
interface SSESnapshotData {
  timestamp: string;
  totalVotes: number;
  partyResults: Array<{
    partyId: string;
    partyName: string;
    partyColor: string;
    voteCount: number;
  }>;
  event?: string;
}

// Unified display data
interface DisplayData {
  partyListResults: PartyListResult[];
  referendumResults: ReferendumResult[];
  totalVotes: number;
  turnoutPercentage: number;
  lastUpdated: string;
}

function normalizeSseData(sseData: SSESnapshotData | null): DisplayData | null {
  if (!sseData) return null;

  return {
    partyListResults: (sseData.partyResults || []).map((p) => ({
      partyId: p.partyId,
      partyName: p.partyName,
      partyNameTh: p.partyName, // SSE uses partyName for Thai
      partyColor: p.partyColor,
      voteCount: p.voteCount,
      percentage: sseData.totalVotes > 0 ? (p.voteCount / sseData.totalVotes) * 100 : 0,
    })),
    referendumResults: [], // SSE doesn't include referendum updates
    totalVotes: sseData.totalVotes,
    turnoutPercentage: 0, // Not in SSE snapshot
    lastUpdated: sseData.timestamp,
  };
}

const StatusIndicator = ({ status, lastUpdated }: { status: string; lastUpdated: string }) => {
  return (
    <div className="flex items-center gap-3 text-sm font-medium">
      <div className={cn(
        "flex items-center gap-1.5 px-3 py-1 rounded-full transition-colors",
        status === 'connected' ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
        status === 'reconnecting' ? "bg-amber-100 text-amber-700 border border-amber-200" :
        "bg-rose-100 text-rose-700 border border-rose-200"
      )}>
        {status === 'connected' ? <Wifi size={14} /> : status === 'reconnecting' ? <RefreshCw size={14} className="animate-spin" /> : <WifiOff size={14} />}
        <span>
          {status === 'connected' ? 'ออนไลน์' : status === 'reconnecting' ? 'กำลังเชื่อมต่อ...' : 'ขาดการเชื่อมต่อ'}
        </span>
      </div>
      <div className="text-slate-500 hidden sm:block">
        อัปเดตล่าสุด: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('th-TH') : '-'}
      </div>
    </div>
  );
};

const PartyListTab = ({ data }: { data: PartyListResult[] }) => {
  const sortedData = useMemo(() => [...data].sort((a, b) => b.voteCount - a.voteCount), [data]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid gap-4">
        {sortedData.map((party, index) => (
          <div key={party.partyId} className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-[200px]">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
                  style={{ backgroundColor: party.partyColor }}
                >
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg leading-tight">{party.partyNameTh || party.partyName}</h3>
                  <p className="text-sm text-slate-500">พรรคการเมือง</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">{formatNumber(party.voteCount)}</span>
                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {party.percentage.toFixed(2)}%
                </span>
              </div>
            </div>
            
            <div 
              className="absolute left-0 top-0 bottom-0 bg-opacity-10 transition-all duration-1000 ease-out"
              style={{ 
                width: `${party.percentage}%`, 
                backgroundColor: party.partyColor,
                opacity: 0.1
              }} 
            />
            <div 
              className="absolute left-0 bottom-0 h-1 transition-all duration-1000 ease-out"
              style={{ 
                width: `${party.percentage}%`, 
                backgroundColor: party.partyColor
              }} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const ConstituencyTab = ({
  data,
}: {
  data: Array<{
    districtId: number;
    districtName: string;
    results: Array<{
      candidateId: number;
      candidateName: string;
      partyName: string;
      voteCount: number;
    }>;
  }>;
}) => {
  const [selectedDistrictId, setSelectedDistrictId] = useState<number>(data[0]?.districtId || 0);

  const selectedDistrict = useMemo(() => 
    data.find(d => d.districtId === Number(selectedDistrictId)), 
    [data, selectedDistrictId]
  );

  const sortedCandidates = useMemo(() => {
    if (!selectedDistrict) return [];
    return [...selectedDistrict.results].sort((a, b) => b.voteCount - a.voteCount);
  }, [selectedDistrict]);

  const winnerId = sortedCandidates[0]?.candidateId;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <label htmlFor="district-select" className="block text-sm font-semibold text-slate-700 mb-2">เลือกเขตเลือกตั้ง</label>
        <select 
          id="district-select"
          value={selectedDistrictId}
          onChange={(e) => setSelectedDistrictId(Number(e.target.value))}
          className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow outline-none"
        >
          {data.map(district => (
            <option key={district.districtId} value={district.districtId}>
              {district.districtName}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3">
        {sortedCandidates.map((candidate, index) => {
          const isWinner = candidate.candidateId === winnerId;
          const maxVotes = sortedCandidates[0]?.voteCount || 1;
          const percentage = (candidate.voteCount / (selectedDistrict?.results.reduce((acc, c) => acc + c.voteCount, 0) || 1)) * 100;

          return (
            <div 
              key={candidate.candidateId} 
              className={cn(
                "relative bg-white border rounded-xl overflow-hidden transition-all p-4",
                isWinner ? "border-emerald-500 ring-1 ring-emerald-500 shadow-md" : "border-slate-200 hover:border-slate-300"
              )}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    isWinner ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  )}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900">{candidate.candidateName}</h4>
                      {isWinner && <Check size={16} className="text-emerald-500" strokeWidth={3} />}
                    </div>
                    <p className="text-sm text-slate-500">{candidate.partyName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-slate-900 text-lg">{formatNumber(candidate.voteCount)}</div>
                  <div className="text-xs text-slate-500">{percentage.toFixed(1)}%</div>
                </div>
              </div>
              
              <div className="absolute left-0 bottom-0 h-1 bg-slate-100 w-full">
                <div 
                  className={cn("h-full transition-all duration-500", isWinner ? "bg-emerald-500" : "bg-slate-400")}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ReferendumTab = ({ data }: { data: ReferendumResult[] }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {data.map((q) => {
        const total = q.approveCount + q.disapproveCount + q.abstainCount;
        const pApprove = total ? (q.approveCount / total) * 100 : 0;
        const pDisapprove = total ? (q.disapproveCount / total) * 100 : 0;
        const pAbstain = total ? (q.abstainCount / total) * 100 : 0;

        return (
          <div key={q.questionId} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-xl text-slate-900 mb-6 leading-relaxed">{q.questionText}</h3>
            
            <div className="h-16 w-full flex rounded-xl overflow-hidden mb-6 text-white font-bold text-sm shadow-inner bg-slate-100">
              <div 
                className="bg-emerald-500 flex items-center justify-center transition-all duration-700 relative group" 
                style={{ width: `${pApprove}%` }}
              >
                {pApprove > 5 && <span className="absolute">เห็นชอบ</span>}
              </div>
              <div 
                className="bg-rose-500 flex items-center justify-center transition-all duration-700 relative group" 
                style={{ width: `${pDisapprove}%` }}
              >
                {pDisapprove > 5 && <span className="absolute">ไม่เห็นชอบ</span>}
              </div>
              <div 
                className="bg-slate-400 flex items-center justify-center transition-all duration-700 relative group" 
                style={{ width: `${pAbstain}%` }}
              >
                {pAbstain > 5 && <span className="absolute text-slate-100">งด</span>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">เห็นชอบ</div>
                <div className="text-2xl font-black text-slate-900">{pApprove.toFixed(1)}%</div>
                <div className="text-sm text-slate-500">{formatNumber(q.approveCount)} คะแนน</div>
              </div>
              <div className="space-y-1 border-l border-r border-slate-100">
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-600">ไม่เห็นชอบ</div>
                <div className="text-2xl font-black text-slate-900">{pDisapprove.toFixed(1)}%</div>
                <div className="text-sm text-slate-500">{formatNumber(q.disapproveCount)} คะแนน</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">งดออกเสียง</div>
                <div className="text-2xl font-black text-slate-900">{pAbstain.toFixed(1)}%</div>
                <div className="text-sm text-slate-500">{formatNumber(q.abstainCount)} คะแนน</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const electionId = searchParams.get('electionId') || 'demo-election-2027';

  const { data: sseData, status } = useSSE<SSESnapshotData>(`/stream/elections/${electionId}/results`);
  const [initialData, setInitialData] = useState<DisplayData | null>(null);
  const [activeTab, setActiveTab] = useState<'party' | 'referendum'>('party');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ success: boolean; data: RestResultsData }>(`/results/${electionId}`)
      .then((response) => {
        if (response.success && response.data) {
          const normalized: DisplayData = {
            partyListResults: response.data.partyListResults,
            referendumResults: response.data.referendumResults,
            totalVotes: response.data.totalVotesCast,
            turnoutPercentage: response.data.turnoutPercentage,
            lastUpdated: response.data.lastUpdated,
          };
          setInitialData(normalized);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch initial data', err);
        setLoading(false);
      });
  }, [electionId]);

  const sseNormalized = normalizeSseData(sseData);
  const displayData: DisplayData | null = sseNormalized || initialData;
  const referendumData = initialData?.referendumResults || displayData?.referendumResults || [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
          <p className="font-medium animate-pulse">กำลังโหลดข้อมูลการเลือกตั้ง...</p>
        </div>
      </div>
    );
  }

  if (!displayData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">ไม่พบข้อมูลการเลือกตั้ง</h2>
          <p className="text-slate-500">กรุณาลองใหม่อีกครั้งในภายหลัง</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="h-2 w-full flex">
          <div className="h-full w-full bg-[#EF3340]"></div>
          <div className="h-full w-full bg-white"></div>
          <div className="h-full w-[200%] bg-[#00247D]"></div>
          <div className="h-full w-full bg-white"></div>
          <div className="h-full w-full bg-[#EF3340]"></div>
        </div>
        
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-none bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              ผลการเลือกตั้ง 2569
            </h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">อย่างไม่เป็นทางการ</p>
          </div>
          <StatusIndicator status={status} lastUpdated={displayData.lastUpdated} />
        </div>
      </header>

      <div className="sticky top-[88px] md:top-[84px] z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto pb-px hide-scrollbar">
            {([
              { id: 'party', label: 'บัญชีรายชื่อ' },
              { id: 'referendum', label: 'ประชามติ' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "py-4 text-sm md:text-base font-bold border-b-2 transition-all whitespace-nowrap px-2",
                  activeTab === tab.id 
                    ? "border-blue-600 text-blue-700" 
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'party' && <PartyListTab data={displayData.partyListResults} />}
            {activeTab === 'referendum' && <ReferendumTab data={referendumData} />}
          </div>
        </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center text-sm md:text-base">
            <div className="flex flex-col md:flex-row md:gap-6">
              <div className="flex items-baseline gap-2">
                <span className="text-slate-500 font-medium">ผู้มาใช้สิทธิ</span>
                <span className="font-black text-slate-900 text-lg">{formatNumber(displayData.totalVotes)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="block text-xs text-slate-500 font-medium uppercase tracking-wider">Voter Turnout</span>
                <span className="block font-black text-blue-600 text-xl leading-none">{formatPercent(displayData.turnoutPercentage)}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
            <p className="font-medium animate-pulse">กำลังโหลดข้อมูลการเลือกตั้ง...</p>
          </div>
        </div>
      }
    >
      <ResultsPageContent />
    </Suspense>
  );
}
