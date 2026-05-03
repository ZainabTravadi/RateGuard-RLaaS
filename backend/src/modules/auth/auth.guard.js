import jwt from "jsonwebtoken";

export async function requireAuth(req, reply) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: payload.userId };
  } catch {
    return reply.code(401).send({ error: "Invalid token", code: "INVALID_TOKEN" });
  }
}
