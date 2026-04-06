import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { hash } from "bcryptjs";
import { sendEmail } from "@/lib/email";

export const teamRouter = router({
  listMembers: protectedProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.user.findMany({
      where: { orgId: ctx.session.orgId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return members;
  }),

  invite: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["ACCOUNTANT", "STAFF"]),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.role !== "OWNER" && ctx.session.role !== "CA") {
        throw new Error("Only owners and CAs can invite team members");
      }

      const existing = await ctx.db.user.findFirst({
        where: { orgId: ctx.session.orgId, email: input.email },
      });
      if (existing) throw new Error("User already exists in this organization");

      const pendingInvite = await ctx.db.invitation.findFirst({
        where: {
          orgId: ctx.session.orgId,
          email: input.email,
          status: "PENDING",
        },
      });
      if (pendingInvite) throw new Error("An invitation is already pending for this email");

      const invitation = await ctx.db.invitation.create({
        data: {
          orgId: ctx.session.orgId,
          email: input.email,
          role: input.role,
          invitedBy: ctx.session.userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const org = await ctx.db.organization.findUnique({
        where: { id: ctx.session.orgId },
        select: { name: true },
      });

      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/${invitation.token}`;

      await sendEmail({
        to: input.email,
        subject: `You've been invited to ${org?.name ?? "InvoiceOS"}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;">
            <h2>You're invited!</h2>
            <p>You've been invited to join <strong>${org?.name ?? "an organization"}</strong> on InvoiceOS as a <strong>${input.role.toLowerCase()}</strong>.</p>
            <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
              Accept Invitation
            </a>
            <p style="color:#6b7280;font-size:14px;margin-top:24px;">This invitation expires in 7 days.</p>
          </div>
        `,
      });

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "USER_INVITED",
          entityType: "invitation",
          entityId: invitation.id,
          metadata: { email: input.email, role: input.role },
        },
      });

      return { id: invitation.id, token: invitation.token };
    }),

  acceptInvite: protectedProcedure
    .input(
      z.object({
        token: z.string(),
        name: z.string().min(1),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { token: input.token },
        include: { org: { select: { name: true } } },
      });

      if (!invitation) throw new Error("Invalid invitation");
      if (invitation.status !== "PENDING") throw new Error("Invitation is no longer valid");
      if (invitation.expiresAt < new Date()) {
        await ctx.db.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        });
        throw new Error("Invitation has expired");
      }

      const hashedPassword = await hash(input.password, 12);

      const user = await ctx.db.user.create({
        data: {
          orgId: invitation.orgId,
          email: invitation.email,
          name: input.name,
          role: invitation.role,
          passwordHash: hashedPassword,
          authProviderId: hashedPassword,
        },
      });

      await ctx.db.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });

      return { userId: user.id, orgName: invitation.org.name };
    }),

  removeMember: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.role !== "OWNER") {
        throw new Error("Only owners can remove team members");
      }

      if (input.userId === ctx.session.userId) {
        throw new Error("You cannot remove yourself");
      }

      const member = await ctx.db.user.findFirst({
        where: { id: input.userId, orgId: ctx.session.orgId },
      });
      if (!member) throw new Error("User not found");
      if (member.role === "OWNER") throw new Error("Cannot remove an owner");

      await ctx.db.user.delete({ where: { id: input.userId } });

      await ctx.db.auditLog.create({
        data: {
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          action: "USER_REMOVED",
          entityType: "user",
          entityId: input.userId,
          metadata: { email: member.email, role: member.role },
        },
      });

      return { success: true };
    }),

  updateRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["ACCOUNTANT", "STAFF"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.role !== "OWNER") {
        throw new Error("Only owners can change roles");
      }

      const member = await ctx.db.user.findFirst({
        where: { id: input.userId, orgId: ctx.session.orgId },
      });
      if (!member) throw new Error("User not found");
      if (member.role === "OWNER") throw new Error("Cannot change owner role");

      await ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });

      return { success: true };
    }),

  listInvitations: protectedProcedure.query(async ({ ctx }) => {
    const invitations = await ctx.db.invitation.findMany({
      where: { orgId: ctx.session.orgId },
      include: { inviter: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      inviterName: inv.inviter.name ?? inv.inviter.email,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }));
  }),

  revokeInvitation: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.role !== "OWNER" && ctx.session.role !== "CA") {
        throw new Error("Only owners and CAs can revoke invitations");
      }

      const invitation = await ctx.db.invitation.findFirst({
        where: {
          id: input.invitationId,
          orgId: ctx.session.orgId,
          status: "PENDING",
        },
      });
      if (!invitation) throw new Error("Invitation not found or already resolved");

      await ctx.db.invitation.update({
        where: { id: input.invitationId },
        data: { status: "REVOKED" },
      });

      return { success: true };
    }),
});
