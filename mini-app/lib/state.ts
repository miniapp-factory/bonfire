import { readFile, writeFile, rename } from 'fs/promises';

export interface GameState {
  trees: number;
  woodStorage: number;
  woodInFire: number;
  fireSize: number;
  fireAliveTime: number;
  lastUpdate: number;
  cooldownEnd: Record<string, number | undefined>;
  chat: { userId: string; message: string; date: number }[];
  records: {
    longestFire: number;
    biggestFire: number;
    actions: Record<
      string,
      { grow: number; chop: number; fuel: number }
    >;
  };
}

const stateFile = '/var/lib/mini-app/state.json';

export async function getState(): Promise<GameState> {
  try {
    const data = await readFile(stateFile, 'utf-8');
    return JSON.parse(data) as GameState;
  } catch {
    try {
      const backupData = await readFile(stateFile + '.backup', 'utf-8');
      return JSON.parse(backupData) as GameState;
    } catch {
      const initial: GameState = {
        trees: 10,
        woodStorage: 100,
        woodInFire: 0,
        fireSize: 0,
        fireAliveTime: 0,
        lastUpdate: Date.now(),
        cooldownEnd: {},
        chat: [],
        records: {
          longestFire: 0,
          biggestFire: 0,
          actions: {},
        },
      };
      return initial;
    }
  }
}

export async function setState(state: GameState): Promise<void> {
  const tempFile = stateFile + '.new';
  await writeFile(tempFile, JSON.stringify(state, null, 2));
  // backup current state file if it contains valid JSON
  try {
    const currentData = await readFile(stateFile, 'utf-8');
    JSON.parse(currentData);
    await rename(stateFile, stateFile + '.backup');
  } catch {}
  await rename(tempFile, stateFile);
}

export async function performAction(userId: string, action: string): Promise<{ success: boolean; message?: string }> {
  const state = await getState();
  const now = Date.now();
  if (now < (state.cooldownEnd[userId] ?? 0)) {
    return { success: false, message: 'Cooldown active' };
  }
  switch (action) {
    case 'grow':
      state.trees += 1;
      state.cooldownEnd[userId] = now + 20000;
      break;
    case 'chop':
      if (state.trees <= 0) return { success: false, message: 'No trees' };
      state.trees -= 1;
      state.woodStorage += 5;
      state.cooldownEnd[userId] = now + 5000;
      break;
    case 'fuel':
      if (state.woodStorage <= 0) return { success: false, message: 'No wood' };
      state.woodStorage -= 1;
      state.woodInFire += 1;
      state.cooldownEnd[userId] = now + 1000;
      break;
    default:
      return { success: false, message: 'Unknown action' };
  }
  // Update action counts
  const userActions = state.records.actions[userId] ?? { grow: 0, chop: 0, fuel: 0 };
  userActions[action as keyof typeof userActions] += 1;
  state.records.actions[userId] = userActions;
  // Add chat message based on action
  const chatMessage =
    action === 'grow'
      ? ` is watching a tree grow, don't count on them for a while`
      : action === 'chop'
      ? ` is swinging their axe around, be careful not to get close`
      : ` is stoking up the fire!`;
  state.chat.push({ userId, message: chatMessage, date: Date.now() });
  if (state.chat.length > 10) {
    state.chat.shift();
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
  // Update records for longest and biggest fire
  if (state.fireAliveTime > state.records.longestFire) {
    state.records.longestFire = state.fireAliveTime;
  }
  if (state.fireSize > state.records.biggestFire) {
    state.records.biggestFire = state.fireSize;
  }
  state.lastUpdate = now;
  await setState(state);
}
