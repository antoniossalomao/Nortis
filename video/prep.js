// Injeta timeline.json no HTML: node prep.js index.html _play.html  (substitui __TL__)
const fs=require('fs');const[i,o]=[process.argv[2]||'index.html',process.argv[3]||'_play.html'];
fs.writeFileSync(o,fs.readFileSync(i,'utf8').replace('__TL__',fs.readFileSync('timeline.json','utf8')));
