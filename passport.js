const puppeteer = require('puppeteer-core');
const axios = require('axios');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const submitForm = require('./helperFunction').submitForm;
const solveCaptcha = require('./helperFunction').solveCaptcha;
const passportWebsiteUrl = "https://forms.zohopublic.eu/EoILisbon/form/FREEAppointmentforPassportServiceatEoILisbon";

// Define constant variables for values
const APPLICATION_NO_VALUE = '24-2004980814';
const CARD_NAME_VALUE = 'ammy';
const CARD_NUMBER_VALUE = '5189880019634796';
const EXP_DATE_VALUE = '11/24';
const CVC_VALUE = '123';
const POSTAL_VALUE = '12345';
const PASSPORT_NO_VALUE = 'p2637224';
const FIRST_NAME_VALUE = 'love';
const LAST_NAME_VALUE = 'ammy';
const PHONE_NUMBER_VALUE = '933598539';
const DROPDOWN_VALUE = 'Renewal of Passport';

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

    // Filter out the passport page
    const page = pages.find(page => page.url().startsWith(passportWebsiteUrl));
    if (!page) {
      throw new Error('Passport page not found');
    }

    // Evaluate the screen dimensions in the page context
    // const { width, height } = await page.evaluate(() => {
    //   return {
    //     width: window.screen.width,
    //     height: window.screen.height,
    //   };
    // });

    // Set the viewport to the screen dimensions
    // await page.setViewport({ width, height });

    // Define the steps with selectors and actions
    const steps = [
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
        iframeSelector: 'iframe' // Search for any iframe
      },
      {
        selector: 'input[name="exp-date"]', action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="exp-date"]');
          await context.type('input[name="exp-date"]', EXP_DATE_VALUE);
        },
        iframeSelector: 'iframe' // Search for any iframe
      },
      {
        selector: 'input[name="cvc"]', action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="cvc"]');
          await context.type('input[name="cvc"]', CVC_VALUE);
        },
        iframeSelector: 'iframe' // Search for any iframe
      },
      {
        selector: 'input[name="postal"]', action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="postal"]');
          await context.type('input[name="postal"]', POSTAL_VALUE);
        },
        iframeSelector: 'iframe' // Search for any iframe
      },
      {
        selector: '.calIconWrapper',
        action: async (context) => {
          // Wait for the calendar icon to be visible
          await context.waitForSelector('.calIconWrapper', { visible: true });
      
          // Scroll the icon into view
          // await context.evaluate(() => {
          //   document.querySelector('.calIconWrapper').scrollIntoView({ block: 'center', inline: 'center' });
          // });
      
          // Click the calendar icon to open the datepicker
          await context.click('.calIconWrapper');
      
          // Wait for the datepicker to become visible
          await context.waitForSelector('.ui-datepicker-calendar', { visible: true });
      
          // Click on the desired date
          await context.click('.ui-datepicker-calendar td[data-handler="selectDay"] a');
        }
      },      
      { selector: 'select[name="Dropdown"]', action: async (context) => await context.select('select[name="Dropdown"]', DROPDOWN_VALUE) },
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
        selector: 'input[name="PhoneNumber"]', action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="PhoneNumber"]');
          await context.type('input[name="PhoneNumber"]', PHONE_NUMBER_VALUE);
        }
      },
      {
        selector: '#zf-captcha', action: async (context) => {
          const captchaImageElement = await context.$('#zf-captcha');
          const captchaImageUrl = await context.evaluate(img => img.src, captchaImageElement);
          const captchaSolution = await solveCaptcha(captchaImageUrl);
          if (captchaSolution) {
            await context.evaluate(selector => document.querySelector(selector).value = '', '#verificationcodeTxt');
            await context.type('#verificationcodeTxt', captchaSolution);
          } else {
            throw new Error('Failed to solve CAPTCHA');
          }
        }
      }
    ];

    await submitForm(page, steps);

  } catch (error) {
    console.error("An error occurred during the form submission:", error.message);
  }
})();