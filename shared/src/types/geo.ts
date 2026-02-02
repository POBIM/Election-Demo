import type { TimestampFields } from './index.js';

// Region (ภาค)
export type RegionName = 'Bangkok' | 'Central' | 'North' | 'Northeast' | 'South';

export interface Region {
  id: string;
  name: RegionName;
  nameTh: string;
  provinceCount: number;
  districtCount: number;
}

// Province (จังหวัด)
export interface Province extends TimestampFields {
  id: string;
  code: number;
  name: string;
  nameTh: string;
  regionId: string;
  region?: Region;
  districtCount: number;
}

// District (เขตเลือกตั้ง - 400 เขต)
export interface District extends TimestampFields {
  id: string;
  provinceId: string;
  province?: Province;
  zoneNumber: number; // เขต 1, 2, 3...
  name: string; // "กรุงเทพมหานคร เขต 1"
  nameTh: string;
  zoneDescription: string; // รายละเอียดพื้นที่
  amphoeList: string[]; // รายชื่อ อำเภอ/เขต
  voterCount: number; // จำนวนผู้มีสิทธิ์
}

// Summary stats
export interface GeoStats {
  totalProvinces: number;
  totalDistricts: number;
  totalVoters: number;
  byRegion: {
    region: RegionName;
    provinces: number;
    districts: number;
    voters: number;
  }[];
}
