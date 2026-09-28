import { NextResponse } from 'next/server';
import { canAccessProject, getCurrentUser } from '@/lib/auth';
import { getCustomerById } from '@/lib/data';
import { generateSupportReply, SupportAgentError } from '@/lib/agent';
import { retrieveMemories } from '@/lib/memory';
import { selectRelevantMemories } from '@/lib/support';
import { projectWorkspaces } from '@/lib/workspace';

export async function POST(request: Request) {
  try {
    const user = getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const customerId = String(body.customerId ?? '').trim();
    const message = String(body.message ?? '').trim();
    const caseId = String(body.caseId ?? '').trim();
    const mode = body.mode ?? 'with-memory';
    if (!customerId || !message || message.length > 8000) {
      return NextResponse.json({ error: 'customerId and a message of at most 8000 characters are required.' }, { status: 400 });
    }
    if (mode !== 'with-memory' && mode !== 'without-memory') {
      return NextResponse.json({ error: 'mode must be with-memory or without-memory.' }, { status: 400 });
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

    const recall = mode === 'with-memory'
      ? await retrieveMemories(customerId, message)
      : { available: false, results: [] };
    const memoriesUsed = mode === 'with-memory'
      ? selectRelevantMemories(recall.results, message, customerId)
      : [];
    const applicableRequirement = customerProject.requirements.find((requirement) => requirement.status !== 'Proposed');
    const response = await generateSupportReply({
      mode,
      customerName: customer.name,
      projectName: customerProject.name,
      caseId: ticket?.id ?? '',
      issue: message,
      ticket,
      memories: memoriesUsed,
      requirements: customerProject.requirements
        .filter((requirement) => requirement.status !== 'Proposed')
        .map((requirement) => `${requirement.id}: ${requirement.description} (${requirement.status})`),
      constraints: customerProject.constraints,
      repositories: customerProject.repositories.map(({ name, branch, context, lastDeployment }) => ({ name, branch, context, lastDeployment })),
      cloud: customerProject.cloud,
    });

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
      mode,
      memoriesUsed,
      recommendedActions,
      memoryCandidates,
      memoryStatus: mode === 'without-memory' ? 'disabled' : recall.available && !recall.error ? 'available' : 'unavailable',
    });
  } catch (error) {
    if (error instanceof SupportAgentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to process support chat.' }, { status: 500 });
  }
}
