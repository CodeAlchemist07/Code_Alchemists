import { describe, expect, it } from 'vitest';
import { buildCustomerBankId, buildTicketDocumentId, buildTicketText, createSupportReply, selectRelevantMemories } from '../lib/support';

describe('SupportMemory memory flow', () => {
  it('retains ticket content in a deterministic bank and document layout', () => {
    expect(buildCustomerBankId('acme')).toBe('customer-acme');
    expect(buildCustomerBankId('acme')).not.toBe(buildCustomerBankId('northstar'));
    expect(buildTicketDocumentId('1042')).toBe('ticket-1042');
    expect(buildTicketText({
      id: '1042',
      customerId: 'acme',
      summary: 'Deployment failures after configuration update',
      status: 'Open',
      createdAt: '2024-05-12T09:00:00Z',
      messages: [
        { speaker: 'customer', text: 'Deployment is failing again.', createdAt: '2024-05-12T09:00:00Z' },
        { speaker: 'agent', text: 'We need to inspect memory pressure.', createdAt: '2024-05-12T09:05:00Z' },
      ],
    })).toContain('Ticket #1042');
  });

  it('returns only memories relevant to a customer and query', () => {
    const memories = [
      { id: 'm1', text: 'Acme Cloud had memory pressure in production', document_id: 'ticket-1042', metadata: { customer: 'acme' } },
      { id: 'm2', text: 'Northstar Labs had router issues in staging', document_id: 'ticket-900', metadata: { customer: 'northstar' } },
    ];

    const results = selectRelevantMemories(memories, 'deployment memory exhaustion in acme production', 'acme');

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('m1');
  });

  it('generates memory-aware support response when relevant recall is available', () => {
    const response = createSupportReply({
      mode: 'with-memory',
      customerName: 'Acme Cloud',
      issue: 'The deployment is failing again after today\'s configuration update.',
      memories: [
        { id: 'm1', text: 'Previous deployment failure here was caused by container memory exhaustion.', document_id: 'ticket-1042', metadata: { customer: 'acme' } },
        { id: 'm2', text: 'Customer prefers production changes outside business hours.', document_id: 'ticket-1097', metadata: { customer: 'acme' } },
      ],
    });

    expect(response).toContain('Ticket #1042');
    expect(response).toContain('memory exhaustion');
    expect(response).toContain('outside business hours');
  });

  it('generates a generic response without memory', () => {
    const response = createSupportReply({
      mode: 'without-memory',
      customerName: 'Acme Cloud',
      issue: 'The deployment is failing again after today\'s configuration update.',
      memories: [],
    });

    expect(response).toContain('I can help');
    expect(response).not.toContain('Ticket #1042');
  });

  it('does not claim historical evidence when recall has no relevant result', () => {
    const response = createSupportReply({
      mode: 'with-memory',
      customerName: 'Acme Cloud',
      issue: 'A deployment is failing.',
      memories: [],
    });

    expect(response).toContain('do not have a relevant historical incident');
  });
});
