import { HindsightClient } from '@vectorize-io/hindsight-client';
import { buildCustomerBankId, buildTicketDocumentId, buildTicketText } from '../lib/support';
import { seedCustomers } from '../lib/data';

async function main() {
  const baseUrl = process.env.HINDSIGHT_BASE_URL;
  if (!baseUrl) {
    throw new Error('HINDSIGHT_BASE_URL is required. Set it to your Hindsight service before running seed:hindsight.');
  }

  const client = new HindsightClient({ baseUrl, apiKey: process.env.HINDSIGHT_API_KEY });

  for (const customer of seedCustomers) {
    const bankId = buildCustomerBankId(customer.id);
    for (const ticket of customer.tickets) {
      const content = buildTicketText(ticket);
      await client.retain(bankId, content, {
        timestamp: new Date(ticket.createdAt),
        context: 'support ticket',
        metadata: {
          customer: customer.id,
          customerId: customer.id,
          ticketId: ticket.id,
          documentId: buildTicketDocumentId(ticket.id),
          source: 'support-ticket',
        },
        documentId: buildTicketDocumentId(ticket.id),
      });
    }
  }

  console.log('Seeded customer Hindsight banks with historical tickets');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
