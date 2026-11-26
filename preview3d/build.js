const fs=require('fs');
const sh=fs.readFileSync(__dirname+'/shell.html','utf8');
const out=sh.replace('/*ENGINE*/',()=>fs.readFileSync('__dirname+"/../engine.js"','utf8'))
 .replace('/*THREE*/',()=>fs.readFileSync(__dirname+'/node_modules/three/build/three.module.min.js','utf8'))
 .replace('/*MAIN*/',()=>fs.readFileSync(__dirname+'/main.js','utf8'));
fs.writeFileSync(__dirname+'/parkle3d.html',out);console.log(out.length);
