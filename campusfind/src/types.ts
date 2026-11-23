export type PageView =
  | 'home'
  | 'browse'
  | 'report-lost'
  | 'report-found'
  | 'claims'
  | 'about'
  | 'admin';

export const ITEM_CATEGORIES = [
  'Electronics',
  'ID Cards',
  'Books and Notes',
  'Bags',
  'Accessories',
  'Water Bottles',
  'Keys',
  'Other',
] as const;

export const CAMPUS_LOCATIONS = [
  'Main Library 2nd Floor',
  'Main Library Ground Floor',
  'Engineering Block A',
  'Engineering Block B Room 204',
  'Computer Science Lab 3',
  'Student Union Cafeteria',
  'Central Sports Complex',
  'Main Auditorium',
  'Hostel Block Gate',
] as const;

export interface ItemRecord {
  itemId: string;
  itemName: string;
  category: string;
  description: string;
  location: string;
  date: string;
  status: string;
  createdAt: string;
  studentName?: string;
  studentId?: string;
  department: string;
  contact: string;
}

export interface MatchResultRecord {
  item: ItemRecord;
  totalScore: number;
  nameScore: number;
  categoryScore: number;
  descriptionScore: number;
  locationScore: number;
  dateScore: number;
  tier: 'High Similarity' | 'Moderate Similarity' | 'Low Similarity' | string;
  reasons: string;
}

export interface ClaimRecord {
  claimId: string;
  itemId: string;
  itemName: string;
  studentId: string;
  studentName: string;
  department: string;
  contact: string;
  ownershipProof: string;
  claimStatus: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | string;
  adminNotes: string;
  createdAt: string;
}

export interface DashboardStats {
  totalLost: number;
  totalFound: number;
  itemsReturned: number;
  pendingClaims: number;
  activeLost: number;
  resolvedLost: number;
  availableFound: number;
  claimedFound: number;
  approvedClaims: number;
  rejectedClaims: number;
  completedClaims: number;
}

export interface AdminStatus {
  configured: boolean;
  authenticated: boolean;
  username: string;
}

export interface AdminReports {
  totalLost: number;
  totalFound: number;
  totalClaims: number;
  returnedCount: number;
  recoveryRatePercent: number;
  categoryBreakdown: {
    category: string;
    lostCount: number;
    foundCount: number;
  }[];
  recentActivity: {
    type: string;
    id: string;
    title: string;
    status: string;
    timestamp: string;
  }[];
}
