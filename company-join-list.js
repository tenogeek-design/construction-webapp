
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Проверяем токен
    const authorization = req.headers.authorization || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({
        error: "Authentication required"
      });
    }

    // 2. Проверяем пользователя
    const {
      data: authData,
      error: authError
    } = await supabase.auth.getUser(match[1]);

    if (authError || !authData.user) {
      return res.status(401).json({
        error: "Invalid session"
      });
    }

    const user = authData.user;

    // 3. Проверяем роль OWNER
    const {
      data: owner,
      error: ownerError
    } = await supabase
      .from("app_user_roles")
      .select("role_code")
      .eq("user_id", user.id)
      .eq("role_code", "owner")
      .is("revoked_at", null)
      .maybeSingle();

    if (ownerError) throw ownerError;

    if (!owner) {
      return res.status(403).json({
        error: "OWNER access required"
      });
    }

    // 4. Загружаем заявки
    const {
      data: applications,
      error: applicationsError
    } = await supabase
      .from("company_join_requests")
      .select("*")
      .order("created_at", {
        ascending: false
      })
      .limit(200);

    if (applicationsError) throw applicationsError;

    // 5. Статистика
    const result = applications || [];

    return res.status(200).json({
      success: true,

      statistics: {
        total: result.length,
        pending: result.filter(
          item => item.status === "pending"
        ).length,
        under_review: result.filter(
          item => item.status === "under_review"
        ).length,
        approved: result.filter(
          item => item.status === "approved"
        ).length,
        rejected: result.filter(
          item => item.status === "rejected"
        ).length
      },

      applications: result
    });

  } catch (error) {
    console.error("Company join list error:", error);

    return res.status(500).json({
      error: "Could not load applications"
    });
  }
}
