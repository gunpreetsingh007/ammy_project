const { google } = require('googleapis');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function extractOtp(emailBody) {
    const otpRegex = /\b\d{6}\b/;
    const match = emailBody.match(otpRegex);
    return match ? match[0] : null;
}

async function listenForOtp(auth, toEmail = '') {
    const gmail = google.gmail({ version: 'v1', auth });

    console.log('Waiting for new OTP email...');

    const startTime = Date.now(); // Record time after clicking "Send OTP"
    const maxAttempts = 20;
    const interval = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: `subject:OTP${toEmail ? ' to:' + toEmail : ''}`,
            maxResults: 5,
        });

        const messages = res.data.messages || [];

        for (const msg of messages) {
            const email = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
            });

            const internalDate = parseInt(email.data.internalDate);
            if (internalDate < startTime) {
                // Skip if email was received before Send OTP was clicked
                continue;
            }

            const snippet = email.data.snippet || '';
            const otp = extractOtp(snippet);
            if (otp) {
                console.log('Extracted OTP:', otp);

                // Mark as read
                await gmail.users.messages.modify({
                    userId: 'me',
                    id: msg.id,
                    resource: {
                        removeLabelIds: ['UNREAD'],
                    },
                });

                return otp;
            }
        }

        await sleep(interval);
    }

    console.log('OTP email not received in time.');
    return null;
}

module.exports = { listenForOtp };