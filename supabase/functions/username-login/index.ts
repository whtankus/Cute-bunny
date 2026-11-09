import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Use POST to sign in." }, 405);
  try {
    const body = await req.json();
    const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!identifier || !password) return reply({ error: "Enter your username/email and password." }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let email = identifier;
    if (!identifier.includes("@")) {
      const username = identifier.toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(username)) return reply({ error: "Invalid username/email or password." }, 401);
      const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: profile, error: profileError } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
      if (profileError || !profile) return reply({ error: "Invalid username/email or password." }, 401);
      const { data: result, error: userError } = await admin.auth.admin.getUserById(profile.id);
      email = result.user?.email || "";
      if (userError || !email) return reply({ error: "Invalid username/email or password." }, 401);
    }

    const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error || !data.session) return reply({ error: "Invalid username/email or password." }, 401);
    return reply({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch {
    return reply({ error: "Sign-in could not be completed. Please try again." }, 400);
  }
});

