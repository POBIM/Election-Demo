# Thai Dashboard - Code Examples for Election Demo

## 1. HOW THE THAILAND MAP WORKS

### The Component API
```typescript
// In your dashboard page:
import { ThailandMap } from './components/ThailandMap';
import { RegionData } from './types';

const [selectedRegion, setSelectedRegion] = useState<string>('All');
const [regionStats, setRegionStats] = useState<RegionData[]>([]);

// Render:
<ThailandMap
  regionStats={regionStats}              // Your election data by region
  selectedRegion={selectedRegion}        // Current selected region filter
  onSelectRegion={setSelectedRegion}     // Called when user clicks province
  simulationResult={null}                // Optional: simulation results
/>
```

### What Happens When You Click a Province
1. User clicks on a province (e.g., "Bangkok")
2. `onSelectRegion` callback fires with region name
3. You update selectedRegion state
4. Component filters the dashboard to show only that region
5. Map highlights the selected region with different color

### The Three View Modes
```typescript
// View 1: By Party (ตามพรรค)
// Color = Winning party color (red for Pheu Thai, orange for People's Party, etc)
// Uses: getProvinceWinningParty(provinceName)

// View 2: By Region (ตามภาค)  
// Color = Region color (Bangkok=Red, Central=Blue, North=Green, etc)
// Uses: getRegionColor(region)

// View 3: By Turnout (ตาม % มาใช้สิทธิ)
// Color = Turnout percentage (Green for high, Red for low)
// Uses: getTurnoutColor(percentage)
```

### Map Data Flow Explained
```
regionStats: RegionData[] = [
  {
    regionName: 'Bangkok',
    totalVoters: 4500000,
    districts: [
      { name: 'Bangkok 1', voterCount: 150000, province: 'กรุงเทพมหานคร', ... },
      { name: 'Bangkok 2', voterCount: 140000, province: 'กรุงเทพมหานคร', ... },
      // ... 31 more Bangkok districts
    ]
  },
  {
    regionName: 'Central',
    totalVoters: 12500000,
    districts: [ ... ]
  },
  // ... North, Northeast, South
]

        ↓ (in ThailandMap component)

// Step 1: Aggregate by province
provinceData = aggregateByProvince(regionStats)
// Result: Map<string, ProvinceStats>
// "กรุงเทพมหานคร" → { totalEligible: 150+140+..., turnoutPercentage: 78.5, ... }

        ↓

// Step 2: For each province in the GeoJSON map
for (const province of geoGeometries) {
  const provinceThaiName = toThaiProvince(province.name)  // "Bangkok" → "กรุงเทพมหานคร"
  const stats = provinceData.get(provinceThaiName)
  const color = getFillColor(stats, viewMode)            // Get appropriate color
  
  // Render geography with color and click handler
  render Geography with color and onSelectRegion callback
}
```

---

## 2. HOW DATA AGGREGATION WORKS

### The aggregateByProvince Function (Key Function!)
```typescript
// From lib/provinceMapping.ts
export function aggregateByProvince(regionData: RegionData[]): Map<string, ProvinceStats> {
  const provinceMap = new Map<string, ProvinceStats>();

  // For each region (Bangkok, Central, North, Northeast, South)
  regionData.forEach(region => {
    // For each district in that region
    region.districts.forEach(district => {
      const provinceTh = district.province;  // "กรุงเทพมหานคร"
      
      // Create or get existing province entry
      if (!provinceMap.has(provinceTh)) {
        provinceMap.set(provinceTh, {
          nameTh: provinceTh,
          nameEn: toEnglishProvince(provinceTh),
          region: getRegion(provinceTh),
          totalEligible: 0,
          totalActual: 0,
          turnoutPercentage: 0,
          // ... other fields
        });
      }
      
      // Add this district's voters to province total
      const stats = provinceMap.get(provinceTh)!;
      stats.totalEligible += district.voterCount;
      stats.totalActual += district.actualVoters || 0;
    });
  });

  // Calculate turnout for each province
  provinceMap.forEach(stats => {
    stats.turnoutPercentage = (stats.totalActual / stats.totalEligible) * 100;
  });

  return provinceMap;
}

// Result: Map with 77 provinces, each with:
// - Total eligible voters
// - Total actual voters
// - Turnout percentage
// - Region classification
// - Thai/English names
```

### How to Use in Your Dashboard
```typescript
// In page.tsx:
const { regionStats, selectedRegion } = useMemo(() => {
  // ... filter data based on selectedRegion
  return { regionStats: filteredData, selectedRegion };
}, [data, selectedRegion]);

// Get province-level statistics
const provinceStats = useMemo(() => {
  return aggregateByProvince(regionStats);
}, [regionStats]);

// Now use it:
provinceStats.get("กรุงเทพมหานคร")  // → ProvinceStats with all Bangkok data
// Result: {
//   nameTh: "กรุงเทพมหานคร",
//   nameEn: "Bangkok",
//   region: "Bangkok",
//   totalEligible: 4500000,
//   totalActual: 3528000,
//   turnoutPercentage: 78.4,
//   districtCount: 33
// }
```

---

## 3. HOW CHARTS WORK

### Pie Chart (Voters by Region)
```typescript
import { VotersByRegionPie } from './components/Charts';

// In your dashboard:
<VotersByRegionPie data={regionStats} />

// What it does:
// 1. Takes regionStats (your RegionData[])
// 2. Aggregates by region using aggregateByRegion()
// 3. Creates pie chart showing voter distribution
// 4. Bangkok 8%, Central 24%, North 19%, Northeast 35%, South 14%
// 5. Each slice is clickable and shows tooltip with numbers
```

### Bar Chart (Top 10 Districts)
```typescript
import { TopDistrictsBar } from './components/Charts';

<TopDistrictsBar data={filteredDistricts} />

// What it does:
// 1. Takes flat district list
// 2. Can sort by voters OR turnout percentage
// 3. Shows top 10 with horizontal bars
// 4. Uses filter buttons to toggle view
// 5. Interactive tooltips show exact numbers
```

### Turnout Chart (by Region)
```typescript
import { TurnoutByRegionChart } from './components/Charts';

<TurnoutByRegionChart data={regionStats} />

// What it does:
// 1. Aggregates by region
// 2. Shows horizontal bar chart with turnout percentages
// 3. Colors change based on turnout (green/blue/yellow/red)
// 4. Sorted from highest to lowest turnout
// 5. Shows actual voter numbers in tooltip
```

### Distribution Histogram
```typescript
import { DistrictTurnoutDistribution } from './components/Charts';

<DistrictTurnoutDistribution data={districts} />

// What it does:
// 1. Groups districts by turnout ranges:
//    - 80%+ (Green)
//    - 75-79% (Blue)
//    - 70-74% (Yellow)
//    - <70% (Red)
// 2. Shows count of districts in each range
// 3. Helps visualize overall voter engagement
```

---

## 4. HOW TO FILTER DATA

### Regional Filtering Pattern (Used in Thai Dashboard)
```typescript
// In page.tsx:
const [selectedRegion, setSelectedRegion] = useState<string>('All');

const filteredDistricts = useMemo(() => {
  if (!data) return [];
  
  const all = data.regions.flatMap(r => r.districts);
  
  if (selectedRegion === 'All') {
    return all;  // Return all districts
  }
  
  // Filter to selected region only
  return data.regions
    .filter(r => r.regionName === selectedRegion)
    .flatMap(r => r.districts);
}, [data, selectedRegion]);

// Now pass to components:
<ThailandMap 
  regionStats={data.regions}
  selectedRegion={selectedRegion}
  onSelectRegion={setSelectedRegion}
/>

<TopDistrictsBar data={filteredDistricts} />  // Only shows selected region
<DistrictTable districts={filteredDistricts} />
```

### Search & Filter Pattern (DistrictTable)
```typescript
const [searchTerm, setSearchTerm] = useState('');

const filteredDistricts = districts.filter(d =>
  d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  d.province.toLowerCase().includes(searchTerm.toLowerCase())
);

// Renders searchable table with filtered results
```

---

## 5. HOW PROVINCE MAPPING WORKS

### The Mappings (Core of the System)
```typescript
// 1. English → Thai Province Names
const PROVINCE_EN_TO_TH = {
  "Bangkok": "กรุงเทพมหานคร",
  "Chiang Mai": "เชียงใหม่",
  "Bangkok": "กรุงเทพมหานคร",
  // ... 75 more
};

// 2. Province → Region
const PROVINCE_TO_REGION = {
  "Bangkok": "Bangkok",
  "กรุงเทพมหานคร": "Bangkok",  // Works both ways!
  "Chiang Mai": "North",
  "เชียงใหม่": "North",
  // ... all 77 provinces mapped to regions
};

// 3. Region → Color
const REGION_COLORS = {
  "Bangkok": "#F87171",      // Red
  "Central": "#60A5FA",      // Blue
  "North": "#34D399",        // Green
  "Northeast": "#FBBF24",    // Yellow
  "South": "#818CF8",        // Purple
};

// Usage:
const region = getRegion("Bangkok");           // → "Bangkok"
const color = getRegionColor(region);          // → "#F87171"
const thaiName = toThaiProvince("Chiang Mai"); // → "เชียงใหม่"
```

### Why This Matters
The TopoJSON map data has English province names, but your election data has Thai names. These mappings bridge that gap automatically.

---

## 6. STATS CARD COMPONENT

### Simple & Reusable
```typescript
import { StatsCard } from './components/StatsCard';
import { Users, Vote, TrendingUp } from 'lucide-react';

// Usage:
<StatsCard
  title="ผู้มีสิทธิเลือกตั้ง"
  value="52,195,920"
  icon={Users}
  colorClass="bg-blue-500"
/>

<StatsCard
  title="ร้อยละมาใช้สิทธิ"
  value="75.80%"
  icon={TrendingUp}
  trend="สูงกว่าเป้าหมาย"
  colorClass="bg-green-500"
/>

// Props:
interface StatsCardProps {
  title: string;                    // Label
  value: string | number;           // Main number
  icon: LucideIcon;                 // Icon from lucide-react
  trend?: string;                   // Optional subtitle (green text)
  colorClass?: string;              // Tailwind color (bg-blue-500, etc)
}
```

---

## 7. DISTRICT TABLE COMPONENT

### Features Explained
```typescript
import { DistrictTable } from './components/DistrictTable';

<DistrictTable districts={filteredDistricts} />

// Built-in features:
// 1. Search by district name, province, or zone description
// 2. Sortable columns (click header to sort)
// 3. Expandable rows (click "ดูเพิ่ม" for details)
// 4. Color-coded turnout percentage
// 5. Shows invalid votes & abstentions if available

// The component handles:
// - useEffect() for search/sort memoization
// - expandedRows set for managing expanded state
// - getTurnoutColor() for conditional styling
// - formatNumber() for locale-specific formatting
// - LocalStorage is NOT used (could add it)
```

---

## 8. COPY-PASTE: Import the Utilities

### Step 1: Copy the lib/provinceMapping.ts file entirely
It's 426 lines of pure, reusable utility functions with no external dependencies.

### Step 2: Use in your code
```typescript
import {
  PROVINCE_EN_TO_TH,
  PROVINCE_TO_REGION,
  REGION_COLORS,
  toThaiProvince,
  toEnglishProvince,
  getRegion,
  getRegionNameTh,
  getRegionColor,
  getTurnoutColor,
  aggregateByProvince,
  aggregateByRegion,
  getDistrictTurnout,
  formatNumber,
  formatPercent,
} from '@/lib/provinceMapping';

// Now use any of these functions in your components
const color = getTurnoutColor(78.5);  // "#3B82F6" (blue)
const thai = toThaiProvince("Bangkok");  // "กรุงเทพมหานคร"
const stats = aggregateByProvince(regionData);  // Map<string, ProvinceStats>
```

---

## 9. THE DATA FLOW (Complete Picture)

### End-to-End Data Journey
```
1. User visits dashboard
   ↓
2. useEffect fetches /api/election-data
   ↓
3. API returns ElectionData (5 regions × ~80 districts)
   ↓
4. setState(data)
   ↓
5. useMemo(filterBy Region) if selectedRegion !== "All"
   ↓
6. useMemo(aggregateByProvince) → ProvinceStats for each province
   ↓
7. Pass regionStats to components:
   - ThailandMap uses it to color provinces
   - Charts use it to render visualizations
   - DistrictTable displays individual districts
   ↓
8. User clicks a province on map
   ↓
9. onSelectRegion("Bangkok") called
   ↓
10. setSelectedRegion("Bangkok")
    ↓
11. Components re-render with filtered data
    ↓
12. User sees only Bangkok districts & updated charts
```

---

## 10. QUICK INTEGRATION GUIDE

### Minimal Working Example
```typescript
// pages/index.tsx (or app/page.tsx)
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ThailandMap } from './components/ThailandMap';
import { TopDistrictsBar, VotersByRegionPie } from './components/Charts';
import { StatsCard } from './components/StatsCard';
import { aggregateByProvince, aggregateByRegion } from '@/lib/provinceMapping';
import { ElectionData, RegionFilter } from './types';
import { Users } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<ElectionData | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>(RegionFilter.ALL);

  // Fetch data
  useEffect(() => {
    fetch('/api/election-data')
      .then(res => res.json())
      .then(data => setData(data));
  }, []);

  // Filter & aggregate
  const { regionStats, filteredDistricts, totalVoters } = useMemo(() => {
    if (!data) return { regionStats: [], filteredDistricts: [], totalVoters: 0 };
    
    let stats = data.regions;
    let districts = data.regions.flatMap(r => r.districts);
    
    if (selectedRegion !== RegionFilter.ALL) {
      stats = data.regions.filter(r => r.regionName === selectedRegion);
      districts = stats.flatMap(r => r.districts);
    }
    
    const total = stats.reduce((sum, r) => sum + r.totalVoters, 0);
    return { regionStats: stats, filteredDistricts: districts, totalVoters: total };
  }, [data, selectedRegion]);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Election Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatsCard
          title="Total Voters"
          value={totalVoters.toLocaleString()}
          icon={Users}
          colorClass="bg-blue-500"
        />
      </div>

      {/* Map & Chart */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <ThailandMap
          regionStats={regionStats}
          selectedRegion={selectedRegion}
          onSelectRegion={setSelectedRegion}
        />
        <VotersByRegionPie data={regionStats} />
      </div>

      {/* Top Districts */}
      <TopDistrictsBar data={filteredDistricts} />
    </div>
  );
}
```

That's it! You now have:
- ✅ Interactive Thailand map
- ✅ Region filtering
- ✅ Pie chart
- ✅ Top districts chart
- ✅ Stats cards

All with < 100 lines of code!

