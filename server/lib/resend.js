const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'interviews@jdmatch.ai';

export async function sendInterviewInvite({
  to,
  candidateName,
  jobTitle,
  companyName,
  interviewUrl,
}) {
  if (!RESEND_API_KEY) {
    console.warn(`[Email] RESEND_API_KEY not set. Interview link for ${to}: ${interviewUrl}`);
    return { success: false, reason: 'RESEND_API_KEY not configured' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `${companyName} <${FROM_EMAIL}>`,
      to: [to],
      subject: `You've been invited to interview for ${jobTitle} at ${companyName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${candidateName},</h2>
          <p>
            Congratulations! After reviewing your application, <strong>${companyName}</strong>
            would like to invite you to complete an AI-powered interview for the
            <strong>${jobTitle}</strong> position.
          </p>
          <p>The interview takes about 15–20 minutes and can be completed at any time.</p>
          <div style="margin: 32px 0;">
            <a href="${interviewUrl}"
               style="background:#2563eb;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
              Start Interview
            </a>
          </div>
          <p style="color:#6b7280;font-size:14px;">
            Or copy this link: <a href="${interviewUrl}">${interviewUrl}</a>
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
          <p style="color:#9ca3af;font-size:12px;">
            This interview is powered by JDMatch AI. If you have questions, reply to this email.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[Email] Resend error:', err);
    return { success: false, error: err };
  }

  return { success: true };
}
