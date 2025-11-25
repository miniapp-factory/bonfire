"use client";

import { createContext, useContext, useEffect, useState } from "react";
import sdk, { Context } from "@farcaster/miniapp-sdk";
import { MiniAppSDK } from "@farcaster/miniapp-sdk/dist/types";

export interface MiniAppContext {
  sdk: MiniAppSDK;
  context: Context.MiniAppContext | undefined;
  isInMiniApp: boolean | undefined;
}
export function useUserId() {
  const { context } = useMiniAppContext();
  const username = context?.user?.username;
  if (username) return username;
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('miniapp_userId') : null;
  if (stored) return stored;
  const adjectives = ['Daring', 'Bold', 'Courageous', 'Fearless', 'Brave'];
  const animals = ['Goat', 'Eagle', 'Bull', 'Hamster', 'Chicken'];
  const randomNumber = () => Math.floor(Math.random() * 1000);
  const userId = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${animals[Math.floor(Math.random() * animals.length)]}${randomNumber()}`;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('miniapp_userId', userId);
  }
  return userId;
}
const defaultSettings: MiniAppContext = {
  sdk,
  context: undefined,
  isInMiniApp: undefined,
};
const MiniAppContext = createContext<MiniAppContext>(defaultSettings);

export function MiniAppProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<MiniAppContext>(defaultSettings);

  useEffect(() => {
    const ready = async () => {
      await Promise.all([
        sdk.context
          .then((context) =>
            setContext((oldContext) => {
              return { ...oldContext, context };
            })
          )
          .catch(console.error),
        sdk
          .isInMiniApp()
          .then((isInMiniApp) =>
            setContext((oldContext) => {
              return { ...oldContext, isInMiniApp };
            })
          )
          .catch(console.error),
        ,
      ]);

      await sdk.actions.ready().catch(console.error);
    };

    ready();
  }, []);

  return (
    <MiniAppContext.Provider value={context}>
      {children}
    </MiniAppContext.Provider>
  );
}

export function useMiniAppContext() {
  return useContext(MiniAppContext);
}
