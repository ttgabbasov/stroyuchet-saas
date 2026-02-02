import nodemailer from 'nodemailer';

export interface MailOptions {
    to: string;
    subject: string;
    html: string;
}

export class MailService {
    private static instance: MailService;
    private transporter: nodemailer.Transporter;

    private constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.example.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    public static getInstance(): MailService {
        if (!MailService.instance) {
            MailService.instance = new MailService();
        }
        return MailService.instance;
    }

    public async sendMail(options: MailOptions): Promise<void> {
        try {
            await this.transporter.sendMail({
                from: `"СтройУчёт" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
                ...options,
            });
        } catch (error) {
            console.error('Email sending failed:', error);
            // We don't throw here to avoid breaking the main flow if email fails
        }
    }

    public async sendInvitation(
        email: string,
        inviteLink: string,
        companyName: string,
        role: string
    ): Promise<void> {
        const roleLabels: Record<string, string> = {
            OWNER: 'Владелец',
            FOREMAN: 'Прораб',
            ACCOUNTANT: 'Бухгалтер',
            VIEWER: 'Наблюдатель',
            PARTNER: 'Партнер',
        };

        const subject = `Приглашение в команду ${companyName} - СтройУчёт`;
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: #2563eb;">Добро пожаловать в СтройУчёт!</h2>
        <p>Вас пригласили присоединиться к компании <strong>${companyName}</strong> в роли <strong>${roleLabels[role] || role}</strong>.</p>
        <p>СтройУчёт поможет вам эффективно управлять финансами строительных проектов и контролировать расходы в реальном времени.</p>
        <div style="margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Принять приглашение
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Если кнопка не работает, скопируйте эту ссылку в браузер:</p>
        <p style="color: #64748b; font-size: 14px; word-break: break-all;">${inviteLink}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px;">Это автоматическое сообщение, на него не нужно отвечать.</p>
      </div>
    `;

        await this.sendMail({
            to: email,
            subject,
            html,
        });
    }
}
