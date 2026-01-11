import * as teamService from "./team.service.js";

/* ===================== GET MEMBERS ===================== */

export async function getTeamMembers(req, reply) {
  const userId = req.user.userId;
  const members = await teamService.getTeamMembers(userId);
  return members;
}

/* ===================== INVITE MEMBER ===================== */

export async function inviteMember(req, reply) {
  const userId = req.user.userId;
  const { email, role } = req.body;

  const member = await teamService.inviteMember(userId, email, role);
  return member;
}

/* ===================== UPDATE ROLE ===================== */

export async function updateMemberRole(req, reply) {
  const userId = req.user.userId;
  const { id } = req.params;
  const { role } = req.body;

  await teamService.updateMemberRole(userId, id, role);
  reply.send({ success: true });
}

/* ===================== REMOVE MEMBER ===================== */

export async function removeMember(req, reply) {
  const userId = req.user.userId;
  const { id } = req.params;

  const deleted = await teamService.removeMember(userId, id);

  if (deleted === 0) {
    reply.code(400).send({
      error: "Cannot remove team owner or member not found",
    });
    return;
  }

  reply.code(204).send();
}

