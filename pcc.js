const puppeteer = require('puppeteer-core');
const axios = require('axios');
const path = require('path');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const submitForm = require('./helperFunction').submitForm;
const solveCaptcha = require('./helperFunction').solveCaptcha;
const pccWebsiteUrl = "https://forms.zohopublic.eu/EoILisbon/form/FREEAppointmentforPCCServiceatEoILisbon";

// Define constant variables for values
const IMAGE_PATH = path.join(__dirname, 'images', 'Nitro_Wallpaper_01_3840x2400.jpg');
const APPLICATION_NO_VALUE = '45451515155';
const CARD_NAME_VALUE = 'John Doe';
const CARD_NUMBER_VALUE = '5189880019634796';
const EXP_DATE_VALUE = '11/24';
const CVC_VALUE = '123';
const POSTAL_VALUE = '12345';
const PASSPORT_NO_VALUE = 'A1234567';
const FIRST_NAME_VALUE = 'John';
const LAST_NAME_VALUE = 'Doe';
const PHONE_NUMBER_VALUE = '1234567890';
const EMAIL_VALUE = 'john.doe@example.com';

(async () => {
  try {
    const puppeteerExtra = addExtra(puppeteer);
    puppeteerExtra.use(StealthPlugin());

    // Fetch the WebSocket endpoint
    const response = await axios.get('http://localhost:9222/json/version');
    const webSocketDebuggerUrl = response.data.webSocketDebuggerUrl;

    // Connect to the existing browser instance
    const browser = await puppeteerExtra.connect({
      browserWSEndpoint: webSocketDebuggerUrl,
    });

    // Get all open pages
    const pages = await browser.pages();
    // pages.map((page, index) => console.log(`Page ${index + 1}: ${page.url()}`));

    // Filter out the PCC page
    const page = pages.find(page => page.url().startsWith(pccWebsiteUrl));
    if (!page) {
      throw new Error('PCC page not found');
    }

    // Evaluate the screen dimensions in the page context
    const { width, height } = await page.evaluate(() => {
      return {
        width: window.screen.width,
        height: window.screen.height,
      };
    });

    // Set the viewport to the screen dimensions
    await page.setViewport({ width, height });

    // Define the steps with selectors and actions
    const steps = [
      {
        selector: 'div[elname="uploadActionDiv"]', action: async (context) => {
          await new Promise(resolve => setTimeout(resolve, 200)); // Wait for 300 milliseconds
          const [fileChooser] = await Promise.all([
            context.waitForFileChooser(),
            context.click('div[elname="uploadActionDiv"]'),
          ]);
          await fileChooser.accept([IMAGE_PATH]);
        }
      },
      {
        selector: 'input[name="SingleLine1"]', action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="SingleLine1"]');
          await context.type('input[name="SingleLine1"]', APPLICATION_NO_VALUE);
        }
      },
      {
        selector: 'input[elname="stripeCardName"]', action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[elname="stripeCardName"]');
          await context.type('input[elname="stripeCardName"]', CARD_NAME_VALUE);
        }
      },
      {
        selector: 'input[name="cardnumber"]', action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="cardnumber"]');
          await context.type('input[name="cardnumber"]', CARD_NUMBER_VALUE);
        },
        iframeSelector: 'iframe[name="__privateStripeFrame9423"]' // Add iframe selector
      },
      {
        selector: 'input[name="exp-date"]', action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="exp-date"]');
          await context.type('input[name="exp-date"]', EXP_DATE_VALUE);
        },
        iframeSelector: 'iframe[name="__privateStripeFrame9423"]' // Add iframe selector
      },
      {
        selector: 'input[name="cvc"]', action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="cvc"]');
          await context.type('input[name="cvc"]', CVC_VALUE);
        },
        iframeSelector: 'iframe[name="__privateStripeFrame9423"]' // Add iframe selector
      },
      {
        selector: 'input[name="postal"]', action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="postal"]');
          await context.type('input[name="postal"]', POSTAL_VALUE);
        },
        iframeSelector: 'iframe[name="__privateStripeFrame9423"]' // Add iframe selector
      },
      {
        selector: 'input[name="SingleLine"]', action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="SingleLine"]');
          await context.type('input[name="SingleLine"]', PASSPORT_NO_VALUE);
        }
      },
      {
        selector: 'input[elname="First"]', action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[elname="First"]');
          await context.type('input[elname="First"]', FIRST_NAME_VALUE);
        }
      },
      {
        selector: 'input[elname="Last"]', action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[elname="Last"]');
          await context.type('input[elname="Last"]', LAST_NAME_VALUE);
        }
      },
      {
        selector: 'input[name="Date"]',
        action: async (context) => {
          // Click the date input field to open the datepicker
          await context.click('input[name="Date"]');

          // Wait for the datepicker to become visible
          await context.waitForSelector('.ui-datepicker-calendar', { visible: true });

          // Click on the desired date
          await context.click('.ui-datepicker-calendar td[data-handler="selectDay"] a');
        }
      },
      {
        selector: 'input[name="PhoneNumber"]', action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="PhoneNumber"]');
          await context.type('input[name="PhoneNumber"]', PHONE_NUMBER_VALUE);
        }
      },
      {
        selector: 'input[name="Email"]', action: async (context) => {
          await context.evaluate(selector => {
            const emailInput = document.querySelector(selector);
            emailInput.removeAttribute('disabled');
            emailInput.value = '';
          }, 'input[name="Email"]');
          await context.type('input[name="Email"]', EMAIL_VALUE);
        }
      },
      {
        selector: '#zf-captcha', action: async (context) => {
          const captchaImageElement = await context.$('#zf-captcha');
          const captchaImageUrl = await context.evaluate(img => img.src, captchaImageElement);
          const captchaSolution = await solveCaptcha(captchaImageUrl);
          if (captchaSolution) {
            await context.type('#verificationcodeTxt', captchaSolution);
          } else {
            throw new Error('Failed to solve CAPTCHA');
          }
        }
      },
    ];

    await submitForm(page, steps);

  } catch (error) {
    console.error("An error occurred during the form submission:", error.message);
  }
})();