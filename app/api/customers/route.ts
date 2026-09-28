import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readData } from '@/lib/data';
import { projectWorkspaces } from '@/lib/workspace';

export async function GET() {
  try {
    const user = getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { customers } = await readData();
    const permittedCustomerIds = projectWorkspaces
      .filter((project) => user.projectIds.includes(project.id))
      .map((project) => project.customerId);
    return NextResponse.json({ customers: customers.filter((customer) => permittedCustomerIds.includes(customer.id)) }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load customers' }, { status: 500 });
  }
}
