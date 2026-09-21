"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { playerSchema, tournamentSchema, scoreSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";
function fail(error: unknown): ActionResult {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : "";
  const mappings: Record<string, string> = {
    SCORE_CONFLICT:
      "نتیجه در دستگاه دیگری تغییر کرده است. صفحه را تازه کنید و دوباره تلاش کنید.",
    TOURNAMENT_NOT_ACTIVE: "مسابقه فعال نیست؛ ابتدا وضعیت آن را بررسی کنید.",
    INCOMPLETE_MATCHES: "ابتدا نتیجه هر ۱۴ بازی را کامل ثبت کنید.",
    INVALID_STATUS: "وضعیت مسابقه تغییر کرده؛ صفحه را تازه کنید.",
    ADMIN_REQUIRED: "این عملیات فقط برای ادمین مجاز است.",
    TOURNAMENT_LOCKED: "نتایج مسابقه پایان‌یافته قابل تغییر نیست.",
    EIGHT_PLAYERS_REQUIRED: "دقیقاً هشت بازیکن متفاوت انتخاب کنید.",
  };
  for (const [key, value] of Object.entries(mappings))
    if (message.includes(key)) return { success: false, error: value };
  console.error("Mutation failed:", message);
  return {
    success: false,
    error: "عملیات انجام نشد. اتصال را بررسی کنید و دوباره تلاش کنید.",
  };
}
function refresh(id?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/tournaments/${id}`);
}
export async function login(
  email: string,
  password: string,
): Promise<ActionResult> {
  if (!z.email().safeParse(email).success || !password)
    return { success: false, error: "ایمیل و رمز عبور را وارد کنید." };
  const db = await createClient();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error)
    return {
      success: false,
      error: "ایمیل یا رمز عبور درست نیست، یا اتصال برقرار نشد.",
    };
  const { data: admin } = await db.rpc("is_admin");
  if (!admin) {
    await db.auth.signOut();
    return { success: false, error: "این حساب دسترسی مدیریت ندارد." };
  }
  return { success: true };
}
export async function logout() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/login");
}
export async function savePlayer(
  input: unknown,
  id?: string,
): Promise<ActionResult> {
  const db = await requireAdmin();
  const parsed = playerSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };
  if (id && !z.uuid().safeParse(id).success)
    return { success: false, error: "شناسه معتبر نیست." };
  const values = { ...parsed.data, phone: parsed.data.phone || null };
  const { error } = id
    ? await db.from("players").update(values).eq("id", id)
    : await db.from("players").insert(values);
  if (error) return fail(error);
  refresh();
  return { success: true };
}
export async function deletePlayer(id: string): Promise<ActionResult> {
  const db = await requireAdmin();
  if (!z.uuid().safeParse(id).success)
    return { success: false, error: "شناسه معتبر نیست." };
  const { error } = await db.from("players").delete().eq("id", id);
  if (error?.code === "23503")
    return {
      success: false,
      error: "این بازیکن سابقه مسابقه دارد و قابل حذف نیست.",
    };
  if (error) return fail(error);
  refresh();
  return { success: true };
}
export async function createTournament(input: unknown): Promise<ActionResult> {
  const db = await requireAdmin();
  const parsed = tournamentSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };
  const { data, error } = await db.rpc("create_tournament", {
    p_title: parsed.data.title,
    p_date: parsed.data.date,
    p_player_ids: parsed.data.player_ids,
  });
  if (error) return fail(error);
  refresh();
  return { success: true, id: data as string };
}
export async function saveScores(
  matchId: string,
  version: number,
  sets: unknown,
): Promise<ActionResult> {
  const db = await requireAdmin();
  const parsed = scoreSchema.safeParse(sets);
  if (!parsed.success)
    return {
      success: false,
      error:
        "هر ست باید دو امتیاز صحیح متفاوت بین ۰ تا ۹۹ داشته باشد یا کاملاً خالی بماند.",
    };
  if (!z.uuid().safeParse(matchId).success || !Number.isInteger(version))
    return { success: false, error: "اطلاعات بازی معتبر نیست." };
  const { error } = await db.rpc("save_match_scores", {
    p_match_id: matchId,
    p_version: version,
    p_sets: parsed.data,
  });
  if (error) return fail(error);
  refresh();
  return { success: true };
}
export async function changeStatus(
  id: string,
  action: "start" | "finish",
): Promise<ActionResult> {
  const db = await requireAdmin();
  if (!z.uuid().safeParse(id).success || !["start", "finish"].includes(action))
    return { success: false, error: "درخواست معتبر نیست." };
  const { error } = await db.rpc(
    action === "start" ? "start_tournament" : "finish_tournament",
    { p_tournament_id: id },
  );
  if (error) return fail(error);
  refresh(id);
  return { success: true };
}
export async function recalculateTournamentStandings(
  tournamentId: string,
): Promise<ActionResult> {
  const db = await requireAdmin();
  if (!z.uuid().safeParse(tournamentId).success)
    return { success: false, error: "شناسه معتبر نیست." };
  const { error } = await db.rpc("recalculate_tournament_standings", {
    p_tournament_id: tournamentId,
  });
  if (error) return fail(error);
  refresh(tournamentId);
  return { success: true };
}
