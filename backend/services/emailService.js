const nodemailer = require('nodemailer');

function getAppUrl() {
    return (process.env.PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function getMailFrom() {
    return process.env.MAIL_FROM || process.env.SMTP_USER || 'Movie Recommender <no-reply@movierecommender.local>';
}

function buildVerificationUrl(token) {
    return `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
}

function createTransporter() {
    if (!process.env.SMTP_HOST) {
        return null;
    }

    const port = Number(process.env.SMTP_PORT) || 587;
    const config = {
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS) || 10000,
        greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS) || 10000,
        socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS) || 15000
    };

    if (process.env.SMTP_USER || process.env.SMTP_PASS) {
        config.auth = {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        };
    }

    return nodemailer.createTransport(config);
}

async function sendViaResend({ email, text, html }) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: getMailFrom(),
            to: [email],
            subject: 'Confirm your Movie Recommender email',
            html,
            text
        })
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Resend email failed with status ${response.status}: ${body}`);
    }
}

async function sendVerificationEmail({ email, login, token }) {
    const verifyUrl = buildVerificationUrl(token);
    const text = [
        `Hello ${login},`,
        '',
        'Please confirm your email address for Movie Recommender by opening this link:',
        verifyUrl,
        '',
        'This link expires in 24 hours.',
        '',
        'If you did not register, ignore this email.'
    ].join('\n');

    const safeVerifyUrl = escapeHtml(verifyUrl);
    const html = `
        <p>Hello ${escapeHtml(login)},</p>
        <p>Please confirm your email address for Movie Recommender by opening this link:</p>
        <p><a href="${safeVerifyUrl}">${safeVerifyUrl}</a></p>
        <p>This link expires in 24 hours.</p>
        <p>If you did not register, ignore this email.</p>
    `;

    const transporter = createTransporter();
    if (process.env.RESEND_API_KEY) {
        console.log(`Resend configured: sender=${getMailFrom()}`);
        await sendViaResend({ email, text, html });
        return;
    }

    if (!transporter) {
        console.log(`Email verification link for ${email}: ${verifyUrl}`);
        return;
    }

    console.log(`SMTP configured: host=${process.env.SMTP_HOST}, port=${process.env.SMTP_PORT || 587}, secure=${process.env.SMTP_SECURE === 'true'}`);

    await transporter.sendMail({
        from: getMailFrom(),
        to: email,
        subject: 'Confirm your Movie Recommender email',
        text,
        html
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

module.exports = {
    buildVerificationUrl,
    sendVerificationEmail
};
