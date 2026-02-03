import { FastifyRequest, FastifyReply } from "fastify";
import { getAuth, db } from "../services/firebase.js";

export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({
      success: false,
      error: "Missing or invalid authorization header",
    });
  }

  const token = authHeader.substring(7);

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    
    request.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      emailVerified: decodedToken.email_verified || false,
    };
  } catch (error) {
    request.log.error(error, "Token verification failed");
    return reply.status(401).send({
      success: false,
      error: "Invalid or expired token",
    });
  }
}

export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    
    request.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || "",
      emailVerified: decodedToken.email_verified || false,
    };
  } catch {
    // Silently ignore invalid tokens for optional auth
  }
}

export async function requireOrgMembership(
  request: FastifyRequest<{ Params: { orgId: string } }>,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: "Authentication required",
    });
  }

  const { orgId } = request.params;

  try {
    const orgDoc = await db.organization(orgId).get();

    if (!orgDoc.exists) {
      return reply.status(404).send({
        success: false,
        error: "Organization not found",
      });
    }

    const orgData = orgDoc.data();
    
    // Check if user is owner
    if (orgData?.ownerId === request.user.uid) {
      return;
    }

    // Check if user is a member
    const isMember = orgData?.members?.some(
      (member: { userId: string }) => member.userId === request.user!.uid
    );

    if (!isMember) {
      return reply.status(403).send({
        success: false,
        error: "You do not have access to this organization",
      });
    }
  } catch (error) {
    request.log.error(error, "Error checking organization membership");
    return reply.status(500).send({
      success: false,
      error: "Internal server error",
    });
  }
}
