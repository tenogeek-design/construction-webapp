
import { createClient } from "@supabase/supabase-js";

function getText(value, max = 500) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function getStringArray(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(item => typeof item === "string")
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Server configuration error");
    }

    const supabase = createClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // =====================================
    // 1. AUTHENTICATION
    // =====================================

    const authorization = req.headers.authorization || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({
        error: "Authentication required"
      });
    }

    const {
      data: authData,
      error: authError
    } = await supabase.auth.getUser(match[1]);

    if (authError || !authData.user) {
      return res.status(401).json({
        error: "Invalid or expired session"
      });
    }

    const user = authData.user;

    // =====================================
    // 2. REQUEST DATA
    // =====================================

    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({
        error: "Invalid request data"
      });
    }

    const fullName = getText(body.fullName, 150);
    const phone = getText(body.phone, 40);

    const requestedRole = body.requestedRole;
    const cooperationType = body.cooperationType;

    if (!fullName || !phone) {
      return res.status(400).json({
        error: "Name and phone are required"
      });
    }

    if (!["worker", "foreman"].includes(requestedRole)) {
      return res.status(400).json({
        error: "Invalid requested role"
      });
    }

    if (!["individual", "own_brigade"].includes(cooperationType)) {
      return res.status(400).json({
        error: "Invalid cooperation type"
      });
    }

    const experience = body.experienceYears;

    if (
      experience !== undefined &&
      experience !== null &&
      (
        !Number.isFinite(Number(experience)) ||
        Number(experience) < 0 ||
        Number(experience) > 80
      )
    ) {
      return res.status(400).json({
        error: "Invalid experience"
      });
    }

    const brigadeName = getText(body.brigadeName, 150);

    const brigadeSize = body.brigadeSize == null
      ? null
      : Number(body.brigadeSize);

    if (
      brigadeSize !== null &&
      (
        !Number.isInteger(brigadeSize) ||
        brigadeSize < 1 ||
        brigadeSize > 200
      )
    ) {
      return res.status(400).json({
        error: "Invalid brigade size"
      });
    }

    if (
      cooperationType === "own_brigade" &&
      !brigadeName
    ) {
      return res.status(400).json({
        error: "Brigade name is required"
      });
    }

    const members = Array.isArray(body.brigadeMembers)
      ? body.brigadeMembers.slice(0, 200)
      : [];

    const brigadeMembers = members.map(member => ({
      full_name: getText(member?.fullName, 150),
      phone: getText(member?.phone, 40),
      specialization: getText(member?.specialization, 150)
    })).filter(member => member.full_name);

    // =====================================
    // 3. SAVE APPLICATION
    // =====================================

    const { data: application, error } = await supabase
      .from("company_join_requests")
      .insert({
        applicant_user_id: user.id,

        full_name: fullName,
        email: user.email,
        phone: phone,

        requested_role: requestedRole,
        cooperation_type: cooperationType,

        experience_years:
          experience == null ? null : Number(experience),

        specialization: getStringArray(body.specialization),

        brigade_name:
          cooperationType === "own_brigade"
            ? brigadeName
            : null,

        brigade_size:
          cooperationType === "own_brigade"
            ? brigadeSize
            : null,

        brigade_specializations:
          getStringArray(body.brigadeSpecializations),

        brigade_has_tools:
          typeof body.brigadeHasTools === "boolean"
            ? body.brigadeHasTools
            : null,

        brigade_has_transport:
          typeof body.brigadeHasTransport === "boolean"
            ? body.brigadeHasTransport
            : null,

        brigade_members_data:
          cooperationType === "own_brigade"
            ? brigadeMembers
            : [],

        additional_info: getText(body.additionalInfo, 3000)
      })
      .select("id, status, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "У вас уже есть активная заявка."
        });
      }

      console.error("Application error:", error);

      throw new Error("Could not save application");
    }

    return res.status(201).json({
      success: true,
      application
    });

  } catch (error) {
    console.error("Company join request error:", error);

    return res.status(500).json({
      error: "Could not submit application"
    });
  }
}
