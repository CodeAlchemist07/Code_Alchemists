import { NextResponse } from 'next/server';
import { canAccessProject, getCurrentUser } from '@/lib/auth';
import { getCustomerById } from '@/lib/data';
import { retrieveMemories } from '@/lib/memory';
import { createSupportReply, selectRelevantMemories } from '@/lib/support';
import { projectWorkspaces } from '@/lib/workspace';

export async function POST(request: Request) {
  try {
    const user = getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const customerId = String(body.customerId ?? '').trim();
    const message = String(body.message ?? '').trim();
    const caseId = String(body.caseId ?? '').trim();
    if (!customerId || !message || message.length > 8000) {
      return NextResponse.json({ error: 'customerId and a message of at most 8000 characters are required.' }, { status: 400 });
    }

    const requestedProjectId = String(body.projectId ?? '').trim();
    const customerProject = projectWorkspaces.find((entry) => entry.customerId === customerId && (!requestedProjectId || entry.id === requestedProjectId));
    if (!customerProject || customerProject.customerId !== customerId || !canAccessProject(user, customerProject.id)) {
      return NextResponse.json({ error: 'You are not authorized to access this customer or project.' }, { status: 403 });
    }

    const customer = await getCustomerById(customerId);
    if (!customer) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    const ticket = caseId ? customer.tickets.find((entry) => entry.id === caseId) : undefined;
    if (caseId && !ticket) return NextResponse.json({ error: 'Case does not belong to the requested customer.' }, { status: 404 });

    const recall = await retrieveMemories(customerId, message);
    const memoriesUsed = selectRelevantMemories(recall.results, message, customerId);
    const baseResponse = createSupportReply({
      mode: 'with-memory',
      customerName: customer.name,
      issue: message,
      memories: memoriesUsed,
    });
    const applicableRequirement = customerProject.requirements.find((requirement) => requirement.status !== 'Proposed');
    const response = [
      baseResponse,
      applicableRequirement ? `Project requirement to verify: ${applicableRequirement.id} - ${applicableRequirement.description}` : '',
      customerProject.cloud.diagnostics[0] ? `Available cloud context: ${customerProject.cloud.diagnostics[0]}` : '',
    ].filter(Boolean).join('\n\n');

    const recommendedActions = [
      'Compare the current deployment configuration with the last known-good version.',
      ...(applicableRequirement ? [`Confirm the change complies with ${applicableRequirement.id} before production rollout.`] : []),
      ...(customerProject.repositories.length ? [`Inspect authorized repository ${customerProject.repositories[0].name}.`] : []),
      ...(customerProject.cloud.diagnostics.length ? ['Review the authorized read-only cloud diagnostic context.'] : []),
    ];

    const memoryCandidates = ticket && /root cause|resolved|resolution|fixed by|customer prefers|must remain|requirement/i.test(message)
      ? [{
          customerId,
          projectId: customerProject.id,
          caseId: ticket.id,
          type: 'incident-learning',
          text: `Case #${ticket.id} learning candidate: ${message}`,
          requiresApproval: true,
        }]
      : [];

    return NextResponse.json({
      response,
      memoriesUsed,
      recommendedActions,
      memoryCandidates,
      memoryStatus: recall.available && !recall.error ? 'available' : 'unavailable',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to process support chat.' }, { status: 500 });
  }
}
