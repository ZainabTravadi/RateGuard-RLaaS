import {
  getRules,
  createRuleHandler,
  toggleRuleHandler,
  deleteRuleHandler,
} from "./rules.controller.js";

import { requireAuth } from "../auth/auth.guard.js";

export async function rulesRoutes(app) {
  app.get(
    "/rules",
    { preHandler: requireAuth },
    getRules
  );

  app.post(
    "/rules",
    { preHandler: requireAuth },
    createRuleHandler
  );

  app.patch(
    "/rules/:id/toggle",
    { preHandler: requireAuth },
    toggleRuleHandler
  );

  app.delete(
    "/rules/:id",
    { preHandler: requireAuth },
    deleteRuleHandler
  );
}
