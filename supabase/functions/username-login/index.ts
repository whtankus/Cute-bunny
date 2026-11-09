// Username sign-in for Cute Bunny. This function never returns account emails.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

interface LoginPayload {
  identifier?: string;
  password?: string;
}

export default {
  fetch: withSupabase({ auth: "publishable" }, async (req, ctx) => {
    try {
      const body: LoginPayload = await req.json();
      const identifier = body.identifier?.trim() ?? "";
      const password = body.password ?? "";
      if (!identifier || !password) {
        return Response.json({ error: "Enter your username/email and password." }, { status: 400 });
      }

      let email = identifier;
      if (!identifier.includes("@")) {
        const username = identifier.toLowerCase();
        if (!/^[a-z0-9_]{3,24}$/.test(username)) {
          return Response.json({ error: "Invalid username/email or password." }, { status: 401 });
        }

        const { data: profile, error: profileError } = await ctx.supabaseAdmin
          .from("profiles").select("id").eq("username", username).maybeSingle();
        if (profileError || !profile) {
          return Response.json({ error: "Invalid username/email or password." }, { status: 401 });
        }

        const { data: userResult, error: userError } =
          await ctx.supabaseAdmin.auth.admin.getUserById(profile.id);
        email = userResult.user?.email ?? "";
        if (userError || !email) {
          return Response.json({ error: "Invalid username/email or password." }, { status: 401 });
        }
      }

      const { data, error } = await ctx.supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        return Response.json({ error: "Invalid username/email or password." }, { status: 401 });
      }

      return Response.json({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    } catch {
      return Response.json({ error: "Sign-in could not be completed. Please try again." }, { status: 400 });
    }
  }),
};

