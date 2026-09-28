import type { Customer, HindsightMemoryResult, Ticket } from './types';

export function buildCustomerBankId(customerId: string): string {
  const prefix = process.env.HINDSIGHT_BANK_PREFIX || 'customer';
  return `${prefix}-${customerId}`;
}

export function buildTicketDocumentId(ticketId: string): string {
  return `ticket-${ticketId}`;
}

export function buildTicketText(ticket: Pick<Ticket, 'id' | 'customerId' | 'summary' | 'status' | 'createdAt' | 'messages'>): string {
  const lines = [
    `Ticket #${ticket.id}`,
    `Customer: ${ticket.customerId}`,
    `Summary: ${ticket.summary}`,
    `Status: ${ticket.status}`,
    `Created: ${ticket.createdAt}`,
    '',
    'Conversation:',
    ...ticket.messages.map((message) => `${message.speaker === 'customer' ? 'Customer' : 'Agent'} (${message.createdAt}): ${message.text}`),
  ];

  return lines.join('\n');
}

export function selectRelevantMemories(
  memories: HindsightMemoryResult[],
  query: string,
  customerId: string,
): HindsightMemoryResult[] {
  const normalized = query.toLowerCase();
  const scored = memories
    .filter((memory) => {
      const metadataCustomer = memory.metadata?.customer ?? memory.metadata?.customerId ?? '';
      return !customerId || metadataCustomer === customerId || metadataCustomer === '' || !metadataCustomer;
    })
    .map((memory) => {
      const text = `${memory.text} ${memory.context ?? ''} ${memory.metadata ? Object.values(memory.metadata).join(' ') : ''}`.toLowerCase();
      const score = [
        text.includes('deployment') && normalized.includes('deployment') ? 3 : 0,
        text.includes('memory') && normalized.includes('memory') ? 3 : 0,
        text.includes('production') && normalized.includes('production') ? 2 : 0,
        text.includes('config') && normalized.includes('config') ? 2 : 0,
        text.includes('business') && normalized.includes('business') ? 2 : 0,
        text.includes('container') && normalized.includes('container') ? 2 : 0,
        text.includes('failure') && normalized.includes('failure') ? 2 : 0,
      ].reduce((sum, value) => sum + value, 0);

      return { memory, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.memory);

  return scored.slice(0, 3);
}

export function createSupportReply({
  mode,
  customerName,
  issue,
  memories,
}: {
  mode: 'with-memory' | 'without-memory';
  customerName: string;
  issue: string;
  memories: HindsightMemoryResult[];
}): string {
  if (mode === 'without-memory') {
    return `I can help investigate this issue for ${customerName}. I’d start by checking the deployment logs, validating the latest config change, and confirming whether the application is hitting resource limits before we try any broader rollback.`;
  }

  const primary = memories[0];
  if (!primary) {
    return `I can help investigate this issue for ${customerName}. I do not have a relevant historical incident to rely on yet, so I would verify the current deployment configuration and runtime evidence before recommending a change.`;
  }

  const memoryText = primary.text;
  const memoryReference = primary.document_id ? primary.document_id.replace('ticket-', 'Ticket #') : 'previous ticket';

  return `I found a relevant historical incident: ${memoryReference}. The prior issue was described as "${memoryText}". I’d verify whether the current deployment is hitting the same conditions before repeating the previous fix, and I’d also check the release timing against ${customerName}'s preference for production changes outside business hours.`;
}

export function getRecentCustomerStatus(customer: Pick<Customer, 'tickets' | 'lastInteraction'>): string {
  return customer.tickets.length > 0 ? `${customer.tickets.length} open tickets` : 'No active tickets';
}
