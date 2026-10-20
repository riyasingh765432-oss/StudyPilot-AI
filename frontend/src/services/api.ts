export interface HealthCheckResponse {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
}

export interface StudyTask {
  id: number;
  user_id: number;
  title: string;
  subject: string;
  scheduled_date: string;
  estimated_minutes: number;
  completed: boolean;
  created_at: string;
}

export interface StudySession {
  id: number;
  user_id: number;
  subject: string;
  duration_minutes: number;
  completed_at: string;
}

export interface QuizAttempt {
  id: number;
  user_id: number;
  topic: string;
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  attempted_at: string;
}

export interface DocumentItem {
  id: number;
  user_id: number;
  original_filename: string;
  file_size: number | null;
  summary: string | null;
  has_text: boolean;
  created_at: string;
}

export interface DocumentDetail extends DocumentItem {
  extracted_text: string | null;
}

export interface DocumentSummaryResponse {
  document_id: number;
  original_filename: string;
  summary: string;
}

export interface AskResponse {
  question: string;
  answer: string;
  sources: string[];
  model: string;
}

export interface AIStatus {
  configured: boolean;
  model: string;
}

// Token storage key in localStorage for client persistence
const TOKEN_STORAGE_KEY = 'studypilot_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

/**
 * Universal fetch wrapper supporting both HttpOnly cookies and Bearer token headers,
 * with bounded timeout enforcement via AbortController.
 */
async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  headers.set('Accept', 'application/json');
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let activeSignal = controller.signal;
  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timeoutId);
      throw new Error('Request was cancelled.');
    }
    options.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Includes HttpOnly cookies
      signal: activeSignal,
    });
    return response;
  } catch (err: any) {
    if (err?.name === 'AbortError' || controller.signal.aborted) {
      if (options.signal?.aborted) {
        throw new Error('Request was cancelled.');
      }
      throw new Error(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s. The server or AI service took too long to respond. Please try again.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// -------------------------------------------------------------
// Health Check
// -------------------------------------------------------------

export async function checkBackendHealth(): Promise<HealthCheckResponse> {
  const response = await fetch('/api/health', {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Backend returned status ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// -------------------------------------------------------------
// Authentication APIs
// -------------------------------------------------------------

export async function apiRegister(name: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Registration failed. Please check your credentials.');
  }

  setStoredToken(data.access_token);
  return data;
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Invalid email or password.');
  }

  setStoredToken(data.access_token);
  return data;
}

export async function apiGetMe(): Promise<User> {
  const response = await fetchWithAuth('/api/auth/me', {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Unauthorized (${response.status})`);
  }

  return response.json();
}

export async function apiLogout(): Promise<void> {
  try {
    await fetchWithAuth('/api/auth/logout', { method: 'POST' });
  } finally {
    setStoredToken(null);
  }
}

// -------------------------------------------------------------
// Study Tasks APIs
// -------------------------------------------------------------

export async function apiGetTasks(): Promise<StudyTask[]> {
  const response = await fetchWithAuth('/api/tasks', { method: 'GET' });
  if (!response.ok) throw new Error('Failed to load study tasks.');
  return response.json();
}

export async function apiCreateTask(
  title: string,
  subject: string,
  scheduled_date: string,
  estimated_minutes: number = 30
): Promise<StudyTask> {
  const response = await fetchWithAuth('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, subject, scheduled_date, estimated_minutes }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to create study task.');
  return data;
}

export async function apiUpdateTask(
  taskId: number,
  updates: Partial<Pick<StudyTask, 'title' | 'subject' | 'scheduled_date' | 'estimated_minutes' | 'completed'>>
): Promise<StudyTask> {
  const response = await fetchWithAuth(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to update study task.');
  return data;
}

export async function apiDeleteTask(taskId: number): Promise<void> {
  const response = await fetchWithAuth(`/api/tasks/${taskId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete study task.');
}

// -------------------------------------------------------------
// Study Sessions APIs
// -------------------------------------------------------------

export async function apiGetSessions(): Promise<StudySession[]> {
  const response = await fetchWithAuth('/api/sessions', { method: 'GET' });
  if (!response.ok) throw new Error('Failed to load study sessions.');
  return response.json();
}

export async function apiCreateSession(subject: string, duration_minutes: number): Promise<StudySession> {
  const response = await fetchWithAuth('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ subject, duration_minutes }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to record study session.');
  return data;
}

// -------------------------------------------------------------
// Quiz Attempts APIs
// -------------------------------------------------------------

export async function apiGetQuizAttempts(): Promise<QuizAttempt[]> {
  const response = await fetchWithAuth('/api/quizzes', { method: 'GET' });
  if (!response.ok) throw new Error('Failed to load quiz attempts.');
  return response.json();
}

export async function apiCreateQuizAttempt(
  topic: string,
  total_questions: number,
  correct_answers: number
): Promise<QuizAttempt> {
  const response = await fetchWithAuth('/api/quizzes', {
    method: 'POST',
    body: JSON.stringify({ topic, total_questions, correct_answers }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to record quiz attempt.');
  return data;
}

// -------------------------------------------------------------
// Stage 3: Documents & AI APIs
// -------------------------------------------------------------

export async function apiGetAIStatus(): Promise<AIStatus> {
  const response = await fetchWithAuth('/api/ai/status', { method: 'GET' });
  if (!response.ok) throw new Error('Failed to fetch AI configuration status.');
  return response.json();
}

export async function apiGetDocuments(): Promise<DocumentItem[]> {
  const response = await fetchWithAuth('/api/documents', { method: 'GET' });
  if (!response.ok) throw new Error('Failed to load study documents.');
  return response.json();
}

export async function apiUploadDocument(file: File): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetchWithAuth('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to upload document.');
  }
  return data;
}

export async function apiGetDocumentDetail(documentId: number): Promise<DocumentDetail> {
  const response = await fetchWithAuth(`/api/documents/${documentId}`, { method: 'GET' });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to load document details.');
  }
  return data;
}

export async function apiDeleteDocument(documentId: number): Promise<void> {
  const response = await fetchWithAuth(`/api/documents/${documentId}`, { method: 'DELETE' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to delete document.');
  }
}

export async function apiSummarizeDocument(
  documentId: number,
  signal?: AbortSignal
): Promise<DocumentSummaryResponse> {
  const response = await fetchWithAuth(
    `/api/documents/${documentId}/summarize`,
    {
      method: 'POST',
      signal,
    },
    45000 // 45-second bounded client timeout for AI summary generation
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const defaultMsg =
      response.status === 503
        ? 'The Gemini AI model is currently experiencing high demand. Please try again shortly.'
        : response.status === 429
        ? 'Gemini API rate limit exceeded. Please wait a moment before trying again.'
        : `Failed to generate summary (HTTP ${response.status}).`;
    throw new Error(data.detail || defaultMsg);
  }
  return data;
}

export async function apiAskNotes(
  question: string,
  documentId?: number,
  signal?: AbortSignal
): Promise<AskResponse> {
  const response = await fetchWithAuth(
    '/api/notes/ask',
    {
      method: 'POST',
      body: JSON.stringify({ question, document_id: documentId }),
      signal,
    },
    45000 // 45-second bounded client timeout for AI Q&A inquiry
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const defaultMsg =
      response.status === 503
        ? 'The Gemini AI model is currently experiencing high demand. Please try again shortly.'
        : response.status === 429
        ? 'Gemini API rate limit exceeded. Please wait a moment before trying again.'
        : `Failed to process inquiry (HTTP ${response.status}).`;
    throw new Error(data.detail || defaultMsg);
  }
  return data;
}
