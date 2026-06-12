/* ═══════════════════════════════════════════════════════════
   MYFOOTCV — SUPABASE CLIENT
   Gère: auth, profils, CV, paiements, admin, audit log
   ═══════════════════════════════════════════════════════════ */

const SUPABASE_URL = "https://jtclfbnanyngdprvxokg.supabase.co";
const SUPABASE_KEY = "sb_publishable_cq4LvMvSZnyzPHFTult_uw_kSUNIXf_";

// Charge le client Supabase (CDN ESM)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Expose globalement pour usage depuis index.html
window.MyFootCV = window.MyFootCV || {};
window.MyFootCV.supabase = supabase;

/* ─── AUTH ──────────────────────────────────────────────── */

window.MyFootCV.signUp = async (email, password, displayName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || email.split("@")[0] } }
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, user: data.user };
};

window.MyFootCV.signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, user: data.user, session: data.session };
};

window.MyFootCV.signInMagicLink = async (email) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin }
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: "Magic link envoyé ! Vérifie ton email." };
};

window.MyFootCV.signOut = async () => {
  await supabase.auth.signOut();
  return { ok: true };
};

window.MyFootCV.getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return { ...user, profile };
};

window.MyFootCV.onAuthChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => callback(event, session));
};

/* ─── CV ──────────────────────────────────────────────── */

window.MyFootCV.saveCv = async (cvData, type) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu dois être connecté" };

  const slug = (cvData.firstName + "-" + cvData.lastName + "-" + Date.now().toString(36))
    .toLowerCase().replace(/[^a-z0-9-]/g, "-");

  // Upsert : crée ou met à jour
  const { data, error } = await supabase
    .from("cvs")
    .upsert({
      user_id: user.id,
      slug: cvData.slug || slug,
      type,
      data: cvData,
      language: cvData.lang || "fr"
    }, { onConflict: "slug" })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, cv: data };
};

window.MyFootCV.getMyCvs = async () => {
  const { data, error } = await supabase
    .from("cvs")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, cvs: data };
};

window.MyFootCV.getPublicCv = async (slug) => {
  const { data, error } = await supabase
    .from("cvs")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (error) return { ok: false, error: "CV introuvable" };
  // Incrémente le compteur de vues
  await supabase.rpc("increment", { row_id: data.id, table_name: "cvs", column_name: "view_count" }).catch(() => {});
  return { ok: true, cv: data };
};

window.MyFootCV.publishCv = async (cvId) => {
  const { error } = await supabase
    .from("cvs")
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq("id", cvId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
};

/* ─── AUDIT LOG ──────────────────────────────────────── */

window.MyFootCV.logEvent = async (eventType, eventData = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_log").insert({
      user_id: user?.id || null,
      event_type: eventType,
      event_data: eventData,
      user_agent: navigator.userAgent
    });
  } catch (e) { /* silent */ }
};

/* ─── PROMO CODES ────────────────────────────────────── */

window.MyFootCV.validatePromoCode = async (code) => {
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .single();

  if (error || !data) return { ok: false, error: "Code invalide" };
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { ok: false, error: "Code expiré" };
  if (data.max_uses && data.current_uses >= data.max_uses) return { ok: false, error: "Code épuisé" };

  return { ok: true, code: data };
};

/* ─── ADMIN DASHBOARD (Super-Admin only) ─────────────── */

window.MyFootCV.admin = {
  // Stats globales (utilise la view stats_overview)
  getStats: async () => {
    const { data, error } = await supabase.from("stats_overview").select("*").single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, stats: data };
  },

  // Liste tous les utilisateurs
  listUsers: async (limit = 50, offset = 0) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) return { ok: false, error: error.message };
    return { ok: true, users: data };
  },

  // Liste tous les CV
  listCvs: async (limit = 50, offset = 0) => {
    const { data, error } = await supabase
      .from("cvs")
      .select("*, profiles(email, display_name)")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) return { ok: false, error: error.message };
    return { ok: true, cvs: data };
  },

  // Liste tous les paiements
  listPayments: async (limit = 50, offset = 0) => {
    const { data, error } = await supabase
      .from("payments")
      .select("*, profiles(email)")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) return { ok: false, error: error.message };
    return { ok: true, payments: data };
  },

  // Liste l'audit log
  listAuditLog: async (limit = 100) => {
    const { data, error } = await supabase
      .from("audit_log")
      .select("*, profiles(email)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { ok: false, error: error.message };
    return { ok: true, logs: data };
  },

  // Liste les CV flagués
  listFlaggedCvs: async () => {
    const { data, error } = await supabase
      .from("flagged_cvs")
      .select("*, cvs(slug, type, data), profiles(email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, flags: data };
  },

  // Crée un code promo
  createPromoCode: async (code, discountPercent, maxUses = null, expiresAt = null) => {
    const { data, error } = await supabase
      .from("promo_codes")
      .insert({
        code: code.toUpperCase(),
        discount_percent: discountPercent,
        max_uses: maxUses,
        expires_at: expiresAt
      })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, code: data };
  },

  // Liste les codes promo
  listPromoCodes: async () => {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, codes: data };
  },

  // Liste les parrainages en attente de paiement
  listPendingPayouts: async () => {
    const { data, error } = await supabase
      .from("referrals")
      .select("*, profiles!referrals_referrer_id_fkey(email, display_name)")
      .eq("status", "pending");
    if (error) return { ok: false, error: error.message };
    return { ok: true, payouts: data };
  },

  // Met à jour les settings app
  updateSetting: async (key, value) => {
    const { error } = await supabase
      .from("app_settings")
      .update({ value: JSON.stringify(value) })
      .eq("key", key);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
};

console.log("✅ MyFootCV Supabase client loaded");
