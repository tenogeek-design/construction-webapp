
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const data = req.body;

    if (!data.name || !data.phone || !data.description) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    const { data: request, error } = await supabase
      .from("requests")
      .insert({
        customer_name: data.name,
        phone: data.phone,
        city: data.address?.city,
        street: data.address?.street,
        building_number: data.address?.building,
        apartment_number: data.address?.apartment || null,
        description: data.description,
        object_type: data.objectType || null,
        area_sqm: data.area || null,
        object_condition: data.condition || null,
        preferred_start: data.startDate || null,
        calculator_items: data.calculator?.works || [],
        estimated_total: data.calculator?.total ?? null,
        additional_services: data.extras || [],
        debris_volume: data.wasteAmount || null,
        floor: data.objectFloor || null,
        has_elevator: data.objectElevator === "yes",
        is_direct_owner: Boolean(data.calculator?.options?.directOwner)
      })
      .select()
      .single();

    if (error) throw error;

    const message = [
      "🏗 <b>CONSTRUCTION</b> — NOWA",
      `Заявка № ${request.request_number}`,
      "",
      `👤 ${data.name}`,
      `📞 ${data.phone}`,
      `📍 ${data.address?.city || ""}, ${data.address?.street || ""} ${data.address?.building || ""}`,
      "",
      `💰 ${data.calculator?.total ?? "Wartość do ustalenia"} PLN`,
      `📝 ${data.description}`
    ].join("\n");

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_GROUP_ID,
          text: message,
          parse_mode: "HTML"
        })
      }
    );

    if (!telegramResponse.ok) {
      throw new Error("Telegram notification failed");
    }

    return res.status(200).json({
      success: true,
      requestNumber: request.request_number
    });

  } catch (error) {
    console.error("Request submission error:", error);
    return res.status(500).json({
      error: "Could not submit request"
    });
  }
}
