import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_IMAGE_URL = "https://openrouter.ai/api/v1/images";
const OPENROUTER_IMAGE_MODEL = process.env.OPENROUTER_IMAGE_MODEL || "openai/gpt-5-image";
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;
const POLLINATIONS_IMAGE_MODEL = process.env.POLLINATIONS_IMAGE_MODEL || "flux";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SUPABASE_REST_URL = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : null;
const SUPABASE_TIMEOUT_MS = 10000;

async function supabaseRequest(path, options = {}) {
  if (!SUPABASE_REST_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase sozlanmagan");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${SUPABASE_REST_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Supabase bazasi 10 soniyada javob bermadi");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`Supabase xatosi: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function callOpenRouter(messages, temperature = 0.7) {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY .env faylida sozlanmagan");
  let res;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-4o-mini", messages, temperature }),
    });
  } catch (error) {
    const code = error.cause?.code || error.code;
    throw new Error(`OpenRouterga ulanish amalga oshmadi: ${code || error.message}`);
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenRouter xatosi: ${res.status} ${txt}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// Sog'lik tekshiruvi
app.get("/api/holat", async (req, res) => {
  let baza = false;
  let bazaXatosi = null;
  try {
    await supabaseRequest("/saved_materials?select=id&limit=1");
    baza = true;
  } catch (error) {
    bazaXatosi = error.message;
  }
  res.status(baza ? 200 : 503).json({ holat: baza ? "ishlamoqda" : "baza xatosi", baza, bazaXatosi, vaqt: new Date().toISOString() });
});

app.get("/api/config", (req, res) => {
  res.json({ supabaseUrl: SUPABASE_URL, supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null });
});

function adminOnly(req, res, next) {
  if (!ADMIN_PASSWORD) return res.status(503).json({ xato: "ADMIN_PASSWORD .env faylida sozlanmagan" });
  if (req.headers["x-admin-password"] !== ADMIN_PASSWORD) return res.status(401).json({ xato: "Admin paroli noto'g'ri" });
  next();
}

app.get("/api/admin/summary", adminOnly, async (req, res) => {
  try {
    const [materials, subscriptions] = await Promise.all([
      supabaseRequest("/saved_materials?select=id,user_id,fan,sinf,mavzu,created_at&order=created_at.desc&limit=100"),
      supabaseRequest("/subscriptions?select=user_id,plan,status,expires_at,daily_images,daily_slides,images_used,slides_used,usage_date&limit=100"),
    ]);
    const users = new Set([...materials, ...subscriptions].map((item) => item.user_id).filter(Boolean));
    res.json({ users: users.size, materials, subscriptions });
  } catch (e) { res.status(500).json({ xato: e.message }); }
});

app.get("/api/saqlanganlar", async (req, res) => {
  try {
    const userId = encodeURIComponent(req.query.user_id || "anonymous");
    const data = await supabaseRequest(`/saved_materials?user_id=eq.${userId}&order=created_at.desc`);
    res.json({ materials: data });
  } catch (e) { res.status(500).json({ xato: e.message }); }
});

app.post("/api/saqlanganlar", async (req, res) => {
  try {
    const { user_id, fan, sinf, mavzu, desc_text, icon, cover } = req.body;
    if (!fan || !sinf || !mavzu) return res.status(400).json({ xato: "Fan, sinf va mavzu kiritilishi shart" });
    const data = await supabaseRequest("/saved_materials", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ user_id: user_id || "anonymous", fan, sinf, mavzu, desc_text, icon, cover }),
    });
    res.status(201).json({ material: data?.[0] });
  } catch (e) { res.status(500).json({ xato: e.message }); }
});

app.delete("/api/saqlanganlar/:id", async (req, res) => {
  try {
    const userId = encodeURIComponent(req.query.user_id || "");
    if (!userId) return res.status(400).json({ xato: "Foydalanuvchi aniqlanmadi" });
    await supabaseRequest(`/saved_materials?id=eq.${encodeURIComponent(req.params.id)}&user_id=eq.${userId}`, { method: "DELETE" });
    res.json({ muvaffaqiyat: true });
  } catch (e) { res.status(500).json({ xato: e.message }); }
});

// AI savol yaratish (ochiq savollar)
app.post("/api/savol-yaratish", async (req, res) => {
  try {
    const { fan, sinf, mavzu, daraja } = req.body;
    if (!fan || !sinf || !mavzu || !daraja) return res.status(400).json({ xato: "Fan, sinf, mavzu va qiyinlik darajasi kiritilishi shart" });
    const messages = [
      {
        role: "system",
        content:
          "Sen o'zbek tilida o'qituvchilar uchun dars savollari yaratuvchi yordamchisan. Savollar dars jarayonida o'quvchilarga beriladi. Faqat to'g'ri, aniq va yosh o'quvchilar uchun tushunarli savollar ber.",
      },
      {
        role: "user",
        content: `Fan: ${fan}, Sinf: ${sinf}, Mavzu: ${mavzu}, Qiyinlik darajasi: ${daraja}. Shu mavzuda o'qituvchi darsda berishi uchun 5 ta ochiq savol yarat. Har bir savolni raqamlang.`,
      },
    ];
    const content = await callOpenRouter(messages, 0.7);
    res.json({ natija: content });
  } catch (e) {
    res.status(500).json({ xato: e.message });
  }
});


// Dars Race test savollari
app.post("/api/poyga-savollari", async (req, res) => {
  try {
    const { fan, sinf, mavzu, daraja, son } = req.body;
    const count = Number(son);
    if (!fan || !sinf || !mavzu || !daraja || !Number.isInteger(count) || count < 1 || count > 30) {
      return res.status(400).json({ xato: "Fan, sinf, mavzu, qiyinlik va 1–30 oralig‘idagi savollar soni kiritilishi shart" });
    }
    const messages = [
      {
        role: "system",
        content:
          "Sen o'zbek tilida o'qituvchilar uchun dars test savollari yaratuvchi yordamchisan. Savollar o'qituvchi tomonidan sinfda o'tkaziladigan poynga uchun mo'ljallangan. Javobni FAQAT JSON formatda qaytar. Format: [{\"savol\":\"...\",\"variantlar\":[\"A...\",\"B...\",\"C...\",\"D...\"],\"togri\":0}] bunda togri indeks 0-3.",
      },
      {
        role: "user",
        content: `Fan: ${fan}, Sinf: ${sinf}, Mavzu: ${mavzu}, Qiyinlik: ${daraja}. O'qituvchi dars uchun ${count} ta test savoli yarat. Har birida 4 ta variant. Faqat JSON qaytar.`,
      },
    ];
    const content = await callOpenRouter(messages, 0.5);
    let savollar;
    try {
      savollar = JSON.parse(content);
    } catch {
      const m = content.match(/\[[\s\S]*\]/);
      savollar = m ? JSON.parse(m[0]) : [];
    }
    res.json({ savollar });
  } catch (e) {
    res.status(500).json({ xato: e.message });
  }
});

app.post("/api/bellashuv-savollari", async (req, res) => {
  try {
    const { fan, sinf } = req.body;
    if (!fan || !sinf) return res.status(400).json({ xato: "Fan va sinfni tanlang" });
    const content = await callOpenRouter([
      { role: "system", content: "Sen o‘zbek tilida 2 kishilik tezkor ta’limiy bellashuv uchun savollar yaratuvchi yordamchisan. Faqat JSON qaytar: [{\"savol\":\"...\",\"variantlar\":[\"A\",\"B\",\"C\",\"D\"],\"togri\":0}]." },
      { role: "user", content: `${fan} fanidan ${sinf} sinf darajasiga mos, turli mavzulardan 30 soniyalik bellashuv uchun 20 ta qisqa test savoli yarat. Har birida 4 variant bo‘lsin. Faqat JSON qaytar.` },
    ], 0.4);
    const match = content.match(/\[[\s\S]*\]/);
    const questions = match ? JSON.parse(match[0]) : [];
    res.json({ savollar: Array.isArray(questions) ? questions.slice(0, 20) : [] });
  } catch (e) { res.status(500).json({ xato: e.message }); }
});

// Rasm yaratish
app.post("/api/rasm-yaratish", async (req, res) => {
  try {
    const { fan, sinf, mavzu, rasmTuri, izoh } = req.body;
    if (!fan || !sinf || !mavzu || !rasmTuri) return res.status(400).json({ xato: "Fan, sinf, mavzu va rasm turi kiritilishi shart" });
    if (!POLLINATIONS_API_KEY && !OPENROUTER_API_KEY) return res.status(503).json({ xato: "Rasm yaratish API kaliti sozlanmagan" });
    const prompt = `O'zbek tilidagi ta'limiy ${rasmTuri}. Fan: ${fan}. Sinf: ${sinf}. Mavzu: ${mavzu}. Rasm ichidagi barcha sarlavha, yozuv, belgi va atamalar faqat o'zbek tilida, lotin yozuvida bo'lsin. Rasm aniq, sodda va o'quvchilar uchun tushunarli bo'lsin. ${izoh || "Darsda foydalanish uchun ilmiy jihatdan to'g'ri va chiroyli ko'rinish."}`;
    if (POLLINATIONS_API_KEY) {
      const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${encodeURIComponent(POLLINATIONS_IMAGE_MODEL)}`;
      const imageRes = await fetch(url, {
        headers: { Authorization: `Bearer ${POLLINATIONS_API_KEY}` },
      });
      if (!imageRes.ok) throw new Error(`Pollinations rasm xatosi: ${imageRes.status} ${await imageRes.text()}`);
      const mime = imageRes.headers.get("content-type") || "image/png";
      const base64 = Buffer.from(await imageRes.arrayBuffer()).toString("base64");
      let tushuntirish = `${fan} fanidan “${mavzu}” mavzusi bo‘yicha ta’limiy rasm. Rasmda mavzuning asosiy tushunchalari o‘zbek tilida ko‘rsatilgan bo‘lib, undan darsni tushuntirishda foydalanish mumkin.`;
      const mavzuPast = mavzu.toLowerCase();
      if (fan.toLowerCase() === "fizika" && (mavzuPast.includes("tok") || mavzuPast.includes("elektr"))) {
        tushuntirish = `Elektr toki — zaryadlangan zarrachalarning tartibli harakati. Tok kuchi amperda o‘lchanadi, kuchlanish volt bilan, qarshilik esa om bilan ifodalanadi. Ular orasidagi bog‘lanish Om qonuni: I = U / R.`;
      } else if (fan.toLowerCase() === "matematika") {
        tushuntirish = `Ushbu rasm ${mavzu} mavzusining asosiy qoidalarini ko‘rsatadi. Belgilar va misollar o‘zbek tilida berilgan bo‘lib, mavzuni bosqichma-bosqich tushunishga yordam beradi.`;
      } else if (fan.toLowerCase() === "biologiya") {
        tushuntirish = `Ushbu rasm ${mavzu} mavzusidagi asosiy biologik tuzilmalar va jarayonlarni ko‘rsatadi. Rasm orqali qismlarning vazifasi va o‘zaro bog‘liqligini tushuntirish mumkin.`;
      }
      return res.json({ rasm: `data:${mime};base64,${base64}`, prompt, izoh: tushuntirish, provider: "pollinations" });
    }
    const imageRes = await fetch(OPENROUTER_IMAGE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: OPENROUTER_IMAGE_MODEL, prompt, n: 1 }),
    });
    if (!imageRes.ok) throw new Error(`OpenRouter rasm xatosi: ${imageRes.status} ${await imageRes.text()}`);
    const data = await imageRes.json();
    const imageData = data.data?.[0] || data.images?.[0] || data.output?.[0];
    const image = imageData?.b64_json || imageData?.base64;
    const imageUrl = imageData?.url || imageData?.image_url?.url || (typeof imageData === "string" ? imageData : null);
    if (!image && !imageUrl) throw new Error("OpenRouter rasm qaytarmadi");
    res.json({
      rasm: image ? `data:${imageData?.mime_type || "image/png"};base64,${image}` : imageUrl,
      prompt,
    });
  } catch (e) {
    res.status(500).json({ xato: e.message });
  }
});

// AI dars slaydlari yaratish
app.post("/api/slayd-yaratish", async (req, res) => {
  try {
    const { fan, sinf, mavzu, slaydSon, uslub } = req.body;
    const count = Number(slaydSon);
    if (!fan || !sinf || !mavzu || !uslub || !Number.isInteger(count) || count < 2 || count > 30) {
      return res.status(400).json({ xato: "Fan, sinf, mavzu, uslub va 2–30 oralig‘idagi slaydlar soni kiritilishi shart" });
    }
    const messages = [
      {
        role: "system",
        content:
          "Sen o'zbek tilida o'qituvchilar uchun dars slaydlari (prezentatsiya) yaratuvchi yordamchisan. Har bir slayd aniq, qisqa va o'quvchilar uchun tushunarli bo'lishi kerak. Javobni FAQAT JSON formatda qaytar. Format: [{\"sarlavha\":\"...\",\"kontent\":\"...\",\"izoh\":\"...\"}] — sarlavha slayd nomi, kontent slayd matni (bullet pointlar bilan), izoh o'qituvchi uchun tavsiya.",
      },
      {
        role: "user",
        content: `Fan: ${fan}, Sinf: ${sinf}, Mavzu: ${mavzu}, Slaydlar soni: ${count}, Uslub: ${uslub}. O'qituvchi sinfda ko'rsatishi uchun ${count} ta dars slaydi yarat. Birinchi slayd kirish, oxirgisi xulosa bo'lsin. Faqat JSON qaytar.`,
      },
    ];
    const content = await callOpenRouter(messages, 0.6);
    let slaydlar;
    try {
      slaydlar = JSON.parse(content);
    } catch {
      const m = content.match(/\[[\s\S]*\]/);
      slaydlar = m ? JSON.parse(m[0]) : [];
    }
    if (!Array.isArray(slaydlar) || !slaydlar.length) throw new Error("AI slaydlar ro‘yxatini qaytarmadi");
    slaydlar = slaydlar.slice(0, count).map((slide, index) => ({
      ...slide,
      rasm: POLLINATIONS_API_KEY
        ? `https://gen.pollinations.ai/image/${encodeURIComponent(`Ta’limiy infografika, ${fan}, ${sinf}-sinf, mavzu: ${mavzu}. Slayd ${index + 1}: ${slide.sarlavha || "asosiy tushuncha"}. Rasmda tushunarli vizual belgilar, diagramma va o‘zbekcha qisqa yozuvlar bo‘lsin. Zamonaviy, toza, dars uchun mos dizayn.`)}?model=${encodeURIComponent(POLLINATIONS_IMAGE_MODEL)}&width=1280&height=720&nologo=true`
        : null,
    }));
    res.json({ slaydlar });
  } catch (e) {
    res.status(500).json({ xato: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Dars Vizual AI serveri ${PORT}-portda ishlamoqda`);
});
