import { NextResponse } from 'next/server';
import { updateGame } from '@/lib/state';

export async function POST() {
  await updateGame();
  return NextResponse.json({ ok: true });
}
