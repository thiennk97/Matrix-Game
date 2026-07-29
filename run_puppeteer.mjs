import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
  let browser;
  try {
    const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    
    if (fs.existsSync(executablePath)) {
      browser = await puppeteer.launch({ executablePath, headless: "new" });
    } else {
      console.log("No Chrome found, exiting.");
      process.exit(1);
    }
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    
    await page.goto('http://localhost:3000');
    
    console.log("Waiting for JS to load...");
    await new Promise(r => setTimeout(r, 1000));
    
    await browser.close();
    console.log("Done");
  } catch (err) {
    console.error(err);
  }
})();
