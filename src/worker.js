/**
 * rivaOS on Cloudflare Workers.
 *
 * Static files in /public are served directly by Workers Static Assets. This Worker only runs for
 * /api/* (see `run_worker_first` in wrangler.jsonc) and powers the bits a static site can't do:
 *
 *   GET  /api/ping      tiny response for latency checks (Task Manager, Test-Connection)
 *   GET  /api/system    which Cloudflare data centre served you, approximate location, protocol
 *   GET  /api/version   the deployed Worker version (rivaOS Update)
 *   GET  /api/weather   local weather for the Widgets panel (MET Norway, cached at the edge)
 *   POST /api/contact   the Contact app: validates, rate-limits, then emails Devik and/or stores in KV
 *
 * Every binding is optional: without MAILER/INBOX the contact endpoint answers 503 and the browser
 * falls back to opening the visitor's email app, so nothing breaks before mail is configured.
 */
import { EmailMessage } from "cloudflare:email";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" };
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      switch (url.pathname) {
        case "/api/ping": return json({ ok: true, t: Date.now() });
        case "/api/system": return json(system(request, env));
        case "/api/version": return json({ version: version(env) });
        case "/api/weather": return await weather(request, env, ctx);
        case "/api/contact":
          if (request.method !== "POST") return json({ error: "Use POST." }, 405, { allow: "POST" });
          return await contact(request, env);
        default: return json({ error: "Not found." }, 404);
      }
    } catch (err) {
      console.error("rivaOS api error", url.pathname, err?.stack || err);
      return json({ error: "Something went wrong." }, 500);
    }
  }
};

/* ───────── /api/system ───────── */
function system(request, env) {
  const cf = request.cf || {};
  return {
    colo: cf.colo || null,
    coloCity: COLOS[cf.colo] || null,
    city: cf.city || null, region: cf.region || null, country: cf.country || null, timezone: cf.timezone || null,
    asOrganization: cf.asOrganization || null,
    httpProtocol: cf.httpProtocol || null, tlsVersion: cf.tlsVersion || null,
    ip: request.headers.get("cf-connecting-ip"),
    ray: request.headers.get("cf-ray"),
    version: version(env)
  };
}
function version(env) {
  const v = env.CF_VERSION;
  return v ? { id: v.id || null, tag: v.tag || null, timestamp: v.timestamp || null } : null;
}

/* ───────── /api/weather ─────────
   Data: MET Norway Locationforecast 2.0 (free, including commercial use, CC BY 4.0; credit shown in the
   widget). Their terms ask for an identifying User-Agent, coordinates to ≤4 decimals and caching; we round
   to 1 decimal (≈10 km, better privacy and cache hits) and cache each area for 30 minutes at the edge. */
async function weather(request, env, ctx) {
  const cf = request.cf || {};
  const lat = Number(cf.latitude), lon = Number(cf.longitude);
  if (!isFinite(lat) || !isFinite(lon)) return json({ error: "Location unavailable." }, 404);
  const la = lat.toFixed(1), lo = lon.toFixed(1);
  const fahrenheit = ["US", "LR", "MM", "BS", "BZ", "KY", "PW"].includes(cf.country);
  const tz = cf.timezone || "UTC";
  const cacheKey = new Request(`https://weather.rivaos.internal/v1?lat=${la}&lon=${lo}&f=${fahrenheit ? 1 : 0}&tz=${encodeURIComponent(tz)}`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return withCity(hit, cf.city);

  let r;
  try {
    r = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${la}&lon=${lo}`, {
      headers: { "user-agent": env.WEATHER_USER_AGENT || "rivaOS/26.11 (+https://rivacomputech.com)", accept: "application/json" }
    });
  } catch { return json({ error: "Weather service unreachable." }, 502); }
  if (!r.ok) return json({ error: "Weather service unavailable." }, 502);
  const data = await r.json();
  const series = data?.properties?.timeseries || [];
  if (!series.length) return json({ error: "No forecast." }, 502);

  const conv = c => fahrenheit ? c * 9 / 5 + 32 : c;
  const dayOf = iso => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  const hourOf = iso => Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(new Date(iso)));
  const sym = e => e.data?.next_1_hours?.summary?.symbol_code || e.data?.next_6_hours?.summary?.symbol_code || e.data?.next_12_hours?.summary?.symbol_code || "";
  const days = new Map();
  for (const e of series) {
    const t = e.data?.instant?.details?.air_temperature; if (typeof t !== "number") continue;
    const k = dayOf(e.time), d = days.get(k) || { date: k, hi: -Infinity, lo: Infinity, sym: "", dist: 99 };
    d.hi = Math.max(d.hi, t); d.lo = Math.min(d.lo, t);
    const dist = Math.abs(hourOf(e.time) - 13), s = sym(e);
    if (s && dist < d.dist) { d.sym = s; d.dist = dist; }
    days.set(k, d);
  }
  const now = series[0], list = [...days.values()].slice(0, 5);
  const body = {
    unit: fahrenheit ? "F" : "C",
    temp: round1(conv(now.data.instant.details.air_temperature)),
    code: wmo(sym(now)), symbol: sym(now),
    hi: round1(conv(list[0]?.hi ?? now.data.instant.details.air_temperature)),
    lo: round1(conv(list[0]?.lo ?? now.data.instant.details.air_temperature)),
    days: list.map(d => ({ date: d.date, hi: round1(conv(d.hi)), lo: round1(conv(d.lo)), code: wmo(d.sym) })),
    source: "MET Norway"
  };
  const res = json(body, 200, { "cache-control": "public, max-age=1800" });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return withCity(res, cf.city);
}
const round1 = n => Math.round(n * 10) / 10;
async function withCity(res, city) {
  const body = await res.json();
  return json({ ...body, city: city || null }, 200, { "cache-control": "private, max-age=900" });
}
/** MET Norway symbol codes → the WMO-style weather codes the rivaOS widgets understand. */
function wmo(s) {
  s = String(s || "");
  if (s.includes("thunder")) return 95;
  if (s.includes("snow")) return 71;
  if (s.includes("sleet")) return 67;
  if (s.includes("rain")) return s.includes("showers") ? 80 : 61;
  if (s.startsWith("fog")) return 45;
  if (s.startsWith("cloudy")) return 3;
  if (s.startsWith("partlycloudy")) return 2;
  if (s.startsWith("fair")) return 1;
  if (s.startsWith("clearsky")) return 0;
  return 3;
}

/* ───────── /api/contact ───────── */
const EMAIL_RE = /^[^\s@<>"(),;:]+@[^\s@<>"(),;:]+\.[^\s@<>"(),;:]{2,}$/;
const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

async function contact(request, env) {
  // Same-origin only: the form lives on this site, so cross-site posts are just spam.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: "Forbidden." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 20000) return json({ error: "That message is too long." }, 413);

  const type = request.headers.get("content-type") || "";
  let d;
  try { d = type.includes("application/json") ? await request.json() : Object.fromEntries(await request.formData()); }
  catch { return json({ error: "Couldn't read the form." }, 400); }

  // Honeypot: real people never fill the hidden field. Pretend it worked.
  if (clean(d.company_website, 200)) return json({ ok: true });

  const name = clean(d.name, 100).replace(/["<>]/g, "");
  const email = clean(d.email, 200);
  const subject = clean(d.subject, 150);
  const message = String(d.message ?? "").replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, 5000);
  if (!name || !EMAIL_RE.test(email) || !message) return json({ error: "Please add your name, a valid email address and a message." }, 400);

  if (env.CONTACT_LIMITER) {
    const { success } = await env.CONTACT_LIMITER.limit({ key: request.headers.get("cf-connecting-ip") || "anonymous" });
    if (!success) return json({ error: "Too many messages. Please wait a minute." }, 429);
  }

  const cf = request.cf || {};
  const record = { name, email, subject, message, at: new Date().toISOString(), country: cf.country || null, city: cf.city || null };
  let delivered = false;
  if (env.INBOX) {
    await env.INBOX.put(`msg:${record.at}:${crypto.randomUUID()}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 365 });
    delivered = true;
  }
  if (env.MAILER) {
    const from = env.CONTACT_FROM, to = env.CONTACT_TO;
    const text = [
      "New inquiry from rivacomputech.com (rivaOS)", "",
      `Name:    ${name}`, `Email:   ${email}`, `Subject: ${subject || "(none)"}`, `From:    ${[cf.city, cf.country].filter(Boolean).join(", ") || "unknown"} (via Cloudflare)`,
      "", "Message", "-------", message, "", `Reply to this email to answer ${name} directly.`
    ].join("\n");
    await env.MAILER.send(new EmailMessage(from, to, mime({ from, to, name, email, subject: `Riva inquiry: ${subject || name}`, text })));
    delivered = true;
  }
  if (!delivered) return json({ error: "Email isn't set up on this deployment yet.", fallback: "mailto" }, 503);
  return json({ ok: true });
}

/** A minimal RFC 5322 message. Header values are already stripped of CR/LF by clean(). */
function mime({ from, to, name, email, subject, text }) {
  const b64 = s => { const bytes = new TextEncoder().encode(s); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  const word = s => /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;
  const display = /^[\x20-\x7e]*$/.test(name) ? `"${name}"` : word(name);
  const domain = from.split("@")[1] || "rivacomputech.com";
  return [
    `From: "Riva Computech website" <${from}>`,
    `To: <${to}>`,
    `Reply-To: ${display} <${email}>`,
    `Subject: ${word(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    b64(text).replace(/.{1,76}/g, "$&\r\n").trimEnd()
  ].join("\r\n");
}

/* A few Cloudflare data-centre codes → cities, for friendlier "served from" labels. Unknown codes just show the code. */
const COLOS = {
  ATL: "Atlanta", BOS: "Boston", CLT: "Charlotte", ORD: "Chicago", CMH: "Columbus", DFW: "Dallas", DEN: "Denver", DTW: "Detroit", IAH: "Houston", IND: "Indianapolis",
  MCI: "Kansas City", LAS: "Las Vegas", LAX: "Los Angeles", MIA: "Miami", MSP: "Minneapolis", BNA: "Nashville", EWR: "Newark", JFK: "New York", MCO: "Orlando",
  PHL: "Philadelphia", PHX: "Phoenix", PIT: "Pittsburgh", PDX: "Portland", RIC: "Richmond", SMF: "Sacramento", SLC: "Salt Lake City", SAN: "San Diego", SJC: "San Jose",
  SEA: "Seattle", STL: "St. Louis", TPA: "Tampa", IAD: "Ashburn", YYZ: "Toronto", YVR: "Vancouver", YUL: "Montréal", YYC: "Calgary", MEX: "Mexico City",
  LHR: "London", MAN: "Manchester", DUB: "Dublin", AMS: "Amsterdam", FRA: "Frankfurt", CDG: "Paris", MAD: "Madrid", LIS: "Lisbon", MXP: "Milan", ZRH: "Zurich",
  VIE: "Vienna", BRU: "Brussels", CPH: "Copenhagen", ARN: "Stockholm", OSL: "Oslo", HEL: "Helsinki", WAW: "Warsaw", PRG: "Prague", ATH: "Athens", IST: "Istanbul",
  TLV: "Tel Aviv", DXB: "Dubai", CAI: "Cairo", JNB: "Johannesburg", LOS: "Lagos", NBO: "Nairobi", BOM: "Mumbai", DEL: "New Delhi", AMD: "Ahmedabad", BLR: "Bangalore",
  MAA: "Chennai", HYD: "Hyderabad", CCU: "Kolkata", SIN: "Singapore", KUL: "Kuala Lumpur", BKK: "Bangkok", CGK: "Jakarta", MNL: "Manila", HKG: "Hong Kong",
  NRT: "Tokyo", KIX: "Osaka", ICN: "Seoul", SYD: "Sydney", MEL: "Melbourne", AKL: "Auckland", GRU: "São Paulo", SCL: "Santiago", BOG: "Bogotá", EZE: "Buenos Aires"
};
