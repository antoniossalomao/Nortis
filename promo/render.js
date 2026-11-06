const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+process.cwd()+'/index.html');await p.evaluate(()=>READY);await p.waitForTimeout(500);
const FPS=30,total=await p.evaluate(()=>TOTAL),N=Math.round(total*FPS),out=process.argv[2]||'nortis-reels.mp4';
const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-i','audio/music.wav','-t',String(total),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',out+'.tmp.mp4'],{stdio:['pipe','inherit','inherit']});
for(let i=0;i<N;i++){await p.evaluate(t=>render(t),i/FPS);const buf=await p.screenshot({type:'jpeg',quality:93});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(i%300==0)console.log('frame',i,'/',N)}
ff.stdin.end();const code=await new Promise(r=>ff.on('close',r));await b.close();if(code===0){fs.renameSync(out+'.tmp.mp4',out);console.log('DONE')}else process.exit(1)})();
