import { NextResponse } from 'next/server';
import { authenticate, createSession } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const user = authenticate(String(body.email ?? '').trim(), String(body.password ?? ''));
  if (!user) {
    return NextResponse.json({ error: 'Invalid work email or password.' }, { status: 401 });
  }
  createSession(user.id);
  return NextResponse.json({ user });
}
