import { NextResponse } from 'next/server';
import { canAccessProject, getCurrentUser } from '@/lib/auth';
import { HindsightService } from '@/lib/hindsight';
import { selectRelevantMemories } from '@/lib/support';
import { getCustomerById } from '@/lib/data';
import { projectWorkspaces } from '@/lib/workspace';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const question = String(body.query ?? '').trim();
    const useMemory = Boolean(body.useMemory);
    const user = getCurrentUser();
    const project = projectWorkspaces.find((entry) => entry.customerId === params.id);
    if (!user || !project || !canAccessProject(user, project.id)) {
      return NextResponse.json({ error: 'You are not authorized to access this customer.' }, { status: 403 });
    }
    const customer = await getCustomerById(params.id);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (!useMemory) {
      return NextResponse.json({ memories: [], available: false }, { status: 200 });
    }

    const hindsight = new HindsightService();
    const recall = await hindsight.recallCustomerMemory(customer.id, question);

    if (!recall.available || recall.error) {
      return NextResponse.json({
        memories: [],
        error: recall.error ?? 'Hindsight recall unavailable',
        available: false,
      }, { status: 200 });
    }

    const relevant = selectRelevantMemories(recall.results, question, customer.id);
    return NextResponse.json({ memories: relevant, available: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to recall memories' }, { status: 500 });
  }
}
