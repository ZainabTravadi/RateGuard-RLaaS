import * as controller from "./apiKeys.controller.js";
import { requireAuth } from "../auth/auth.guard.js";

export default async function apiKeysRoutes(app) {
  app.get(
    "/",
    { preHandler: requireAuth },
    controller.listKeys
  );

  app.post(
    "/",
    { preHandler: requireAuth },
    controller.createKey
  );

  app.post(
    "/:id/rotate",
    { preHandler: requireAuth },
    controller.rotateKey
  );

  app.delete(
    "/:id",
    {
      preHandler: requireAuth,
      schema: {
        body: undefined, // DELETE has no body
      },
    },
    controller.deleteKey
  );
}
