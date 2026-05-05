import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const defaultDistDir = resolve(__dirname, "dist");
const defaultPort = Number(process.env.PORT) || 4173;
const maxRequestBodyBytes = 0;
const defaultRateLimit = {
  maxRequests: 120,
  windowMs: 60_000,
};

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
]);

const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self' data:; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

class BadRequestError extends Error {}

/**
 * Creates an in-memory fixed-window rate limiter keyed by client IP.
 */
export function createRateLimiter({ maxRequests = defaultRateLimit.maxRequests, windowMs = defaultRateLimit.windowMs } = {}) {
  const buckets = new Map();

  return {
    check(clientIp) {
      const now = Date.now();
      const existing = buckets.get(clientIp);

      if (!existing || now >= existing.resetAt) {
        buckets.set(clientIp, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }

      if (existing.count >= maxRequests) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        };
      }

      existing.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

/**
 * Creates the static app request handler with security headers and abuse controls.
 */
export function createRequestHandler({
  distDir = defaultDistDir,
  port = defaultPort,
  rateLimiter = createRateLimiter(defaultRateLimit),
} = {}) {
  return async function handleRequest(request, response) {
    if (!request.url || !["GET", "HEAD"].includes(request.method ?? "")) {
      writeResponseHead(response, 405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }

    const rateLimit = rateLimiter.check(getClientIp(request));

    if (!rateLimit.allowed) {
      writeResponseHead(response, 429, { "Retry-After": String(rateLimit.retryAfterSeconds) });
      response.end("Too many requests");
      return;
    }

    if (requestHasBody(request)) {
      writeResponseHead(response, 413);
      response.end("Request body too large");
      return;
    }

    try {
      const filePath = await getServablePath(request.url, distDir, port);

      if (!filePath || !existsSync(filePath)) {
        writeResponseHead(response, 404);
        response.end("Not found");
        return;
      }

      writeResponseHead(response, 200, {
        "Cache-Control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
        "Content-Type": mimeTypes.get(extname(filePath)) ?? "application/octet-stream",
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      createReadStream(filePath).pipe(response);
    } catch (error) {
      if (error instanceof BadRequestError) {
        writeResponseHead(response, 400);
        response.end("Bad request");
        return;
      }

      console.error(error);
      writeResponseHead(response, 500);
      response.end("Internal server error");
    }
  };
}

function resolveStaticPath(requestUrl, distDir, port) {
  const url = new URL(requestUrl, `http://localhost:${port}`);
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    throw new BadRequestError("Malformed request path.");
  }

  const requestedPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(distDir, requestedPath));

  if (relative(distDir, filePath).startsWith("..")) {
    return undefined;
  }

  return filePath;
}

async function getServablePath(requestUrl, distDir, port) {
  const filePath = resolveStaticPath(requestUrl, distDir, port);

  if (!filePath) {
    return undefined;
  }

  if (existsSync(filePath) && (await stat(filePath)).isFile()) {
    return filePath;
  }

  return join(distDir, "index.html");
}

function getClientIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim().length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.socket.remoteAddress ?? "unknown";
}

function requestHasBody(request) {
  const contentLength = request.headers["content-length"];

  if (typeof contentLength === "string" && Number(contentLength) > maxRequestBodyBytes) {
    return true;
  }

  if (Array.isArray(contentLength) && contentLength.some((value) => Number(value) > maxRequestBodyBytes)) {
    return true;
  }

  return Boolean(request.headers["transfer-encoding"]);
}

function writeResponseHead(response, statusCode, headers = {}) {
  response.writeHead(statusCode, {
    ...securityHeaders,
    ...headers,
  });
}

/**
 * Creates the production HTTP server.
 */
export function createStaticServer(options = {}) {
  return createServer(createRequestHandler(options));
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  const server = createStaticServer({ distDir: defaultDistDir, port: defaultPort });

  server.listen(defaultPort, "0.0.0.0", () => {
    console.log(`Serving ${defaultDistDir} on port ${defaultPort}`);
  });
}
