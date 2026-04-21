import { createClient } from "npm:@supabase/supabase-js@2.96.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function purgePublicUserData(
  admin: ReturnType<typeof createClient>,
  userId: string
): Promise<{ error?: string }> {
  const { data: categories, error: catSelErr } = await admin.from("categories").select("id").eq("user_id", userId);
  if (catSelErr) return { error: catSelErr.message };
  const categoryIds = (categories ?? []).map((c: { id: string }) => c.id);

  const { data: workouts, error: wSelErr } = await admin.from("workouts").select("id").eq("user_id", userId);
  if (wSelErr) return { error: wSelErr.message };

  const workoutIds = (workouts ?? []).map((w: { id: string }) => w.id);
  if (workoutIds.length > 0) {
    const { error: setsErr } = await admin.from("sets").delete().in("workout_id", workoutIds);
    if (setsErr) return { error: setsErr.message };
  }

  const { error: wDelErr } = await admin.from("workouts").delete().eq("user_id", userId);
  if (wDelErr) return { error: wDelErr.message };

  const { error: prErr } = await admin.from("exercise_prs").delete().eq("user_id", userId);
  if (prErr) return { error: prErr.message };

  const { data: exercises, error: exSelErr } = await admin.from("exercises").select("id").eq("user_id", userId);
  if (exSelErr) return { error: exSelErr.message };

  const exerciseIds = (exercises ?? []).map((e: { id: string }) => e.id);
  if (exerciseIds.length > 0) {
    const { error: ecErr } = await admin.from("exercise_categories").delete().in("exercise_id", exerciseIds);
    if (ecErr) return { error: ecErr.message };
  }

  const { error: exDelErr } = await admin.from("exercises").delete().eq("user_id", userId);
  if (exDelErr) return { error: exDelErr.message };

  // Some exercise rows may not have user_id populated (legacy/imported data) but still reference
  // this user's categories. Remove them before deleting categories to avoid category_id NOT NULL errors.
  if (categoryIds.length > 0) {
    const { error: exByCatErr } = await admin.from("exercises").delete().in("category_id", categoryIds);
    if (exByCatErr) return { error: exByCatErr.message };
  }

  // Avoid deleting categories directly: in production schema, deleting category rows can trigger
  // FK behavior that attempts to null exercises.category_id (NOT NULL), causing account deletion
  // to fail even after user exercise cleanup.

  const { error: friendsErr } = await admin
    .from("friends")
    .delete()
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
  if (friendsErr) return { error: friendsErr.message };

  const { error: reqErr } = await admin
    .from("friend_requests")
    .delete()
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  if (reqErr) return { error: reqErr.message };

  const { error: bwErr } = await admin.from("bodyweight_logs").delete().eq("user_id", userId);
  if (bwErr) return { error: bwErr.message };

  const { error: rankErr } = await admin.from("rankings").delete().eq("user_id", userId);
  if (rankErr) return { error: rankErr.message };

  const { error: avatarErr } = await admin.storage.from("avatars").remove([`${userId}/avatar.jpg`]);
  if (avatarErr) console.warn("[delete-user] avatar remove:", avatarErr.message);

  // Do not delete profile row directly here. In this schema, profile/category relationships can
  // trigger category updates that attempt to null exercises.category_id (NOT NULL) during profile-
  // initiated cascades. Let auth.admin.deleteUser(userId) handle final auth/profile cleanup.

  return {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing or invalid authorization" }, 401);
  }
  const accessToken = authHeader.slice("Bearer ".length).trim();

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Validate the presented access token directly against Auth.
  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(accessToken);
  if (userErr || !user?.id) {
    return jsonResponse({ error: "Not authenticated" }, 401);
  }

  const userId = user.id;

  const purge = await purgePublicUserData(admin, userId);
  if (purge.error) {
    // Don't hard-fail account deletion on purge ordering/constraint issues.
    // We still remove the auth user to honor account deletion requests, and log
    // the purge problem for follow-up cleanup.
    console.error("[delete-user] purge failed (continuing with auth delete)", purge.error);
  }

  const { error: delAuthErr } = await admin.auth.admin.deleteUser(userId);
  if (delAuthErr) {
    console.error("[delete-user] auth.admin.deleteUser failed", delAuthErr);
    return jsonResponse({ error: "Failed to delete authentication account" }, 500);
  }

  return jsonResponse({ success: true });
});
