import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function runNode(args,label){
 const result=spawnSync(process.execPath,args,{cwd:root,encoding:"utf8",timeout:30000});
 if(result.stdout)process.stdout.write(result.stdout);
 if(result.stderr)process.stderr.write(result.stderr);
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error(label+" failed with exit code "+result.status);
}
runNode(["scripts/extract-source.mjs"],"Source extraction");
const bundle=path.join(root,".workbench","server-bundle.js");
const html=path.join(root,".workbench","app.html");
if(!fs.existsSync(bundle)||!fs.existsSync(html))throw new Error("Extracted application sources are missing");
if(fs.statSync(bundle).size<10000||fs.statSync(html).size<10000)throw new Error("An extracted application source is unexpectedly small");
runNode(["--check",bundle],"Backend bundle syntax check");
const htmlText=fs.readFileSync(html,"utf8");
if(!htmlText.includes("<html")||!htmlText.includes("</body>")||!htmlText.includes('dir="rtl"'))throw new Error("The original RTL application shell is incomplete");
const wrapper=fs.readFileSync(path.join(root,"server.js"),"utf8");
const requiredAnchors=["const attendanceCronAnchor=","const roleScopedBootstrapAnchor=","const accountRoleOptionsAnchor=","const uiRoleNavAnchor=","const accountRuntimeScript=","monthlyReports:rbReports?"];
for(const anchor of requiredAnchors)if(!wrapper.includes(anchor))throw new Error("Final runtime wrapper is missing "+anchor);
console.log("PASS: compressed HTML and backend bundle extracted; original bundle syntax, RTL shell, and final wrapper patch anchors validated without starting a server or reading persisted state.");
