
/**
 * Province Mapping Library
 * Central utility for Thai province/district/region data transformations
 */

// Define RegionFilter locally as it was imported from @/app/types in reference
export enum RegionFilter {
  ALL = 'ALL',
  BANGKOK = 'BANGKOK',
  CENTRAL = 'CENTRAL',
  NORTH = 'NORTH',
  NORTHEAST = 'NORTHEAST',
  SOUTH = 'SOUTH',
}

// ============================================================================
// Province Name Mappings (English <-> Thai)
// ============================================================================

export const PROVINCE_EN_TO_TH: Record<string, string> = {
  // Bangkok
  "Bangkok": "กรุงเทพมหานคร",
  "Bangkok Metropolis": "กรุงเทพมหานคร",

  // North (ภาคเหนือ) - 17 provinces
  "Chiang Rai": "เชียงราย",
  "Chiang Mai": "เชียงใหม่",
  "Nan": "น่าน",
  "Phayao": "พะเยา",
  "Phrae": "แพร่",
  "Mae Hong Son": "แม่ฮ่องสอน",
  "Lampang": "ลำปาง",
  "Lamphun": "ลำพูน",
  "Uttaradit": "อุตรดิตถ์",
  "Tak": "ตาก",
  "Sukhothai": "สุโขทัย",
  "Phitsanulok": "พิษณุโลก",
  "Phichit": "พิจิตร",
  "Phetchabun": "เพชรบูรณ์",
  "Kamphaeng Phet": "กำแพงเพชร",
  "Nakhon Sawan": "นครสวรรค์",
  "Uthai Thani": "อุทัยธานี",

  // Northeast (ภาคอีสาน) - 20 provinces
  "Kalasin": "กาฬสินธุ์",
  "Khon Kaen": "ขอนแก่น",
  "Chaiyaphum": "ชัยภูมิ",
  "Nakhon Phanom": "นครพนม",
  "Nakhon Ratchasima": "นครราชสีมา",
  "Bueng Kan": "บึงกาฬ",
  "Buri Ram": "บุรีรัมย์",
  "Maha Sarakham": "มหาสารคาม",
  "Mukdahan": "มุกดาหาร",
  "Yasothon": "ยโสธร",
  "Roi Et": "ร้อยเอ็ด",
  "Loei": "เลย",
  "Sakon Nakhon": "สกลนคร",
  "Surin": "สุรินทร์",
  "Si Sa Ket": "ศรีสะเกษ",
  "Nong Khai": "หนองคาย",
  "Nong Bua Lam Phu": "หนองบัวลำภู",
  "Udon Thani": "อุดรธานี",
  "Ubon Ratchathani": "อุบลราชธานี",
  "Amnat Charoen": "อำนาจเจริญ",

  // Central (ภาคกลาง) - 26 provinces
  "Chai Nat": "ชัยนาท",
  "Nakhon Nayok": "นครนายก",
  "Nakhon Pathom": "นครปฐม",
  "Nonthaburi": "นนทบุรี",
  "Pathum Thani": "ปทุมธานี",
  "Phra Nakhon Si Ayutthaya": "พระนครศรีอยุธยา",
  "Lop Buri": "ลพบุรี",
  "Samut Prakan": "สมุทรปราการ",
  "Samut Songkhram": "สมุทรสงคราม",
  "Samut Sakhon": "สมุทรสาคร",
  "Sing Buri": "สิงห์บุรี",
  "Suphan Buri": "สุพรรณบุรี",
  "Saraburi": "สระบุรี",
  "Ang Thong": "อ่างทอง",
  "Chanthaburi": "จันทบุรี",
  "Chachoengsao": "ฉะเชิงเทรา",
  "Chon Buri": "ชลบุรี",
  "Trat": "ตราด",
  "Prachin Buri": "ปราจีนบุรี",
  "Rayong": "ระยอง",
  "Sa Kaeo": "สระแก้ว",
  "Kanchanaburi": "กาญจนบุรี",
  "Prachuap Khiri Khan": "ประจวบคีรีขันธ์",
  "Phetchaburi": "เพชรบุรี",
  "Ratchaburi": "ราชบุรี",

  // South (ภาคใต้) - 14 provinces
  "Krabi": "กระบี่",
  "Chumphon": "ชุมพร",
  "Trang": "ตรัง",
  "Nakhon Si Thammarat": "นครศรีธรรมราช",
  "Narathiwat": "นราธิวาส",
  "Pattani": "ปัตตานี",
  "Phangnga": "พังงา",
  "Phatthalung": "พัทลุง",
  "Phuket": "ภูเก็ต",
  "Yala": "ยะลา",
  "Ranong": "ระนอง",
  "Songkhla": "สงขลา",
  "Satun": "สตูล",
  "Surat Thani": "สุราษฎร์ธานี"
};

// Reverse mapping: Thai -> English
export const PROVINCE_TH_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(PROVINCE_EN_TO_TH).map(([en, th]) => [th, en])
);

// ============================================================================
// Province to Region Mapping
// ============================================================================

export const PROVINCE_TO_REGION: Record<string, RegionFilter> = {
  // Bangkok
  "Bangkok": RegionFilter.BANGKOK,
  "Bangkok Metropolis": RegionFilter.BANGKOK,
  "กรุงเทพมหานคร": RegionFilter.BANGKOK,

  // North
  ...Object.fromEntries([
    "Chiang Rai", "Chiang Mai", "Nan", "Phayao", "Phrae", "Mae Hong Son",
    "Lampang", "Lamphun", "Uttaradit", "Tak", "Sukhothai", "Phitsanulok",
    "Phichit", "Phetchabun", "Kamphaeng Phet", "Nakhon Sawan", "Uthai Thani",
    "เชียงราย", "เชียงใหม่", "น่าน", "พะเยา", "แพร่", "แม่ฮ่องสอน",
    "ลำปาง", "ลำพูน", "อุตรดิตถ์", "ตาก", "สุโขทัย", "พิษณุโลก",
    "พิจิตร", "เพชรบูรณ์", "กำแพงเพชร", "นครสวรรค์", "อุทัยธานี"
  ].map(p => [p, RegionFilter.NORTH])),

  // Northeast
  ...Object.fromEntries([
    "Kalasin", "Khon Kaen", "Chaiyaphum", "Nakhon Phanom", "Nakhon Ratchasima",
    "Bueng Kan", "Buri Ram", "Maha Sarakham", "Mukdahan", "Yasothon",
    "Roi Et", "Loei", "Sakon Nakhon", "Surin", "Si Sa Ket", "Nong Khai",
    "Nong Bua Lam Phu", "Udon Thani", "Ubon Ratchathani", "Amnat Charoen",
    "กาฬสินธุ์", "ขอนแก่น", "ชัยภูมิ", "นครพนม", "นครราชสีมา",
    "บึงกาฬ", "บุรีรัมย์", "มหาสารคาม", "มุกดาหาร", "ยโสธร",
    "ร้อยเอ็ด", "เลย", "สกลนคร", "สุรินทร์", "ศรีสะเกษ", "หนองคาย",
    "หนองบัวลำภู", "อุดรธานี", "อุบลราชธานี", "อำนาจเจริญ"
  ].map(p => [p, RegionFilter.NORTHEAST])),

  // Central
  ...Object.fromEntries([
    "Chai Nat", "Nakhon Nayok", "Nakhon Pathom", "Nonthaburi", "Pathum Thani",
    "Phra Nakhon Si Ayutthaya", "Lop Buri", "Samut Prakan", "Samut Songkhram",
    "Samut Sakhon", "Sing Buri", "Suphan Buri", "Saraburi", "Ang Thong",
    "Chanthaburi", "Chachoengsao", "Chon Buri", "Trat", "Prachin Buri",
    "Rayong", "Sa Kaeo", "Kanchanaburi", "Prachuap Khiri Khan", "Phetchaburi", "Ratchaburi",
    "ชัยนาท", "นครนายก", "นครปฐม", "นนทบุรี", "ปทุมธานี",
    "พระนครศรีอยุธยา", "ลพบุรี", "สมุทรปราการ", "สมุทรสงคราม",
    "สมุทรสาคร", "สิงห์บุรี", "สุพรรณบุรี", "สระบุรี", "อ่างทอง",
    "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ตราด", "ปราจีนบุรี",
    "ระยอง", "สระแก้ว", "กาญจนบุรี", "ประจวบคีรีขันธ์", "เพชรบุรี", "ราชบุรี"
  ].map(p => [p, RegionFilter.CENTRAL])),

  // South
  ...Object.fromEntries([
    "Krabi", "Chumphon", "Trang", "Nakhon Si Thammarat", "Narathiwat",
    "Pattani", "Phangnga", "Phatthalung", "Phuket", "Yala", "Ranong",
    "Songkhla", "Satun", "Surat Thani",
    "กระบี่", "ชุมพร", "ตรัง", "นครศรีธรรมราช", "นราธิวาส",
    "ปัตตานี", "พังงา", "พัทลุง", "ภูเก็ต", "ยะลา", "ระนอง",
    "สงขลา", "สตูล", "สุราษฎร์ธานี"
  ].map(p => [p, RegionFilter.SOUTH]))
};

// ============================================================================
// Region Display Names
// ============================================================================

export const REGION_NAMES_TH: Record<string, string> = {
  [RegionFilter.ALL]: 'ทั้งหมด',
  [RegionFilter.BANGKOK]: 'กรุงเทพฯ',
  [RegionFilter.CENTRAL]: 'ภาคกลาง',
  [RegionFilter.NORTH]: 'ภาคเหนือ',
  [RegionFilter.NORTHEAST]: 'ภาคอีสาน',
  [RegionFilter.SOUTH]: 'ภาคใต้'
};

export const REGION_NAMES_EN: Record<string, string> = {
  [RegionFilter.ALL]: 'All',
  [RegionFilter.BANGKOK]: 'Bangkok',
  [RegionFilter.CENTRAL]: 'Central',
  [RegionFilter.NORTH]: 'North',
  [RegionFilter.NORTHEAST]: 'Northeast',
  [RegionFilter.SOUTH]: 'South'
};

// ============================================================================
// Region Colors
// ============================================================================

export const REGION_COLORS: Record<string, string> = {
  [RegionFilter.BANGKOK]: "#F87171",   // Red
  [RegionFilter.CENTRAL]: "#60A5FA",   // Blue
  [RegionFilter.NORTH]: "#34D399",     // Green
  [RegionFilter.NORTHEAST]: "#FBBF24", // Yellow
  [RegionFilter.SOUTH]: "#818CF8",     // Purple
  "Default": "#E5E7EB"
};

// Chart colors (ordered for consistent display)
export const CHART_COLORS = ['#F87171', '#60A5FA', '#34D399', '#FBBF24', '#818CF8', '#82ca9d'];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert English province name to Thai
 */
export function toThaiProvince(englishName: string): string {
  return PROVINCE_EN_TO_TH[englishName] || englishName;
}

/**
 * Convert Thai province name to English
 */
export function toEnglishProvince(thaiName: string): string {
  return PROVINCE_TH_TO_EN[thaiName] || thaiName;
}

/**
 * Get region from province name (accepts both Thai and English)
 */
export function getRegion(provinceName: string): RegionFilter {
  return PROVINCE_TO_REGION[provinceName] || RegionFilter.CENTRAL;
}

/**
 * Get Thai region name
 */
export function getRegionNameTh(region: string): string {
  return REGION_NAMES_TH[region] || region;
}

/**
 * Get region color
 */
export function getRegionColor(region: string): string {
  return REGION_COLORS[region] || REGION_COLORS["Default"];
}

/**
 * Get turnout color based on percentage
 */
export function getTurnoutColor(percentage: number): string {
  if (percentage >= 80) return "#059669"; // Green
  if (percentage >= 75) return "#3B82F6"; // Blue
  if (percentage >= 70) return "#F59E0B"; // Yellow
  return "#EF4444"; // Red
}

/**
 * Get turnout level label
 */
export function getTurnoutLevel(percentage: number): { label: string; labelTh: string; color: string } {
  if (percentage >= 80) return { label: 'High', labelTh: 'สูง', color: 'text-green-600' };
  if (percentage >= 75) return { label: 'Good', labelTh: 'ดี', color: 'text-blue-600' };
  if (percentage >= 70) return { label: 'Medium', labelTh: 'ปานกลาง', color: 'text-yellow-600' };
  return { label: 'Low', labelTh: 'ต่ำ', color: 'text-red-600' };
}

/**
 * Format number with Thai locale
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('th-TH');
}

/**
 * Format percentage
 */
export function formatPercent(num: number, decimals: number = 2): string {
  return `${num.toFixed(decimals)}%`;
}
