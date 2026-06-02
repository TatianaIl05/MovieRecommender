const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { users_pool } = require('../config/database');
const { buildVerificationUrl, sendVerificationEmail } = require('../services/emailService');

const EMAIL_VERIFICATION_TTL_HOURS = 24;

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function deliverVerificationEmail({ email, login, token }) {
    try {
        await sendVerificationEmail({ email, login, token });
    } catch (mailError) {
        console.error('Verification email error:', mailError);
        console.log(`Email verification link for ${email}: ${buildVerificationUrl(token)}`);
    }
}

async function resendVerificationForExistingUser({ login, email, hashedPassword }) {
    const existing = await users_pool.query(
        `
            SELECT id, login, email, email_verified
            FROM users
            WHERE login = $1 OR lower(email) = lower($2)
            ORDER BY CASE
                WHEN login = $1 AND lower(email) = lower($2) THEN 0
                WHEN login = $1 THEN 1
                ELSE 2
            END
            LIMIT 1
        `,
        [login, email]
    );

    const user = existing.rows[0];
    if (!user || user.email_verified || user.login !== login || user.email.toLowerCase() !== email) {
        return null;
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const result = await users_pool.query(
        `
            UPDATE users
            SET password_hash = $2,
                email_verification_token = $3,
                email_verification_expires_at = NOW() + ($4::text || ' hours')::interval
            WHERE id = $1
              AND email_verified = FALSE
            RETURNING id, login, email, email_verified, created_at
        `,
        [user.id, hashedPassword, verificationToken, EMAIL_VERIFICATION_TTL_HOURS]
    );

    if (result.rows.length === 0) {
        return null;
    }

    await deliverVerificationEmail({ email, login, token: verificationToken });
    return result.rows[0];
}

async function register(req, res) {
    const login = String(req.body.login || '').trim();
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!login || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Enter a valid email' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    let hashedPassword;

    try {
        hashedPassword = await bcrypt.hash(password, 10);
        const existing = await users_pool.query(
            `
                SELECT id, login, email, email_verified
                FROM users
                WHERE login = $1 OR lower(email) = lower($2)
                ORDER BY CASE
                    WHEN login = $1 AND lower(email) = lower($2) THEN 0
                    WHEN login = $1 THEN 1
                    ELSE 2
                END
                LIMIT 1
            `,
            [login, email]
        );

        const existingUser = existing.rows[0];
        if (existingUser) {
            if (existingUser.login === login && existingUser.email.toLowerCase() === email && !existingUser.email_verified) {
                const resentUser = await resendVerificationForExistingUser({ login, email, hashedPassword });
                if (resentUser) {
                    return res.status(200).json({
                        message: 'Verification email sent again. Please check your inbox.',
                        user: resentUser
                    });
                }
            }

            const field = existingUser.login === login ? 'login' : 'email';
            return res.status(409).json({ error: `User with this ${field} already exists` });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');

        const result = await users_pool.query(
            `
                INSERT INTO users (
                    login,
                    email,
                    password_hash,
                    email_verified,
                    email_verification_token,
                    email_verification_expires_at
                )
                VALUES ($1, $2, $3, FALSE, $4, NOW() + ($5::text || ' hours')::interval)
                RETURNING id, login, email, email_verified, created_at
            `,
            [login, email, hashedPassword, verificationToken, EMAIL_VERIFICATION_TTL_HOURS]
        );

        await deliverVerificationEmail({ email, login, token: verificationToken });

        res.status(201).json({
            message: 'Registration successful! Please check your email to confirm your account.',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Registration error:', error);

        if (error.code === '23505') {
            const existingUser = await resendVerificationForExistingUser({ login, email, hashedPassword });
            if (existingUser) {
                return res.status(200).json({
                    message: 'Verification email sent again. Please check your inbox.',
                    user: existingUser
                });
            }

            const field = error.constraint.includes('login') ? 'login' : 'email';
            return res.status(409).json({ error: `User with this ${field} already exists` });
        }

        res.status(500).json({ error: 'Server error' });
    }
}

async function login(req, res) {
    const login = String(req.body.login || '').trim();
    const { password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ error: 'Enter login or email and password' });
    }

    try {
        const result = await users_pool.query(
            `
                SELECT *
                FROM users
                WHERE login = $1 OR lower(email) = lower($1)
                ORDER BY CASE WHEN login = $1 THEN 0 ELSE 1 END
                LIMIT 1
            `,
            [login]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid login or password' });
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid login or password' });
        }

        if (!user.email_verified) {
            return res.status(403).json({ error: 'Please confirm your email before logging in' });
        }

        res.json({
            message: 'Login successful!',
            user: { id: user.id, login: user.login, email: user.email, email_verified: user.email_verified }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

async function verifyEmail(req, res) {
    const token = String(req.query.token || '').trim();

    if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
    }

    try {
        const result = await users_pool.query(
            `
                UPDATE users
                SET email_verified = TRUE,
                    email_verification_token = NULL,
                    email_verification_expires_at = NULL
                WHERE email_verification_token = $1
                  AND email_verification_expires_at > NOW()
                RETURNING id, login, email, email_verified
            `,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Verification link is invalid or expired' });
        }

        res.json({
            message: 'Email confirmed successfully. You can now log in.',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Server error' });
    }
}

async function getUsers(req, res) {
    try {
        const result = await users_pool.query('SELECT id, login, email, email_verified, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching data' });
    }
}

module.exports = {
    register,
    login,
    verifyEmail,
    getUsers
};
