const crypto = require("crypto");
const { pool } = require("./_db");
const { verify } = require("./_auth");
const { reply: botReply, TX: BOT_TX } = require("./_bot");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return req.body;
}
function txt(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max);
}

// Bot üçün is_bot sütunu (bir dəfə yaradılır)
async function ensureBot() {
  if (globalThis.chatBotReady !== undefined) return globalThis.chatBotReady;
  try {
    await pool.query("alter table chat_messages add column if not exists is_bot boolean not null default false");
    globalThis.chatBotReady = true;
  } catch (e) {
    console.error("chat is_bot:", e);
    globalThis.chatBotReady = false;
  }
  return globalThis.chatBotReady;
}

// Admin son 10 dəqiqədə cavab veribsə bot susur
async function adminActive() {
  const r = await pool.query(
    "select 1 from chat_messages where sender = 'admin' and is_bot = false and created_at > now() - interval '10 minutes' limit 1");
  return r.rowCount > 0;
}

async function runBot(threadId, text, lang) {
  if (await adminActive()) return null;
  let answer = await botReply(pool, text, lang);
  const prev = await pool.query("select 1 from chat_messages where thread_id = $1 and is_bot = true limit 1", [threadId]);
  const t = BOT_TX[lang] || BOT_TX.az;
  if (!prev.rowCount) answer += "\n\n" + t.offline;
  const m = await pool.query(
    `insert into chat_messages (thread_id, sender, body, is_bot) values ($1, 'admin', $2, true)
     returning id::int as id, sender, body, created_at`,
    [threadId, answer.slice(0, 1900)]);
  await pool.query("update chat_threads set last_message_at = now() where id = $1", [threadId]);
  return m.rows[0];
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const action = (req.query && req.query.action) || "";
  const q = req.query || {};

  try {
    // ================= ZİYARƏTÇİ =================
    if (req.method === "POST" && action === "send") {
      const b = body(req);
      const text = txt(b.body, 1000);
      if (!text) return res.status(400).json({ ok: false, error: "Mesaj yazın." });

      let token = txt(b.token, 100);
      let thread = null;
      if (token) {
        const r = await pool.query("select id from chat_threads where visitor_token = $1", [token]);
        thread = r.rows[0] || null;
      }

      if (!thread) {
        const recent = await pool.query(
          "select count(*)::int as n from chat_threads where created_at > now() - interval '1 hour'");
        if (recent.rows[0].n >= 60) {
          return res.status(429).json({ ok: false, error: "Hazırda çox müraciət var. Bir az sonra yenidən cəhd edin." });
        }
        token = crypto.randomBytes(24).toString("hex");
        const name = txt(b.name, 60);
        const ins = await pool.query(
          "insert into chat_threads (visitor_token, visitor_name) values ($1, $2) returning id",
          [token, name || null]);
        thread = ins.rows[0];
      } else {
        const rate = await pool.query(
          `select count(*)::int as n from chat_messages
           where thread_id = $1 and sender = 'visitor' and created_at > now() - interval '10 minutes'`,
          [thread.id]);
        if (rate.rows[0].n >= 15) {
          return res.status(429).json({ ok: false, error: "Çox tez-tez mesaj göndərirsiniz. Bir az gözləyin." });
        }
      }

      const m = await pool.query(
        `insert into chat_messages (thread_id, sender, body) values ($1, 'visitor', $2)
         returning id::int as id, sender, body, created_at`,
        [thread.id, text]);
      await pool.query(
        "update chat_threads set unread_admin = unread_admin + 1, last_message_at = now(), status = 'open' where id = $1",
        [thread.id]);
      let bot = null;
      try {
        if (await ensureBot()) bot = await runBot(thread.id, text, txt(b.lang, 5));
      } catch (e) {
        console.error("bot:", e);
      }
      return res.status(200).json({ ok: true, token: token, message: m.rows[0], bot: bot });
    }

    if (req.method === "GET" && action === "poll") {
      const token = txt(q.token, 100);
      const after = parseInt(q.after, 10) || 0;
      if (!token) return res.status(200).json({ ok: true, messages: [], notfound: true });
      const t = await pool.query("select id, status from chat_threads where visitor_token = $1", [token]);
      if (!t.rowCount) return res.status(200).json({ ok: true, messages: [], notfound: true });
      const r = await pool.query(
        `select id::int as id, sender, body, created_at from chat_messages
         where thread_id = $1 and id > $2 order by id limit 200`,
        [t.rows[0].id, after]);
      return res.status(200).json({ ok: true, messages: r.rows, status: t.rows[0].status });
    }

    // ================= ADMİN =================
    const h = req.headers.authorization || "";
    const p = verify(h.replace(/^Bearer\s+/i, "").trim());
    if (!p || p.role !== "admin") return res.status(401).json({ ok: false, error: "Admin girişi tələb olunur." });

    if (req.method === "GET" && action === "admin_threads") {
      const r = await pool.query(
        `select t.id, t.visitor_name, t.status, t.unread_admin, t.last_message_at,
                (select body from chat_messages m where m.thread_id = t.id order by m.id desc limit 1) as last_body
         from chat_threads t
         order by t.last_message_at desc limit 200`);
      return res.status(200).json({ ok: true, threads: r.rows });
    }

    if (req.method === "GET" && action === "admin_messages") {
      await ensureBot();
      const id = String(q.thread || "");
      if (!UUID_RE.test(id)) return res.status(400).json({ ok: false, error: "Söhbət yanlışdır." });
      const after = parseInt(q.after, 10) || 0;
      const t = await pool.query("select id, visitor_name, status from chat_threads where id = $1", [id]);
      if (!t.rowCount) return res.status(404).json({ ok: false, error: "Söhbət tapılmadı." });
      const r = await pool.query(
        `select id::int as id, sender, body, created_at, coalesce(is_bot, false) as is_bot from chat_messages
         where thread_id = $1 and id > $2 order by id limit 500`,
        [id, after]);
      await pool.query("update chat_threads set unread_admin = 0 where id = $1", [id]);
      return res.status(200).json({ ok: true, thread: t.rows[0], messages: r.rows });
    }

    if (req.method === "POST" && action === "admin_reply") {
      const b = body(req);
      const id = String(b.thread || "");
      const text = txt(b.body, 2000);
      if (!UUID_RE.test(id)) return res.status(400).json({ ok: false, error: "Söhbət yanlışdır." });
      if (!text) return res.status(400).json({ ok: false, error: "Cavab yazın." });
      const t = await pool.query("select id from chat_threads where id = $1", [id]);
      if (!t.rowCount) return res.status(404).json({ ok: false, error: "Söhbət tapılmadı." });
      const m = await pool.query(
        `insert into chat_messages (thread_id, sender, body) values ($1, 'admin', $2)
         returning id::int as id, sender, body, created_at`,
        [id, text]);
      await pool.query("update chat_threads set last_message_at = now(), unread_admin = 0 where id = $1", [id]);
      return res.status(200).json({ ok: true, message: m.rows[0] });
    }

    if (req.method === "POST" && action === "admin_status") {
      const b = body(req);
      const id = String(b.thread || "");
      if (!UUID_RE.test(id)) return res.status(400).json({ ok: false, error: "Söhbət yanlışdır." });
      if (b.status !== "open" && b.status !== "closed") return res.status(400).json({ ok: false, error: "Status yanlışdır." });
      const r = await pool.query("update chat_threads set status = $2 where id = $1 returning id", [id, b.status]);
      if (!r.rowCount) return res.status(404).json({ ok: false, error: "Söhbət tapılmadı." });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "POST" && action === "admin_delete") {
      const b = body(req);
      const id = String(b.thread || "");
      if (!UUID_RE.test(id)) return res.status(400).json({ ok: false, error: "Söhbət yanlışdır." });
      const r = await pool.query("delete from chat_threads where id = $1 returning id", [id]);
      if (!r.rowCount) return res.status(404).json({ ok: false, error: "Söhbət tapılmadı." });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
  } catch (e) {
    console.error("chat:", e);
    return res.status(500).json({ ok: false, error: "Server xətası." });
  }
};
