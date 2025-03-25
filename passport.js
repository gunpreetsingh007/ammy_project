const puppeteer = require('puppeteer-core');
const axios = require('axios');
const { addExtra } = require('puppeteer-extra');
const authorize = require('./gmailAuth').authorize;
const readline = require('readline');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { interceptor, patterns } = require('puppeteer-extra-plugin-interceptor');
const { submitForm, SUBMIT_BUTTON_ID, submitOTP } = require('./helperFunction');
const solveCaptcha = require('./helperFunction').solveCaptcha;
const passportWebsiteUrl = "https://forms.zohopublic.eu/EoILisbon/form/FREEAppointmentforPassportServiceatEoILisbon";
const passportWebsiteUrlTemp = "https://forms.zohopublic.eu/EoILisbon/form/PCCapplicationsbyPOSTwithPrePayment";

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
const EMAIL_VALUE = 'gunpreetsinghking7172@gmail.com';
// const OTP_VALUE = '123456';

(async () => {
  try {
    const auth = await authorize();

    const puppeteerExtra = addExtra(puppeteer);
    puppeteerExtra.use(StealthPlugin());
    // puppeteerExtra.use(interceptor());

    // Fetch the WebSocket endpoint
    const response = await axios.get('http://localhost:9222/json/version');
    const webSocketDebuggerUrl = response.data.webSocketDebuggerUrl;

    // Connect to the existing browser instance
    const browser = await puppeteerExtra.connect({
      browserWSEndpoint: webSocketDebuggerUrl
    });

    // Get all open pages
    const pages = await browser.pages();

    // Find the passport page
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

    // const client = await page.createCDPSession();
    // await client.send('Fetch.enable', {
    //   patterns: [{ urlPattern: '*validateotp*', requestStage: 'Response' }]
    // });

    // client.on('Fetch.requestPaused', async event => {
    //   const { requestId, responseStatusCode, responseHeaders, request } = event;

    //   if (responseStatusCode) {
    //     if (request.url.includes('/validateotp')) {
    //       // Get the original response body
    //       // const { body } = await client.send('Fetch.getResponseBody', { requestId });
    //       const newResponseJson = JSON.stringify({"status": "success", "redirect_url":request.headers.Referer })
    //       const newResponse = Buffer.from(newResponseJson);
    //       const base64EncodedResponse = newResponse.toString('base64');

    //       await client.send('Fetch.fulfillRequest', {
    //         requestId,
    //         responseCode: 200,
    //         responseHeaders: responseHeaders,
    //         body: base64EncodedResponse
    //       });
    //     } else {
    //       // Continue with the original response for other URLs
    //       await client.send('Fetch.continueResponse', { requestId });
    //     }
    //   } else {
    //     // Continue with the original request
    //     await client.send('Fetch.continueRequest', { requestId });
    //   }
    // });

    // await page.setRequestInterception(true);

    // page.on('request', request => {
    //   request.continue();
    // });

    // page.on('response', async response => {
    //   const request = response.request();
    //   const url = request.url();

    //   if (url.includes('/validateotp')) {
    //     const originalResponse = await response.buffer();
    //     const responseBody = originalResponse.toString('utf8');

    //     // Modify the response
    //     const modifiedBody = JSON.stringify({ message: "OTP verified" });

    //     const headers = response.headers();
    //     headers['content-length'] = Buffer.byteLength(modifiedBody, 'utf8').toString();

    //     // Send the modified response
    //     await interceptResponse(response, {
    //       status: 201, // Change status code to 201
    //       contentType: 'application/json',
    //       headers,
    //       body: modifiedBody,
    //     });
    //   }
    // });

    // Define the steps with selectors and actions
    const steps = [
      // {
      //   name: 'Application Number',
      //   selector: 'input[name="SingleLine1"]',
      //   completed: false,
      //   fillInitially: true,
      //   action: async (context) => {
      //     await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="SingleLine1"]');
      //     await context.type('input[name="SingleLine1"]', APPLICATION_NO_VALUE);
      //   }
      // },
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
        iframeSelector: 'iframe' // Search for any iframe
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
        iframeSelector: 'iframe' // Search for any iframe
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
        iframeSelector: 'iframe' // Search for any iframe
      },
      // {
      //   name: 'Postal Code',
      //   selector: 'input[name="postal"]',
      //   completed: false,
      //   fillInitially: true,
      //   action: async (context) => {
      //     await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="postal"]');
      //     await context.type('input[name="postal"]', POSTAL_VALUE);
      //   },
      //   iframeSelector: 'iframe' // Search for any iframe
      // },
      // {
      //   name: 'Date Picker',
      //   selector: 'input[name="Date"]',
      //   completed: false,
      //   fillInitially: true,
      //   action: async (context) => {
      //     await context.evaluate(
      //       ({ desiredYear, desiredMonth, desiredDay }) => {
      //         // Construct the desired date
      //         const desiredDate = new Date(desiredYear, desiredMonth - 1, desiredDay);

      //         // Get the date input field
      //         const dateInput = document.querySelector('#Date-date');

      //         if (dateInput) {
      //           // Check if jQuery UI datepicker is available
      //           if (typeof $(dateInput).datepicker === 'function') {
      //             // Set the date using the datepicker's method
      //             $(dateInput).datepicker('setDate', desiredDate);

      //             // Trigger change events to ensure any listeners are notified
      //             $(dateInput).trigger('input');
      //             $(dateInput).trigger('change');
      //           } else {
      //             // Fallback if jQuery UI is not available
      //             dateInput.value = desiredDate.toLocaleDateString('en-GB', {
      //               day: '2-digit',
      //               month: 'short',
      //               year: 'numeric',
      //             });

      //             // Manually dispatch events
      //             dateInput.dispatchEvent(new Event('input', { bubbles: true }));
      //             dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      //           }
      //         }
      //       },
      //       { desiredYear, desiredMonth, desiredDay } // Pass global variables as arguments
      //     );
      //   }
      // },
      // {
      //   name: 'Service Type',
      //   selector: 'select[name="Dropdown"]',
      //   completed: false,
      //   fillInitially: true,
      //   action: async (context) => {
      //     await context.select('select[name="Dropdown"]', DROPDOWN_VALUE);
      //   }
      // },
      // {
      //   name: 'Passport Number',
      //   selector: 'input[name="SingleLine"]',
      //   completed: false,
      //   fillInitially: true,
      //   action: async (context) => {
      //     await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="SingleLine"]');
      //     await context.type('input[name="SingleLine"]', PASSPORT_NO_VALUE);
      //   }
      // },
      // {
      //   name: 'First Name',
      //   selector: 'input[elname="First"]',
      //   completed: false,
      //   fillInitially: true,
      //   action: async (context) => {
      //     await context.evaluate(selector => document.querySelector(selector).value = '', 'input[elname="First"]');
      //     await context.type('input[elname="First"]', FIRST_NAME_VALUE);
      //   }
      // },
      // {
      //   name: 'Last Name',
      //   selector: 'input[elname="Last"]',
      //   completed: false,
      //   fillInitially: true,
      //   action: async (context) => {
      //     await context.evaluate(selector => document.querySelector(selector).value = '', 'input[elname="Last"]');
      //     await context.type('input[elname="Last"]', LAST_NAME_VALUE);
      //   }
      // },
      // {
      //   name: 'Phone Number',
      //   selector: 'input[name="PhoneNumber"]',
      //   completed: false,
      //   fillInitially: true,
      //   action: async (context) => {
      //     await context.evaluate(selector => document.querySelector(selector).value = '', 'input[name="PhoneNumber"]');
      //     await context.type('input[name="PhoneNumber"]', PHONE_NUMBER_VALUE);
      //   }
      // },
      {
        name: 'CAPTCHA',
        selector: '#verificationcodeTxt',
        completed: false,
        fillInitially: true,
        action: async (context) => {
          const captchaSolution = await solveCaptcha(context);
          if (captchaSolution) {
            await context.evaluate(selector => document.querySelector(selector).value = '', '#verificationcodeTxt');
            await context.type('#verificationcodeTxt', captchaSolution);
          } else {
            throw new Error('Failed to solve CAPTCHA');
          }
        }
      }
    ];

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Page is ready. Press Enter to continue...', async () => {
      rl.close();

      await submitOTP({page, email: EMAIL_VALUE, auth});
      // Wait for the swiper to load
      await page.waitForSelector('#swiperParentDiv');

      // Execute custom JavaScript to display all fields
      await page.evaluate((SUBMIT_BUTTON_ID) => {
        // Hide navigation buttons
        const navButtons = document.querySelectorAll('.zf-next, .zf-prev');
        navButtons.forEach(button => {
          button.style.display = 'none'; // Hide navigation
        });

        const swiperParentDiv = document.querySelector('#swiperParentDiv');
        const allSlides = document.querySelectorAll('.swiper-slide');

        if (!swiperParentDiv) {
          console.error('Swiper wrapper not found');
          return;
        }

        // Create a scrollable container to hold all form fields
        const unifiedContainer = document.createElement('div');
        unifiedContainer.id = 'all-fields-container';
        unifiedContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 20px;
        height: auto;
        max-height: 90vh;
        overflow-y: auto;
        padding: 20px;
        border: 1px solid #ccc;
        background: #fff;
        position: relative;`;


        // Loop through each slide and append fields
        allSlides.forEach((slide) => {
          const formFields = slide.querySelectorAll('.fieldWrapper');
          formFields.forEach(field => {
            unifiedContainer.appendChild(field);
          });
        });

        const lastElement = unifiedContainer.lastElementChild;
        unifiedContainer.insertBefore(lastElement, unifiedContainer.firstChild);
        // submit button in the last element
        const submitButton = lastElement.querySelector('button.zfbtnSubmit');
        if (submitButton) {
          submitButton.id = SUBMIT_BUTTON_ID;
          submitButton.style.display = 'block';
        }

        // Replace swiperParentDiv with the new container
        swiperParentDiv.replaceWith(unifiedContainer);
        console.log('All fields are now visible');
      }, SUBMIT_BUTTON_ID);

      await submitForm(page, steps, false);
    });

  } catch (error) {
    console.error("An error occurred during the form submission:", error.message);
  }
})();