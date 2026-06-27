import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import stripeWebhookRouter from "./routes/stripe-webhook";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./lib/session";
import { errorHandler } from "./lib/http";
import { serveClient } from "./lib/static";

const app: Express = express();

// Behind the Vite/nginx proxy in dev and prod; trust it so secure cookies and
// req.ip work correctly.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

// Stripe webhook must see the raw body for signature verification, so it is
// mounted before the JSON body parser.
app.use(stripeWebhookRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware());

app.use("/api", router);

// Serve the built frontend in production (single-service deploy).
serveClient(app);

app.use(errorHandler);

export default app;
