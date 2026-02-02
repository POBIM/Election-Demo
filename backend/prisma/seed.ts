import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

const DATA_DIR = '/home/pobimgroup/thai-election-dashboard/data';

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
    where: { id: 'demo-election-2027' },
    update: { status: 'OPEN' },
    create: {
      id: 'demo-election-2027',
      name: 'General Election 2027',
      nameTh: 'การเลือกตั้งทั่วไป พ.ศ. 2570',
      description: 'Demo election for testing the system',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2027-12-31'),
      status: 'OPEN',
      hasPartyList: true,
      hasConstituency: true,
      hasReferendum: true,
    },
  });

  const parties = [
    { partyNumber: 1, name: 'Pheu Thai Party', nameTh: 'พรรคเพื่อไทย', abbreviation: 'PTP', color: '#E3000F' },
    { partyNumber: 2, name: 'Move Forward Party', nameTh: 'พรรคก้าวไกล', abbreviation: 'MFP', color: '#FF6600' },
    { partyNumber: 3, name: 'Bhumjaithai Party', nameTh: 'พรรคภูมิใจไทย', abbreviation: 'BJT', color: '#00529B' },
    { partyNumber: 4, name: 'Palang Pracharath Party', nameTh: 'พรรคพลังประชารัฐ', abbreviation: 'PPRP', color: '#002D62' },
    { partyNumber: 5, name: 'Democrat Party', nameTh: 'พรรคประชาธิปัตย์', abbreviation: 'DP', color: '#1E90FF' },
    { partyNumber: 6, name: 'United Thai Nation Party', nameTh: 'พรรครวมไทยสร้างชาติ', abbreviation: 'UTN', color: '#FF0066' },
    { partyNumber: 7, name: 'Chart Thai Pattana Party', nameTh: 'พรรคชาติไทยพัฒนา', abbreviation: 'CTP', color: '#4B0082' },
    { partyNumber: 8, name: 'Thai Sang Thai Party', nameTh: 'พรรคไทยสร้างไทย', abbreviation: 'TST', color: '#228B22' },
  ];

  for (const party of parties) {
    await prisma.party.upsert({
      where: { electionId_partyNumber: { electionId: election.id, partyNumber: party.partyNumber } },
      update: party,
      create: {
        electionId: election.id,
        ...party,
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

  console.log('Seeding demo candidates for ALL districts...');
  const districts = await prisma.district.findMany();
  const partyList = await prisma.party.findMany({ where: { electionId: election.id } });

  const candidateNames = [
    { titleTh: 'นาย', firstNameTh: 'สมชาย', lastNameTh: 'ใจดี' },
    { titleTh: 'นาง', firstNameTh: 'สมหญิง', lastNameTh: 'รักไทย' },
    { titleTh: 'นาย', firstNameTh: 'วิชัย', lastNameTh: 'พัฒนา' },
    { titleTh: 'นางสาว', firstNameTh: 'ปรียา', lastNameTh: 'สุขใจ' },
    { titleTh: 'นาย', firstNameTh: 'ประยุทธ์', lastNameTh: 'มั่นคง' },
    { titleTh: 'นาย', firstNameTh: 'ทักษิณ', lastNameTh: 'เจริญ' },
    { titleTh: 'นางสาว', firstNameTh: 'ยิ่งลักษณ์', lastNameTh: 'รุ่งเรือง' },
    { titleTh: 'นาย', firstNameTh: 'อภิสิทธิ์', lastNameTh: 'ประชาธิป' },
  ];

  let candidateCount = 0;
  for (const district of districts) {
    for (let i = 0; i < Math.min(partyList.length, 5); i++) {
      const party = partyList[i];
      const nameIndex = (candidateCount + i) % candidateNames.length;
      const name = candidateNames[nameIndex];
      
      await prisma.candidate.upsert({
        where: {
          electionId_districtId_candidateNumber: {
            electionId: election.id,
            districtId: district.id,
            candidateNumber: i + 1,
          },
        },
        update: {},
        create: {
          electionId: election.id,
          districtId: district.id,
          partyId: party.id,
          candidateNumber: i + 1,
          titleTh: name.titleTh,
          firstNameTh: name.firstNameTh,
          lastNameTh: name.lastNameTh,
          titleEn: name.titleTh === 'นาย' ? 'Mr.' : name.titleTh === 'นาง' ? 'Mrs.' : 'Ms.',
          firstNameEn: name.firstNameTh,
          lastNameEn: name.lastNameTh,
        },
      });
      candidateCount++;
    }
  }
  console.log(`Created ${candidateCount} demo candidates`);
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
