// जेवर कौशल अभियान: सार्वजनिक फ़ॉर्म का एकमात्र रास्ता (bot व spam सुरक्षा के साथ)
// Deploy: Supabase project "jewar-kaushal" → Edge Function "submit" (verify_jwt = false; यह function खुद जाँच करता है)
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED = [
  "https://vickiedevil.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];
// action -> [खिड़की (मिनट), उसमें एक IP से अधिकतम बार]
// ध्यान: Jio/Airtel में कई लोग एक ही IP साझा करते हैं, इसलिए सीमा बहुत कम नहीं रखी।
const LIMITS: Record<string, Array<[number, number]>> = {
  support: [[60, 20], [1440, 100]],
  comment: [[10, 5], [1440, 40]],
  react: [[60, 60]],
  poll: [[1440, 10]],
};
const SKILLS = ["computer", "electrician", "airport", "silai", "english", "other"];
const KINDS = ["agree", "same_story", "know_more"];

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

function cors(origin: string | null) {
  const ok = origin && ALLOWED.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin! : ALLOWED[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Vary": "Origin",
  };
}
function reply(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });
}
async function hashIp(ip: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(sig)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);

async function limited(ipHash: string, action: string) {
  for (const [mins, max] of LIMITS[action]) {
    const since = new Date(Date.now() - mins * 60000).toISOString();
    const { count } = await db.from("rate_events").select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).eq("action", action).gte("created_at", since);
    if ((count ?? 0) >= max) return true;
  }
  await db.from("rate_events").insert({ ip_hash: ipHash, action });
  if (Math.random() < 0.02) await db.from("rate_events").delete().lt("created_at", new Date(Date.now() - 2 * 86400000).toISOString());
  return false;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return reply(405, { error: "method" }, origin);
  if (!origin || !ALLOWED.includes(origin)) return reply(403, { error: "origin" }, origin);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return reply(400, { error: "bad_json" }, origin); }
  if (JSON.stringify(b).length > 4000) return reply(413, { error: "too_big" }, origin);

  const action = String(b.action || "");
  if (!LIMITS[action]) return reply(400, { error: "action" }, origin);

  // bot जाल: छिपा field भरा हो या फ़ॉर्म 3 सेकंड से कम में भरा गया हो → चुपचाप अनदेखा
  const elapsed = Number(b.t || 0);
  if (clean(b.website, 100) !== "" || ((action === "support" || action === "comment") && !(elapsed >= 3000))) {
    return reply(200, { ok: true }, origin);
  }

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const ipHash = await hashIp(ip);
  if (await limited(ipHash, action)) return reply(429, { error: "rate" }, origin);

  if (action === "support") {
    const name = clean(b.name, 60), village = clean(b.village, 60);
    const mobile = String(b.mobile || "").replace(/\D/g, "").replace(/^(91|0)(?=[6-9]\d{9}$)/, "");
    if (name.length < 2 || village.length < 2 || !/^[6-9]\d{9}$/.test(mobile) || b.adult !== true) return reply(400, { error: "invalid" }, origin);
    if (/^(\d)\1{9}$/.test(mobile)) return reply(400, { error: "invalid" }, origin);
    const src = /^[a-z0-9_-]{1,30}$/i.test(String(b.src || "")) ? String(b.src) : null;
    const { error } = await db.from("supporters").insert({ name, mobile, village, is_adult: true, wants_updates: b.updates === true, src, ip_hash: ipHash });
    if (error) return reply(error.code === "23505" ? 409 : 500, { error: error.code === "23505" ? "duplicate" : "db" }, origin);
    return reply(200, { ok: true }, origin);
  }

  if (action === "comment") {
    const slug = clean(b.slug, 80), body = clean(b.body, 1500);
    const name = b.anon === true ? null : clean(b.name, 60);
    const village = clean(b.village, 60) || null;
    const parent = b.parent_id == null ? null : Number(b.parent_id);
    if (!/^[a-z0-9-]{1,80}$/.test(slug) || body.length < 3 || (name !== null && name.length < 2) || (parent !== null && !Number.isInteger(parent))) return reply(400, { error: "invalid" }, origin);
    const { error } = await db.from("comments").insert({ post_slug: slug, parent_id: parent, name, village, body, ip_hash: ipHash });
    if (error) return reply(500, { error: "db" }, origin);
    return reply(200, { ok: true, pending: true }, origin);
  }

  if (action === "react") {
    const target = clean(b.target, 100), kind = String(b.kind || "");
    if (!/^(post|comment):[a-z0-9-]{1,80}$/.test(target) || !KINDS.includes(kind)) return reply(400, { error: "invalid" }, origin);
    const { error } = await db.from("reactions").insert({ target, kind, ip_hash: ipHash });
    if (error) return reply(500, { error: "db" }, origin);
    return reply(200, { ok: true }, origin);
  }

  if (action === "poll") {
    const choices = Array.isArray(b.choices) ? [...new Set(b.choices.map(String))].filter((c) => SKILLS.includes(c)) : [];
    if (!choices.length) return reply(400, { error: "invalid" }, origin);
    const { error } = await db.from("skill_poll").insert({ choices, ip_hash: ipHash });
    if (error) return reply(500, { error: "db" }, origin);
    return reply(200, { ok: true }, origin);
  }
  return reply(400, { error: "action" }, origin);
});
