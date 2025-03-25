require('dotenv').config();
const axios = require('axios');
const { listenForOtp } = require('./otpListener');
const CAPTCHA_API_KEY = process.env.CAPTCHA_API_KEY;
const CAPTCHA_USER_ID = process.env.CAPTCHA_USER_ID; // Add your TrueCaptcha user ID to the environment variables
const SUBMIT_BUTTON_ID = 'visible-submit-button-007'
// Function to solve CAPTCHA using TrueCaptcha
async function solveCaptcha(page) {
  if (!CAPTCHA_API_KEY || !CAPTCHA_USER_ID) {
    throw new Error('CAPTCHA_API_KEY or CAPTCHA_USER_ID is not set in the environment variables.');
  }

  try {
    // Wait for the CAPTCHA image to load
    await page.waitForSelector('#zf-captcha', { visible: true });

    const captchaImageUrl = await page.evaluate(() => {
      return document.querySelector('#zf-captcha').src;
    });

    // Step 1: Download the CAPTCHA image
    const imageResponse = await axios.get(captchaImageUrl, { responseType: 'arraybuffer' });
    const captchaBuffer = Buffer.from(imageResponse.data, 'binary');
    const base64Captcha = captchaBuffer.toString('base64').replace(/^data:image\/(png|jpg|jpeg|gif);base64,/, "");

    // Step 2: Send the image to TrueCaptcha for solving
    const params = {
      userid: CAPTCHA_USER_ID,
      apikey: CAPTCHA_API_KEY,
      data: base64Captcha,
    };

    const response = await axios.post('https://api.apitruecaptcha.org/one/gettext', params);

    const solution = response.data.result?.toUpperCase();

    return solution;
  } catch (error) {
    console.error('Error solving CAPTCHA:', error.message);
    return null;
  }
}

// Unified function to check if an element is visible (works with both selectors and element handles)
const isVisible = async (context, selectorOrElementHandle) => {
  if (typeof selectorOrElementHandle === 'string') {
    // It's a selector; get the element handle
    const elementHandle = await context.$(selectorOrElementHandle);
    if (!elementHandle) return false;
    return await isElementVisibleRecursive(elementHandle);
  } else {
    // It's an element handle
    return await isElementVisibleRecursive(selectorOrElementHandle);
  }
};

// Helper function to check visibility of an element and its parents (using element handles)
const isElementVisibleRecursive = async (elementHandle) => {
  return await elementHandle.evaluate((elem) => {
    const isVisibleRecursive = (el) => {
      if (!el) return true; // Reached the root element
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || el.hasAttribute('hidden')) {
        return false;
      }
      return isVisibleRecursive(el.parentElement);
    };
    return isVisibleRecursive(elem);
  });
};

const submitForm = async (page, steps, clickSubmitButton) => {

  // Attempt to fill all fields initially
  await Promise.all(steps.map(async (step) => {
    if (step.completed) return;
    if (typeof step.fillInitially === "boolean" && !step.fillInitially) return;
    try {
      let context = page;

      if (step.iframeSelector) {
        if (!step.iframeContext) {
          const iframes = await page.$$(step.iframeSelector);
          for (const iframeElement of iframes) {
            const iframe = await iframeElement.contentFrame();
            const elementHandle = await iframe.$(step.selector);
            if (elementHandle) {
              step.iframeContext = iframe;
              break;
            }
          }
        }
        context = step.iframeContext || context;
      }

      await step.action(context);
      step.completed = true;
      console.log(`Filled: ${step.name}`);

    } catch (error) {
      console.warn(`Could not fill the field "${step.name}" at this time. Will attempt later if possible.`);
    }
  }));

  const allStepsCompleted = steps.every(step => step.completed);

  if (clickSubmitButton && allStepsCompleted) {
    await page.click(`#${SUBMIT_BUTTON_ID}`);
    console.log('Clicked "Submit" button.');
  }
};

// Function to click the visible "Next" or "Submit" button
const clickVisibleButton = async (page) => {
  // Selectors for the buttons
  const submitButtonSelector = 'button.zfbtnSubmit';
  const nextButtonSelector = 'a.zf-next';

  // Check for visible submit button
  const submitButtons = await page.$$(submitButtonSelector);
  for (const button of submitButtons) {
    const isButtonVisible = await isVisible(page, button);
    if (isButtonVisible) {
      await button.click();
      console.log('Clicked "Submit" button.');
      return 'Submit';
    }
  }

  // Check for visible next button
  const nextButtons = await page.$$(nextButtonSelector);
  for (const button of nextButtons) {
    const isButtonVisible = await isVisible(page, button);
    if (isButtonVisible) {
      await button.click();
      console.log('Clicked "Next" button.');
      return 'Next';
    }
  }

  // If neither button is found
  return null;
};

async function interceptResponse(response, newResponse) {
  const fetchRequest = response.request();
  const { body, headers, status, contentType } = newResponse;

  // Create headers object
  const responseHeaders = headers || {};
  if (contentType) {
    responseHeaders['Content-Type'] = contentType;
  }

  // Fetch the original request
  const fakeResponse = await fetch(fetchRequest.url(), {
    method: fetchRequest.method(),
    headers: fetchRequest.headers(),
    body: fetchRequest.postData(),
  });

  const { client } = response._client._client;

  // Send the modified response
  await client.send('Fetch.fulfillRequest', {
    requestId: fetchRequest._interceptionId,
    responseCode: status || 200,
    responseHeaders: Object.entries(responseHeaders).map(([name, value]) => ({ name, value: String(value) })),
    body: Buffer.from(body).toString('base64'),
  });
}

async function submitOTP({page, auth, email}) {
  // Perform OTP-related steps
  await page.waitForSelector('input#email_cntct_val', { visible: true });

  // Enter Email
  await page.evaluate(selector => document.querySelector(selector).value = '', 'input#email_cntct_val');
  await page.type('input#email_cntct_val', email);

  // Solve CAPTCHA for OTP
  await page.waitForSelector('#zf-captcha', { visible: true });
  const otpCaptchaSolution = await solveCaptcha(page);
  if (otpCaptchaSolution) {
    await page.evaluate(selector => document.querySelector(selector).value = '', '#verificationcodeTxt');
    await page.type('#verificationcodeTxt', otpCaptchaSolution);
  } else {
    throw new Error('Failed to solve CAPTCHA for OTP');
  }

  // Click "Get OTP" Button
  await page.click('button.otpBtn[elname="getOtpBtn"]');

  // Listen for OTP email
  const otp = await listenForOtp(auth);
  if (!otp) {
    throw new Error('Failed to retrieve OTP from email');
  }

  // Wait for OTP input fields to appear
  await page.waitForSelector('#otpValueDiv input', { visible: true });

  // Enter OTP
  const otpInputs = await page.$$('#otpValueDiv input');

  // Enter the OTP digits
  for (let i = 0; i < otpInputs.length; i++) {
    await otpInputs[i].type(otp[i]);
  }

  // Click "Verify OTP" Button
  await page.click('button.otpBtn[onclick="validateOtp()"]');
}

module.exports = {
  solveCaptcha,
  submitForm,
  interceptResponse,
  SUBMIT_BUTTON_ID,
  submitOTP
};