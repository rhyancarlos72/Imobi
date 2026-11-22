import "server-only";
import { isDemo } from "../config";
import { demoStore } from "./demo";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export const store: Store = isDemo ? demoStore : supabaseStore;
export * from "./types";
