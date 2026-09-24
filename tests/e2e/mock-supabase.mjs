import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures");
const png = await readFile(resolve(root, "transparent.png"));
const users = new Map();
const userIds = new Map();
const visits = new Set();
const favorites = new Map();
const reviews = [];
const photos = [];
const objects = new Map();
const avatars = new Map();
const profiles = new Map();
const adminIds = new Set();
const asJson = (res, status, body, headers = {}) => { res.writeHead(status, { "content-type": "application/json", ...headers }); res.end(JSON.stringify(body)); };
const collect = req => new Promise((resolveBody, reject) => { const parts = []; req.on("data", part => parts.push(part)); req.on("end", () => resolveBody(Buffer.concat(parts))); req.on("error", reject); });
const userFor = req => users.get(req.headers.authorization?.replace(/^Bearer /, "")) ?? null;
const filter = (url, column, value) => url.searchParams.get(column) === `eq.${value}`;
const respondRows = (req, res, rows, total = rows.length) => {
  const headers = { "content-range": rows.length ? `0-${rows.length - 1}/${total}` : `*/${total}` };
  if (req.headers.accept?.includes("application/vnd.pgrst.object+json")) return rows.length ? asJson(res, 200, rows[0], headers) : asJson(res, 406, { code: "PGRST116", message: "No rows" });
  res.writeHead(200, { "content-type": "application/json", ...headers }); res.end(JSON.stringify(rows));
};

const server = createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "authorization, apikey, content-type, x-client-info, x-supabase-api-version, prefer, accept, range, accept-profile, content-profile");
  res.setHeader("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  const url = new URL(req.url ?? "/", "http://127.0.0.1:54321");
  if (url.pathname === "/health") return asJson(res, 200, { ok: true });
  if (url.pathname === "/auth/v1/token" && req.method === "POST") {
    const body = JSON.parse((await collect(req)).toString("utf8"));
    const id = userIds.get(body.email) ?? (body.email?.startsWith("admin") ? "00000000-0000-4000-8000-000000000002" : body.email?.startsWith("member") ? "00000000-0000-4000-8000-000000000001" : "00000000-0000-4000-8000-000000000003");
    userIds.set(body.email, id);
    if (!profiles.has(id)) profiles.set(id, { id, display_name: body.email?.split("@")[0] ?? "Member", avatar_url: null });
    if (id.endsWith("0002")) adminIds.add(id);
    const user = { id, aud: "authenticated", role: "authenticated", email: body.email, app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: new Date().toISOString() };
    const token = `e2e-${id}`;
    users.set(token, user);
    return asJson(res, 200, { access_token: token, token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `refresh-${token}`, user });
  }
  if (url.pathname === "/auth/v1/user") {
    const user = userFor(req); return user ? asJson(res, 200, user) : asJson(res, 401, { message: "Invalid token" });
  }
  if (url.pathname === "/auth/v1/recover" && req.method === "POST") {
    await collect(req);
    return asJson(res, 200, { message: "If the email exists, a reset link was sent" });
  }
  if (url.pathname === "/auth/v1/logout") return asJson(res, 204, null);

  const user = userFor(req);
  const avatarPrefix = "/storage/v1/object/avatars/";
  const publicAvatarPrefix = "/storage/v1/object/public/avatars/";
  if (url.pathname.startsWith(avatarPrefix) || url.pathname.startsWith(publicAvatarPrefix)) {
    const isPublicAvatar = url.pathname.startsWith(publicAvatarPrefix);
    const path = decodeURIComponent(url.pathname.slice(isPublicAvatar ? publicAvatarPrefix.length : avatarPrefix.length));
    if (!isPublicAvatar && req.method === "POST") {
      if (!user || !path.startsWith(`${user.id}/`)) return asJson(res, 403, { message: "Avatar owner mismatch" });
      avatars.set(path, await collect(req));
      return asJson(res, 200, { Key: `avatars/${path}` });
    }
    if (!isPublicAvatar && req.method === "DELETE") {
      const body = JSON.parse((await collect(req)).toString("utf8"));
      for (const prefix of body.prefixes ?? []) if (user && prefix.startsWith(`${user.id}/`)) avatars.delete(prefix);
      return asJson(res, 200, { message: "Successfully deleted" });
    }
    const content = avatars.get(path);
    if (!content) return asJson(res, 404, { message: "Not found" });
    res.writeHead(200, { "content-type": path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp" : "image/jpeg" });
    return res.end(content);
  }
  if (url.pathname === "/rest/v1/rpc/is_admin" && req.method === "POST") return asJson(res, 200, !!user && adminIds.has(user.id));
  if (url.pathname === "/rest/v1/rpc/check_rate_limit" && req.method === "POST") return asJson(res, 200, true);
  if (url.pathname === "/rest/v1/rpc/submit_review_reward" && req.method === "POST") {
    const body = JSON.parse((await collect(req)).toString("utf8"));
    if (!user) return asJson(res, 400, { message: "not_authenticated" });
    if (!visits.has(`${user.id}:${body.p_slug}`)) return asJson(res, 400, { message: "visit_required" });
    const id = body.p_id;
    const review = { id, user_id: user.id, cafe_slug: body.p_slug, author_name: body.p_name, rating: body.p_rating, comment: body.p_comment, created_at: new Date().toISOString() };
    reviews.unshift(review);
    const submitted = new Set(body.p_photos ?? []);
    for (const photo of photos) if (submitted.has(photo.id) && photo.user_id === user.id && photo.review_batch) { photo.review_id = id; photo.review_batch = null; photo.is_public = true; }
    const reward = submitted.size >= 3 ? "10_percent" : "5_baht";
    return asJson(res, 200, { review, coupon: { id: crypto.randomUUID(), reward } });
  }

  if (url.pathname.startsWith("/storage/v1/object/sign/cafe-community/")) {
    const path = decodeURIComponent(url.pathname.slice("/storage/v1/object/sign/cafe-community/".length));
    return asJson(res, 200, { signedURL: `http://127.0.0.1:54321/storage/v1/object/cafe-community/${encodeURIComponent(path).replaceAll("%2F", "/")}` });
  }
  if (url.pathname.startsWith("/storage/v1/object/cafe-community/") && req.method === "POST") {
    const path = decodeURIComponent(url.pathname.slice("/storage/v1/object/cafe-community/".length));
    objects.set(path, await collect(req));
    return asJson(res, 200, { Key: `cafe-community/${path}` });
  }
  if (url.pathname.startsWith("/storage/v1/object/cafe-community/") && req.method === "DELETE") {
    const body = JSON.parse((await collect(req)).toString("utf8"));
    for (const path of body.prefixes ?? []) objects.delete(path);
    return asJson(res, 200, { message: "Successfully deleted" });
  }
  if (url.pathname.startsWith("/storage/v1/object/cafe-community/")) {
    const path = decodeURIComponent(url.pathname.slice("/storage/v1/object/cafe-community/".length));
    res.writeHead(200, { "content-type": "image/png" }); return res.end(objects.get(path) ?? png);
  }

  if (!url.pathname.startsWith("/rest/v1/")) return asJson(res, 404, { message: "Not found" });
  const table = url.pathname.slice("/rest/v1/".length);
  if (table === "cafes") {
    if (url.searchParams.get("select") === "slug") {
      const slug = url.searchParams.get("slug")?.slice(3);
      return respondRows(req, res, slug === "baan-baann" ? [{ slug }] : []);
    }
    return asJson(res, 404, { code: "PGRST205", message: "Table unavailable in E2E mock" });
  }
  if (table === "cafe_visits" && req.method === "GET") {
    const slug = url.searchParams.get("cafe_slug")?.slice(3);
    const rows = user ? [...visits]
      .filter(key => key.startsWith(`${user.id}:`))
      .map(key => key.slice(user.id.length + 1))
      .filter(cafeSlug => !slug || cafeSlug === slug)
      .map(cafe_slug => ({ cafe_slug, created_at: new Date().toISOString() })) : [];
    return respondRows(req, res, rows);
  }
  if (table === "cafe_visits" && (req.method === "POST" || req.method === "DELETE")) {
    if (req.method === "POST") return asJson(res, 403, { code: "42501", message: "Photo required" });
    const slug = url.searchParams.get("cafe_slug")?.slice(3);
    if (req.method === "DELETE" && user && slug) visits.delete(`${user.id}:${slug}`);
    res.writeHead(204); return res.end();
  }
  if (table === "favorites" && req.method === "GET") {
    const rows = [...favorites.values()].filter(row => user && row.user_id === user.id && filter(url, "user_id", user.id));
    return respondRows(req, res, rows);
  }
  if (table === "favorites" && req.method === "POST") {
    const body = JSON.parse((await collect(req)).toString("utf8"));
    const rows = Array.isArray(body) ? body : [body];
    if (!user || rows.some(row => row.user_id !== user.id)) return asJson(res, 403, { code: "42501", message: "Favorite owner mismatch" });
    const saved = rows.map(row => {
      const key = `${row.user_id}:${row.cafe_slug}`;
      const entry = favorites.get(key) ?? { ...row, created_at: new Date().toISOString() };
      favorites.set(key, entry);
      return entry;
    });
    return respondRows(req, res, saved);
  }
  if (table === "favorites" && req.method === "DELETE") {
    const slug = url.searchParams.get("cafe_slug")?.slice(3);
    if (user && slug) favorites.delete(`${user.id}:${slug}`);
    res.writeHead(204); return res.end();
  }
  if (table === "cafe_photos" && req.method === "GET") {
    const reviewFilter = url.searchParams.get("review_id") ?? "";
    const reviewIds = reviewFilter.startsWith("in.(") ? reviewFilter.slice(4, -1).split(",").map(id => id.replaceAll('"', "")) : null;
    const rows = photos.filter(photo => photo.review_batch === null &&
      ((url.searchParams.has("cafe_slug") && filter(url, "cafe_slug", photo.cafe_slug)) || (user && filter(url, "user_id", user.id))) &&
      (!reviewIds || reviewIds.includes(photo.review_id)));
    return respondRows(req, res, rows.map(({ id, user_id, cafe_slug, path, caption, is_public, review_id }) => ({ id, user_id, cafe_slug, path, caption, is_public, review_id })));
  }
  if (table === "cafe_photos" && req.method === "POST") {
    const body = JSON.parse((await collect(req)).toString("utf8"));
    if (!user || body.user_id !== user.id || !objects.has(body.path)) return asJson(res, 403, { code: "42501", message: "Photo required" });
    const row = { id: crypto.randomUUID(), user_id: user?.id, cafe_slug: body.cafe_slug, path: body.path, caption: body.caption ?? "", is_public: body.is_public ?? false, review_id: null, review_batch: body.review_batch ?? null, created_at: new Date().toISOString() };
    photos.push(row);
    if (!row.review_batch) visits.add(`${user.id}:${row.cafe_slug}`);
    return respondRows(req, res, [row]);
  }
  if (table === "reviews" && req.method === "GET") return respondRows(req, res, reviews.filter(row => filter(url, "cafe_slug", row.cafe_slug)));
  if (table === "profiles") {
    if (req.method === "GET") {
      const profile = user ? profiles.get(user.id) : null;
      const requestedId = url.searchParams.get("id")?.slice(3);
      return respondRows(req, res, profile && (!requestedId || requestedId === user.id) ? [profile] : [], profile ? 1 : 0);
    }
    if (req.method === "POST" || req.method === "PATCH") {
      const body = JSON.parse((await collect(req)).toString("utf8"));
      const rows = Array.isArray(body) ? body : [body];
      if (!user || rows.some(row => row.id !== user.id)) return asJson(res, 403, { code: "42501", message: "Profile owner mismatch" });
      const saved = rows.map(row => {
        const current = profiles.get(user.id) ?? { id: user.id, display_name: null, avatar_url: null };
        const next = { ...current, ...row };
        profiles.set(user.id, next);
        return next;
      });
      return respondRows(req, res, saved);
    }
  }
  if (table === "review_coupons" && req.method === "GET") {
    const rows = user ? [{
      id: "00000000-0000-4000-8000-000000000099",
      user_id: user.id,
      cafe_slug: "baan-baann",
      reward: "5_baht",
      issued_at: "2026-09-24T00:00:00.000Z",
      expires_at: "2026-10-22T18:32:05.175897Z",
      used_at: null,
      cancelled_at: null,
    }] : [];
    return respondRows(req, res, rows);
  }
  if (["cafe_suggestions", "data_reports"].includes(table)) return respondRows(req, res, [], 0);
  return respondRows(req, res, []);
});

server.listen(54321, "127.0.0.1");
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
