const puppeteer = require('puppeteer-core');
const axios = require('axios');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { submitForm } = require('./helperFunction');
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
const desiredYear = 2024;
const desiredMonth = 12;
const desiredDay = 31;

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

    // Find the passport page
    const page = pages.find(page => page.url().startsWith(passportWebsiteUrl));
    if (!page) {
      throw new Error('Passport page not found');
    }

    // Start solving CAPTCHA early
    const captchaPromise = solveCaptcha(page);

    // Define the steps with selectors and actions
    const steps = [
      {
        name: 'Application Number',
        selector: 'input[name="SingleLine1"]',
        completed: false,
        action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="SingleLine1"]');
          await context.type('input[name="SingleLine1"]', APPLICATION_NO_VALUE);
        }
      },
      {
        name: 'Card Name',
        selector: 'input[elname="stripeCardName"]',
        completed: false,
        action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[elname="stripeCardName"]');
          await context.type('input[elname="stripeCardName"]', CARD_NAME_VALUE);
        }
      },
      {
        name: 'Card Number',
        selector: 'input[name="cardnumber"]',
        completed: false,
        action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="cardnumber"]');
          await context.type('input[name="cardnumber"]', CARD_NUMBER_VALUE);
        },
        iframeSelector: 'iframe' // Search for any iframe
      },
      {
        name: 'Expiration Date',
        selector: 'input[name="exp-date"]',
        completed: false,
        action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="exp-date"]');
          await context.type('input[name="exp-date"]', EXP_DATE_VALUE);
        },
        iframeSelector: 'iframe' // Search for any iframe
      },
      {
        name: 'CVC',
        selector: 'input[name="cvc"]',
        completed: false,
        action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="cvc"]');
          await context.type('input[name="cvc"]', CVC_VALUE);
        },
        iframeSelector: 'iframe' // Search for any iframe
      },
      {
        name: 'Postal Code',
        selector: 'input[name="postal"]',
        completed: false,
        action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="postal"]');
          await context.type('input[name="postal"]', POSTAL_VALUE);
        },
        iframeSelector: 'iframe' // Search for any iframe
      },
      {
        name: 'Date Picker',
        selector: 'input[name="Date"]',
        completed: false,
        action: async (context) => {
          await context.evaluate(
            ({ desiredYear, desiredMonth, desiredDay }) => {
              // Construct the desired date
              const desiredDate = new Date(desiredYear, desiredMonth - 1, desiredDay);

              // Get the date input field
              const dateInput = document.querySelector('#Date-date');

              if (dateInput) {
                // Check if jQuery UI datepicker is available
                if (typeof $(dateInput).datepicker === 'function') {
                  // Set the date using the datepicker's method
                  $(dateInput).datepicker('setDate', desiredDate);

                  // Trigger change events to ensure any listeners are notified
                  $(dateInput).trigger('input');
                  $(dateInput).trigger('change');
                } else {
                  // Fallback if jQuery UI is not available
                  dateInput.value = desiredDate.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  // Manually dispatch events
                  dateInput.dispatchEvent(new Event('input', { bubbles: true }));
                  dateInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
            },
            { desiredYear, desiredMonth, desiredDay } // Pass global variables as arguments
          );
        }
      },
      {
        name: 'Service Type',
        selector: 'select[name="Dropdown"]',
        completed: false,
        action: async (context) => {
          await context.select('select[name="Dropdown"]', DROPDOWN_VALUE);
        }
      },
      {
        name: 'Passport Number',
        selector: 'input[name="SingleLine"]',
        completed: false,
        action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="SingleLine"]');
          await context.type('input[name="SingleLine"]', PASSPORT_NO_VALUE);
        }
      },
      {
        name: 'First Name',
        selector: 'input[elname="First"]',
        completed: false,
        action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[elname="First"]');
          await context.type('input[elname="First"]', FIRST_NAME_VALUE);
        }
      },
      {
        name: 'Last Name',
        selector: 'input[elname="Last"]',
        completed: false,
        action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[elname="Last"]');
          await context.type('input[elname="Last"]', LAST_NAME_VALUE);
        }
      },
      {
        name: 'Phone Number',
        selector: 'input[name="PhoneNumber"]',
        completed: false,
        action: async (context) => {
          await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="PhoneNumber"]');
          await context.type('input[name="PhoneNumber"]', PHONE_NUMBER_VALUE);
        }
      },
      {
        name: 'CAPTCHA',
        selector: '#verificationcodeTxt',
        completed: false,
        action: async (context) => {
          const captchaSolution = await captchaPromise;
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