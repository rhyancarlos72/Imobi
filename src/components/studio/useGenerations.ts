"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { Generation } from "@/lib/store/types";
import { useStudio } from "./StudioContext";

/** Lista as gerações e consulta de novo enquanto houver alguma em andamento. */
export function useGenerations(intervalMs = 4000) {
  const { setCredits } = useStudio();
  const [items, setItems] = useState<Generation[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const r = await api<{ generations: Generation[]; credits: number }>("/api/generations");
      if (!alive.current) return;
      setItems(r.generations);
      setCredits(r.credits);
      const pending = r.generations.some((g) => g.status === "queued" || g.status === "processing");
      if (timer.current) clearTimeout(timer.current);
      if (pending) timer.current = setTimeout(load, intervalMs);
    } catch {
      if (alive.current) timer.current = setTimeout(load, intervalMs * 2);
    }
  }, [intervalMs, setCredits]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  return { items, reload: load, setItems };
}
