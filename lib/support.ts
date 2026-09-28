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

export function getRecentCustomerStatus(customer: Pick<Customer, 'tickets' | 'lastInteraction'>): string {
  return customer.tickets.length > 0 ? `${customer.tickets.length} open tickets` : 'No active tickets';
}
