import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

function rabataApiDevPlugin(): Plugin {
  return {
    name: "rabata-api-dev-middleware",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) {
          return next();
        }
        try {
          const { handleApiRoute } = (await server.ssrLoadModule("./src/server.ts")) as {
            handleApiRoute?: (req: Request) => Promise<Response | null>;
          };
          if (!handleApiRoute) return next();

          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          }
          const bodyBuffer = Buffer.concat(chunks);
          const hasBody = req.method !== "GET" && req.method !== "HEAD" && bodyBuffer.length > 0;

          const host = req.headers.host || "localhost:8080";
          const protocol = req.headers["x-forwarded-proto"] || "http";
          const fullUrl = `${protocol}://${host}${req.url}`;

          const webHeaders = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (v !== undefined) {
              if (Array.isArray(v)) {
                v.forEach((val) => webHeaders.append(k, val));
              } else {
                webHeaders.set(k, v);
              }
            }
          }

          const webReq = new Request(fullUrl, {
            method: req.method,
            headers: webHeaders,
            body: hasBody ? bodyBuffer : undefined,
            // @ts-expect-error Node duplex option
            duplex: "half",
          });

          const webRes = await handleApiRoute(webReq);
          if (!webRes) return next();

          res.statusCode = webRes.status;
          webRes.headers.forEach((val, key) => res.setHeader(key, val));
          const arrayBuf = await webRes.arrayBuffer();
          res.end(Buffer.from(arrayBuf));
        } catch (err) {
          console.error("[Rabata Dev API Error]", err);
          next(err);
        }
      });
    },
  };
}

const isVercel = Boolean(process.env["VERCEL"]) || process.env["NITRO_PRESET"] === "vercel";

export default defineConfig({
  vite: {
    plugins: [rabataApiDevPlugin()],
    server: {
      allowedHosts: true,
    },
  },
  ...(isVercel ? { nitro: { preset: "vercel" } } : {}),
  tanstackStart: {
    server: { entry: "server" },
  },
});
