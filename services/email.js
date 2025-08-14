import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

  const msg = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: 'ÀLÙJÓ Password Reset',
    html: `
      <p>You requested a password reset. Click the link below to proceed:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    `,
  };

  await sgMail.send(msg);
};