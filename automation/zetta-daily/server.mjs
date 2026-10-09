import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const dir=path.join(process.env.USERPROFILE,'Documents','ZConnect','Zetta');
fs.mkdirSync(dir,{recursive:true});

http.createServer((req,res)=>{
  if(req.method!=='POST'||req.url!=='/zetta'){
    res.writeHead(404);return res.end();
  }

  let body='';
  req.on('data',chunk=>body+=chunk);
  req.on('end',()=>{
    fs.writeFileSync(path.join(dir,'zetta-interno.json'),body,'utf8');
    res.writeHead(200,{'Access-Control-Allow-Origin':'*'});
    res.end('OK');
  });
}).listen(39741,'127.0.0.1',()=>console.log('Zetta local: 39741'));
