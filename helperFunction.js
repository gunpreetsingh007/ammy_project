require('dotenv').config();
const axios = require('axios');
const CAPTCHA_API_KEY = process.env.CAPTCHA_API_KEY;
const CAPTCHA_USER_ID = process.env.CAPTCHA_USER_ID; // Add your TrueCaptcha user ID to the environment variables

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

    if (response.data.result !== 'success') {
      throw new Error(`TrueCaptcha error: ${response.data.result}`);
    }

    const solution = response.data.result;

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

const submitForm = async (page, steps) => {
  let formSubmitted = false;

  // Attempt to fill all fields initially
  for (const step of steps) {
    if (step.completed) continue;

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
  }

  // Loop to handle clicking "Next" or "Submit" and filling new fields that become visible
  while (!formSubmitted) {
    // Click the visible "Next" or "Submit" button
    const clickedButton = await clickVisibleButton(page);

    if (!clickedButton) {
      throw new Error('No visible "Next" or "Submit" button found.');
    }

    if (clickedButton === 'Submit') {
      formSubmitted = true;
      console.log("Form submission initiated.");
      break;
    }

    // After clicking "Next", attempt to fill any new fields that became visible
    for (const step of steps) {
      if (step.completed) continue;

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

        const isElementVisible = await isVisible(context, step.selector);

        if (isElementVisible) {
          await step.action(context);
          step.completed = true;
          console.log(`Filled: ${step.name}`);
        }

      } catch (error) {
        throw new Error(`Could not fill the field "${step.name}" on this step even though it became visible.`);
      }
    }
  }

  // Wait for confirmation that the form was submitted
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    console.log("Form submission completed successfully.");
  } catch (error) {
    console.error("Form submission may have failed or timed out:", error.message);
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

module.exports = {
  solveCaptcha,
  submitForm
};