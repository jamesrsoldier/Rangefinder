import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/helpers';

export async function GET() {
  const user = await getAuthUser();
  return NextResponse.json({ isAdmin: user?.isAdmin ?? false });
}
