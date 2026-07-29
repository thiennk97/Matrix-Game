const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  await page.goto('http://localhost:3000');
  
  // Click Join Room
  await page.click('#btn-join-room');
  await new Promise(r => setTimeout(r, 1000));
  
  // Second page for player 2
  const page2 = await browser.newPage();
  page2.on('console', msg => console.log('BROWSER 2 LOG:', msg.text()));
  await page2.goto('http://localhost:3000');
  // wait for input to be available
  await page2.waitForSelector('#btn-join-room');
  await page2.click('#btn-join-room');
  await new Promise(r => setTimeout(r, 1000));
  
  // P1 ready
  await page.click('#btn-toggle-ready');
  // P2 ready
  await page2.click('#btn-toggle-ready');
  await new Promise(r => setTimeout(r, 500));
  
  // P1 starts game
  await page.click('#btn-start-game-server');
  await new Promise(r => setTimeout(r, 1000));
  
  // P1 clicks cell 0,0
  console.log("Clicking cell 0 on P1...");
  await page.evaluate(() => {
    document.querySelectorAll('.cell')[0].click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  await browser.close();
})();
