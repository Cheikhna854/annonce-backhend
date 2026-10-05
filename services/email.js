const sendPasswordResetCode = async (email, code) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY et EMAIL_FROM doivent être configurés pour envoyer les emails.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Code de réinitialisation de votre mot de passe',
      text: `Votre code de réinitialisation est : ${code}\n\nIl expire dans 10 minutes. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.`,
      html: `<p>Votre code de réinitialisation est :</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>Il expire dans 10 minutes. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Échec de l'envoi de l'email (${response.status}): ${details}`);
  }
};

const sendContactMessage = async ({ nom, email, message }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY et EMAIL_FROM doivent être configurés pour envoyer les emails.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: ['annonce854@gmail.com'],
      reply_to: email,
      subject: `Nouveau message depuis SenAnnonces — ${nom}`,
      text: `Nom : ${nom}\nEmail : ${email}\n\nMessage :\n${message}`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Échec de l'envoi de l'email (${response.status}): ${details}`);
  }
};

module.exports = { sendPasswordResetCode, sendContactMessage };
