import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = '/home/pobimgroup/thai-election-dashboard/data';

// Party logos mapping (scraped from กกต.)
interface PartyLogosMap {
  [partyName: string]: string;
}

// Constituency candidates data (scraped from กกต.)
interface ConstituencyCandidate {
  province: string;
  zone: number;
  candidateNumber: number;
  fullName: string;
  party: string;
}

interface ConstituencyCandidatesData {
  total_provinces: number;
  total_candidates: number;
  provinces: string[];
  candidates: ConstituencyCandidate[];
}

interface ProvinceZoneData {
  province_code: number;
  province_name: string;
  zone_list: string[];
}

interface ElectionDataRegion {
  regionName: string;
  totalVoters: number;
  districts: {
    name: string;
    province: string;
    voterCount: number;
    zoneDescription?: string;
    amphoeList?: string[];
  }[];
}

interface ElectionData {
  totalEligibleVoters: number;
  regions: ElectionDataRegion[];
}

const REGION_MAP: Record<string, { name: string; nameTh: string }> = {
  Bangkok: { name: 'Bangkok', nameTh: 'กรุงเทพมหานคร' },
  Central: { name: 'Central', nameTh: 'ภาคกลาง' },
  North: { name: 'North', nameTh: 'ภาคเหนือ' },
  Northeast: { name: 'Northeast', nameTh: 'ภาคตะวันออกเฉียงเหนือ' },
  South: { name: 'South', nameTh: 'ภาคใต้' },
};

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

async function seedRegions() {
  console.log('Seeding regions...');
  const regions = Object.entries(REGION_MAP).map(([key, value]) => ({
    id: key.toLowerCase(),
    name: value.name,
    nameTh: value.nameTh,
  }));

  for (const region of regions) {
    await prisma.region.upsert({
      where: { id: region.id },
      update: region,
      create: region,
    });
  }
  console.log(`Created ${regions.length} regions`);
}

async function seedProvincesAndDistricts() {
  console.log('Seeding provinces and districts...');

  const provinceZonesRaw = readFileSync(join(DATA_DIR, 'province_zones.json'), 'utf-8');
  const provinceZones: { data_list: ProvinceZoneData[] } = JSON.parse(provinceZonesRaw);

  const electionDataRaw = readFileSync(join(DATA_DIR, 'election-data-from-wevis.json'), 'utf-8');
  const electionData: ElectionData = JSON.parse(electionDataRaw);

  const districtsByProvince = new Map<string, ElectionDataRegion['districts']>();
  const regionByProvince = new Map<string, string>();

  for (const region of electionData.regions) {
    for (const district of region.districts) {
      const existing = districtsByProvince.get(district.province) || [];
      existing.push(district);
      districtsByProvince.set(district.province, existing);
      regionByProvince.set(district.province, region.regionName.toLowerCase());
    }
  }

  let provinceCount = 0;
  let districtCount = 0;

  for (const pz of provinceZones.data_list) {
    const regionId = regionByProvince.get(pz.province_name) || 'central';

    const province = await prisma.province.upsert({
      where: { code: pz.province_code },
      update: {
        name: pz.province_name,
        nameTh: pz.province_name,
        regionId,
      },
      create: {
        code: pz.province_code,
        name: pz.province_name,
        nameTh: pz.province_name,
        regionId,
      },
    });
    provinceCount++;

    const provinceDistricts = districtsByProvince.get(pz.province_name) || [];

    for (let i = 0; i < pz.zone_list.length; i++) {
      const zoneNumber = i + 1;
      const zoneDescription = pz.zone_list[i] || '';
      const districtName = `${pz.province_name} เขต ${zoneNumber}`;
      
      const matchingDistrict = provinceDistricts.find(d => 
        d.name === districtName || d.name.includes(`เขต ${zoneNumber}`)
      );

      await prisma.district.upsert({
        where: {
          provinceId_zoneNumber: {
            provinceId: province.id,
            zoneNumber,
          },
        },
        update: {
          name: districtName,
          nameTh: districtName,
          zoneDescription: zoneDescription.replace(/\$/g, ', '),
          amphoeList: zoneDescription,
          voterCount: matchingDistrict?.voterCount || 0,
        },
        create: {
          provinceId: province.id,
          zoneNumber,
          name: districtName,
          nameTh: districtName,
          zoneDescription: zoneDescription.replace(/\$/g, ', '),
          amphoeList: zoneDescription,
          voterCount: matchingDistrict?.voterCount || 0,
        },
      });
      districtCount++;
    }
  }

  console.log(`Created ${provinceCount} provinces and ${districtCount} districts`);
}

async function seedDemoUsers() {
  console.log('Seeding demo users...');

  const demoUsers = [
    {
      id: 'super-admin-1',
      email: 'admin@election.go.th',
      passwordHash: hashPassword('admin123'),
      name: 'Super Admin',
      role: 'super_admin',
    },
    {
      id: 'regional-admin-bkk',
      email: 'regional.bkk@election.go.th',
      passwordHash: hashPassword('regional123'),
      name: 'Regional Admin Bangkok',
      role: 'regional_admin',
      scopeRegionId: 'bangkok',
    },
    {
      id: 'province-admin-bkk',
      email: 'province.bkk@election.go.th',
      passwordHash: hashPassword('province123'),
      name: 'Province Admin Bangkok',
      role: 'province_admin',
    },
    {
      id: 'district-official-1',
      email: 'district1.bkk@election.go.th',
      passwordHash: hashPassword('district123'),
      name: 'District Official BKK Zone 1',
      role: 'district_official',
    },
  ];

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }

  console.log(`Created ${demoUsers.length} demo users`);
}

async function seedDemoElection() {
  console.log('Seeding demo election...');

  const election = await prisma.election.upsert({
    where: { id: 'demo-election-2569' },
    update: { status: 'OPEN' },
    create: {
      id: 'demo-election-2569',
      name: 'General Election 2026',
      nameTh: 'การเลือกตั้งทั่วไป พ.ศ. 2569',
      description: 'การเลือกตั้งสมาชิกสภาผู้แทนราษฎร พ.ศ. 2569',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-01'),
      status: 'OPEN',
      hasPartyList: true,
      hasConstituency: true,
      hasReferendum: true,
    },
  });

  // Load party logos from scraped data
  const partyLogosPath = join(__dirname, 'party-logos.json');
  let partyLogos: PartyLogosMap = {};
  try {
    const partyLogosRaw = readFileSync(partyLogosPath, 'utf-8');
    partyLogos = JSON.parse(partyLogosRaw);
    console.log(`Loaded ${Object.keys(partyLogos).length} party logos`);
  } catch (err) {
    console.warn('Could not load party-logos.json, continuing without logos');
  }

  const getLogoUrl = (nameTh: string): string | undefined => {
    const shortName = nameTh.replace('พรรค', '');
    return partyLogos[shortName];
  };

  const parties = [
    { partyNumber: 1, name: 'Thai Sap Thawee Party', nameTh: 'พรรคไทยทรัพย์ทวี', abbreviation: 'TST', color: '#FFD700' },
    { partyNumber: 2, name: 'Phuea Chart Thai Party', nameTh: 'พรรคเพื่อชาติไทย', abbreviation: 'PCT', color: '#8B4513' },
    { partyNumber: 3, name: 'Mai Party', nameTh: 'พรรคใหม่', abbreviation: 'MAI', color: '#00CED1' },
    { partyNumber: 4, name: 'Miti Mai Party', nameTh: 'พรรคมิติใหม่', abbreviation: 'MTM', color: '#9932CC' },
    { partyNumber: 5, name: 'Ruam Jai Thai Party', nameTh: 'พรรครวมใจไทย', abbreviation: 'RJT', color: '#DC143C' },
    { partyNumber: 6, name: 'United Thai Nation Party', nameTh: 'พรรครวมไทยสร้างชาติ', abbreviation: 'UTN', color: '#FF0066' },
    { partyNumber: 7, name: 'Palang Wat Party', nameTh: 'พรรคพลวัต', abbreviation: 'PLW', color: '#4169E1' },
    { partyNumber: 8, name: 'Prachathipatai Mai Party', nameTh: 'พรรคประชาธิปไตยใหม่', abbreviation: 'PDM', color: '#32CD32' },
    { partyNumber: 9, name: 'Pheu Thai Party', nameTh: 'พรรคเพื่อไทย', abbreviation: 'PTP', color: '#E3000F' },
    { partyNumber: 10, name: 'Tang Lueak Mai Party', nameTh: 'พรรคทางเลือกใหม่', abbreviation: 'TLM', color: '#FF8C00' },
    { partyNumber: 11, name: 'Setthakit Party', nameTh: 'พรรคเศรษฐกิจ', abbreviation: 'SKT', color: '#228B22' },
    { partyNumber: 12, name: 'Seri Ruam Thai Party', nameTh: 'พรรคเสรีรวมไทย', abbreviation: 'SRT', color: '#4B0082' },
    { partyNumber: 13, name: 'Ruam Palang Prachachon Party', nameTh: 'พรรครวมพลังประชาชน', abbreviation: 'RPP', color: '#8B0000' },
    { partyNumber: 14, name: 'Thongthi Thai Party', nameTh: 'พรรคท้องที่ไทย', abbreviation: 'TTT', color: '#006400' },
    { partyNumber: 15, name: 'Anakot Thai Party', nameTh: 'พรรคอนาคตไทย', abbreviation: 'AKT', color: '#FF4500' },
    { partyNumber: 16, name: 'Palang Phuea Thai Party', nameTh: 'พรรคพลังเพื่อไทย', abbreviation: 'PPT', color: '#B22222' },
    { partyNumber: 17, name: 'Thai Chana Party', nameTh: 'พรรคไทยชนะ', abbreviation: 'TCN', color: '#1E90FF' },
    { partyNumber: 18, name: 'Palang Sangkhom Mai Party', nameTh: 'พรรคพลังสังคมใหม่', abbreviation: 'PSM', color: '#9ACD32' },
    { partyNumber: 19, name: 'Sangkhom Prachathipatai Thai Party', nameTh: 'พรรคสังคมประชาธิปไตยไทย', abbreviation: 'SPT', color: '#FF1493' },
    { partyNumber: 20, name: 'Fusion Party', nameTh: 'พรรคฟิวชัน', abbreviation: 'FUS', color: '#00BFFF' },
    { partyNumber: 21, name: 'Sai Ruam Palang Party', nameTh: 'พรรคไทรวมพลัง', abbreviation: 'SRP', color: '#8FBC8F' },
    { partyNumber: 22, name: 'Kao Itsara Party', nameTh: 'พรรคก้าวอิสระ', abbreviation: 'KIS', color: '#DA70D6' },
    { partyNumber: 23, name: 'Puang Chon Thai Party', nameTh: 'พรรคปวงชนไทย', abbreviation: 'PCN', color: '#CD853F' },
    { partyNumber: 24, name: 'Vision Mai Party', nameTh: 'พรรควิชชั่นใหม่', abbreviation: 'VSM', color: '#6A5ACD' },
    { partyNumber: 25, name: 'Phuea Chiwit Mai Party', nameTh: 'พรรคเพื่อชีวิตใหม่', abbreviation: 'PCM', color: '#20B2AA' },
    { partyNumber: 26, name: 'Klong Thai Party', nameTh: 'พรรคคลองไทย', abbreviation: 'KLT', color: '#0000CD' },
    { partyNumber: 27, name: 'Democrat Party', nameTh: 'พรรคประชาธิปัตย์', abbreviation: 'DP', color: '#1E90FF' },
    { partyNumber: 28, name: 'Thai Kao Na Party', nameTh: 'พรรคไทยก้าวหน้า', abbreviation: 'TKN', color: '#FF6347' },
    { partyNumber: 29, name: 'Thai Phakdi Party', nameTh: 'พรรคไทยภักดี', abbreviation: 'TPD', color: '#800000' },
    { partyNumber: 30, name: 'Raeng Ngan Sang Chat Party', nameTh: 'พรรคแรงงานสร้างชาติ', abbreviation: 'RSC', color: '#4682B4' },
    { partyNumber: 31, name: 'Prachakorn Thai Party', nameTh: 'พรรคประชากรไทย', abbreviation: 'PKT', color: '#2E8B57' },
    { partyNumber: 32, name: 'Khru Thai Phuea Prachachon Party', nameTh: 'พรรคครูไทยเพื่อประชาชน', abbreviation: 'KTP', color: '#D2691E' },
    { partyNumber: 33, name: 'Prachachat Party', nameTh: 'พรรคประชาชาติ', abbreviation: 'PCC', color: '#008080' },
    { partyNumber: 34, name: 'Sang Anakot Thai Party', nameTh: 'พรรคสร้างอนาคตไทย', abbreviation: 'SAT', color: '#FF69B4' },
    { partyNumber: 35, name: 'Rak Chat Party', nameTh: 'พรรครักชาติ', abbreviation: 'RKC', color: '#800080' },
    { partyNumber: 36, name: 'Thai Phrom Party', nameTh: 'พรรคไทยพร้อม', abbreviation: 'TPM', color: '#556B2F' },
    { partyNumber: 37, name: 'Bhumjaithai Party', nameTh: 'พรรคภูมิใจไทย', abbreviation: 'BJT', color: '#00529B' },
    { partyNumber: 38, name: 'Palang Tham Mai Party', nameTh: 'พรรคพลังธรรมใหม่', abbreviation: 'PTM', color: '#DAA520' },
    { partyNumber: 39, name: 'Green Party', nameTh: 'พรรคกรีน', abbreviation: 'GRN', color: '#228B22' },
    { partyNumber: 40, name: 'Thai Tham Party', nameTh: 'พรรคไทยธรรม', abbreviation: 'TTM', color: '#BDB76B' },
    { partyNumber: 41, name: 'Phaendin Tham Party', nameTh: 'พรรคแผ่นดินธรรม', abbreviation: 'PDT', color: '#8B4513' },
    { partyNumber: 42, name: 'Kla Tham Party', nameTh: 'พรรคกล้าธรรม', abbreviation: 'KLD', color: '#708090' },
    { partyNumber: 43, name: 'Palang Pracharath Party', nameTh: 'พรรคพลังประชารัฐ', abbreviation: 'PPRP', color: '#002D62' },
    { partyNumber: 44, name: 'Okas Mai Party', nameTh: 'พรรคโอกาสใหม่', abbreviation: 'OKM', color: '#00CED1' },
    { partyNumber: 45, name: 'Pen Tham Party', nameTh: 'พรรคเป็นธรรม', abbreviation: 'PNT', color: '#9370DB' },
    { partyNumber: 46, name: 'People\'s Party', nameTh: 'พรรคประชาชน', abbreviation: 'PP', color: '#FF6600' },
    { partyNumber: 47, name: 'Pracha Thai Party', nameTh: 'พรรคประชาไทย', abbreviation: 'PRT', color: '#A0522D' },
    { partyNumber: 48, name: 'Thai Sang Thai Party', nameTh: 'พรรคไทยสร้างไทย', abbreviation: 'TSS', color: '#228B22' },
    { partyNumber: 49, name: 'Thai Kao Mai Party', nameTh: 'พรรคไทยก้าวใหม่', abbreviation: 'TKM', color: '#FF7F50' },
    { partyNumber: 50, name: 'Pracha Asa Chat Party', nameTh: 'พรรคประชาอาสาชาติ', abbreviation: 'PAC', color: '#6B8E23' },
    { partyNumber: 51, name: 'Phrom Party', nameTh: 'พรรคพร้อม', abbreviation: 'PRM', color: '#483D8B' },
    { partyNumber: 52, name: 'Khruakhai Chaona Party', nameTh: 'พรรคเครือข่ายชาวนาแห่งประเทศไทย', abbreviation: 'KCN', color: '#9ACD32' },
    { partyNumber: 53, name: 'Ruam Palang Party', nameTh: 'พรรครวมพลัง', abbreviation: 'RPL', color: '#CD5C5C' },
    { partyNumber: 54, name: 'Khwam Wang Mai Party', nameTh: 'พรรคความหวังใหม่', abbreviation: 'KWM', color: '#7B68EE' },
    { partyNumber: 55, name: 'Raksa Tham Party', nameTh: 'พรรครักษ์ธรรม', abbreviation: 'RKT', color: '#3CB371' },
    { partyNumber: 56, name: 'Sammathippatai Party', nameTh: 'พรรคสัมมาธิปไตย', abbreviation: 'SMT', color: '#BC8F8F' },
    { partyNumber: 57, name: 'Phuea Ban Muang Party', nameTh: 'พรรคเพื่อบ้านเมือง', abbreviation: 'PBM', color: '#4682B4' },
    { partyNumber: 58, name: 'Palang Thai Rak Chat Party', nameTh: 'พรรคพลังไทยรักชาติ', abbreviation: 'PTR', color: '#B8860B' },
    { partyNumber: 59, name: 'Thai Ruam Thai Party', nameTh: 'พรรคไทยรวมไทย', abbreviation: 'TRT', color: '#8B008B' },
    { partyNumber: 60, name: 'Thai Pitak Tham Party', nameTh: 'พรรคไทยพิทักษ์ธรรม', abbreviation: 'TPT', color: '#556B2F' },
  ];

  for (const party of parties) {
    const logoUrl = getLogoUrl(party.nameTh);
    await prisma.party.upsert({
      where: { electionId_partyNumber: { electionId: election.id, partyNumber: party.partyNumber } },
      update: { ...party, logoUrl },
      create: {
        electionId: election.id,
        ...party,
        logoUrl,
      },
    });
  }

  await prisma.referendumQuestion.upsert({
    where: { electionId_questionNumber: { electionId: election.id, questionNumber: 1 } },
    update: {},
    create: {
      electionId: election.id,
      questionNumber: 1,
      questionTh: 'ท่านเห็นชอบหรือไม่ที่จะให้มีการแก้ไขรัฐธรรมนูญ พ.ศ. 2560',
      questionEn: 'Do you approve the amendment of the 2017 Constitution?',
      descriptionTh: 'การลงประชามติเพื่อแก้ไขรัฐธรรมนูญแห่งราชอาณาจักรไทย',
    },
  });

  console.log(`Created demo election with ${parties.length} parties and 1 referendum question`);

  console.log('Loading constituency candidates from scraped data...');
  
  const candidatesDataPath = join(__dirname, 'constituency-candidates-2569.json');
  const candidatesRaw = readFileSync(candidatesDataPath, 'utf-8');
  const candidatesData: ConstituencyCandidatesData = JSON.parse(candidatesRaw);
  
  console.log(`Loaded ${candidatesData.total_candidates} candidates from ${candidatesData.total_provinces} provinces`);

  const districts = await prisma.district.findMany({
    include: { province: true },
  });
  const partyList = await prisma.party.findMany({ where: { electionId: election.id } });
  
  const partyByNameTh = new Map<string, typeof partyList[0]>();
  for (const party of partyList) {
    const shortName = party.nameTh.replace('พรรค', '');
    partyByNameTh.set(shortName, party);
  }
  
  const districtMap = new Map<string, typeof districts[0]>();
  for (const district of districts) {
    const key = `${district.province.nameTh}-${district.zoneNumber}`;
    districtMap.set(key, district);
  }

  function parseThaiName(fullName: string): { titleTh: string; firstNameTh: string; lastNameTh: string } {
    const titles = ['นาย', 'นาง', 'นางสาว', 'พันเอก', 'พันโท', 'พันตรี', 'ร้อยเอก', 'ร้อยโท', 'ร้อยตรี', 
                    'พลเอก', 'พลโท', 'พลตรี', 'ดร.', 'ศ.', 'รศ.', 'ผศ.', 'พล.ต.อ.', 'พล.ต.ท.', 'พล.ต.ต.'];
    
    let titleTh = 'นาย';
    let remaining = fullName.trim();
    
    for (const title of titles) {
      if (remaining.startsWith(title)) {
        titleTh = title;
        remaining = remaining.substring(title.length).trim();
        break;
      }
    }
    
    const parts = remaining.split(/\s+/);
    const firstNameTh = parts[0] || '';
    const lastNameTh = parts.slice(1).join(' ') || '';
    
    return { titleTh, firstNameTh, lastNameTh };
  }

  let candidateCount = 0;
  let skippedCount = 0;
  
  for (const candidate of candidatesData.candidates) {
    const districtKey = `${candidate.province}-${candidate.zone}`;
    const district = districtMap.get(districtKey);
    
    if (!district) {
      skippedCount++;
      continue;
    }
    
    const party = partyByNameTh.get(candidate.party);
    if (!party) {
      skippedCount++;
      continue;
    }
    
    const { titleTh, firstNameTh, lastNameTh } = parseThaiName(candidate.fullName);
    
    await prisma.candidate.upsert({
      where: {
        electionId_districtId_candidateNumber: {
          electionId: election.id,
          districtId: district.id,
          candidateNumber: candidate.candidateNumber,
        },
      },
      update: {
        partyId: party.id,
        titleTh,
        firstNameTh,
        lastNameTh,
      },
      create: {
        electionId: election.id,
        districtId: district.id,
        partyId: party.id,
        candidateNumber: candidate.candidateNumber,
        titleTh,
        firstNameTh,
        lastNameTh,
        titleEn: titleTh === 'นาย' ? 'Mr.' : titleTh === 'นาง' ? 'Mrs.' : titleTh === 'นางสาว' ? 'Ms.' : titleTh,
        firstNameEn: firstNameTh,
        lastNameEn: lastNameTh,
      },
    });
    candidateCount++;
  }
  
  console.log(`Created ${candidateCount} constituency candidates (skipped ${skippedCount} due to missing district/party mapping)`);
}

async function main() {
  console.log('Starting seed...');
  console.log(`Data directory: ${DATA_DIR}`);

  await seedRegions();
  await seedProvincesAndDistricts();
  await seedDemoUsers();
  await seedDemoElection();

  const provinceCount = await prisma.province.count();
  const districtCount = await prisma.district.count();

  console.log('\n=== Seed Summary ===');
  console.log(`Provinces: ${provinceCount}`);
  console.log(`Districts: ${districtCount}`);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
