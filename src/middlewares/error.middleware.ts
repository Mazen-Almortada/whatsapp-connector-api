import { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ContentfulStatusCode, StatusCode } from "hono/utils/http-status";
import { ApplicationError } from "../errors";
import { env } from "../env";

export const globalErrorMiddleware: ErrorHandler = (err, c) => {

  if (err instanceof HTTPException) {
    return c.json(
      {
        message: err.message,
      },
      err.status
    );
  }


  if (ApplicationError.isApplicationError(err)) {


    const isErrorStatus = typeof err.code === 'number' && err.code >= 400 && err.code < 600;
    const statusCode = isErrorStatus ? err.code : 500;



    return c.json(err.getResponseMessage(), statusCode as ContentfulStatusCode);
  }


  console.error("UNHANDLED APP ERROR:", err);
  
  const message = env.NODE_ENV === "PRODUCTION" 
    ? "Something went wrong, please try again later!" 
    : err.message;

  return c.json({ message: message }, 500);
};
