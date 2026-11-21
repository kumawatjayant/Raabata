import type { Enquiry } from './enquiry-schema';
import { site } from './site';

export async function notifyEnquiry(enquiry: Enquiry, reference: string) {
  const accessToken =
    process.env['GOOGLE_MAIL_ACCESS_TOKEN'] || process.env['GOOGLE_MAIL_API_KEY'];
  if (!accessToken) {
    // When no external mailer is connected, enquiry remains safely logged in database
    return { sent: false, status: 503, error: 'Email notification service is not configured.' };
  }

  const { website: _website, ...safe } = enquiry;
  const body = `A new ${enquiry.kind} enquiry was received by Rabata.\nReference: ${reference}\n\n${Object.entries(
    safe,
  )
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')}\n\nThis information is private. Please handle student and guardian details with care.`;

  const message = [
    `To: ${site.email}`,
    `Reply-To: ${enquiry.email}`,
    `Subject: Rabata - new ${enquiry.kind} enquiry`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\r\n');

  const bytes = new TextEncoder().encode(message);
  const raw = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Gmail notification failed [${response.status}]: ${errorBody}`);
      return { sent: false, status: response.status, error: errorBody };
    }

    return { sent: true };
  } catch (err) {
    console.error('Failed to dispatch enquiry notification email:', err);
    return { sent: false, status: 500, error: 'Network error sending notification.' };
  }
}
