import { HindsightClient } from '@vectorize-io/hindsight-client';
import { buildCustomerBankId, buildTicketDocumentId, buildTicketText } from './support';
import type { HindsightMemoryResult, Ticket } from './types';

export interface HindsightRecallResult {
  available: boolean;
  results: HindsightMemoryResult[];
  error?: string;
}

export interface MemoryToStore {
  text: string;
  projectId?: string;
  caseId?: string;
  type?: 'resolution' | 'customer-preference' | 'project-decision' | 'incident-learning';
  context?: string;
  documentId?: string;
}

export class HindsightService {
  private client?: HindsightClient;

  constructor() {
    const baseUrl = process.env.HINDSIGHT_BASE_URL;
    if (!baseUrl) {
      return;
    }

    this.client = new HindsightClient({
      baseUrl,
      apiKey: process.env.HINDSIGHT_API_KEY,
    });
  }

  public get isConfigured(): boolean {
    return Boolean(this.client);
  }

  public async retainTicket(customerId: string, ticket: Ticket): Promise<{ success: boolean; reason?: string }> {
    if (!this.client) {
      return { success: false, reason: 'Hindsight is not configured. Add HINDSIGHT_BASE_URL to enable memory retention.' };
    }

    try {
      const bankId = buildCustomerBankId(customerId);
      const content = buildTicketText(ticket);
      await this.client.retain(bankId, content, {
        timestamp: new Date(ticket.createdAt),
        context: 'support ticket',
        metadata: {
          customer: customerId,
          customerId,
          ticketId: ticket.id,
          documentId: buildTicketDocumentId(ticket.id),
          source: 'support-ticket',
        },
        documentId: buildTicketDocumentId(ticket.id),
      });

      return { success: true };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown retain error';
      return { success: false, reason };
    }
  }

  public async storeMemory(customerId: string, memory: MemoryToStore): Promise<{ success: boolean; documentId?: string; reason?: string }> {
    if (!this.client) {
      return { success: false, reason: 'Hindsight is not configured. Set HINDSIGHT_BASE_URL to enable memory storage.' };
    }

    const text = memory.text.trim();
    if (!text) {
      return { success: false, reason: 'Memory text cannot be empty.' };
    }

    const documentId = memory.documentId ?? `memory-${memory.caseId ?? Date.now()}`;
    try {
      await this.client.retain(buildCustomerBankId(customerId), text, {
        timestamp: new Date(),
        context: memory.context ?? 'approved support memory',
        metadata: {
          customer: customerId,
          customerId,
          projectId: memory.projectId ?? '',
          caseId: memory.caseId ?? '',
          type: memory.type ?? 'incident-learning',
          source: 'supportmemory-approved-learning',
        },
        documentId,
      });
      return { success: true, documentId };
    } catch (error) {
      return { success: false, reason: error instanceof Error ? error.message : 'Unknown retain error' };
    }
  }

  public async recallCustomerMemory(customerId: string, question: string): Promise<HindsightRecallResult> {
    if (!this.client) {
      return { available: false, results: [] };
    }

    try {
      const response = await this.client.recall(buildCustomerBankId(customerId), question, {
        budget: 'mid',
        maxTokens: 250,
      });

      const results = (response.results ?? []).map((result) => ({
        id: result.id,
        text: result.text,
        type: result.type ?? null,
        context: result.context ?? null,
        document_id: result.document_id ?? null,
        occurred_start: result.occurred_start ?? null,
        occurred_end: result.occurred_end ?? null,
        mentioned_at: result.mentioned_at ?? null,
        metadata: result.metadata ?? {},
        entities: result.entities ?? null,
      }));

      return { available: true, results };
    } catch (error) {
      return {
        available: true,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown recall error',
      };
    }
  }

  public async retrieveMemories(customerId: string, message: string): Promise<HindsightRecallResult> {
    return this.recallCustomerMemory(customerId, message);
  }

  public async reflectCustomerMemory(customerId: string, issue: string): Promise<{ text?: string; available: boolean; error?: string }> {
    if (!this.client) {
      return { available: false };
    }

    try {
      const response = await this.client.reflect(buildCustomerBankId(customerId), issue, {
        budget: 'low',
      });

      return { available: true, text: response.text ?? '' };
    } catch (error) {
      return {
        available: true,
        error: error instanceof Error ? error.message : 'Unknown reflect error',
      };
    }
  }
}
