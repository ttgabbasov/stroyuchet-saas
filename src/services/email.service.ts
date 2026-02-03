import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'StroyUchet'}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log('Message sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, code: string) {
  const subject = 'Сброс пароля - СтройУчёт';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563EB;">Сброс пароля</h2>
      <p>Вы запросили сброс пароля для вашего аккаунта в СтройУчёт.</p>
      <p>Ваш код для сброса пароля:</p>
      <div style="background-color: #F3F4F6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1F2937;">${code}</span>
      </div>
      <p>Этот код действителен в течение 15 минут.</p>
      <p style="color: #6B7280; font-size: 14px;">Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
    </div>
    </div>
  `;
  return sendEmail(to, subject, html);
}

export async function sendProjectDeletionCode(to: string, projectName: string, code: string) {
  const subject = `Код подтверждения удаления объекта - СтройУчёт`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #DC2626;">Подтверждение удаления</h2>
      <p>Был получен запрос на удаление объекта <b>"${projectName}"</b>.</p>
      <p>Для подтверждения удаления введите этот код:</p>
      <div style="background-color: #FEF2F2; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px solid #FECACA;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #DC2626;">${code}</span>
      </div>
      <p>Код действителен в течение 10 минут.</p>
      <p style="color: #6B7280; font-size: 14px;">Если вы не инициировали это действие, срочно смените пароль.</p>
    </div>
  `;
  return sendEmail(to, subject, html);
}
