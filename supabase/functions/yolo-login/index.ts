import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
) {
  let page = 1;
  const perPage = 1000;
  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

/** Se l'action_link contiene già #access_token / #refresh_token (flusso implicito). */
function tokensFromUrlHash(actionLink: string): {
  access_token?: string;
  refresh_token?: string;
} {
  const i = actionLink.indexOf("#");
  if (i === -1) return {};
  const params = new URLSearchParams(actionLink.slice(i + 1));
  return {
    access_token: params.get("access_token") ?? undefined,
    refresh_token: params.get("refresh_token") ?? undefined,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      console.error("Missing SUPABASE_URL, SERVICE_ROLE_KEY or ANON_KEY");
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }

    let body: { email?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const raw = body.email?.trim();
    if (!raw) {
      return jsonResponse({ error: "email richiesto" }, 400);
    }
    const email = raw.toLowerCase();

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: allowed, error: allowErr } = await admin
      .from("allowed_emails")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (allowErr) {
      console.error("allowed_emails:", allowErr);
      return jsonResponse({ error: "Errore verifica email" }, 500);
    }
    if (!allowed) {
      return jsonResponse({ error: "Email non autorizzata" }, 401);
    }

    const existing = await findUserByEmail(admin, email);
    if (!existing) {
      const { error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (createErr) {
        if (!/already|registered|exists/i.test(createErr.message ?? "")) {
          console.error("createUser:", createErr);
          return jsonResponse({ error: createErr.message }, 500);
        }
      }
    }

    const { data: linkData, error: linkErr } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkErr || !linkData?.properties) {
      console.error("generateLink:", linkErr);
      return jsonResponse(
        { error: linkErr?.message ?? "generateLink fallito" },
        500,
      );
    }

    const { action_link, hashed_token, email_otp } = linkData.properties;
    const fromHash = tokensFromUrlHash(action_link);
    if (fromHash.access_token && fromHash.refresh_token) {
      return jsonResponse({
        access_token: fromHash.access_token,
        refresh_token: fromHash.refresh_token,
      });
    }

    const anon = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: sessData, error: verifyErr } = await anon.auth.verifyOtp({
      token_hash: hashed_token,
      type: "magiclink",
    });

    if (!verifyErr && sessData?.session) {
      const s = sessData.session;
      return jsonResponse({
        access_token: s.access_token,
        refresh_token: s.refresh_token,
      });
    }

    if (email_otp) {
      const second = await anon.auth.verifyOtp({
        email,
        token: email_otp,
        type: "magiclink",
      });
      if (!second.error && second.data.session) {
        const s = second.data.session;
        return jsonResponse({
          access_token: s.access_token,
          refresh_token: s.refresh_token,
        });
      }
    }

    console.error("verifyOtp:", verifyErr);
    return jsonResponse(
      { error: verifyErr?.message ?? "Verifica sessione fallita" },
      500,
    );
  } catch (e) {
    console.error(e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : "Errore interno" },
      500,
    );
  }
});
