import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
const root=path.dirname(fileURLToPath(import.meta.url));
globalThis.__ALHAMAL_DIR=root;
function readParts(dir){return fs.readdirSync(dir).filter((n)=>/^\d+\.txt$/.test(n)).sort((a,b)=>Number(a.slice(0,-4))-Number(b.slice(0,-4))).map((n)=>fs.readFileSync(path.join(dir,n),"utf8")).join("");}
globalThis.__ALHAMAL_HTML=zlib.brotliDecompressSync(Buffer.from(readParts(path.join(root,"public","html-chunks")),"base64")).toString("utf8");
const bundle=zlib.brotliDecompressSync(Buffer.from(readParts(path.join(root,"bundle-chunks")),"base64"));
const imported=await import("data:text/javascript;base64,"+bundle.toString("base64"));
const appServer=imported.default;
export default function handler(req,res){const p=(req.url||"/").split("?")[0];if((req.method==="GET"||req.method==="HEAD")&&(p==="/"||p==="/index.html")){const html=Buffer.from(globalThis.__ALHAMAL_HTML,"utf8");res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Content-Length":String(html.length),"Cache-Control":"no-cache","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"strict-origin-when-cross-origin","Permissions-Policy":"camera=(), microphone=(), geolocation=()"});return req.method==="HEAD"?res.end():res.end(html);}return appServer.emit("request",req,res);}
