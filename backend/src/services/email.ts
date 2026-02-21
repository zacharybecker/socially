import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@socially.app";

export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  orgName: string,
  inviteUrl: string
): Promise<void> {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You've been invited to join ${orgName} on Socially`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 8px;">You're Invited!</h1>
        <p style="color: #94a3b8; margin-bottom: 24px;">
          <strong style="color: #e2e8f0;">${inviterName}</strong> has invited you to join
          <strong style="color: #e2e8f0;">${orgName}</strong> on Socially.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(to right, #3b82f6, #8b5cf6); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
          Accept Invitation
        </a>
        <p style="color: #64748b; font-size: 12px; margin-top: 32px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendApprovalRequestEmail(
  to: string,
  postContent: string,
  requesterName: string,
  reviewUrl: string
): Promise<void> {
  const truncatedContent = postContent.length > 200
    ? postContent.substring(0, 200) + "..."
    : postContent;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Content review requested by ${requesterName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
        <h1 style="color: #ffffff; font-size: 24px; margin-bottom: 8px;">Review Requested</h1>
        <p style="color: #94a3b8; margin-bottom: 16px;">
          <strong style="color: #e2e8f0;">${requesterName}</strong> has submitted content for your approval.
        </p>
        <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 3px solid #3b82f6;">
          <p style="color: #cbd5e1; margin: 0; white-space: pre-wrap;">${truncatedContent}</p>
        </div>
        <a href="${reviewUrl}" style="display: inline-block; background: linear-gradient(to right, #3b82f6, #8b5cf6); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
          Review Post
        </a>
      </div>
    `,
  });
}
