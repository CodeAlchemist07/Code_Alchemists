import crypto from 'crypto';
import { cookies } from 'next/headers';

export type UserRole = 'Support Engineer' | 'Delivery Lead' | 'Customer Success Manager';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: string;
  projectIds: string[];
}

type DemoCredential = AuthUser & { passwordHash: string };

const sessionCookie = 'supportmemory_session';
const sessionSecret = process.env.SESSION_SECRET ?? 'supportmemory-local-session-secret';

const users: DemoCredential[] = [
  {
    id: 'kevin',
    name: 'Kevin Rao',
    email: 'kevin@apex.consulting',
    role: 'Support Engineer',
    team: 'Support Engineering',
    projectIds: ['meridian', 'acme'],
    passwordHash: hashPassword('ApexDemo123!'),
  },
  {
    id: 'maya',
    name: 'Maya Rao',
    email: 'maya@apex.consulting',
    role: 'Delivery Lead',
    team: 'Platform Delivery',
    projectIds: ['meridian', 'northstar'],
    passwordHash: hashPassword('ApexDemo123!'),
  },
  {
    id: 'omar',
    name: 'Omar Mehta',
    email: 'omar@apex.consulting',
    role: 'Customer Success Manager',
    team: 'Customer Success',
    projectIds: ['meridian'],
    passwordHash: hashPassword('ApexDemo123!'),
  },
];

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function sign(value: string): string {
  return crypto.createHmac('sha256', sessionSecret).update(value).digest('hex');
}

function encodeSession(userId: string): string {
  const value = Buffer.from(userId).toString('base64url');
  return `${value}.${sign(value)}`;
}

function decodeSession(token: string): string | null {
  const [value, signature] = token.split('.');
  if (!value || !signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(sign(value)))) {
    return null;
  }
  return Buffer.from(value, 'base64url').toString('utf8');
}

export function authenticate(email: string, password: string): AuthUser | null {
  const user = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) {
    return null;
  }
  return toPublicUser(user);
}

export function createSession(userId: string): void {
  cookies().set(sessionCookie, encodeSession(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export function clearSession(): void {
  cookies().set(sessionCookie, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
}

export function getCurrentUser(): AuthUser | null {
  const token = cookies().get(sessionCookie)?.value;
  if (!token) {
    return null;
  }
  const userId = decodeSession(token);
  const user = users.find((entry) => entry.id === userId);
  return user ? toPublicUser(user) : null;
}

export function getUserById(userId: string): AuthUser | null {
  const user = users.find((entry) => entry.id === userId);
  return user ? toPublicUser(user) : null;
}

export function canAccessProject(user: AuthUser, projectId: string): boolean {
  return user.projectIds.includes(projectId);
}

export function canManageProject(user: AuthUser): boolean {
  return user.role === 'Delivery Lead';
}

export function getDemoCredentials(): Array<Pick<AuthUser, 'name' | 'email' | 'role'>> {
  return users.map(({ name, email, role }) => ({ name, email, role }));
}

function toPublicUser(user: DemoCredential): AuthUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
