import type {
  AdminReports,
  AdminStatus,
  ClaimRecord,
  DashboardStats,
  ItemRecord,
  MatchResultRecord,
} from './types';

async function requestJson<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Received an invalid response from the C backend.');
  }

  if (!res.ok) {
    const errMsg =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Request failed with status ${res.status}`;
    throw new Error(errMsg);
  }
  return data as T;
}

export const api = {
  getStats(): Promise<DashboardStats> {
    return requestJson<DashboardStats>('/api/dashboard/stats');
  },

  getFoundItems(token?: string | null): Promise<ItemRecord[]> {
    return requestJson<ItemRecord[]>('/api/found', {}, token);
  },

  getLostItems(token?: string | null): Promise<ItemRecord[]> {
    return requestJson<ItemRecord[]>('/api/lost', {}, token);
  },

  getFoundDetail(
    id: string,
    token?: string | null
  ): Promise<{ item: ItemRecord; possibleLostMatches: MatchResultRecord[] }> {
    return requestJson(`/api/found/${encodeURIComponent(id)}`, {}, token);
  },

  getMyLostReports(studentId: string): Promise<ItemRecord[]> {
    return requestJson<ItemRecord[]>(
      `/api/lost/mine?studentId=${encodeURIComponent(studentId)}`
    );
  },

  searchItems(params: {
    type: 'found' | 'lost';
    q?: string;
    category?: string;
    location?: string;
    status?: string;
    sort?: 'newest' | 'oldest';
  }): Promise<ItemRecord[]> {
    const sp = new URLSearchParams();
    sp.set('type', params.type);
    if (params.q) sp.set('q', params.q);
    if (params.category && params.category !== 'All') sp.set('category', params.category);
    if (params.location && params.location !== 'All') sp.set('location', params.location);
    if (params.status && params.status !== 'All') sp.set('status', params.status);
    if (params.sort) sp.set('sort', params.sort);
    return requestJson<ItemRecord[]>(`/api/search?${sp.toString()}`);
  },

  createLostItem(payload: {
    itemName: string;
    category: string;
    description: string;
    date: string;
    location: string;
    studentName: string;
    studentId: string;
    department: string;
    contact: string;
  }): Promise<{ item: ItemRecord; matches: MatchResultRecord[] }> {
    return requestJson('/api/lost', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createFoundItem(payload: {
    itemName: string;
    category: string;
    description: string;
    date: string;
    location: string;
    studentName: string;
    studentId: string;
    department: string;
    contact: string;
  }): Promise<{ item: ItemRecord; possibleLostMatches: MatchResultRecord[] }> {
    return requestJson('/api/found', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMatchesForLost(
    lostId: string
  ): Promise<{ lostItem: ItemRecord; matches: MatchResultRecord[] }> {
    return requestJson(`/api/matches/${encodeURIComponent(lostId)}`);
  },

  submitClaim(payload: {
    itemId: string;
    studentName: string;
    studentId: string;
    department: string;
    contact: string;
    ownershipProof: string;
  }): Promise<ClaimRecord> {
    return requestJson<ClaimRecord>('/api/claims', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getStudentClaims(studentId: string, status = 'All'): Promise<ClaimRecord[]> {
    const sp = new URLSearchParams({ studentId, status });
    return requestJson<ClaimRecord[]>(`/api/claims?${sp.toString()}`);
  },

  // Admin endpoints (require Bearer token held in memory)
  getAdminStatus(token?: string | null): Promise<AdminStatus> {
    return requestJson<AdminStatus>('/api/admin/status', {}, token);
  },

  setupAdmin(payload: {
    username: string;
    password: string;
  }): Promise<{ token: string; username: string; message: string }> {
    return requestJson('/api/admin/setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  loginAdmin(payload: {
    username: string;
    password: string;
  }): Promise<{ token: string; username: string }> {
    return requestJson('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  logoutAdmin(token: string): Promise<{ message: string }> {
    return requestJson('/api/admin/logout', { method: 'POST' }, token);
  },

  getAdminReports(token: string): Promise<AdminReports> {
    return requestJson<AdminReports>('/api/admin/reports', {}, token);
  },

  getAllClaimsAdmin(token: string, status = 'All'): Promise<ClaimRecord[]> {
    const sp = new URLSearchParams({ status });
    return requestJson<ClaimRecord[]>(`/api/claims?${sp.toString()}`, {}, token);
  },

  updateClaimStatus(
    token: string,
    claimId: string,
    claimStatus: string,
    adminNotes: string
  ): Promise<ClaimRecord> {
    return requestJson<ClaimRecord>(
      `/api/claims/${encodeURIComponent(claimId)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ claimStatus, adminNotes }),
      },
      token
    );
  },

  updateItemAdmin(
    token: string,
    type: 'lost' | 'found',
    itemId: string,
    payload: Partial<ItemRecord>
  ): Promise<ItemRecord> {
    return requestJson<ItemRecord>(
      `/api/${type}/${encodeURIComponent(itemId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      token
    );
  },

  deleteItemAdmin(
    token: string,
    type: 'lost' | 'found',
    itemId: string
  ): Promise<{ message: string }> {
    return requestJson(
      `/api/${type}/${encodeURIComponent(itemId)}`,
      { method: 'DELETE' },
      token
    );
  },
};
