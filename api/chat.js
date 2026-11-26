const crypto = require("crypto");
const { pool } = require("./_db");
const { verify, rateLimit, clientIp } = require("./_auth");
const { reply: botReply, TX: BOT_TX } = require("./_bot");
const { aiReply } = require("./_ai");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return req.body;
}
function txt(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max);
}

// ---------- Fayl yükləmə ----------
const MAX_FILE = 2.5 * 1024 * 1024;           // 2.5 MB (Vercel sorğu limiti 4.5 MB, base64 ~33% artırır)
const FILE_COLS = "file_id, file_name, file_type, file_size";
const FILE_TYPES = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  pdf: "application/pdf", txt: "text/plain; charset=utf-8",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};
const FILE_NOTE = {
  az: "Faylınız qəbul olundu. Operator tezliklə baxıb cavab verəcək.",
  ru: "Файл получен. Оператор скоро посмотрит и ответит.",
  en: "File received. An operator will review it and reply shortly."
};

function cleanName(n) {
  n = String(n || "").replace(/[\\/\u0000-\u001f<>:"|?*]+/g, "_").trim().replace(/^\.+/, "");
  return n.slice(-100) || "fayl";
}
function magicOk(ext, buf) {
  if (buf.length < 4) return false;
  if (ext === "jpg" || ext === "jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (ext === "png") return buf.toString("hex", 0, 4) === "89504e47";
  if (ext === "gif") return buf.toString("latin1", 0, 4) === "GIF8";
  if (ext === "webp") return buf.length > 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP";
  if (ext === "pdf") return buf.toString("latin1", 0, 4) === "%PDF";
  if (ext === "docx" || ext === "xlsx") return buf[0] === 0x50 && buf[1] === 0x4b;
  if (ext === "txt") return buf.indexOf(0) === -1;
  return false;
}

// Fayl cədvəli və mesaj sütunları (bir dəfə yaradılır, əl ilə SQL işlətmək lazım deyil)
async function ensureFiles() {
  if (globalThis.chatFilesReady) return globalThis.chatFilesReady;
  globalThis.chatFilesReady = (async () => {
    await pool.query(`create table if not exists chat_files (
      id uuid primary key default gen_random_uuid(),
      thread_id uuid not null,
      name text not null,
      mime text not null,
      size integer not null,
      data bytea not null,
      created_at timestamptz not null default now()
    )`);
    await pool.query("create index if not exists chat_files_thread_idx on chat_files (thread_id)");
    await pool.query("alter table chat_messages add column if not exists file_id uuid");
    await pool.query("alter table chat_messages add column if not exists file_name text");
    await pool.query("alter table chat_messages add column if not exists file_type text");
    await pool.query("alter table chat_messages add column if not exists file_size integer");
    await pool.query("alter table chat_threads add column if not exists admin_typing_at timestamptz");
    await pool.query("alter table chat_threads add column if not exists rating smallint");
    await pool.query("alter table chat_threads add column if not exists rated_at timestamptz");
  })().catch(function (e) { globalThis.chatFilesReady = null; throw e; });
  return globalThis.chatFilesReady;
}

// Ziyarətçinin söhbətini tapır, yoxdursa yaradır. Limit aşılıbsa cavab göndərir və null qaytarır.
async function visitorThread(b, res) {
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
      res.status(429).json({ ok: false, error: "Hazırda çox müraciət var. Bir az sonra yenidən cəhd edin." });
      return null;
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
    if (rate.rows[0].n >= 25) {
      res.status(429).json({ ok: false, error: "Çox tez-tez mesaj göndərirsiniz. Bir az gözləyin." });
      return null;
    }
  }
  return { thread: thread, token: token };
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

// Operator bu söhbətdə son 10 dəqiqədə cavab veribsə bot həmin söhbətdə susur (digər söhbətlərə təsir etmir)
async function adminActive(threadId) {
  const r = await pool.query(
    `select 1 from chat_messages where thread_id = $1 and sender = 'admin' and is_bot = false
     and created_at > now() - interval '10 minutes' limit 1`, [threadId]);
  return r.rowCount > 0;
}

async function runBot(threadId, text, lang) {
  if (await adminActive(threadId)) return null;
  // 1) Claude ilə sərbəst söhbət; 2) açar yoxdursa / xəta olarsa qayda əsaslı bot
  let answer = await aiReply(pool, threadId, text, lang);
  if (!answer) {
    answer = await botReply(pool, text, lang);
    const prev = await pool.query("select 1 from chat_messages where thread_id = $1 and is_bot = true limit 1", [threadId]);
    const t = BOT_TX[lang] || BOT_TX.az;
    if (!prev.rowCount) answer += "\n\n" + t.offline;
  }
  const m = await pool.query(
    `insert into chat_messages (thread_id, sender, body, is_bot) values ($1, 'admin', $2, true)
     returning id::int as id, sender, body, created_at, is_bot`,
    [threadId, answer.slice(0, 1900)]);
  await pool.query("update chat_threads set last_message_at = now() where id = $1", [threadId]);
  return m.rows[0];
}

async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const action = (req.query && req.query.action) || "";
  const q = req.query || {};

  try {
    await ensureFiles();
        // Spam / bot qorunması (IP üzrə)
    if (req.method === "POST" && (action === "send" || action === "upload")) {
      const ip = clientIp(req);
      const bt = (req.body && typeof req.body === "object") ? req.body : {};
      let ok = await rateLimit("chat:" + ip, action === "upload" ? 15 : 40, 600);
      if (ok && !bt.token) ok = await rateLimit("chatnew:" + ip, 6, 3600);
      if (!ok) return res.status(429).json({ ok: false, error: "Çox tez-tez müraciət edirsiniz. Bir az gözləyin." });
    }
    // ================= ZİYARƏTÇİ =================
    if (req.method === "POST" && action === "send") {
      const b = body(req);
      const text = txt(b.body, 1000);
      if (!text) return res.status(400).json({ ok: false, error: "Mesaj yazın." });

      const vt = await visitorThread(b, res);
      if (!vt) return;
      const thread = vt.thread, token = vt.token;

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

    // Ziyarətçi fayl göndərir (JSON: base64)
    if (req.method === "POST" && action === "upload") {
      const b = body(req);
      const name = cleanName(b.file_name);
      const em = name.match(/\.([A-Za-z0-9]{1,5})$/);
      const ext = em ? em[1].toLowerCase() : "";
      if (!FILE_TYPES[ext]) return res.status(400).json({ ok: false, error: "Bu fayl növü qəbul olunmur (JPG, PNG, WEBP, GIF, PDF, TXT, DOCX, XLSX)." });
      const buf = Buffer.from(String(b.data || ""), "base64");
      if (!buf.length) return res.status(400).json({ ok: false, error: "Fayl boşdur." });
      if (buf.length > MAX_FILE) return res.status(413).json({ ok: false, error: "Fayl çox böyükdür (maksimum 2.5 MB)." });
      if (!magicOk(ext, buf)) return res.status(400).json({ ok: false, error: "Fayl zədəlidir və ya növü uyğun deyil." });

      const vt = await visitorThread(b, res);
      if (!vt) return;
      const thread = vt.thread, token = vt.token;

      const lim = await pool.query(
        "select count(*)::int as n from chat_files where thread_id = $1 and created_at > now() - interval '1 hour'", [thread.id]);
      if (lim.rows[0].n >= 10) return res.status(429).json({ ok: false, error: "Çox fayl göndərdiniz. Bir az gözləyin." });
      const day = await pool.query(
        "select coalesce(sum(size), 0)::bigint as s from chat_files where created_at > now() - interval '24 hours'");
      if (Number(day.rows[0].s) > 150 * 1024 * 1024) return res.status(429).json({ ok: false, error: "Hazırda fayl qəbulu müvəqqəti dayandırılıb." });

      const f = await pool.query(
        "insert into chat_files (thread_id, name, mime, size, data) values ($1, $2, $3, $4, $5) returning id",
        [thread.id, name, FILE_TYPES[ext], buf.length, buf]);
      const m = await pool.query(
        `insert into chat_messages (thread_id, sender, body, file_id, file_name, file_type, file_size)
         values ($1, 'visitor', $2, $3, $4, $5, $6)
         returning id::int as id, sender, body, created_at, ${FILE_COLS}`,
        [thread.id, ("📎 " + name).slice(0, 200), f.rows[0].id, name, FILE_TYPES[ext].split(";")[0], buf.length]);
      await pool.query(
        "update chat_threads set unread_admin = unread_admin + 1, last_message_at = now(), status = 'open' where id = $1",
        [thread.id]);

      // Operator yaxınlarda yazmayıbsa qısa avtomatik təsdiq mesajı
      let bot = null;
      try {
        if (await ensureBot() && !(await adminActive(thread.id))) {
          const recentNote = await pool.query(
            `select 1 from chat_messages where thread_id = $1 and is_bot = true
             and created_at > now() - interval '2 minutes' limit 1`, [thread.id]);
          if (!recentNote.rowCount) {
            const lg = txt(b.lang, 5);
            const nm = await pool.query(
              `insert into chat_messages (thread_id, sender, body, is_bot) values ($1, 'admin', $2, true)
               returning id::int as id, sender, body, created_at, is_bot`,
              [thread.id, FILE_NOTE[lg] || FILE_NOTE.az]);
            bot = nm.rows[0];
          }
        }
      } catch (e) {
        console.error("file note:", e);
      }
      return res.status(200).json({ ok: true, token: token, message: m.rows[0], bot: bot });
    }

    // Ziyarətçi xidməti qiymətləndirir (1 = yaxşı, -1 = pis)
    if (req.method === "POST" && action === "rate") {
      const b = body(req);
      const token = txt(b.token, 100);
      const v = Number(b.value) === 1 ? 1 : (Number(b.value) === -1 ? -1 : 0);
      if (!token || !v) return res.status(400).json({ ok: false, error: "Qiymət yanlışdır." });
      const r = await pool.query(
        "update chat_threads set rating = $2, rated_at = now() where visitor_token = $1 returning id", [token, v]);
      if (!r.rowCount) return res.status(404).json({ ok: false, error: "Söhbət tapılmadı." });
      return res.status(200).json({ ok: true });
    }

    // Faylı göstərmək/yükləmək (id təxmin edilə bilməyən UUID-dir)
    if (req.method === "GET" && action === "file") {
      const id = String(q.id || "");
      if (!UUID_RE.test(id)) return res.status(404).end();
      const r = await pool.query("select name, mime, data from chat_files where id = $1", [id]);
      if (!r.rowCount) return res.status(404).end();
      const f = r.rows[0];
      const isImg = /^image\//.test(f.mime);
      const fallback = f.name.replace(/[^\x20-\x7e]/g, "_");
      res.setHeader("Content-Type", f.mime);
      res.setHeader("Content-Length", String(f.data.length));
      res.setHeader("Content-Disposition",
        (isImg ? "inline" : "attachment") + '; filename="' + fallback + '"; filename*=UTF-8\'\'' + encodeURIComponent(f.name));
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, max-age=86400");
      return res.status(200).end(f.data);
    }

    if (req.method === "GET" && action === "poll") {
      const token = txt(q.token, 100);
      const after = parseInt(q.after, 10) || 0;
      if (!token) return res.status(200).json({ ok: true, messages: [], notfound: true });
      const t = await pool.query(
        `select id, status, rating,
                (admin_typing_at is not null and admin_typing_at > now() - interval '6 seconds') as typing
         from chat_threads where visitor_token = $1`, [token]);
      if (!t.rowCount) return res.status(200).json({ ok: true, messages: [], notfound: true });
      const hasBot = await ensureBot();
      const r = await pool.query(
        `select id::int as id, sender, body, created_at, ${hasBot ? "coalesce(is_bot, false)" : "false"} as is_bot, ${FILE_COLS}
         from chat_messages
         where thread_id = $1 and id > $2 order by id limit 200`,
        [t.rows[0].id, after]);
      return res.status(200).json({ ok: true, messages: r.rows, status: t.rows[0].status, rating: t.rows[0].rating, typing: !!t.rows[0].typing });
    }

    // ================= ADMİN =================
    const h = req.headers.authorization || "";
    const p = verify(h.replace(/^Bearer\s+/i, "").trim());
    if (!p || p.role !== "admin") return res.status(401).json({ ok: false, error: "Admin girişi tələb olunur." });

    if (req.method === "GET" && action === "admin_threads") {
      const r = await pool.query(
        `select t.id, t.visitor_name, t.status, t.unread_admin, t.last_message_at, t.rating,
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
      const t = await pool.query("select id, visitor_name, status, rating from chat_threads where id = $1", [id]);
      if (!t.rowCount) return res.status(404).json({ ok: false, error: "Söhbət tapılmadı." });
      const r = await pool.query(
        `select id::int as id, sender, body, created_at, coalesce(is_bot, false) as is_bot, ${FILE_COLS} from chat_messages
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
      await pool.query("update chat_threads set last_message_at = now(), unread_admin = 0, admin_typing_at = null where id = $1", [id]);
      return res.status(200).json({ ok: true, message: m.rows[0] });
    }

    // Operator yazarkən ziyarətçidə "yazır..." göstərilir
    if (req.method === "POST" && action === "admin_typing") {
      const b = body(req);
      const id = String(b.thread || "");
      if (!UUID_RE.test(id)) return res.status(400).json({ ok: false, error: "Söhbət yanlışdır." });
      await pool.query("update chat_threads set admin_typing_at = now() where id = $1", [id]);
      return res.status(200).json({ ok: true });
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
      await pool.query("delete from chat_files where thread_id = $1", [id]);
      const r = await pool.query("delete from chat_threads where id = $1 returning id", [id]);
      if (!r.rowCount) return res.status(404).json({ ok: false, error: "Söhbət tapılmadı." });
      return res.status(200).json({ ok: true });
    }

    // Bütün yazışmaları və faylları sil
    if (req.method === "POST" && action === "admin_delete_all") {
      const b = body(req);
      if (b.confirm !== "SIL") return res.status(400).json({ ok: false, error: "Təsdiq tələb olunur." });
      const c = await pool.connect();
      let n = 0;
      try {
        await c.query("begin");
        await c.query("delete from chat_files");
        await c.query("delete from chat_messages");
        const d = await c.query("delete from chat_threads");
        n = d.rowCount || 0;
        await c.query("commit");
      } catch (e) {
        try { await c.query("rollback"); } catch (e2) {}
        throw e;
      } finally {
        c.release();
      }
      return res.status(200).json({ ok: true, deleted: n });
    }

    return res.status(400).json({ ok: false, error: "Naməlum əməliyyat." });
  } catch (e) {
    console.error("chat:", e);
    return res.status(500).json({ ok: false, error: "Server xətası." });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: { sizeLimit: "4mb" } } };
