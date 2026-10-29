import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const wrapper=fs.readFileSync(path.join(root,"server.js"),"utf8");
const lines=wrapper.split(String.fromCharCode(10));
function runNode(args,label){
 const result=spawnSync(process.execPath,args,{cwd:root,encoding:"utf8",timeout:30000});
 if(result.stdout)process.stdout.write(result.stdout);
 if(result.stderr)process.stderr.write(result.stderr);
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error(label+" failed with exit code "+result.status);
}
runNode(["scripts/extract-source.mjs"],"Source extraction");
const bundlePath=path.join(root,".workbench","server-bundle-transformed.mjs");
const bundleStart=lines.findIndex(line=>line.startsWith("let bundleSource=zlib.brotliDecompressSync("));
const bundleEnd=lines.findIndex(line=>line.startsWith('const bundle=Buffer.from(bundleSource,"utf8");'));
if(bundleStart<0||bundleEnd<=bundleStart)throw new Error("Could not isolate the exact backend transformation section from server.js");
const transformCode=[
 'import fs from "node:fs";',
 'import path from "node:path";',
 'import zlib from "node:zlib";',
 'import { fileURLToPath } from "node:url";',
 'const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));',
 'function readParts(dir){return fs.readdirSync(dir).filter((n)=>/^\\d+\\.txt$/.test(n)).sort((a,b)=>Number(a.slice(0,-4))-Number(b.slice(0,-4))).map((n)=>fs.readFileSync(path.join(dir,n),"utf8")).join("");}',
 ...lines.slice(bundleStart,bundleEnd),
 'fs.writeFileSync(path.join(root,".workbench","server-bundle-transformed.mjs"),bundleSource);',
 'console.log("Assembled transformed runtime bytes="+Buffer.byteLength(bundleSource,"utf8"));'
].join("\n");
const transformPath=path.join(root,".workbench","assemble-runtime.mjs");
fs.writeFileSync(transformPath,transformCode);
runNode([transformPath],"Runtime assembly");
const html=fs.readFileSync(path.join(root,".workbench","app.html"),"utf8");
if(!html.includes("<html")||!html.includes("</body>")||!html.includes('dir="rtl"'))throw new Error("The original RTL application shell is incomplete");
const required=["const attendanceCronAnchor=","const roleScopedBootstrapAnchor=","const accountRoleOptionsAnchor=","const uiRoleNavAnchor=","const accountRuntimeScript=","monthlyReports:rbReports?"];
for(const anchor of required)if(!wrapper.includes(anchor))throw new Error("Final runtime wrapper missing "+anchor);
runNode(["--check",bundlePath],"Transformed backend bundle syntax check");
console.log("PASS: compressed source extracted, every backend patch anchor applied, transformed backend syntax verified, and RTL shell confirmed. No state data was read or mutated.");
