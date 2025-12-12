import { Hono } from "hono";
import { lookup as mimeLookup } from "mime-types";

type Env = {
  BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Env }>();

function contentTypeForKey(key: string): string {
  const mt = mimeLookup(key);
  return (typeof mt === "string" && mt) || "application/octet-stream";
}

app.get("*", async (c) => {
  const url = new URL(c.req.url);
  const key = url.pathname.replace(/^\/+/, "");
  if (!key) return c.text("Not Found", 404);

  // Edge cache first
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);

  if (cached) return cached;
  // Fetch from R2 (no Range support)
  const obj = await c.env.BUCKET.get(key);
  if (!obj) return c.text("Not Found", 404);

  // Build headers
  const headers = new Headers();

  // Prefer R2 httpMetadata
  if (obj.httpMetadata) {
    if (obj.httpMetadata.contentType) {
      headers.set("Content-Type", obj.httpMetadata.contentType);
    }
    if (obj.httpMetadata.contentLanguage) {
      headers.set("Content-Language", obj.httpMetadata.contentLanguage);
    }
    if (obj.httpMetadata.contentDisposition) {
      headers.set("Content-Disposition", obj.httpMetadata.contentDisposition);
    }
    if (obj.httpMetadata.cacheControl) {
      headers.set("Cache-Control", obj.httpMetadata.cacheControl);
    }
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", contentTypeForKey(key));
  }
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  if (obj.etag) headers.set("ETag", obj.etag);

  // ETag revalidation
  const inm = c.req.header("If-None-Match");
  if (inm && obj.etag && inm === obj.etag) {
    return new Response(null, { status: 304, headers });
  }

  // Full response; store in edge cache
  const resp = new Response(obj.body, { status: 200, headers });
  c.executionCtx.waitUntil(cache.put(cacheKey, resp.clone()));
  return resp;
});

export default app;
