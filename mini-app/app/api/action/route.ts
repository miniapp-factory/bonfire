import { NextResponse } from 'next/server';
import { performAction } from '@/lib/state';

export async function POST(request: Request) {
  const { userId, action } = await request.json();
  const result = await performAction(userId, action);
  return NextResponse.json(result);
}
