import { requireAuth } from "../auth/auth.guard.js";
import {
  listEnvironments,
  updateEnvironment,
} from "./environments.controller.js";

export default async function environmentsRoutes(app) {
  // 🔒 EVERYTHING HERE IS PROTECTED
  app.addHook("preHandler", requireAuth);

  app.get("/environments", listEnvironments);
  app.patch("/environments/:id", updateEnvironment);
}
