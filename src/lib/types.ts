export type VoteChoice = 'juristic' | 'municipality';
export type BallotStatus = 'submitted' | 'verified' | 'rejected';
export type DocType = 'house_registration' | 'proxy_letter' | 'id_card_owner' | 'id_card_proxy';
export type AdminRole = 'admin' | 'reviewer';

export interface Household {
  id: string;
  house_no: string;
  owner_name: string;
  invite_code: string;
  invite_expires_at: string | null;
  is_active: boolean;
  created_at: string;
  ballots?: { id: string; status: BallotStatus }[];
}

export interface Ballot {
  id: string;
  household_id: string;
  voter_name: string;
  is_proxy: boolean;
  proxy_name: string | null;
  choice: VoteChoice;
  status: BallotStatus;
  reject_reason: string | null;
  ip_address: string | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  household?: Pick<Household, 'house_no' | 'owner_name'>;
  documents?: VoteDocument[];
}

export interface VoteDocument {
  id: string;
  ballot_id: string;
  doc_type: DocType;
  file_path: string;
  file_name: string;
  uploaded_at: string;
}

export interface VoteConfig {
  id: string;
  vote_title: string;
  village_name: string;
  option_a_label: string;
  option_b_label: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface VoterSession {
  householdId: string;
  houseNo: string;
  ownerName: string;
}

export interface AdminSession {
  adminId: string;
  username: string;
  role: AdminRole;
}

export interface VoteResults {
  totalHouseholds: number;
  total: number;
  submitted: number;
  verified: number;
  rejected: number;
  juristic: number;
  municipality: number;
  abstain: number;
  follow_majority: number;
  juristic_pending: number;
  municipality_pending: number;
  abstain_pending: number;
  follow_majority_pending: number;
}
