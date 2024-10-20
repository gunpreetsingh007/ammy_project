require('dotenv').config();
const puppeteer = require('puppeteer-core');
const axios = require('axios');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const CAPTCHA_API_KEY = process.env.CAPTCHA_API_KEY;

// Function to solve CAPTCHA using 2Captcha
async function solveCaptcha(imageUrl) {
  try {
    // Step 1: Download the CAPTCHA image
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const captchaBuffer = Buffer.from(imageResponse.data, 'binary');
    const base64Captcha = captchaBuffer.toString('base64');

    // Step 2: Send the image to 2Captcha for solving
    const response = await axios.post('http://2captcha.com/in.php', null, {
      params: {
        key: CAPTCHA_API_KEY,
        method: 'base64',
        body: base64Captcha,
        json: 1,
      },
    });

    const captchaId = response.data.request;
    
    // Step 3: Wait for the solution from 2Captcha
    let solution = null;
    while (!solution) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for 2 seconds before checking the result
      const resultResponse = await axios.get('http://2captcha.com/res.php', {
        params: {
          key: CAPTCHA_API_KEY,
          action: 'get',
          id: captchaId,
          json: 1,
        },
      });
      if (resultResponse.data.status === 1) {
        solution = resultResponse.data.request;
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

(async () => {
  try {
    const puppeteerExtra = addExtra(puppeteer);
    puppeteerExtra.use(StealthPlugin());

    // Connect to the existing browser instance
    const browser = await puppeteerExtra.connect({
      browserURL: 'http://localhost:9222', // URL for the remote debugging
    });

    // Get all open pages
    const pages = await browser.pages();

    // Assuming the target page is the first one
    const page = pages[0];

    // Navigate to the website (if not already there)
    await page.goto('https://example.com'); // Replace with your actual website URL

    // Upload Passport First Page (assuming it's an image upload field)
    const inputFilePath = '/path/to/your/image.jpg'; // Replace with your actual image path
    const uploadInput = await page.$('input[name="ImageUpload"]');
    if (uploadInput) {
      await uploadInput.uploadFile(inputFilePath);
    } else {
      throw new Error('Upload input field for passport image not found');
    }

    // Click the Next button after uploading the image
    await page.click('a.zf-next');
    
    // Fill other details (this part remains unchanged)
    await page.waitForSelector('input[name="SingleLine1"]');
    await page.type('input[name="SingleLine1"]', '24-123456');
    await page.click('a.zf-next');

    await page.waitForSelector('input[elname="stripeCardName"]');
    await page.type('input[elname="stripeCardName"]', 'John Doe');
    await page.type('input[name="cardnumber"]', '4111111111111111');
    await page.type('input[name="exp-date"]', '11/24');
    await page.type('input[name="cvc"]', '123');
    await page.click('a.zf-next');

    await page.waitForSelector('input[name="SingleLine"]');
    await page.type('input[name="SingleLine"]', 'A12345678');
    await page.click('a.zf-next');

    await page.waitForSelector('input[elname="First"]');
    await page.type('input[elname="First"]', 'John');
    await page.type('input[elname="Last"]', 'Doe');
    await page.click('a.zf-next');

    await page.waitForSelector('a.ui-state-hover');
    await page.click('a.ui-state-hover');
    await page.click('a.zf-next');

    await page.waitForSelector('input[name="PhoneNumber"]');
    await page.type('input[name="PhoneNumber"]', '1234567890');
    await page.click('a.zf-next');

    await page.waitForSelector('input[name="Email"]');
    await page.type('input[name="Email"]', 'john.doe@example.com');
    await page.click('a.zf-next');

    // Handling CAPTCHA
    const captchaImageElement = await page.$('#zf-captcha'); // Update with the correct selector for the CAPTCHA image
    const captchaImageUrl = await page.evaluate(img => img.src, captchaImageElement);

    const captchaSolution = await solveCaptcha(captchaImageUrl); // Solve the CAPTCHA using 2Captcha

    if (captchaSolution) {
      await page.type('#verificationcodeTxt', captchaSolution); // Enter the CAPTCHA solution in the verification field
    } else {
      throw new Error('Failed to solve CAPTCHA');
    }

    // Submit the form
    await page.click('button.zfbtnSubmit');
    
    // Wait for the submission to process
    await page.waitForTimeout(5000); // Wait for 5 seconds to let the form submit

    console.log("Form submission completed successfully.");
    
  } catch (error) {
    console.error("An error occurred during the form submission:", error.message);
  }
})();