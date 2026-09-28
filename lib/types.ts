export type CustomerStatus = 'Active' | 'Monitoring' | 'Escalated';

export interface Message {
  id: string;
  speaker: 'customer' | 'agent';
  text: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  customerId: string;
  summary: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  priority: 'low' | 'medium' | 'high';
  messages: Message[];
}

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  status: CustomerStatus;
  lastInteraction: string;
  openIssue: string;
  environment: string[];
  issues: string[];
  preferences: string[];
  tickets: Ticket[];
}

export interface HindsightMemoryResult {
  id: string;
  text: string;
  type?: string | null;
  context?: string | null;
  document_id?: string | null;
  occurred_start?: string | null;
  occurred_end?: string | null;
  mentioned_at?: string | null;
  metadata?: Record<string, string> | null;
  entities?: string[] | null;
}

export interface SupportResponsePayload {
  response: string;
  mode: 'with-memory' | 'without-memory';
  memoryAvailable: boolean;
  memories: HindsightMemoryResult[];
  error?: string;
}
