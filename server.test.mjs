// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import { createRateLimiter, createRequestHandler } from "./server.mjs";

const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

describe("server hardening", () => {
  it("adds security headers to successful static responses", async () => {
    const distDir = createDistDir();
    const response = await sendRequest(createRequestHandler({ distDir }), { method: "HEAD", url: "/" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(response.headers["X-Frame-Options"]).toBe("DENY");
    expect(response.headers["Referrer-Policy"]).toBe("no-referrer");
    expect(response.headers["Content-Security-Policy"]).toContain("default-src 'self'");
  });

  it("returns bad request for malformed encoded paths", async () => {
    const distDir = createDistDir();
    const response = await sendRequest(createRequestHandler({ distDir }), { method: "GET", url: "/%ZZ" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe("Bad request");
  });

  it("rejects request bodies on the static server", async () => {
    const distDir = createDistDir();
    const response = await sendRequest(createRequestHandler({ distDir }), {
      headers: { "content-length": "1" },
      method: "GET",
      url: "/",
    });

    expect(response.statusCode).toBe(413);
    expect(response.body).toBe("Request body too large");
  });

  it("rate limits requests by client IP", async () => {
    const distDir = createDistDir();
    const rateLimiter = createRateLimiter({ maxRequests: 2, windowMs: 60_000 });
    const handler = createRequestHandler({ distDir, rateLimiter });

    await sendRequest(handler, { ip: "203.0.113.10", method: "HEAD", url: "/" });
    await sendRequest(handler, { ip: "203.0.113.10", method: "HEAD", url: "/" });
    const blocked = await sendRequest(handler, { ip: "203.0.113.10", method: "HEAD", url: "/" });

    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers["Retry-After"]).toBe("60");
    expect(blocked.body).toBe("Too many requests");
  });
});

function createDistDir() {
  const distDir = mkdtempSync(join(tmpdir(), "cif-dist-"));

  tempDirs.push(distDir);
  writeFileSync(join(distDir, "index.html"), "<!doctype html><title>CIF</title>");

  return distDir;
}

function sendRequest(handler, options) {
  const request = {
    headers: options.headers ?? {},
    method: options.method,
    socket: { remoteAddress: options.ip ?? "127.0.0.1" },
    url: options.url,
  };
  const response = new TestResponse();

  handler(request, response);

  return response.done;
}

class TestResponse extends Writable {
  chunks = [];
  headers = {};
  statusCode = 200;

  constructor() {
    super();
    this.done = new Promise((resolve) => {
      this.resolveDone = resolve;
    });
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    this.headers = { ...this.headers, ...headers };
  }

  end(chunk) {
    if (chunk) {
      this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }

    super.end(() => {
      this.resolveDone({
        body: Buffer.concat(this.chunks).toString("utf8"),
        headers: this.headers,
        statusCode: this.statusCode,
      });
    });
  }

  _write(chunk, _encoding, callback) {
    this.chunks.push(Buffer.from(chunk));
    callback();
  }
}
