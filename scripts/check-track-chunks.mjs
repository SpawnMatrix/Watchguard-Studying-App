// Production-browser regression for lazy track banks and cross-track sessions.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base = process.env.A11Y_URL || 'http://127.0.0.1:3000';
const browser=await chromium.launch();
try {
 for(const track of ['local','cloud','network-plus']) {
 const page=await browser.newPage({reducedMotion:'reduce'});const requests=[];const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('.js')) requests.push(r.url())});
 await page.goto(base + '/#quiz');await page.getByPlaceholder('e.g. packet_pilot').fill('reviewer');
 await page.evaluate(t=>localStorage.setItem('watchguard-learning-track:device',t),track);
 await page.getByRole('button',{name:/this device only/i}).click();
 await page.getByRole('button',{name:'Check answer',exact:true}).waitFor();
 await page.waitForLoadState('networkidle');
 const banks=requests.filter(x=>/\/(local|cloud|network-plus)-/.test(x));
 console.log(track,banks.map(x=>x.split('/').at(-1)),await page.locator('.catalog-count').innerText());
 assert.equal(banks.length,1);assert.ok(banks[0].includes('/'+track+'-'));assert.deepEqual(errors,[]);
 await page.locator('.quiz-filter-drawer summary').click();await page.getByLabel('Study mode',{exact:true}).selectOption('mock-exam');await page.getByText('Question 1 of 50',{exact:true}).waitFor();
 const saved = await page.evaluate(()=>JSON.parse(localStorage.getItem('watchguard-quiz-session-v2')));
 await page.reload();await page.getByPlaceholder('e.g. packet_pilot').fill('reviewer');await page.getByRole('button',{name:/this device only/i}).click();await page.getByText('Question 1 of 50',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('watchguard-quiz-session-v2')).current.id),saved.current.id);
 await page.getByLabel('Learning track',{exact:true}).selectOption(track==='local'?'cloud':'local');
 await page.getByText(/Your saved .* session is ready/).waitFor();
 assert.match(await page.locator('.question-meta').innerText(),/Question 1 of 50/);
 await page.close();
 }
 // Cross-track weakness review must fetch both ID owners, not silently drop either.
 const page=await browser.newPage();
 await page.addInitScript(()=>localStorage.setItem('weakness_deck',JSON.stringify({'1001':0,'1400':0})));
 await page.goto(base + '/#quiz');await page.getByPlaceholder('e.g. packet_pilot').fill('reviewer');await page.getByRole('button',{name:/this device only/i}).click();
 await page.locator('.quiz-filter-drawer summary').click();await page.getByLabel('Study mode',{exact:true}).selectOption('weakness-review');await page.getByText('2 concepts to review',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Check answer',exact:true}).count(),1);
 console.log('Cross-track weakness deck retains both concepts.');
 await page.close();
}finally{await browser.close();}
