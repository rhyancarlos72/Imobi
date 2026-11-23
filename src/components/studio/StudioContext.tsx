"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { api } from "@/lib/client";
import type { Provider } from "@/lib/models";
import type { PricingParams } from "@/lib/pricing";
import type { Profile } from "@/lib/store/types";

type Ctx = {
  profile: Profile;
  setProfile: (p: Profile) => void;
  credits: number;
  setCredits: (n: number) => void;
  refresh: () => Promise<void>;
  pricing: PricingParams;
  demo: { app: boolean; ai: boolean; payments: boolean };
  providers: Record<Provider, boolean>;
  isAdmin: boolean;
};

const StudioCtx = createContext<Ctx | null>(null);

export function StudioProvider({ initialProfile, pricing, demo, providers, isAdmin = false, children }: { initialProfile: Profile; pricing: PricingParams; demo: Ctx["demo"]; providers: Ctx["providers"]; isAdmin?: boolean; children: ReactNode }) {
  const [profile, setProfile] = useState(initialProfile);
  const [credits, setCredits] = useState(initialProfile.credits);
  const refresh = useCallback(async () => {
    const r = await api<{ profile: Profile }>("/api/me");
    setProfile(r.profile);
    setCredits(r.profile.credits);
  }, []);
  return <StudioCtx.Provider value={{ profile, setProfile, credits, setCredits, refresh, pricing, demo, providers, isAdmin }}>{children}</StudioCtx.Provider>;
}

export function useStudio() {
  const c = useContext(StudioCtx);
  if (!c) throw new Error("useStudio fora do StudioProvider");
  return c;
}
