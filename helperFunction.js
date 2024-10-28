require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const CAPTCHA_API_KEY = process.env.CAPTCHA_API_KEY;

// Function to solve CAPTCHA using 2Captcha
async function solveCaptcha(page) {
  if (!CAPTCHA_API_KEY) {
    throw new Error('CAPTCHA_API_KEY is not set in the environment variables.');
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
    const base64Captcha = captchaBuffer.toString('base64');

    // Step 2: Send the image to 2Captcha for solving
    const formData = new FormData();
    formData.append('key', CAPTCHA_API_KEY);
    formData.append('method', 'base64');
    formData.append('body', base64Captcha);
    formData.append('json', '1');

    const response = await axios.post('https://2captcha.com/in.php', formData, {
      headers: formData.getHeaders(),
    });

    if (response.data.status !== 1) {
      throw new Error(`2Captcha error: ${response.data.request}`);
    }

    const captchaId = response.data.request;

    // Step 3: Wait for the solution from 2Captcha
    let solution = null;
    const startTime = Date.now();
    const timeout = 120000; // 2 minutes timeout

    while (!solution) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout while waiting for CAPTCHA solution.');
      }

      const resultResponse = await axios.get('https://2captcha.com/res.php', {
        params: {
          key: CAPTCHA_API_KEY,
          action: 'get',
          id: captchaId,
          json: 1,
        },
      });
      if (resultResponse.data.status === 1) {
        if(resultResponse.data.request === 'sorry'){
          throw new Error('2Captcha error: CAPTCHA was not solved');
        }
        solution = resultResponse.data.request;
      } else if (resultResponse.data.status === 0 && resultResponse.data.request !== 'CAPCHA_NOT_READY') {
        throw new Error(`2Captcha error: ${resultResponse.data.request}`);
      } else {
        console.log('Captcha not ready yet, retrying...');
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 2 seconds
      }
    }

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