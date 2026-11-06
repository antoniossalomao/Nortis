const { chromium } = require('playwright');const fs=require('fs');fs.mkdirSync('build',{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>m.type()=='error'&&console.log('CONSOLE',m.text()));
await p.goto('file://'+process.cwd()+'/index.html');await p.evaluate(()=>READY);await p.waitForTimeout(300);
for(const t of process.argv.slice(2).map(Number)){await p.evaluate(t=>render(t),t);await p.screenshot({path:`build/p_${t}.jpg`,type:'jpeg',quality:70})}await b.close()})();
