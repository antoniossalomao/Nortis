// Captura prints reais da interface (src/) com window.nortis mockado. Uso: node capture.js
const { chromium } = require('playwright'); const path = require('path');
const SRC = 'file://' + path.resolve(__dirname, '../src') + '/';
(async () => {
  const b = await chromium.launch({ args: ['--lang=pt-BR'] });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1240 }, deviceScaleFactor: 2, locale: 'pt-BR' });
  await ctx.addInitScript({ path: path.join(__dirname, 'mock.js') });
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
  const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: `shots/${n}.png` }); console.log(n); };
  await p.goto(SRC + 'login.html'); await p.waitForTimeout(1200);
  await p.fill('#loginEmail', 'marina@exemplo.com'); await p.fill('#loginPassword', 'segredo123'); await shot('login');
  await p.goto(SRC + 'index.html'); await p.waitForTimeout(2000); await shot('dash');
  await p.click('#btnTx'); await p.click('#typeOut'); await p.fill('#fDesc', 'Farmácia'); await p.fill('#fAmount', '86.40');
  await p.selectOption('#fCategory', 'Saúde').catch(()=>{}); await shot('modal_tx');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.click('#btnGoal'); await p.fill('#gName', 'Casa própria'); await p.fill('#gTarget', '60000'); await p.fill('#gTargetDate', '2030-01-31'); await shot('modal_goal');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.fill('#txSearch', 'super'); await shot('search');
  await p.fill('#txSearch', ''); await p.selectOption('#txTypeFilter', 'receita'); await shot('filter_income');
  await p.selectOption('#txTypeFilter', ''); await p.click('#prevMonth'); await shot('dash_oct');
  await b.close();
})();
