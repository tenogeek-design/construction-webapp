
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    // =====================================
    // 1. CONFIGURATION
    // =====================================

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Server configuration missing");
    }

    // =====================================
    // 2. AUTHENTICATION
    // =====================================

    const authorization = req.headers.authorization || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({
        error: "Authentication required"
      });
    }

    const token = match[1];

    // Проверяем JWT пользователя через серверный ключ
    const authClient = createClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const {
      data: authData,
      error: authError
    } = await authClient.auth.getUser(token);

    if (authError || !authData.user) {
      return res.status(401).json({
        error: "Invalid session"
      });
    }

    const user = authData.user;

    // =====================================
    // 3. OWNER CHECK
    // =====================================

    const {
      data: owner,
      error: ownerError
    } = await authClient
      .from("app_user_roles")
      .select("role_code")
      .eq("user_id", user.id)
      .eq("role_code", "owner")
      .is("revoked_at", null)
      .maybeSingle();

    if (ownerError) throw ownerError;

    if (!owner) {
      return res.status(403).json({
        error: "Only OWNER can review applications"
      });
    }

    // =====================================
    // 4. VALIDATE REQUEST
    // =====================================

    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    if (!body || typeof body !== "object") {
      return res.status(400).json({
        error: "Invalid request body"
      });
    }

    const requestId = body.requestId;
    const decision = body.decision;

    const comment = typeof body.comment === "string"
      ? body.comment.trim().slice(0, 2000)
      : null;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      typeof requestId !== "string" ||
      !uuidPattern.test(requestId)
    ) {
      return res.status(400).json({
        error: "Invalid application ID"
      });
    }

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({
        error: "Invalid decision"
      });
    }

    if (decision === "rejected" && !comment) {
      return res.status(400).json({
        error: "Please provide a rejection reason"
      });
    }

    // =====================================
    // 5. CALL DATABASE FUNCTION AS OWNER
    // =====================================

    // Важно: RPC вызывается с JWT самого OWNER,
    // чтобы auth.uid() и is_owner() работали правильно.

    const ownerClient = createClient(
      supabaseUrl,
      serviceKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const {
      data: result,
      error: reviewError
    } = await ownerClient.rpc(
      "review_company_join_request",
      {
        p_request_id: requestId,
        p_decision: decision,
        p_comment: comment
      }
    );

    if (reviewError) {
      console.error("Review RPC error:", reviewError);

      return res.status(400).json({
        error: reviewError.message
      });
    }

    // =====================================
    // 6. SUCCESS
    // =====================================

    return res.status(200).json({
      success: true,
      result
    });

  } catch (error) {
    console.error("Company review API error:", error);

    return res.status(500).json({
      error: "Could not process application"
    });
  }
}
