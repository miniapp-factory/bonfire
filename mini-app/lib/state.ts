import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';

export interface GameState {
  trees: number;
  woodStorage: number;
  woodInFire: number;
  fireSize: number;
  fireAliveTime: number;
  lastUpdate: number;
  cooldownEnd: number;
  chat: { userId: string; message: string; date: number }[];
}

const stateFile = '/var/lib/mini-app/state.json';

export async function getState(): Promise<GameState> {
  try {
    const data = await readFile(stateFile, 'utf-8');
    return JSON.parse(data) as GameState;
  } catch {
    const initial: GameState = {
      trees: 10,
      woodStorage: 100,
      woodInFire: 0,
      fireSize: 0,
      fireAliveTime: 0,
      lastUpdate: Date.now(),
      cooldownEnd: 0,
      chat: [],
    };
    await writeFile(stateFile, JSON.stringify(initial, null, 2));
    return initial;
  }
}

export async function setState(state: GameState): Promise<void> {
  await writeFile(stateFile, JSON.stringify(state, null, 2));
}

export async function performAction(userId: string, action: string): Promise<{ success: boolean; message?: string }> {
  const state = await getState();
  const now = Date.now();
  if (now < state.cooldownEnd) {
    return { success: false, message: 'Cooldown active' };
  }
  switch (action) {
    case 'grow':
      state.trees += 1;
      state.cooldownEnd = now + 20000;
      break;
    case 'chop':
      if (state.trees <= 0) return { success: false, message: 'No trees' };
      state.trees -= 1;
      state.woodStorage += 5;
      state.cooldownEnd = now + 5000;
      break;
    case 'fuel':
      if (state.woodStorage <= 0) return { success: false, message: 'No wood' };
      state.woodStorage -= 1;
      state.woodInFire += 1;
      state.cooldownEnd = now + 1000;
      break;
    default:
      return { success: false, message: 'Unknown action' };
  }
  await setState(state);
  return { success: true };
}

export async function addChatMessage(userId: string, message: string): Promise<void> {
  const state = await getState();
  const newMsg = { userId, message, date: Date.now() };
  state.chat.push(newMsg);
  if (state.chat.length > 10) {
    state.chat.shift();
  }
  await setState(state);
}

export async function updateGame(): Promise<void> {
  const state = await getState();
  const now = Date.now();
  if (now - state.lastUpdate < 900) return;
  const delta = 1;
  if (state.woodInFire > 0) {
    const consume = state.fireSize * 0.1 * delta;
    state.woodInFire = Math.max(0, state.woodInFire - consume);
    const growth = ((state.woodInFire * 0.5) - state.fireSize) / 50 * delta;
    state.fireSize = Math.max(0, state.fireSize + growth);
    if (state.fireSize > 0) {
      state.fireAliveTime += delta;
    }
  } else {
    state.fireSize = 0;
    state.fireAliveTime = 0;
  }
  state.lastUpdate = now;
  await setState(state);
}
