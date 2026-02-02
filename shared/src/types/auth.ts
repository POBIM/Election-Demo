import type { UserRole, OfficialScope } from './rbac.js';

// ThaiD Mock Response
export interface ThaiDVerifyResponse {
  citizenId: string;
  titleTh: string;
  firstNameTh: string;
  lastNameTh: string;
  titleEn: string;
  firstNameEn: string;
  lastNameEn: string;
  birthDate: string;
  gender: 'M' | 'F';
  address: {
    houseNo: string;
    villageNo: string;
    lane: string;
    road: string;
    subdistrict: string;
    district: string;
    province: string;
    postalCode: string;
  };
  // Mapped to election district
  eligibleDistrictId: string;
  eligibleProvince: string;
}

// Auth User
export interface AuthUser {
  id: string;
  email?: string;
  citizenId?: string;
  name: string;
  role: UserRole;
  scope?: OfficialScope;
  eligibleDistrictId?: string;
}

// JWT Payload
export interface JWTPayload {
  sub: string; // user id
  role: UserRole;
  scope?: OfficialScope;
  iat: number;
  exp: number;
}

// Login requests
export interface VoterLoginRequest {
  citizenId: string;
}

export interface OfficialLoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}
