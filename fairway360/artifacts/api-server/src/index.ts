import app from "./app";
import { logger } from "./lib/logger";
import { installProcessHandlers } from "./lib/monitoring";
import { startFollowupEngine } from "./lib/followups";

installProcessHandlers();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  // In-process automation: lead follow-up emails (no-op when email is off).
  startFollowupEngine();
});
