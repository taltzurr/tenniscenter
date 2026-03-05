#!/usr/bin/env node
/**
 * Generate a Firebase password reset link without sending an email.
 * Usage: node scripts/generate-reset-link.js <email>
 *
 * Requires: firebase CLI to be logged in (firebase login)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_ID = 'tennis-training-app-gemini';
const CONFIG_PATH = path.join(
    process.env.HOME,
    '.config/configstore/firebase-tools.json'
);

function getAccessToken() {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const token = config?.tokens?.access_token;
    if (!token) throw new Error('Not logged in. Run: firebase login');
    return token;
}

function generateLink(email, accessToken) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            requestType: 'PASSWORD_RESET',
            email,
            returnOobLink: true,
        });

        const options = {
            hostname: 'identitytoolkit.googleapis.com',
            path: `/v1/projects/${PROJECT_ID}/accounts:sendOobCode`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const parsed = JSON.parse(data);
                if (parsed.oobLink) resolve(parsed.oobLink);
                else reject(new Error(parsed.error?.message || 'Unknown error'));
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error('Usage: node scripts/generate-reset-link.js <email>');
        process.exit(1);
    }

    try {
        const token = getAccessToken();
        const link = await generateLink(email, token);
        console.log('\n✅ קישור איפוס סיסמה עבור:', email);
        console.log('\n' + link + '\n');
        console.log('⚠️  תקף ל-60 דקות בלבד.\n');
    } catch (err) {
        console.error('❌ שגיאה:', err.message);
        process.exit(1);
    }
}

main();
