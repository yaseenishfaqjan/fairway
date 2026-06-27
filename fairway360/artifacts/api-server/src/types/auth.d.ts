import "express-session";
import type { Role } from "@workspace/api-zod";

declare module "express-session" {
  interface SessionData {
    userId: string;
    clubId: string;
    role: Role;
  }
}

declare global {
  namespace Express {
    interface Request {
      // Populated by requireAuth. club_id is ALWAYS taken from here (the
      // session), never from request input — this is the tenant-isolation
      // boundary.
      auth?: {
        userId: string;
        clubId: string;
        role: Role;
      };
    }
  }
}
