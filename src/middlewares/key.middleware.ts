
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { env } from "../env";


export const createWaGatewayKeyMiddleware = () =>
  createMiddleware(async (c, next) => {
    const generalApiKey = env.KEY; 



    if (!generalApiKey) {
      console.warn("[WaGateway Key Middleware] WARNING: General KEY not set in .env. Allowing request without authentication.");
      await next();
      return;
    }

    const providedKey = c.req.query("key") || c.req.header("key");
    
    if (providedKey !== generalApiKey) {
      console.warn(`[WaGateway Key Middleware] Unauthorized access attempt with key: ${providedKey}`);
      throw new HTTPException(401, {
        message: "Unauthorized: Invalid or missing API key.",
      });
    }
    await next();
  });



export const createFrappeApiKeyMiddleware = () =>
  createMiddleware(async (c, next) => {
    const frappeServiceApiKey = env.SERVICE_API_KEY;



    if (!frappeServiceApiKey) {
      console.error("[Frappe Key Middleware] CRITICAL: SERVICE_API_KEY is not set in .env. Denying all Frappe API requests.");
      throw new HTTPException(503, { message: "Service Unavailable: API endpoint is not configured." });
    }

    const apiKeyFromHeader = c.req.header("X-API-Key");

    if (!apiKeyFromHeader) {
      console.warn("[Frappe Key Middleware] Denied access due to missing X-API-Key header.");
      throw new HTTPException(401, { message: "Unauthorized: Missing X-API-Key header." });
    }

    if (apiKeyFromHeader !== frappeServiceApiKey) {
      console.warn("[Frappe Key Middleware] Denied access due to invalid X-API-Key.");
      throw new HTTPException(403, { message: "Forbidden: Invalid API Key." });
    }

    await next();
  });
