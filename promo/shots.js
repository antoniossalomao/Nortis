const { chromium } = require('playwright');
const path=require('path');
const cats=[['receita','Salário'],['receita','Freelance'],['gasto','Moradia'],['gasto','Alimentação'],['gasto','Transporte'],['gasto','Lazer'],['gasto','Saúde'],['gasto','Assinaturas']];
const tx=[];let n=0;
const add=(type,desc,amount,category,date)=>tx.push({id:'tx'+(n++),type,desc,amount,category,date});
const months=['2026-06','2026-07','2026-08','2026-09','2026-10','2026-11'];
months.forEach((m,i)=>{
 add('receita','Salário',8200,'Salário',m+'-05');
 if(i%2==0||i==5) add('receita','Projeto freelance',1200+i*350,'Freelance',m+'-18');
 add('gasto','Aluguel',2300,'Moradia',m+'-10');
 add('gasto','Supermercado',980-i*40,'Alimentação',m+'-08');
 add('gasto','Restaurante',320+i*15,'Alimentação',m+'-14');
 add('gasto','Combustível',410-i*20,'Transporte',m+'-12');
 add('gasto','Cinema e shows',260,'Lazer',m+'-16');
 add('gasto','Farmácia',140,'Saúde',m+'-03');
 add('gasto','Streaming',89.9,'Assinaturas',m+'-01');
 add('gasto','Academia',119.9,'Saúde',m+'-02');
});
const data={transactions:tx.reverse(),goals:[
 {id:'g1',name:'Reserva de emergência',target:30000,current:21450,targetDate:'2027-06-30'},
 {id:'g2',name:'Viagem para o Japão',target:18000,current:7200,targetDate:'2027-10-01'},
 {id:'g3',name:'Notebook novo',target:7500,current:6100,targetDate:'2027-02-01'}],
 categories:cats.map(([type,name])=>({type,name,color:null}))};
(async()=>{
 const b=await chromium.launch();
 const p=await b.newPage({viewport:{width:1440,height:1500},deviceScaleFactor:2});
 p.on('pageerror',e=>console.log('ERR',e.message));
 await p.addInitScript(d=>{const ok=x=>Promise.resolve(x);window.nortis={auth:{me:()=>ok({name:'Antônio'}),login:()=>ok({}),register:()=>ok({}),logout:()=>ok({})},bootstrap:()=>ok(d),transactions:{},goals:{},backup:{}}},data);
 await p.goto('file://'+path.resolve('../src/index.html'));await p.waitForTimeout(2500);
 await p.screenshot({path:'shots/dash.png'});
 await p.screenshot({path:'shots/full.png',fullPage:true});
 await p.goto('file://'+path.resolve('../src/login.html'));await p.waitForTimeout(1500);
 await p.setViewportSize({width:1440,height:900});await p.screenshot({path:'shots/login.png'});
 await b.close()})();
