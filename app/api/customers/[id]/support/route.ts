import { NextResponse } from 'next/server';
import { canAccessProject, getCurrentUser } from '@/lib/auth';
import { getCustomerById } from '@/lib/data';
import { generateSupportReply, SupportAgentError } from '@/lib/agent';
import { selectRelevantMemories } from '@/lib/support';
import { retrieveMemories } from '@/lib/memory';
import { projectWorkspaces } from '@/lib/workspace';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const user = getCurrentUser();
    const project = projectWorkspaces.find((entry) => entry.customerId === params.id);
    if (!user || !project || !canAccessProject(user, project.id)) {
      return NextResponse.json({ error: 'You are not authorized to access this customer.' }, { status: 403 });
    }
    const customer = await getCustomerById(params.id);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const useMemory = Boolean(body.useMemory);
    const issue = String(body.message ?? '').trim();
    if (!issue || issue.length > 8000) {
      return NextResponse.json({ error: 'A message of at most 8000 characters is required.' }, { status: 400 });
    }
    const recall = useMemory ? await retrieveMemories(customer.id, issue) : { available: false, results: [] };
    const memories = selectRelevantMemories(recall.results, issue, customer.id);

    const response = await generateSupportReply({
      mode: useMemory ? 'with-memory' : 'without-memory',
      customerName: customer.name,
      projectName: project.name,
      caseId: '',
      issue,
      requirements: project.requirements
        .filter((requirement) => requirement.status !== 'Proposed')
        .map((requirement) => `${requirement.id}: ${requirement.description} (${requirement.status})`),
      constraints: project.constraints,
      repositories: project.repositories.map(({ name, branch, context, lastDeployment }) => ({ name, branch, context, lastDeployment })),
      cloud: project.cloud,
      memories,
    });

    return NextResponse.json({ response, memories, useMemory, memoryAvailable: recall.available }, { status: 200 });
  } catch (error) {
    if (error instanceof SupportAgentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to generate response' }, { status: 500 });
  }
}
