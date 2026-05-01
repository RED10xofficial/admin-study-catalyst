export async function sendResetEmail(
  to: string,
  token: string,
  studentOrigin: string,
  resendApiKey: string,
): Promise<void> {
  if (!resendApiKey.trim()) return;

  const resetUrl = `${studentOrigin}/reset-password?token=${encodeURIComponent(token)}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'noreply@yourdomain.com',
      to,
      subject: 'Reset your password',
      text: `Click this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Resend failed (${res.status}): ${text}`);
  }
}
