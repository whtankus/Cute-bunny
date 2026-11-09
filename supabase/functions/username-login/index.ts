import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST to sign in." }, 405);

  try {
    const { identifier, password } = await req.json();
    if (typeof identifier !== "string" || typeof password !== "string" ||
        !identifier.trim() || !password) {
      return json({ error: "Enter your username or email and password." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let email = identifier.trim();
    if (!email.includes("@")) {
      const username = email.toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(username)) {
        return json({ error: "Invalid username or password." }, 401);
      }
      const { data: profile, error: profileError } = await admin
        .from("profiles").select("id").eq("username", username).maybeSingle();
      if (profileError || !profile) {
        return json({ error: "Invalid username or password." }, 401);
      }
      const { data: userResult, error: userError } =
        await admin.auth.admin.getUserById(profile.id);
      email = userResult.user?.email || "";
      if (userError || !email) {
        return json({ error: "Invalid username or password." }, 401);
      }
    }

    const auth = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await auth.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) {
      return json({ error: "Invalid username/email or password." }, 401);
    }

    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch {
    return json({ error: "Sign-in could not be completed. Please try again." }, 400);
  }
});

