import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'slrj_digital_jwt_secret_key_prod_auth_2026_secure';
export const AUTH_COOKIE_NAME = 'slrj_auth_token';

export type UserRole = 'SUPER_ADMIN' | 'MARKETING_MANAGER' | 'CAMPAIGN_OPERATOR';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') return null;

    return user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export function hasPermission(userRole: string, requiredRole: UserRole): boolean {
  const roleWeights: Record<string, number> = {
    CAMPAIGN_OPERATOR: 1,
    MARKETING_MANAGER: 2,
    SUPER_ADMIN: 3,
  };

  const userWeight = roleWeights[userRole] || 0;
  const requiredWeight = roleWeights[requiredRole] || 0;

  return userWeight >= requiredWeight;
}
