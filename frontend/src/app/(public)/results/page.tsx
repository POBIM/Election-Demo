'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { ThailandMap, ProvinceData } from './components/ThailandMap';
import { RegionFilter, formatNumber, formatPercent } from '@/lib/provinceMapping';
import { Loader2, Users, Vote, PieChart, Map as MapIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface APIResponse {
  success: boolean;
  data: {
    electionId: string;
    electionName: string;
    lastUpdated: string;
    provinces: ProvinceData[];
  };
}

interface AggregatedStats {
  totalVotes: number;
  totalEligible: number;
  turnoutPercentage: number;
  provincesReported: number;
  totalProvinces: number;
  leadingParty: {
    name: string;
    color: string;
    seats: number;
  } | null;
  partySeats: Array<{
    name: string;
    color: string;
    seats: number;
    votes: number;
  }>;
}

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const electionId = searchParams.get('electionId') || 'demo-election-2569';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<APIResponse['data'] | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>(RegionFilter.ALL);
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await apiRequest<APIResponse>(`/results/${electionId}/by-province`);
        if (response.success) {
          setData(response.data);
        } else {
          setError('Failed to load election data');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('An error occurred while loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [electionId]);

  const stats = useMemo<AggregatedStats | null>(() => {
    if (!data || !data.provinces) return null;

    let totalVotes = 0;
    let totalEligible = 0;
    const partyMap = new Map<string, { name: string; color: string; seats: number; votes: number }>();

    data.provinces.forEach(p => {
      totalVotes += p.totalVotes;
      totalEligible += p.totalEligibleVoters;

      p.partyResults.forEach(pr => {
        const existing = partyMap.get(pr.partyId) || {
          name: pr.partyNameTh,
          color: pr.partyColor,
          seats: 0,
          votes: 0
        };
        existing.seats += pr.seatsWon;
        existing.votes += pr.voteCount;
        partyMap.set(pr.partyId, existing);
      });
    });

    const partySeats = Array.from(partyMap.values())
      .sort((a, b) => b.seats - a.seats);

    return {
      totalVotes,
      totalEligible,
      turnoutPercentage: totalEligible > 0 ? (totalVotes / totalEligible) * 100 : 0,
      provincesReported: data.provinces.length,
      totalProvinces: 77,
      leadingParty: partySeats.length > 0 ? partySeats[0] : null,
      partySeats: partySeats.slice(0, 10)
    };
  }, [data]);

  const handleSelectRegion = (region: string) => {
    setSelectedRegion(region);
    if (region === RegionFilter.ALL) {
      setSelectedProvince(null);
    }
  };

  const handleSelectProvince = (province: ProvinceData | null) => {
    setSelectedProvince(province);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
          <p className="font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <p className="text-xl font-bold text-slate-900">{error || 'ไม่พบข้อมูล'}</p>
          <button 
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="h-1.5 w-full flex">
          <div className="h-full w-full bg-[#EF3340]"></div>
          <div className="h-full w-full bg-white"></div>
          <div className="h-full w-[200%] bg-[#00247D]"></div>
          <div className="h-full w-full bg-white"></div>
          <div className="h-full w-full bg-[#EF3340]"></div>
        </div>
        
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              {data.electionName}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              อัปเดตล่าสุด: {new Date(data.lastUpdated).toLocaleTimeString('th-TH')}
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Vote size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">ผู้มาใช้สิทธิ</p>
                <p className="text-xl font-bold text-slate-900">{formatNumber(stats.totalVotes)}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <PieChart size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">ร้อยละการใช้สิทธิ</p>
                <p className="text-xl font-bold text-slate-900">{formatPercent(stats.turnoutPercentage)}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">พรรคนำ</p>
                <div className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: stats.leadingParty?.color || '#ccc' }}
                  />
                  <p className="text-xl font-bold text-slate-900 truncate max-w-[120px]">
                    {stats.leadingParty?.name || '-'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <MapIcon size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500">จังหวัดรายงานผล</p>
                <p className="text-xl font-bold text-slate-900">{stats.provincesReported}/{stats.totalProvinces}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <ThailandMap
              provinceData={data.provinces}
              selectedRegion={selectedRegion}
              onSelectRegion={handleSelectRegion}
              onSelectProvince={handleSelectProvince}
            />
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-[340px]">
              <h3 className="text-base font-bold text-slate-800 mb-2">สรุปจำนวนที่นั่ง (Top 8)</h3>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart
                  layout="vertical"
                  data={stats?.partySeats.slice(0, 8) || []}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="seats" radius={[0, 4, 4, 0]} barSize={18}>
                    {stats?.partySeats.slice(0, 8).map((entry) => (
                      <Cell key={`party-${entry.name}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {selectedProvince && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{selectedProvince.provinceNameTh}</h3>
                    <p className="text-xs text-slate-500">{selectedProvince.regionNameTh} • {selectedProvince.districtCount} เขต</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">มาใช้สิทธิ</p>
                    <p className={`text-base font-bold ${
                      selectedProvince.turnoutPercentage >= 75 ? 'text-green-600' : 'text-slate-700'
                    }`}>
                      {formatPercent(selectedProvince.turnoutPercentage)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedProvince.partyResults
                    .sort((a, b) => b.seatsWon - a.seatsWon || b.voteCount - a.voteCount)
                    .slice(0, 4)
                    .map((party) => (
                      <div key={party.partyId} className="flex items-center gap-2">
                        <div className="w-1 h-8 rounded-full" style={{ backgroundColor: party.partyColor }}></div>
                        <div className="flex-grow min-w-0">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-slate-800 truncate">{party.partyNameTh}</span>
                            <span className="font-bold text-slate-900 ml-2">{party.seatsWon} ที่นั่ง</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full rounded-full" 
                              style={{ 
                                width: `${Math.min(party.percentage, 100)}%`,
                                backgroundColor: party.partyColor 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {!selectedProvince && (
               <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center flex flex-col items-center justify-center h-[300px] text-blue-800">
                 <MapIcon size={40} className="mb-3 text-blue-300" />
                 <p className="font-medium">คลิกจังหวัดในแผนที่</p>
                 <p className="text-sm text-blue-600 mt-1">เพื่อดูผลคะแนนรายจังหวัด</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
        <p className="font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResultsPageContent />
    </Suspense>
  );
}
