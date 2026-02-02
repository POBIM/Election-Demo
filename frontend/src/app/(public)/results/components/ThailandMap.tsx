'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import {
  toThaiProvince,
  getRegion,
  getRegionColor,
  getRegionNameTh,
  getTurnoutColor,
  formatNumber,
  formatPercent,
  RegionFilter,
  REGION_COLORS,
} from '@/lib/provinceMapping';

const GEO_URL = "https://raw.githubusercontent.com/markmarkoh/datamaps/master/src/js/data/tha.topo.json";

// Province centroid coordinates for labels (approximate)
const PROVINCE_CENTROIDS: Record<string, [number, number]> = {
  "Bangkok": [100.5, 13.75],
  "Nonthaburi": [100.5, 13.9],
  "Pathum Thani": [100.5, 14.0],
  "Samut Prakan": [100.6, 13.6],
  "Nakhon Pathom": [100.1, 13.8],
  "Chon Buri": [101.0, 13.3],
  "Rayong": [101.3, 12.7],
  "Chiang Mai": [98.9, 18.8],
  "Chiang Rai": [99.8, 19.9],
  "Nakhon Ratchasima": [102.1, 15.0],
  "Khon Kaen": [102.8, 16.4],
  "Udon Thani": [102.8, 17.4],
  "Ubon Ratchathani": [104.8, 15.2],
  "Buri Ram": [103.1, 14.9],
  "Songkhla": [100.5, 7.2],
  "Nakhon Si Thammarat": [99.9, 8.4],
  "Surat Thani": [99.3, 9.1],
  "Phuket": [98.4, 7.9],
};

type ViewMode = 'party' | 'region' | 'turnout';

export interface PartyResult {
  partyId: string;
  partyName: string;
  partyNameTh: string;
  partyColor: string;
  voteCount: number;
  percentage: number;
  seatsWon: number;
}

export interface ProvinceData {
  provinceId: number;
  provinceName: string;
  provinceNameTh: string;
  regionId: number;
  regionName: string;
  regionNameTh: string;
  districtCount: number;
  totalEligibleVoters: number;
  totalVotes: number;
  turnoutPercentage: number;
  partyResults: PartyResult[];
  winningParty: PartyResult | null;
}

interface ThailandMapProps {
  provinceData: ProvinceData[];
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  onSelectProvince: (province: ProvinceData | null) => void;
}

export const ThailandMap: React.FC<ThailandMapProps> = ({ 
  provinceData, 
  selectedRegion, 
  onSelectRegion,
  onSelectProvince 
}) => {
  const [geoData, setGeoData] = useState<object | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [tooltipContent, setTooltipContent] = useState<ProvinceData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('party');

  useEffect(() => {
    let isMounted = true;
    
    const loadGeoData = async () => {
      try {
        const response = await fetch(GEO_URL);
        if (!response.ok) {
          throw new Error('Failed to fetch map data');
        }
        const data = await response.json();
        
        if (isMounted && data && typeof data === 'object') {
          setGeoData(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load map data:', err);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    loadGeoData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const provinceMap = useMemo(() => {
    const map = new Map<string, ProvinceData>();
    provinceData.forEach(p => {
      map.set(p.provinceNameTh, p);
      // Also map English name if needed, but we mostly use Thai for lookup
    });
    return map;
  }, [provinceData]);

  const getFillColor = (provinceNameEn: string, provinceNameTh: string, isSelected: boolean): string => {
    if (!isSelected) return "#E5E7EB";

    const data = provinceMap.get(provinceNameTh);

    switch (viewMode) {
      case 'party': {
        return data?.winningParty?.partyColor || "#9CA3AF";
      }
      case 'turnout': {
        return data ? getTurnoutColor(data.turnoutPercentage) : "#9CA3AF";
      }
      case 'region':
      default: {
        const region = getRegion(provinceNameEn);
        return getRegionColor(region);
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden" style={{ height: '700px' }}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            แผนที่แสดงข้อมูลการเลือกตั้ง
          </h3>
          <p className="text-sm text-gray-500">
            คลิกที่จังหวัดเพื่อดูข้อมูลรายละเอียด
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['party', 'region', 'turnout'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`text-xs px-3 py-1 rounded transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {mode === 'party' ? 'ตามพรรค' : mode === 'region' ? 'ตามภาค' : 'ตาม % มาใช้สิทธิ'}
            </button>
          ))}
          {selectedRegion !== RegionFilter.ALL && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelectRegion(RegionFilter.ALL); }}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded ml-2"
            >
              รีเซ็ต
            </button>
          )}
        </div>
      </div>

      <div className="flex-grow flex gap-4">
        {/* Main Map */}
        <div className="flex-grow rounded-lg overflow-hidden relative bg-blue-50/10 flex items-center justify-center" style={{ minHeight: 0 }}>
          {hasError ? (
            <div className="text-red-400 text-sm flex flex-col items-center">
              <p>ไม่สามารถโหลดแผนที่ได้</p>
              <p className="text-xs mt-1 text-gray-400">(Map Data Unavailable)</p>
            </div>
          ) : isLoading || !geoData ? (
            <div className="text-gray-400 animate-pulse">กำลังโหลดแผนที่...</div>
          ) : (
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 950,
                center: [101.5, 4]
              }}
              className="w-full h-full"
              style={{ width: '100%', height: '100%' }}
              width={280}
              height={560}
            >
              <Geographies geography={geoData}>
                {({ geographies }: { geographies: any[] }) =>
                  geographies
                    .filter((geo: any) => geo.properties?.name)
                    .map((geo: any) => {
                      const provinceNameEn = geo.properties.name;
                      const provinceNameTh = toThaiProvince(provinceNameEn);
                      const region = getRegion(provinceNameEn);
                      const isSelected = selectedRegion === RegionFilter.ALL || selectedRegion === region;
                      const data = provinceMap.get(provinceNameTh);
                      const fillColor = getFillColor(provinceNameEn, provinceNameTh, isSelected);

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onMouseEnter={() => {
                            if (data) {
                              setTooltipContent(data);
                            }
                          }}
                          onMouseLeave={() => {
                            setTooltipContent(null);
                          }}
                          onClick={() => {
                            onSelectRegion(region);
                            onSelectProvince(data || null);
                          }}
                          style={{
                            default: {
                              fill: fillColor,
                              stroke: "#FFFFFF",
                              strokeWidth: 0.5,
                              outline: "none",
                              transition: "all 0.2s"
                            },
                            hover: {
                              fill: fillColor,
                              stroke: "#FFFFFF",
                              strokeWidth: 1,
                              outline: "none",
                              filter: "brightness(0.85)",
                              cursor: "pointer"
                            },
                            pressed: {
                              fill: fillColor,
                              outline: "none",
                              filter: "brightness(0.7)"
                            }
                          }}
                        />
                      );
                    })
                }
              </Geographies>

              {/* Province Labels with District Count */}
              {Object.entries(PROVINCE_CENTROIDS).map(([provinceName, coords]) => {
                const provinceNameTh = toThaiProvince(provinceName);
                const data = provinceMap.get(provinceNameTh);
                const region = getRegion(provinceName);
                const isSelected = selectedRegion === RegionFilter.ALL || selectedRegion === region;

                if (!data || !isSelected) return null;

                return (
                  <Marker key={provinceName} coordinates={coords}>
                    <circle r={8} fill="white" stroke="#374151" strokeWidth={0.5} opacity={0.9} />
                    <text
                      textAnchor="middle"
                      y={4}
                      style={{
                        fontFamily: "system-ui",
                        fill: "#1F2937",
                        fontSize: "8px",
                        fontWeight: "bold"
                      }}
                    >
                      {data.districtCount}
                    </text>
                  </Marker>
                );
              })}
            </ComposableMap>
          )}

          {/* Tooltip */}
          {tooltipContent && (
            <div className="absolute bottom-4 left-4 bg-gray-800 text-white text-xs px-4 py-3 rounded-lg shadow-lg pointer-events-none opacity-95 z-10 min-w-[250px]">
              <div className="font-semibold text-sm flex items-center gap-2">
                {tooltipContent.provinceNameTh}
                {viewMode === 'party' && tooltipContent.winningParty && (
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: tooltipContent.winningParty.partyColor, color: 'white' }}
                  >
                    {tooltipContent.winningParty.partyNameTh}
                  </span>
                )}
              </div>
              <div className="text-gray-400 text-xs mb-2">{tooltipContent.provinceName}</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-300">ภาค:</span>
                  <span>{tooltipContent.regionNameTh}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">เขตเลือกตั้ง:</span>
                  <span className="font-semibold text-yellow-400">{tooltipContent.districtCount} เขต</span>
                </div>
                {viewMode === 'party' && tooltipContent.partyResults && (
                  <div className="border-t border-gray-600 pt-1 mt-1">
                    <div className="text-gray-300 mb-1">ผลคะแนนนำ:</div>
                    {tooltipContent.partyResults.slice(0, 3).map((result) => (
                      <div key={result.partyId} className="flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: result.partyColor }}></span>
                          {result.partyNameTh}
                        </span>
                        <span>{formatPercent(result.percentage)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between mt-2 pt-1 border-t border-gray-600">
                  <span className="text-gray-300">ผู้มีสิทธิ:</span>
                  <span>{formatNumber(tooltipContent.totalEligibleVoters)} คน</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">มาใช้สิทธิ:</span>
                  <span>{formatNumber(tooltipContent.totalVotes)} คน</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">ร้อยละมาใช้สิทธิ:</span>
                  <span className={`font-semibold ${
                    tooltipContent.turnoutPercentage >= 75 ? 'text-green-400' :
                    tooltipContent.turnoutPercentage >= 70 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {formatPercent(tooltipContent.turnoutPercentage)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Legend */}
        <div className="w-[160px] flex-shrink-0 flex flex-col gap-2">
          <div className="bg-white/95 p-3 rounded-lg shadow-sm border border-gray-100 text-xs backdrop-blur-sm">
            <div className="font-semibold text-gray-700 mb-2">
              {viewMode === 'party' ? 'พรรคที่ชนะ' : viewMode === 'region' ? 'ภูมิภาค' : 'ร้อยละมาใช้สิทธิ'}
            </div>

            {viewMode === 'party' && (
              <div className="text-gray-500 text-xs italic">
                แสดงสีตามพรรคที่ได้คะแนนสูงสุดในแต่ละจังหวัด
              </div>
            )}

            {viewMode === 'turnout' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: "#059669" }}></div>
                  <span className="text-gray-600">80%+ (สูง)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: "#3B82F6" }}></div>
                  <span className="text-gray-600">75-79% (ดี)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: "#F59E0B" }}></div>
                  <span className="text-gray-600">70-74% (ปานกลาง)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: "#EF4444" }}></div>
                  <span className="text-gray-600">ต่ำกว่า 70%</span>
                </div>
              </div>
            )}

            {viewMode === 'region' && (
              <div className="space-y-1">
                {[
                  { key: RegionFilter.ALL, label: 'ทั้งหมด', color: 'gradient' },
                  { key: RegionFilter.BANGKOK, label: 'กรุงเทพฯ', color: REGION_COLORS[RegionFilter.BANGKOK] },
                  { key: RegionFilter.CENTRAL, label: 'ภาคกลาง', color: REGION_COLORS[RegionFilter.CENTRAL] },
                  { key: RegionFilter.NORTH, label: 'ภาคเหนือ', color: REGION_COLORS[RegionFilter.NORTH] },
                  { key: RegionFilter.NORTHEAST, label: 'ภาคอีสาน', color: REGION_COLORS[RegionFilter.NORTHEAST] },
                  { key: RegionFilter.SOUTH, label: 'ภาคใต้', color: REGION_COLORS[RegionFilter.SOUTH] },
                ].map((item, index) => (
                  <React.Fragment key={item.key}>
                    {index === 1 && <div className="border-t border-gray-200 my-1"></div>}
                    <button
                      type="button"
                      onClick={() => onSelectRegion(item.key)}
                      className={`flex items-center gap-2 w-full text-left p-1.5 rounded transition-all ${
                        selectedRegion === item.key
                          ? 'bg-blue-100 ring-1 ring-blue-400'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${item.color === 'gradient' ? 'bg-gradient-to-r from-green-400 via-yellow-400 to-purple-400' : ''}`}
                        style={item.color !== 'gradient' ? { backgroundColor: item.color } : undefined}
                      ></div>
                      <span className={`${selectedRegion === item.key ? 'font-bold text-blue-700' : 'text-gray-600'}`}>
                        {item.label}
                      </span>
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {selectedRegion !== RegionFilter.ALL && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-lg text-xs font-medium">
              กำลังแสดง: {getRegionNameTh(selectedRegion)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
