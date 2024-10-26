require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const CAPTCHA_API_KEY = process.env.CAPTCHA_API_KEY;

// Function to solve CAPTCHA using 2Captcha
async function solveCaptcha(imageUrl) {
  if (!CAPTCHA_API_KEY) {
    throw new Error('CAPTCHA_API_KEY is not set in the environment variables.');
  }

  try {
    // Step 1: Download the CAPTCHA image
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
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

      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for 2 seconds before checking the result

      const resultResponse = await axios.get('https://2captcha.com/res.php', {
        params: {
          key: CAPTCHA_API_KEY,
          action: 'get',
          id: captchaId,
          json: 1,
        },
      });

      if (resultResponse.data.status === 1) {
        solution = resultResponse.data.request;
      } else if (resultResponse.data.status === 0 && resultResponse.data.request !== 'CAPCHA_NOT_READY') {
        throw new Error(`2Captcha error: ${resultResponse.data.request}`);
      } else {
        console.log('Captcha not ready yet, retrying...');
      }
    }

    return solution;
  } catch (error) {
    console.error('Error solving CAPTCHA:', error.message);
    return null;
  }
}

// Function to check if an element and its parents are visible
const isVisible = async (context, element) => {
  return await context.evaluate(element => {
    const isVisibleRecursive = (el) => {
      if (!el) return true;
      const style = window.getComputedStyle(el);
      if (style.opacity === '0' || style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
      return isVisibleRecursive(el.parentElement);
    };
    return isVisibleRecursive(element);
  }, element);
};

// Function to click an element with retries
const clickElement = async (context, selector) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const elements = await context.$$(selector);
      for (const elementHandle of elements) {
        if (await isVisible(context, elementHandle)) {
          await elementHandle.click();
          return;
        }
      }
    } catch (error) {
      console.log(`Attempt ${attempt + 1} to click ${selector} failed: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
    }
  }
  throw new Error(`Failed to click ${selector} after multiple attempts`);
};

// Function to get all visible elements
const getVisibleElements = async (context, selectors) => {
  const visibleElements = [];
  for (const step of selectors) {
    let elementContext = context;
    if (step.iframeSelector) {
      const iframeElement = await context.$(step.iframeSelector);
      const iframe = await iframeElement.contentFrame();
      elementContext = iframe;
    }
    const elementHandle = await elementContext.$(step.selector);
    if (elementHandle && await isVisible(elementContext, elementHandle)) {
      visibleElements.push(step);
    }
  }
  return visibleElements;
};

const submitForm = async (page, steps) => {
  let formSubmitted = false;

  // Iterate through the steps and perform actions
  while (!formSubmitted) {
    const visibleSteps = await getVisibleElements(page, steps);
    if (visibleSteps.length === 0) {
      throw new Error('No visible elements found to perform actions.');
    }

    for (const step of visibleSteps) {
      let context = page;
      if (step.iframeSelector) {
        const iframeElement = await page.$(step.iframeSelector);
        const iframe = await iframeElement.contentFrame();
        context = iframe;
      }
      await step.action(context);
    }

    // Check for the presence of the "Next" button or the "Submit" button
    if (await page.$('a.zf-next')) {
      await clickElement(page, 'a.zf-next');
      await new Promise(resolve => setTimeout(resolve, 800)); // Wait for 500 milliseconds
    } else if (await page.$('button.zfbtnSubmit')) {
      await clickElement(page, 'button.zfbtnSubmit');
      formSubmitted = true;
    } else {
      throw new Error('No "Next" or "Submit" button found.');
    }
  }

  // Final check to ensure the form was submitted
  if (!formSubmitted) {
    console.error("Form submission failed.");
  } else {
    // Wait for the submission to process
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds to let the form submit
    console.log("Form submission completed successfully.");
  }
}

module.exports = {
  solveCaptcha,
  submitForm
};