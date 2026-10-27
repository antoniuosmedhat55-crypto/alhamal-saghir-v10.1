import { fileURLToPath } from "node:url";
import path from "node:path";

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.env.NODE_ENV="test";
process.env.SESSION_SECRET=process.env.SESSION_SECRET||"ci-runtime-validation-only-secret-not-for-production";
try{
 const imported=await import(new URL("../server.js",import.meta.url).href);
 if(typeof imported.default!=="function")throw new Error("Vercel handler export is missing");
 console.log("PASS: final Vercel wrapper inflated the compressed app and compiled all runtime string patches.");
}catch(error){
 console.error("Runtime assembly failed: "+String(error&&error.name||"Error")+": "+String(error&&error.message||"unknown failure"));
 const stack=String(error&&error.stack||"").split("\n").filter(line=>line.length<500&&!line.startsWith("data:text/javascript;base64,")&&!line.includes("node_modules/")).slice(0,8);
 if(stack.length)console.error(stack.join("\n"));
 process.exitCode=1;
}
