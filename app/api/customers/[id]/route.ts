import { NextResponse } from 'next/server';
import { getCustomerById } from '@/lib/data';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const customer = await getCustomerById(params.id);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ customer }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load customer' }, { status: 500 });
  }
}
