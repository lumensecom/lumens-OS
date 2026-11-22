import { spawn } from "node:child_process"
import { createHmac, timingSafeEqual } from "node:crypto"
import { readFileSync } from "node:fs"
import { createServer, request } from "node:http"

const jwtKey = readFileSync("/run/lumens-preview/jwt", "utf8").trim()
const publicKey = "lumens-local-preview"
const ownerId = "405cf1a3-65bb-4b7b-a94e-2e1337af7828"
const cookieName = "sb-127-auth-token"
const sessionSeconds = 60 * 60 * 24
const localHost = /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/
const owner = {
  id: ownerId,
  aud: "authenticated",
  role: "authenticated",
  email: "operaciones@lumens-demo.invalid",
  app_metadata: {},
  user_metadata: { full_name: "Operaciones LUMENS" },
  created_at: new Date().toISOString(),
}

const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url")
const sign = (value) => createHmac("sha256", jwtKey).update(value).digest()
const expires = () => Math.floor(Date.now() / 1000) + sessionSeconds

function ownerToken(exp) {
  const content = encode({ typ: "JWT", alg: "HS256" }) + "." + encode({ role: "authenticated", sub: ownerId, exp })
  return content + "." + sign(content).toString("base64url")
}

function isOwnerToken(token) {
  try {
    const [header, payload, signature, ...extra] = token?.split(".") ?? []
    if (!header || !payload || !signature || extra.length) return false
    const expected = sign(header + "." + payload)
    const actual = Buffer.from(signature, "base64url")
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false
    const claims = JSON.parse(Buffer.from(payload, "base64url"))
    return claims.role === "authenticated" && claims.sub === ownerId && claims.exp > Date.now() / 1000
  } catch {
    return false
  }
}

function forward(incoming, response, { hostname, port, path, headers, rewriteRedirect = false }) {
  const upstream = request({ hostname, port, path, method: incoming.method, headers }, (result) => {
    const returnedHeaders = { ...result.headers }
    if (rewriteRedirect && returnedHeaders.location) {
      const location = URL.parse(returnedHeaders.location)
      if (location && /^(127\.0\.0\.1|localhost):3001$/.test(location.host)) {
        returnedHeaders.location = location.pathname + location.search + location.hash
      }
    }
    response.writeHead(result.statusCode ?? 502, returnedHeaders)
    result.pipe(response)
  })
  upstream.on("error", () => {
    if (!response.headersSent) response.writeHead(502, { "content-type": "text/plain; charset=utf-8" })
    response.end("El servicio local está arrancando.")
  })
  incoming.pipe(upstream)
}

createServer((incoming, response) => {
  const path = incoming.url ?? "/"
  if (path === "/auth/v1/user" && incoming.method === "GET") {
    const allowed = isOwnerToken(incoming.headers.authorization?.split(" ")[1])
    return response.writeHead(allowed ? 200 : 401, { "content-type": "application/json" })
      .end(JSON.stringify(allowed ? owner : { code: "bad_jwt", msg: "Sesión local inválida." }))
  }
  if (path === "/auth/v1/logout" && incoming.method === "POST") return response.writeHead(204).end()
  if (!path.startsWith("/rest/v1/")) return response.writeHead(404).end()
  const headers = { ...incoming.headers }
  if (headers.authorization === "Bearer " + publicKey) delete headers.authorization
  return forward(incoming, response, { hostname: "rest", port: 3000, path: path.slice("/rest/v1".length), headers })
}).listen(45433, "127.0.0.1")

createServer((incoming, response) => {
  const host = incoming.headers.host ?? ""
  if (!localHost.test(host)) return response.writeHead(403).end()

  const path = incoming.url ?? "/"
  if (path === "/__health" && incoming.method === "GET") {
    return forward(incoming, response, {
      hostname: "127.0.0.1", port: 3001, path: "/login",
      headers: { host, "x-forwarded-host": host },
    })
  }
  if (path === "/" && incoming.method === "GET" && incoming.headers["sec-fetch-site"] !== "cross-site") {
    const exp = expires()
    const session = {
      access_token: ownerToken(exp),
      refresh_token: "local-preview",
      expires_at: exp,
      expires_in: sessionSeconds,
      token_type: "bearer",
      user: owner,
    }
    return response.writeHead(303, {
      location: "/torre",
      "set-cookie": cookieName + "=base64-" + encode(session) + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + sessionSeconds,
      "cache-control": "no-store",
    }).end()
  }
  return forward(incoming, response, {
    hostname: "127.0.0.1", port: 3001, path,
    headers: { ...incoming.headers, "x-forwarded-host": host, "x-forwarded-proto": "http" },
    rewriteRedirect: true,
  })
}).listen(3000, "0.0.0.0")

const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3001"], { stdio: "inherit" })
next.on("exit", (code) => process.exit(code ?? 1))
next.on("error", (error) => { console.error(error.message); process.exit(1) })
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => next.kill(signal))
}
