
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import moment from "moment";

import { env } from "./env";
import { globalErrorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/notfound.middleware";
import { createFrappeAPIRouter } from "./routes/frappe.routes";
import { initializeWhatsApp } from "./services/whatsapp.service";




process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('!!!!!!!!!! GLOBAL UNHANDLED REJECTION !!!!!!!!!');
  console.error('Reason:', reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('!!!!!!!!!! GLOBAL UNCAUGHT EXCEPTION !!!!!!!!!');
  console.error('Terminating due to uncaught exception:', error.message);
  console.error('Stack Trace:', error.stack);

  process.exit(1); // Exit is mandatory after an uncaught exception.
});



const app = new Hono();


app.use(logger((str) => console.log(`${moment().toISOString()} | ${str}`)));
app.use(cors()); // Apply CORS to all routes



const frappeRouter = createFrappeAPIRouter();
app.route("/api", frappeRouter);












app.onError(globalErrorMiddleware);
app.notFound(notFoundMiddleware);



const port = env.PORT;
serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`✅ Server is running on http://localhost:${info.port}`);
    

    initializeWhatsApp();

  }
);
