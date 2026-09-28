import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readData } from '@/lib/data';
import { projectWorkspaces } from '@/lib/workspace';

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { customers } = await readData();
  const projects = projectWorkspaces
    .filter((project) => user.projectIds.includes(project.id))
    .map((project) => ({
      ...project,
      customer: customers.find((customer) => customer.id === project.customerId),
    }));

  return NextResponse.json({ user, projects });
}
