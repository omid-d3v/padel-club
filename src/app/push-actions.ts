"use server";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireMember } from "@/lib/platform/data";
export async function registerPush(token: string) {
  const value = z.string().min(20).max(4096).parse(token);
  const { db } = await requireMember();
  const jar = await cookies();
  const device = z.uuid().safeParse(jar.get("rallyyar-push-device")?.value);
  const deviceId = device.success ? device.data : crypto.randomUUID();
  const { error } = await db.rpc("register_push_device", {
    p_device: deviceId,
    p_token: value,
  });
  if (error) return { success: false };
  jar.set("rallyyar-push-device", deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 31536000,
  });
  return { success: true };
}
export async function unregisterPush() {
  const { db } = await requireMember();
  const jar = await cookies();
  const device = z.uuid().safeParse(jar.get("rallyyar-push-device")?.value);
  if (device.success)
    await db.rpc("revoke_push_device", { p_device: device.data });
  jar.delete("rallyyar-push-device");
  return { success: true };
}
