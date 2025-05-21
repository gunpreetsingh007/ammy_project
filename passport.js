const puppeteer = require('puppeteer-core');
const axios = require('axios');
const { addExtra } = require('puppeteer-extra');
const authorize = require('./gmailAuth').authorize;
const readline = require('readline');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { submitForm, SUBMIT_BUTTON_ID, submitOTP, displayAllFields } = require('./helperFunction');

const passportWebsiteUrl = "https://forms.zohopublic.eu/EoILisbon/form/FREEAppointmentforPassportServiceatEoILisbon";

// Constants
const APPLICATION_NO_VALUE = '';
const CARD_NAME_VALUE = 'TRAVELS';
const CARD_NUMBER_VALUE = '5189880018742269';
const EXP_DATE_VALUE = '06/25';
const CVC_VALUE = '820';
const POSTAL_VALUE = '';
const PASSPORT_NO_VALUE = '';
const FIRST_NAME_VALUE = '';
const LAST_NAME_VALUE = '';
const PHONE_NUMBER_VALUE = '';
const DROPDOWN_VALUE = '';
const desiredYear = 2024;
const desiredMonth = 12;
const desiredDay = 31;
const EMAIL_VALUE = 'kattotravel@gmail.com';

(async () => {
  try {
    const auth = await authorize();

    const puppeteerExtra = addExtra(puppeteer);
    puppeteerExtra.use(StealthPlugin());

    const response = await axios.get('http://localhost:9222/json/version');
    const webSocketDebuggerUrl = response.data.webSocketDebuggerUrl;

    const browser = await puppeteerExtra.connect({
      browserWSEndpoint: webSocketDebuggerUrl
    });

    const pages = await browser.pages();
    const page = pages.find(page => page.url().startsWith(passportWebsiteUrl));
    if (!page) {
      throw new Error('Passport page not found');
    }

    const steps = [
      {
        name: 'Card Name',
        selector: 'input[elname="stripeCardName"]',
        completed: false,
        fillInitially: true,
        action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[elname="stripeCardName"]');
          await context.type('input[elname="stripeCardName"]', CARD_NAME_VALUE);
        }
      },
      {
        name: 'Card Number',
        selector: 'input[name="cardnumber"]',
        completed: false,
        fillInitially: true,
        action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="cardnumber"]');
          await context.type('input[name="cardnumber"]', CARD_NUMBER_VALUE);
        },
        iframeSelector: 'iframe'
      },
      {
        name: 'Expiration Date',
        selector: 'input[name="exp-date"]',
        completed: false,
        fillInitially: true,
        action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="exp-date"]');
          await context.type('input[name="exp-date"]', EXP_DATE_VALUE);
        },
        iframeSelector: 'iframe'
      },
      {
        name: 'CVC',
        selector: 'input[name="cvc"]',
        completed: false,
        fillInitially: true,
        action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="cvc"]');
          await context.type('input[name="cvc"]', CVC_VALUE);
        },
        iframeSelector: 'iframe'
      },
      {
        name: 'Math CAPTCHA',
        selector: 'input[name="Number"]',
        completed: false,
        fillInitially: true,
        action: async (context) => {
          const question = await context.$eval('#Number-li label.fieldlabel span.fieldLabelTxt', el => el.textContent.trim());
console.log("Extracted question:", question);
          const mathExpression = question.replace(/[^\d+\-*/().]/g, '');
          let result;
          try {
            result = eval(mathExpression);
          } catch (e) {
            throw new Error('Failed to parse CAPTCHA math question');
          }
          await context.evaluate(() => {
            const input = document.querySelector('input[name="Number"]');
            if (input) input.value = '';
          });
          await context.type('input[name="Number"]', String(result));
        }
      }
    ];

   const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Page is ready. Press Enter to continue...', async () => {
  rl.close();
  await submitOTP({ page, email: EMAIL_VALUE, auth });
  await displayAllFields(page, SUBMIT_BUTTON_ID);
  await submitForm(page, steps, false, true);
  
// Paste this block immediately after
await new Promise(resolve => setTimeout(resolve, 1000)); // 

await page.evaluate(() => {
  const submitBtn = document.querySelector('button[elname="submit"]');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.style.display = 'block';
    submitBtn.click();
    console.log("Submit button clicked.");
  } else {
    console.log("Submit button not found.");
}
});
});

  } catch (error) {
    console.error("An error occurred during the form submission:", error.message);
  }
})();