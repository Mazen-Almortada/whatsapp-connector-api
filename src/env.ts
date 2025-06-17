
import "dotenv/config";
import { z } from "zod";

export const env = z
  .object({
    NODE_ENV: z.enum(["DEVELOPMENT", "PRODUCTION"]).default("DEVELOPMENT"),
    
    PORT: z
      .string()
      .default("5001")
      .transform((e) => Number(e)),

    KEY: z.string().optional().default(""),

 
    SERVICE_API_KEY: z.string().optional().default(""), 


    SESSIONS_PARENT_DIR: z.string().default("sessions"), 

    BAILEYS_LOG_LEVEL: z.enum(['silent', 'info', 'debug', 'trace', 'fatal']).default("info"),

    MAX_MESSAGE_UPDATES_PER_SITE: z.string().default("100").transform(Number),
    MAX_MESSAGE_UPDATE_AGE_MS: z.string().default((24 * 60 * 60 * 1000).toString()).transform(Number),
    
    WEBHOOK_BASE_URL: z.string().optional(),

  })
  .parse(process.env);
