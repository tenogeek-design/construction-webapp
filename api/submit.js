
import { createClient } from "@supabase/supabase-js";

function getText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Supabase environment variables are missing"
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const data =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return res.status(400).json({
        error: "Invalid request data"
      });
    }

    // =====================================
    // 1. ПРОВЕРКА АВТОРИЗАЦИИ
    // =====================================

    let customerUserId = null;
    let customerEmail = null;

    const authorization =
      req.headers.authorization || "";

    if (authorization) {
      const match = authorization.match(/^Bearer\s+(.+)$/i);

      if (!match) {
        return res.status(401).json({
          error: "Invalid authorization header"
        });
      }

      const accessToken = match[1];

      const {
        data: authData,
        error: authError
      } = await supabase.auth.getUser(accessToken);

      if (authError || !authData.user) {
        return res.status(401).json({
          error: "Invalid or expired session"
        });
      }

      customerUserId = authData.user.id;
      customerEmail = authData.user.email || null;
    }

    // =====================================
    // 2. ПРОВЕРКА ДАННЫХ ЗАЯВКИ
    // =====================================

    const name = getText(data.name);
    const phone = getText(data.phone);
    const description = getText(data.description);

    const address = data.address || {};

    const city = getText(address.city);
    const street = getText(address.street);
    const building = getText(address.building);

    if (
      !name ||
      !phone ||
      !description ||
      !city ||
      !street ||
      !building
    ) {
      return res.status(400).json({
        error: "Please fill in all required fields"
      });
    }

    const calculator = data.calculator || {};
    const options = calculator.options || {};

    const hasElevator =
      typeof data.hasElevator === "boolean"
        ? data.hasElevator
        : data.objectElevator === "yes"
          ? true
          : data.objectElevator === "no"
            ? false
            : null;

    const additionalServices =
      Array.isArray(data.extras)
        ? data.extras
        : [];

    const calculatorItems =
      Array.isArray(calculator.works)
        ? calculator.works
        : [];

    // =====================================
    // 3. СОХРАНЕНИЕ ЗАЯВКИ
    // =====================================

    const { data: request, error } = await supabase
      .from("requests")
      .insert({
        customer_user_id: customerUserId,
        email: customerEmail,

        customer_name: name,
        phone: phone,

        city: city,
        street: street,
        building_number: building,

        apartment_number:
          getText(address.apartment) || null,

        description: description,
        object_type: data.objectType || null,
        area_sqm: data.area || null,
        object_condition: data.condition || null,

        preferred_start: data.startDate || null,

        calculator_items: calculatorItems,
        estimated_total: calculator.total ?? null,

        additional_services: additionalServices,
        debris_volume: data.wasteAmount || null,

        floor: data.objectFloor || null,
        has_elevator: hasElevator,

        is_direct_owner: Boolean(
          options.directOwner ?? options.owner ?? false
        ),

        contact_preference:
          data.contactPreference || null
      })
      .select("id, request_number")
      .single();

    if (error) {
      console.error("Supabase error:", error);

      throw new Error("Could not save request");
    }

    // =====================================
    // 4. TELEGRAM УВЕДОМЛЕНИЕ
    // =====================================

    const addressText = [
      city,
      `${street} ${building}`,
      address.apartment
        ? `кв. ${address.apartment}`
        : ""
    ].filter(Boolean).join(", ");

    const message = [
      "🏗 CONSTRUCTION — NOWA ZGŁOSZENIE",
      `Заявка № ${request.request_number}`,
      "",
      `👤 ${name}`,
      `📞 ${phone}`,
      `📍 ${addressText}`,
      "",
      `💰 ${calculator.total ?? "До уточнения"} PLN`,
      "",
      `📝 ${description}`,
      "",
      customerUserId
        ? "👤 Зарегистрированный заказчик"
        : "👤 Гостевая заявка"
    ].join("\n");

    try {
      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_GROUP_ID,
            text: message
          })
        }
      );

      if (!telegramResponse.ok) {
        console.error(
          "Telegram notification error:",
          await telegramResponse.text()
        );
      }

    } catch (telegramError) {
      console.error("Telegram error:", telegramError);
    }

    // =====================================
    // 5. УСПЕШНЫЙ ОТВЕТ
    // =====================================

    return res.status(200).json({
      success: true,
      requestId: request.id,
      requestNumber: request.request_number
    });

  } catch (error) {
    console.error(
      "Request submission error:",
      error
    );

    return res.status(500).json({
      error: "Could not submit request"
    });
  }
}
