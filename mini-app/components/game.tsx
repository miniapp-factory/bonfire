'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share } from '@/components/share';
import { url } from '@/lib/metadata';
import { useUserId } from '@/components/context/miniapp-provider';

type GameState = {
  trees: number;
  woodStorage: number;
  woodInFire: number;
  fireSize: number;
  fireAliveTime: number;
  cooldownEnd: number;
};

export default function Game() {
  const [state, setState] = useState<GameState | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [shareTime, setShareTime] = useState<string | null>(null);
  const userId = useUserId();

  const fetchState = async () => {
    const res = await fetch('/api/state');
    const data = await res.json();
    setState(data);
    setCooldown(Math.max(0, Math.ceil((data.cooldownEnd - Date.now()) / 1000)));
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

  useEffect(() => {
    fetchState();
    const interval = setInterval(async () => {
      await fetch('/api/update', { method: 'POST' });
      await fetchState();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
      <img src={getFireImage()} alt="Fire" className="w-64 h-64" />
      <div className="text-center">
        <p><span className="text-green-500">Trees</span>: {state.trees}</p>
        <p><span className="text-amber-600">Wood</span> Storage: {state.woodStorage}</p>
        <p><span className="text-amber-600">Wood</span> in <span className="text-orange-600">Fire</span>: {state.woodInFire.toFixed(2)}</p>
        <p><span className="text-orange-600">Fire</span> Size: {state.fireSize.toFixed(2)}</p>
        <p><span className="text-orange-600">Fire</span> Alive Time: {state.fireAliveTime.toFixed(0)}s</p>
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
    </div>
  );
}
