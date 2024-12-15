const { google } = require('googleapis');
const authorize = require('./gmailAuth').authorize;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract OTP from the email body.
 *
 * @param {string} emailBody The body of the email.
 */
function extractOtp(emailBody) {
    const otpRegex = /\b\d{6}\b/; // Adjust the regex based on your OTP format
    const match = emailBody.match(otpRegex);
    return match ? match[0] : null;
}

/**
 * Listen for new OTP emails and extract the OTP.
 */
async function listenForOtp() {
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    console.log('Listening for new OTP emails...');

    const maxAttempts = 50; // Maximum number of times to poll
    const interval = 200;  // Interval between polls in milliseconds

    let attempts = 0;

    while (attempts < maxAttempts) {
        attempts++;

        // List unread messages
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: 'is:unread',
            maxResults: 10,
        });

        const messages = res.data.messages || [];

        for (const message of messages) {
            const email = await gmail.users.messages.get({
                userId: 'me',
                id: message.id,
            });

            const emailBody = email.data.snippet;
            const otp = extractOtp(emailBody);

            if (otp) {
                console.log('Extracted OTP:', otp);

                // Mark the email as read to prevent re-processing
                await gmail.users.messages.modify({
                    userId: 'me',
                    id: message.id,
                    resource: {
                        removeLabelIds: ['UNREAD'],
                    },
                });

                return otp;
            }
        }

        // Wait before checking again
        await sleep(interval);
    }

    console.log('OTP email not received within the expected time.');
    return null;
}

module.exports = { listenForOtp };