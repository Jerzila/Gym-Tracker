"use server";

import { createServerClient } from "@/lib/supabase/server";
import type { BodyweightLog } from "@/lib/types";
import { revalidatePath } from "next/cache";

function isConnectionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("network");
}

export async function getBodyweightLogs(): Promise<BodyweightLog[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("bodyweight_logs")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      user_id: (row as { user_id: string }).user_id,
      weight: Number(row.weight),
      date: row.date,
      created_at: row.created_at,
    })) as BodyweightLog[];
  } catch (e) {
    if (isConnectionError(e)) {
      throw new Error("Can't connect to Supabase. Check .env.local.");
    }
    throw e;
  }
}

export type BodyweightStats = {
  latest: { weight: number; date: string } | null;
  diffFromPrevious: number | null;
  avg7Days: number | null;
  change30Days: number | null;
};

export async function getBodyweightStats(): Promise<BodyweightStats> {
  try {
    const logs = await getBodyweightLogs();
    if (logs.length === 0) {
      return { latest: null, diffFromPrevious: null, avg7Days: null, change30Days: null };
    }

    const latest = { weight: logs[0].weight, date: logs[0].date };
    const diffFromPrevious = logs.length >= 2 ? logs[0].weight - logs[1].weight : null;

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last7 = logs.filter((l) => new Date(l.date) >= sevenDaysAgo);
    const avg7Days = last7.length > 0 ? last7.reduce((s, l) => s + l.weight, 0) / last7.length : null;

    const last30 = logs.filter((l) => new Date(l.date) >= thirtyDaysAgo);
    const change30Days =
      last30.length >= 2
        ? last30[0].weight - last30[last30.length - 1].weight
        : last30.length === 1
          ? null
          : null;

    return {
      latest,
      diffFromPrevious,
      avg7Days: avg7Days != null ? Math.round(avg7Days * 10) / 10 : null,
      change30Days: change30Days != null ? Math.round(change30Days * 10) / 10 : null,
    };
  } catch (e) {
    if (isConnectionError(e)) throw e;
    return { latest: null, diffFromPrevious: null, avg7Days: null, change30Days: null };
  }
}

export async function createBodyweightLog(formData: FormData): Promise<{ error?: string }> {
  const weight = Number(formData.get("weight"));
  const dateRaw = formData.get("date") as string;

  if (Number.isNaN(weight) || weight <= 0) {
    return { error: "Enter a valid weight (kg)." };
  }
  if (!dateRaw) {
    return { error: "Date is required." };
  }
  const date = new Date(dateRaw).toISOString().slice(0, 10);
  if (date === "Invalid Date" || date.length !== 10) {
    return { error: "Enter a valid date." };
  }

  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "You must be signed in to log bodyweight." };

    const { error } = await supabase
      .from("bodyweight_logs")
      .insert({ user_id: user.id, weight, date } as Record<string, unknown>);

    if (error) return { error: error.message };
    revalidatePath("/");
    revalidatePath("/bodyweight");
    return {};
  } catch (e) {
    if (isConnectionError(e)) {
      return { error: "Can't connect to Supabase. Check .env.local." };
    }
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteBodyweightLog(id: string): Promise<{ error?: string }> {
  if (!id) return { error: "Missing log id" };
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from("bodyweight_logs").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/");
    revalidatePath("/bodyweight");
    return {};
  } catch (e) {
    if (isConnectionError(e)) {
      return { error: "Can't connect to Supabase. Check .env.local." };
    }
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
