'use client';
import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Share } from '@/components/share';
import { url } from '@/lib/metadata';
import { useUserId } from '@/components/context/miniapp-provider';
import { GameState } from '@/lib/state';


export default function Game() {
  const [state, setState] = useState<GameState | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [shareTime, setShareTime] = useState<string | null>(null);
  const userId = useUserId();

  const fetchState = async () => {
    const res = await fetch('/api/state');
    const data = await res.json();
    setState(data);
    if (data.fireSize === 0 && data.fireAliveTime > 0) {
      setShareTime(`${data.fireAliveTime.toFixed(2)}s`);
    }
  };

  const perform = async (action: string) => {
    await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action }),
    });
    await fetchState();
  };

  const [newMessage, setNewMessage] = useState('');
  const watchingCount = state
    ? Object.values(state.cooldownEnd).filter(
        (v) => v && v < Date.now() - 5 * 60 * 1000
      ).length
    : 0;
  const { longestFire, biggestFire, actions } = state?.records ?? {
    longestFire: 0,
    biggestFire: 0,
    actions: {},
  };

  const getLeaderboard = (action: keyof typeof actions) => {
    const entries = Object.entries(actions).map(([uid, counts]) => ({
      uid,
      count: counts[action as keyof typeof counts] ?? 0,
    }));
    entries.sort((a, b) => b.count - a.count);
    return entries;
  };
  const sendChat = async () => {
    if (!newMessage.trim()) return;
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message: newMessage }),
    });
    setNewMessage('');
    await fetchState();
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(async () => {
      await fetch('/api/update', { method: 'POST' });
      await fetchState();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!state) return;
    setCooldown(Math.max(0, Math.ceil(((state.cooldownEnd[userId] ?? 0) - Date.now()) / 1000)));
    const interval = setInterval(() => {
      setCooldown(Math.max(0, Math.ceil(((state.cooldownEnd[userId] ?? 0) - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [state, userId]);

  if (!state) return null;

  const getFireImage = () => {
    const size = state.fireSize;
    if (size > 10) return '/fire-10.png';
    if (size > 6) return '/fire-6.png';
    if (size > 4) return '/fire-4.png';
    if (size > 2) return '/fire-2.png';
    if (size > 0) return '/fire-0.png';
    return '/fire-dead.png';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xl font-semibold mb-2">Welcome {userId}!</p>
      <div className="relative">
        {state.fireSize > 0 && (
          <div className="absolute inset-0 -m-2 bg-orange-300 rounded-lg animate-pulse -z-10" />
        )}
        <img src={getFireImage()} alt="Fire" className="w-64 h-64" />
      </div>
      <div className="text-center">
        <p><span className="text-green-500">Trees</span>: {state.trees}</p>
        <p><span className="text-amber-600">Wood</span> in Storage: {state.woodStorage}</p>
        <p><span className="text-amber-600">Wood</span> in <span className="text-orange-600">Fire</span>: {state.woodInFire.toFixed(2)}</p>
        <p><span className="text-orange-600">Fire</span> Size: {state.fireSize.toFixed(2)}</p>
        <p><span className="text-orange-600">Fire</span> Alive Time: {state.fireAliveTime.toFixed(0)}s</p>
        <p><span className="text-orange-600">Watching the Fire</span>: {watchingCount}</p>
      </div>
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-1">
          <img src="/grow-tree.png" alt="Grow Tree" className="w-16 h-16" />
          <Button onClick={() => perform('grow')} disabled={cooldown > 0}>
            Grow Tree {cooldown > 0 && `(${cooldown}s)`}
          </Button>
        </div>
        <div className="flex flex-col items-center gap-1">
          <img src="/chop-tree.png" alt="Chop Tree" className="w-16 h-16" />
          <Button onClick={() => perform('chop')} disabled={cooldown > 0}>
            Chop Tree {cooldown > 0 && `(${cooldown}s)`}
          </Button>
        </div>
        <div className="flex flex-col items-center gap-1">
          <img src="/fuel-fire.png" alt="Fuel Fire" className="w-16 h-16" />
          <Button onClick={() => perform('fuel')} disabled={cooldown > 0}>
            Fuel Fire {cooldown > 0 && `(${cooldown}s)`}
          </Button>
        </div>
      </div>
      {shareTime && (
        <Share text={`I kept the fire alive for ${shareTime} in Bonfire! ${url}`} />
      )}
      <div className="w-full max-w-md mt-4">
        <h3 className="text-lg font-semibold mb-2">Chat</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto bg-muted p-2 rounded">
          {state.chat.map((msg, idx) => (
            <div key={idx} className="p-2 bg-background rounded">
              <span className="text-xs text-muted-foreground">{new Date(msg.date).toLocaleTimeString()}</span>{' '}
              <strong>{msg.userId}:</strong> {msg.message}
            </div>
          ))}
        </div>
        <div className="flex mt-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 border rounded p-1"
            placeholder="Type a message"
          />
          <Button onClick={sendChat} className="ml-2">
            Send
          </Button>
        </div>
      </div>
      <div className="w-full max-w-md mt-4">
        <h3 className="text-lg font-semibold mb-2">Hall of Fame</h3>
        <p>Longest Fire: {longestFire.toFixed(0)}s</p>
        <p>Biggest Fire: {biggestFire.toFixed(2)}</p>
        <div className="mt-4">
          <h4 className="font-semibold">Grow Tree Leaderboard</h4>
          <ol className="list-decimal pl-4">
            {getLeaderboard('grow').slice(0, 5).map((e) => (
              <li key={e.uid}>
                {e.uid}: {e.count}
              </li>
            ))}
          </ol>
          <h4 className="font-semibold mt-2">Chop Tree Leaderboard</h4>
          <ol className="list-decimal pl-4">
            {getLeaderboard('chop').slice(0, 5).map((e) => (
              <li key={e.uid}>
                {e.uid}: {e.count}
              </li>
            ))}
          </ol>
          <h4 className="font-semibold mt-2">Fuel Fire Leaderboard</h4>
          <ol className="list-decimal pl-4">
            {getLeaderboard('fuel').slice(0, 5).map((e) => (
              <li key={e.uid}>
                {e.uid}: {e.count}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
