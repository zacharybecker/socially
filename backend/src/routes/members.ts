import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomBytes } from "crypto";
import { authenticate, requireOrgMembership } from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { db } from "../services/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { createError } from "../middleware/errorHandler.js";
import { sendInvitationEmail } from "../services/email.js";
import { logActivity } from "../services/activity-log.js";
import { Invitation, Organization, OrganizationMember } from "../types/index.js";

const inviteSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["admin", "editor", "viewer"]),
});

const changeRoleSchema = z.object({
  role: z.enum(["admin", "editor", "viewer"]),
});

export async function memberRoutes(fastify: FastifyInstance) {
  // GET / - list organization members
  fastify.get<{
    Params: { orgId: string };
  }>(
    "/",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;

      const orgDoc = await db.organization(orgId).get();
      if (!orgDoc.exists) {
        throw createError("Organization not found", 404);
      }

      const org = orgDoc.data() as Organization;

      // Build member list including owner
      const memberUserIds = [org.ownerId, ...(org.members || []).map((m) => m.userId)];
      const userDocs = await Promise.all(
        memberUserIds.map((uid) => db.user(uid).get())
      );

      const members = [];

      // Owner entry
      const ownerDoc = userDocs[0];
      members.push({
        userId: org.ownerId,
        role: "owner" as const,
        displayName: ownerDoc.exists ? ownerDoc.data()?.displayName || ownerDoc.data()?.email : "Unknown",
        email: ownerDoc.exists ? ownerDoc.data()?.email : "",
        photoURL: ownerDoc.exists ? ownerDoc.data()?.photoURL : null,
        joinedAt: org.createdAt,
      });

      // Other members
      for (let i = 0; i < (org.members || []).length; i++) {
        const member = org.members[i];
        const userDoc = userDocs[i + 1];
        members.push({
          userId: member.userId,
          role: member.role,
          displayName: userDoc.exists ? userDoc.data()?.displayName || userDoc.data()?.email : "Unknown",
          email: userDoc.exists ? userDoc.data()?.email : "",
          photoURL: userDoc.exists ? userDoc.data()?.photoURL : null,
          joinedAt: member.joinedAt,
        });
      }

      return reply.send({
        success: true,
        data: members,
      });
    }
  );

  // POST /invite - invite a member
  fastify.post<{
    Params: { orgId: string };
  }>(
    "/invite",
    { preHandler: [authenticate, requireOrgMembership, requireRole("admin")] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { email, role } = validateBody(inviteSchema, request.body);

      // Check if already a member
      const orgDoc = await db.organization(orgId).get();
      const org = orgDoc.data() as Organization;

      // Check by email in user docs
      const existingMembers = [org.ownerId, ...(org.members || []).map((m) => m.userId)];
      for (const uid of existingMembers) {
        const userDoc = await db.user(uid).get();
        if (userDoc.exists && userDoc.data()?.email === email) {
          throw createError("User is already a member of this organization", 400);
        }
      }

      // Check for existing pending invitation
      const existingInvite = await db
        .invitations(orgId)
        .where("email", "==", email)
        .where("status", "==", "pending")
        .get();

      if (!existingInvite.empty) {
        throw createError("An invitation has already been sent to this email", 400);
      }

      // Create invitation
      const token = randomBytes(32).toString("hex");
      const invitationData: Omit<Invitation, "id"> = {
        email,
        role,
        invitedBy: request.user!.uid,
        status: "pending",
        token,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days
      };

      const invRef = await db.invitations(orgId).add(invitationData);

      // Send invitation email
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const inviteUrl = `${frontendUrl}/invite/${token}?orgId=${orgId}`;

      const inviterDoc = await db.user(request.user!.uid).get();
      const inviterName = inviterDoc.exists
        ? inviterDoc.data()?.displayName || inviterDoc.data()?.email || "A team member"
        : "A team member";

      try {
        await sendInvitationEmail(email, inviterName, org.name, inviteUrl);
      } catch (error) {
        request.log.error(error, "Failed to send invitation email");
        // Don't fail the request — invitation is still created
      }

      await logActivity(orgId, request.user!.uid, "member_invited", "member", invRef.id, `Invited ${email} as ${role}`);

      return reply.status(201).send({
        success: true,
        data: { id: invRef.id, ...invitationData, token: undefined },
        message: "Invitation sent",
      });
    }
  );

  // DELETE /:userId - remove member
  fastify.delete<{
    Params: { orgId: string; userId: string };
  }>(
    "/:userId",
    { preHandler: [authenticate, requireOrgMembership, requireRole("admin")] },
    async (request, reply) => {
      const { orgId, userId } = request.params;

      const orgDoc = await db.organization(orgId).get();
      const org = orgDoc.data() as Organization;

      if (org.ownerId === userId) {
        throw createError("Cannot remove the organization owner", 400);
      }

      const memberIndex = (org.members || []).findIndex((m) => m.userId === userId);
      if (memberIndex === -1) {
        throw createError("User is not a member of this organization", 404);
      }

      const updatedMembers = [...org.members];
      updatedMembers.splice(memberIndex, 1);

      const updatedMemberUserIds = updatedMembers.map((m) => m.userId);

      await db.organization(orgId).update({
        members: updatedMembers,
        memberUserIds: updatedMemberUserIds,
      });

      await logActivity(orgId, request.user!.uid, "member_removed", "member", userId, `Removed member ${userId}`);

      return reply.send({
        success: true,
        message: "Member removed",
      });
    }
  );

  // PUT /:userId/role - change member role
  fastify.put<{
    Params: { orgId: string; userId: string };
  }>(
    "/:userId/role",
    { preHandler: [authenticate, requireOrgMembership, requireRole("admin")] },
    async (request, reply) => {
      const { orgId, userId } = request.params;
      const { role } = validateBody(changeRoleSchema, request.body);

      const orgDoc = await db.organization(orgId).get();
      const org = orgDoc.data() as Organization;

      // Only owner can change roles
      if (org.ownerId !== request.user!.uid) {
        throw createError("Only the organization owner can change roles", 403);
      }

      if (org.ownerId === userId) {
        throw createError("Cannot change the owner's role", 400);
      }

      const memberIndex = (org.members || []).findIndex((m) => m.userId === userId);
      if (memberIndex === -1) {
        throw createError("User is not a member of this organization", 404);
      }

      const updatedMembers = [...org.members];
      updatedMembers[memberIndex] = {
        ...updatedMembers[memberIndex],
        role,
      };

      await db.organization(orgId).update({
        members: updatedMembers,
      });

      await logActivity(orgId, request.user!.uid, "settings_updated", "member", userId, `Changed role to ${role}`);

      return reply.send({
        success: true,
        message: "Role updated",
      });
    }
  );

  // GET /invitations - list pending invitations
  fastify.get<{
    Params: { orgId: string };
  }>(
    "/invitations",
    { preHandler: [authenticate, requireOrgMembership, requireRole("admin")] },
    async (request, reply) => {
      const { orgId } = request.params;

      const snapshot = await db
        .invitations(orgId)
        .where("status", "==", "pending")
        .orderBy("createdAt", "desc")
        .get();

      const invitations = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          role: data.role,
          invitedBy: data.invitedBy,
          status: data.status,
          createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
          expiresAt: data.expiresAt?.toDate?.() ? data.expiresAt.toDate().toISOString() : data.expiresAt,
        };
      });

      return reply.send({
        success: true,
        data: invitations,
      });
    }
  );

  // DELETE /invitations/:invitationId - revoke invitation
  fastify.delete<{
    Params: { orgId: string; invitationId: string };
  }>(
    "/invitations/:invitationId",
    { preHandler: [authenticate, requireOrgMembership, requireRole("admin")] },
    async (request, reply) => {
      const { orgId, invitationId } = request.params;

      const invDoc = await db.invitation(orgId, invitationId).get();
      if (!invDoc.exists) {
        throw createError("Invitation not found", 404);
      }

      await db.invitation(orgId, invitationId).update({
        status: "revoked",
      });

      return reply.send({
        success: true,
        message: "Invitation revoked",
      });
    }
  );

  // POST /invitations/:token/accept - accept invitation
  fastify.post<{
    Params: { orgId: string; token: string };
  }>(
    "/invitations/:token/accept",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { orgId, token } = request.params;

      // Find invitation by token
      const snapshot = await db
        .invitations(orgId)
        .where("token", "==", token)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw createError("Invalid or expired invitation", 404);
      }

      const invDoc = snapshot.docs[0];
      const invitation = invDoc.data() as Invitation;

      // Check expiration
      const expiresAt = invitation.expiresAt?.toDate?.()
        ? invitation.expiresAt.toDate()
        : new Date(invitation.expiresAt as unknown as string);
      if (expiresAt < new Date()) {
        await invDoc.ref.update({ status: "expired" });
        throw createError("This invitation has expired", 400);
      }

      // Check if user is already a member
      const orgDoc = await db.organization(orgId).get();
      if (!orgDoc.exists) {
        throw createError("Organization not found", 404);
      }

      const org = orgDoc.data() as Organization;
      const existingMember = (org.members || []).find((m) => m.userId === request.user!.uid);
      if (existingMember || org.ownerId === request.user!.uid) {
        throw createError("You are already a member of this organization", 400);
      }

      // Add user to organization
      const newMember: OrganizationMember = {
        userId: request.user!.uid,
        role: invitation.role,
        joinedAt: Timestamp.now(),
      };

      await db.organization(orgId).update({
        members: [...(org.members || []), newMember],
        memberUserIds: [...(org.memberUserIds || []), request.user!.uid],
      });

      // Mark invitation as accepted
      await invDoc.ref.update({ status: "accepted" });

      await logActivity(orgId, request.user!.uid, "member_joined", "member", request.user!.uid, `Accepted invitation as ${invitation.role}`);

      return reply.send({
        success: true,
        message: "Invitation accepted",
        data: { orgId, role: invitation.role },
      });
    }
  );
}
