import {
  getTeamMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} from "./team.controller.js";

import { requireAuth } from "../auth/auth.guard.js";

export async function teamRoutes(app) {
  // Get team members
  app.get(
    "/team/members",
    { preHandler: requireAuth },
    getTeamMembers
  );

  // Invite member
  app.post(
    "/team/invite",
    { preHandler: requireAuth },
    inviteMember
  );

  // Update role
  app.patch(
    "/team/members/:id",
    { preHandler: requireAuth },
    updateMemberRole
  );

  // Delete member (NO BODY)
  app.delete(
    "/team/members/:id",
    {
      preHandler: requireAuth,
      // explicitly tell Fastify: no body expected
      schema: {
        body: undefined,
      },
    },
    removeMember
  );
}
