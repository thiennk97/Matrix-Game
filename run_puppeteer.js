const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  let browser;
  try {
    // macOS default chrome path
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
    
    await page.click('#btn-join-room');
    await new Promise(r => setTimeout(r, 1000));
    
    await page.click('#btn-toggle-ready');
    await new Promise(r => setTimeout(r, 1000));
    
    await browser.close();
    console.log("Done");
  } catch (err) {
    console.error(err);
  }
})();
