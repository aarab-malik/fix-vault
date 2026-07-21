const API_BASE = "/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function formatDetail(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) return String((item as { msg: unknown }).msg);
        return JSON.stringify(item);
      })
      .join("; ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new ApiError(
      "Cannot reach the FixVault API proxy. Check BACKEND_URL on the frontend host.",
      0
    );
  }
  if (!res.ok) {
    const raw = await res.text();
    let detail: unknown;
    try {
      detail = JSON.parse(raw).detail;
    } catch {
      detail = raw.trim() || null;
    }
    throw new ApiError(
      formatDetail(detail, res.statusText || `Request failed (${res.status})`),
      res.status
    );
  }
  return res.json();
}

export type User = {
  id: string;
  email: string;
  credentials_configured: boolean;
  openai_configured: boolean;
  pinecone_configured: boolean;
  openai_validated_at?: string;
  pinecone_validated_at?: string;
  openai_key_hint?: string;
  pinecone_key_hint?: string;
  openai_base_url?: string;
  pinecone_index_host?: string;
};

export type Attempt = {
  id?: string;
  action: string;
  result?: string;
  outcome: string;
};

export type IncidentSummary = {
  id: string;
  title: string;
  status: string;
  stop_code?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type IncidentDetail = IncidentSummary & {
  problem: string;
  environment?: string;
  error_messages?: string;
  root_cause?: string;
  final_fix?: string;
  original_notes: string;
  attempts: Attempt[];
};

export type IncidentDraft = {
  title: string;
  problem: string;
  environment?: string;
  error_messages?: string;
  root_cause?: string;
  final_fix?: string;
  status: string;
  tags: string[];
  attempts: Attempt[];
};

export type Citation = {
  incident_id: string;
  title: string;
  match_score: number;
  section: string;
  excerpt: string;
};

export const api = {
  signup: (email: string, password: string) =>
    request<User>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<User>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () => request<User>("/auth/me"),
  saveOpenAI: (openai_api_key: string, openai_base_url?: string) =>
    request<User>("/settings/openai", {
      method: "POST",
      body: JSON.stringify({ openai_api_key, openai_base_url: openai_base_url || null }),
    }),
  savePinecone: (pinecone_api_key: string, pinecone_index_host: string) =>
    request<User>("/settings/pinecone", {
      method: "POST",
      body: JSON.stringify({ pinecone_api_key, pinecone_index_host }),
    }),
  testOpenAI: () => request<{ ok: boolean; message: string }>("/settings/test/openai", { method: "POST" }),
  testPinecone: () => request<{ ok: boolean; message: string }>("/settings/test/pinecone", { method: "POST" }),
  clearCredentials: () => request<User>("/settings", { method: "DELETE" }),
  dashboard: () =>
    request<{
      total: number;
      unresolved: number;
      recent: IncidentSummary[];
      recurring_tags: { tag: string; count: number }[];
    }>("/incidents/dashboard"),
  listIncidents: (params?: { status?: string; tag?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.tag) q.set("tag", params.tag);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return request<{ items: IncidentSummary[]; total: number }>(`/incidents${qs ? `?${qs}` : ""}`);
  },
  draftIncident: (notes: string) =>
    request<IncidentDraft>("/incidents/draft", { method: "POST", body: JSON.stringify({ notes }) }),
  similarIncidents: (notes: string) =>
    request<{ incidents: { id: string; title: string; status: string; similarity: number; relevance: string }[] }>(
      "/incidents/similar",
      { method: "POST", body: JSON.stringify({ notes }) }
    ),
  createIncident: (data: IncidentDraft & { original_notes: string }) =>
    request<IncidentDetail>("/incidents", { method: "POST", body: JSON.stringify(data) }),
  getIncident: (id: string) => request<IncidentDetail>(`/incidents/${id}`),
  updateIncident: (id: string, data: Partial<IncidentDraft>) =>
    request<IncidentDetail>(`/incidents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteIncident: (id: string) => request<{ ok: boolean }>(`/incidents/${id}`, { method: "DELETE" }),
  ask: (question: string) =>
    request<{ answer: string; citations: Citation[]; failed_fix_warnings: string[] }>("/ask", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),
};
