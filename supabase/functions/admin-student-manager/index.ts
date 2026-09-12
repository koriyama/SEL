// Supabase Edge Function: admin-student-manager
// Two actions:
//   create_bulk:     create many student accounts at once
//   reset_password:  reset one student's password
//
// Only callable by a logged-in teacher or admin.
// Uses the service_role key (server-side only).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreateBulkRow {
  institutional_id: string;
  display_name: string;
  password?: string;
}

interface CreateBulkPayload {
  action: "create_bulk";
  students: CreateBulkRow[];
  class_id?: string;
}

interface ResetPasswordPayload {
  action: "reset_password";
  student_id: string;
}

type Payload = CreateBulkPayload | ResetPasswordPayload;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generatePassword(): string {
  // Avoid easily-confused characters (no l, 1, O, 0).
  const chars =
    "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function makeStudentEmail(institutionalId: string): string {
  // Supabase Auth requires an email. We use a fake domain so
  // students never see or need a real email address.
  // Normalize the ID: lowercase, strip anything not a-z0-9.
  const safe = institutionalId.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${safe}@students.local`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // ---------- 1. Verify the caller ----------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse(
        { error: "Server is misconfigured (missing secrets)" },
        500,
      );
    }

    // Client bound to the caller's JWT — used only to identify them.
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } =
      await callerClient.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "Invalid or expired token" }, 401);
    }

    const callerId = userData.user.id;

    // Service-role client — used for admin work.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Confirm the caller is a teacher or admin.
    const { data: callerProfile, error: profileErr } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .single();

    if (profileErr || !callerProfile) {
      return jsonResponse({ error: "Caller profile not found" }, 403);
    }

    if (callerProfile.role !== "teacher" && callerProfile.role !== "admin") {
      return jsonResponse(
        { error: "Only teachers and admins can manage students" },
        403,
      );
    }

    // ---------- 2. Parse the body ----------
    const payload = (await req.json()) as Payload;

    if (payload.action === "create_bulk") {
      return await handleCreateBulk(adminClient, payload);
    }

    if (payload.action === "reset_password") {
      return await handleResetPassword(adminClient, payload);
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("admin-student-manager error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

// ---------- create_bulk ----------
async function handleCreateBulk(
  adminClient: ReturnType<typeof createClient>,
  payload: CreateBulkPayload,
): Promise<Response> {
  const rows = Array.isArray(payload.students) ? payload.students : [];
  const classId =
    typeof payload.class_id === "string" && payload.class_id.length > 0
      ? payload.class_id
      : null;

  const results: Array<{
    institutional_id: string;
    display_name: string;
    status: "created" | "already_exists" | "error";
    error?: string;
    temp_password?: string;
    user_id?: string;
  }> = [];

  for (const row of rows) {
    const iidRaw = (row.institutional_id ?? "").toString().trim();
    const name = (row.display_name ?? "").toString().trim();

    if (!iidRaw || !name) {
      results.push({
        institutional_id: iidRaw,
        display_name: name,
        status: "error",
        error: "Missing institutional_id or display_name",
      });
      continue;
    }

    const email = makeStudentEmail(iidRaw);
    const plainPassword =
      row.password && row.password.length >= 6
        ? row.password
        : generatePassword();
    const usedTempPassword = !(row.password && row.password.length >= 6);

    // Check whether this institutional_id already exists.
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, display_name")
      .eq("institutional_id", iidRaw)
      .maybeSingle();

    if (existingProfile) {
      // Already exists. Optionally enroll in the class if asked.
      if (classId) {
        await adminClient.from("class_members").upsert(
          {
            class_id: classId,
            student_id: existingProfile.id,
          },
          { onConflict: "class_id,student_id" },
        );
      }
      results.push({
        institutional_id: iidRaw,
        display_name: existingProfile.display_name,
        status: "already_exists",
        user_id: existingProfile.id,
      });
      continue;
    }

    // Create the auth user.
    const { data: created, error: createErr } =
      await adminClient.auth.admin.createUser({
        email,
        password: plainPassword,
        email_confirm: true,
        user_metadata: {
          institutional_id: iidRaw,
          display_name: name,
        },
      });

    if (createErr || !created?.user) {
      results.push({
        institutional_id: iidRaw,
        display_name: name,
        status: "error",
        error: createErr?.message ?? "Failed to create user",
      });
      continue;
    }

    const newUserId = created.user.id;

    // Create the profile row.
    const { error: profileInsertErr } = await adminClient
      .from("profiles")
      .insert({
        id: newUserId,
        institutional_id: iidRaw,
        display_name: name,
        role: "student",
        must_change_password: usedTempPassword,
      });

    if (profileInsertErr) {
      // Roll back the auth user to keep things clean.
      await adminClient.auth.admin.deleteUser(newUserId);
      results.push({
        institutional_id: iidRaw,
        display_name: name,
        status: "error",
        error: profileInsertErr.message,
      });
      continue;
    }

    // Optional: enroll in the class.
    if (classId) {
      await adminClient.from("class_members").insert({
        class_id: classId,
        student_id: newUserId,
      });
    }

    results.push({
      institutional_id: iidRaw,
      display_name: name,
      status: "created",
      temp_password: usedTempPassword ? plainPassword : undefined,
      user_id: newUserId,
    });
  }

  return jsonResponse({ results });
}

// ---------- reset_password ----------
async function handleResetPassword(
  adminClient: ReturnType<typeof createClient>,
  payload: ResetPasswordPayload,
): Promise<Response> {
  const studentId = (payload.student_id ?? "").trim();
  if (!studentId) {
    return jsonResponse({ error: "Missing student_id" }, 400);
  }

  const newTemp = generatePassword();

  const { error: updateErr } = await adminClient.auth.admin.updateUserById(
    studentId,
    { password: newTemp },
  );

  if (updateErr) {
    return jsonResponse({ error: updateErr.message }, 500);
  }

  const { error: flagErr } = await adminClient
    .from("profiles")
    .update({ must_change_password: true, updated_at: new Date().toISOString() })
    .eq("id", studentId);

  if (flagErr) {
    return jsonResponse({ error: flagErr.message }, 500);
  }

  return jsonResponse({ temp_password: newTemp });
}