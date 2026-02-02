import { createHash } from 'crypto';
import type { ThaiDVerifyResponse } from '@election/shared';

const THAI_FIRST_NAMES = [
  'สมชาย', 'สมหญิง', 'วิชัย', 'วิภา', 'ประเสริฐ', 'ประภา',
  'สุรชัย', 'สุภา', 'เกียรติ', 'กัลยา', 'ณัฐ', 'นภา',
];

const THAI_LAST_NAMES = [
  'ใจดี', 'มั่นคง', 'เจริญ', 'สุขใจ', 'รักไทย', 'พัฒนา',
  'ศรีสุข', 'วงศ์ไทย', 'ทองดี', 'แสงทอง', 'สว่าง', 'มีชัย',
];

const PROVINCES = [
  { name: 'กรุงเทพมหานคร', maxZones: 33 },
  { name: 'นนทบุรี', maxZones: 8 },
  { name: 'ปทุมธานี', maxZones: 7 },
  { name: 'สมุทรปราการ', maxZones: 8 },
  { name: 'เชียงใหม่', maxZones: 10 },
  { name: 'ขอนแก่น', maxZones: 11 },
  { name: 'นครราชสีมา', maxZones: 16 },
  { name: 'สงขลา', maxZones: 9 },
];

function deterministicRandom(seed: string, max: number): number {
  const hash = createHash('md5').update(seed).digest('hex');
  const num = parseInt(hash.substring(0, 8), 16);
  return num % max;
}

function deterministicSelect<T>(seed: string, array: T[]): T {
  return array[deterministicRandom(seed, array.length)]!;
}

export function verifyThaiD(citizenId: string): ThaiDVerifyResponse | null {
  if (!/^\d{13}$/.test(citizenId)) {
    return null;
  }

  const gender = deterministicRandom(citizenId + 'gender', 2) === 0 ? 'M' : 'F';
  const titleTh = gender === 'M' ? 'นาย' : (deterministicRandom(citizenId + 'title', 2) === 0 ? 'นาง' : 'นางสาว');
  const titleEn = gender === 'M' ? 'Mr.' : (titleTh === 'นาง' ? 'Mrs.' : 'Miss');

  const firstNameTh = deterministicSelect(citizenId + 'first', THAI_FIRST_NAMES);
  const lastNameTh = deterministicSelect(citizenId + 'last', THAI_LAST_NAMES);

  const firstNameEn = `Firstname${citizenId.substring(0, 4)}`;
  const lastNameEn = `Lastname${citizenId.substring(4, 8)}`;

  const province = deterministicSelect(citizenId + 'province', PROVINCES);
  const zoneNumber = deterministicRandom(citizenId + 'zone', province.maxZones) + 1;

  const birthYear = 1960 + deterministicRandom(citizenId + 'year', 45);
  const birthMonth = deterministicRandom(citizenId + 'month', 12) + 1;
  const birthDay = deterministicRandom(citizenId + 'day', 28) + 1;
  const birthDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

  const districtId = `${province.name.toLowerCase().replace(/\s/g, '-')}-zone-${zoneNumber}`;

  return {
    citizenId,
    titleTh,
    firstNameTh,
    lastNameTh,
    titleEn,
    firstNameEn,
    lastNameEn,
    birthDate,
    gender,
    address: {
      houseNo: String(deterministicRandom(citizenId + 'house', 999) + 1),
      villageNo: String(deterministicRandom(citizenId + 'village', 20)),
      lane: '',
      road: '',
      subdistrict: 'ตำบลตัวอย่าง',
      district: 'อำเภอตัวอย่าง',
      province: province.name,
      postalCode: String(10000 + deterministicRandom(citizenId + 'postal', 90000)),
    },
    eligibleDistrictId: districtId,
    eligibleProvince: province.name,
  };
}
