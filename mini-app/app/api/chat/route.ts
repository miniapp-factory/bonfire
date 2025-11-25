import { NextResponse } from 'next/server';
import { addChatMessage } from '@/lib/state';

export async function POST(request: Request) {
  const { userId, message } = await request.json();
  if (!userId || !message) {
    return NextResponse.json({ success: false, message: 'Missing userId or message' }, { status: 400 });
  }
  await addChatMessage(userId, message);
  return NextResponse.json({ success: true });
}
