import express, { type Request, Response, NextFunction } from "express";
import { supabaseConfigured, supabaseDisabledMessage } from "./supabase";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

async function listenOnAvailablePort(
  server: ReturnType<typeof createServer>,
  preferredPort: number,
  { host, allowFallback }: { host: string; allowFallback: boolean },
) {
  let port = preferredPort;

  while (true) {
    try {
      await new Promise<void>((resolve, reject) => {
        const handleListening = () => {
          server.off("error", handleError);
          resolve();
        };

        const handleError = (error: NodeJS.ErrnoException) => {
          server.off("listening", handleListening);
          reject(error);
        };

        server.once("listening", handleListening);
        server.once("error", handleError);
        server.listen({ port, host });
      });

      return port;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE" && allowFallback) {
        const nextPort = port + 1;
        log(`port ${port} is in use, retrying on ${nextPort}`, "express");
        port = nextPort;
        continue;
      }

      throw error;
    }
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  if (!supabaseConfigured) {
    log(supabaseDisabledMessage, "supabase");
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    log(`${status} ${message}`, "error");
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const explicitPort = process.env.PORT;
  const port = parseInt(explicitPort || "5000", 10);
  const resolvedPort = await listenOnAvailablePort(httpServer, port, {
    host: "0.0.0.0",
    allowFallback: process.env.NODE_ENV !== "production" && explicitPort == null,
  });
  log(`serving on port ${resolvedPort}`);
})();
