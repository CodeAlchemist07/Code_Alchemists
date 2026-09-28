import { NextResponse } from 'next/server';
import { canAccessProject, getCurrentUser } from '@/lib/auth';
import { getCustomerById } from '@/lib/data';
import { storeMemory } from '@/lib/memory';
import type { MemoryToStore } from '@/lib/hindsight';
import { projectWorkspaces } from '@/lib/workspace';

const allowedTypes = new Set<NonNullable<MemoryToStore['type']>>([
  'resolution',
  'customer-preference',
  'project-decision',
  'incident-learning',
]);

export async function POST(request: Request) {
  try {
    const user = getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    if (body.approved !== true) {
      return NextResponse.json({ error: 'Explicit approval is required before storing a memory.' }, { status: 400 });
    }
    const customerId = String(body.customerId ?? '').trim();
    const projectId = String(body.projectId ?? '').trim();
    const caseId = String(body.caseId ?? '').trim();
    const text = String(body.text ?? '').trim();
    const type = String(body.type ?? 'incident-learning') as MemoryToStore['type'];

    if (!customerId || !projectId || !caseId || !text || text.length > 6000 || !allowedTypes.has(type as NonNullable<MemoryToStore['type']>)) {
      return NextResponse.json({ error: 'A valid customer, project, case, memory type, and text are required.' }, { status: 400 });
    }

    const project = projectWorkspaces.find((entry) => entry.id === projectId && entry.customerId === customerId);
    if (!project || !canAccessProject(user, project.id)) {
      return NextResponse.json({ error: 'You are not authorized to store memory for this project.' }, { status: 403 });
    }

    const customer = await getCustomerById(customerId);
    if (!customer?.tickets.some((ticket) => ticket.id === caseId)) {
      return NextResponse.json({ error: 'Case does not belong to the requested customer.' }, { status: 404 });
    }

    const result = await storeMemory(customerId, {
      text,
      projectId,
      caseId,
      type,
      context: `Approved ${type} for project ${project.name}`,
      documentId: `case-${caseId}-${type}`,
    });
    if (!result.success) return NextResponse.json({ error: result.reason ?? 'Hindsight memory storage failed.' }, { status: 503 });

    return NextResponse.json({ stored: true, documentId: result.documentId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to store memory.' }, { status: 500 });
  }
}
