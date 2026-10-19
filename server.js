import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
const root=path.dirname(fileURLToPath(import.meta.url));
globalThis.__ALHAMAL_DIR=root;
function readParts(dir){return fs.readdirSync(dir).filter((n)=>/^\d+\.txt$/.test(n)).sort((a,b)=>Number(a.slice(0,-4))-Number(b.slice(0,-4))).map((n)=>fs.readFileSync(path.join(dir,n),"utf8")).join("");}
let html=zlib.brotliDecompressSync(Buffer.from(readParts(path.join(root,"public","html-chunks")),"base64")).toString("utf8");
const accountChoice='<div class="account-choice"><label class="auth-label" for="alhamalAccountPicker">اختيار الحساب</label><select id="alhamalAccountPicker" class="field account-picker-select" aria-label="اختيار الحساب"><option value="">اختر حسابك من القائمة</option><option value="antonios">أنطونيوس مدحت — مدير النظام</option><option value="assistant">ماجد — فني صيانة</option><option value="ihab">المهندس إيهاب زكي — مدير الصيانة</option><option value="supervisor">مشرف الصيانة</option><option value="ant.tech">أنطونيوس — فني صيانة</option><option value="solib">صليب — فني صيانة</option><option value="ata">عطا — فني صيانة</option><option value="romany">روماني — فني صيانة</option><option value="georges">جرجس — فني صيانة</option></select><div class="account-choice-note">الاختيار يملأ اسم المستخدم فقط؛ اكتب كلمة مرور حسابك بنفسك.</div></div>';
const usernameLabel='<label class="auth-label" for="lu">اسم المستخدم</label>';
if(!html.includes(usernameLabel))throw new Error("Account picker insertion point not found");
html=html.replace(usernameLabel,accountChoice+usernameLabel);
const accountStyles=[
'.account-choice{margin:12px 0 9px;text-align:right}',
'.account-choice .auth-label{display:block;text-align:right;margin:0 2px 6px;font-size:11px;color:#bcd0e5}',
'#alhamalAccountPicker{width:100%;min-height:46px;background:rgba(4,15,27,.94)!important;color:#eef8ff!important;border:1px solid rgba(45,180,245,.46)!important;border-radius:12px;padding:0 12px;outline:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.015),0 0 18px rgba(0,173,255,.04);transition:border-color .2s,box-shadow .2s}',
'#alhamalAccountPicker:focus{border-color:#2bd8ff!important;box-shadow:0 0 0 3px rgba(43,216,255,.12),0 0 22px rgba(43,216,255,.12)!important}',
'#alhamalAccountPicker option{background:#081727;color:#f4f8fc}',
'.account-choice-note{margin:5px 2px 0;color:#829db5;font-size:10px;line-height:1.7}',
'.kpi,.kpi-pro,.card,.panel,.row,.place,.q{transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease}',
'.kpi:hover,.kpi-pro:hover,.place:hover,.q:hover,.row:hover{transform:translateY(-2px)!important;box-shadow:0 14px 34px rgba(0,0,0,.22),0 0 22px rgba(34,211,238,.08)!important;border-color:rgba(56,189,248,.44)!important}',
'.kpi .kicon{animation:alhamalIconGlow 4s ease-in-out infinite}',
'.nav.active{box-shadow:inset -3px 0 0 #27dfff,0 0 16px rgba(0,217,255,.13)!important}',
'.authbox{animation:alhamalEnter .42s ease-out both}',
'@keyframes alhamalEnter{from{opacity:0;transform:translateY(9px) scale(.995)}to{opacity:1;transform:translateY(0) scale(1)}}',
'@keyframes alhamalIconGlow{0%,100%{filter:drop-shadow(0 0 0 rgba(42,215,255,0))}50%{filter:drop-shadow(0 0 6px rgba(42,215,255,.28))}}',
'@media(prefers-reduced-motion:reduce){.authbox,.kpi .kicon{animation:none!important}.kpi,.kpi-pro,.card,.panel,.row,.place,.q{transition:none!important}}'
].join("\n");
html=html.replace("</style>",accountStyles+"</style>");
const accountChoiceScript='<script id="alhamal-account-choice-runtime">(function(){var picker=document.getElementById("alhamalAccountPicker");var user=document.getElementById("lu");if(!picker||!user)return;picker.addEventListener("change",function(){if(!this.value)return;user.value=this.value;user.dispatchEvent(new Event("input",{bubbles:true}));user.focus();});})();</script>';
html=html.replace("</body>",accountChoiceScript+"</body>");
globalThis.__ALHAMAL_HTML=html;
let bundleSource=zlib.brotliDecompressSync(Buffer.from(readParts(path.join(root,"bundle-chunks")),"base64")).toString("utf8");
const normalizeHook="function normalize(d){";
if(!bundleSource.includes(normalizeHook))throw new Error("Account role policy insertion point not found");
const rolePolicy="function normalize(d){if(Array.isArray(d.users)){const users=d.users;const majed=users.find(u=>String(u.username||'').trim().toLowerCase()==='assistant');if(majed){majed.role='فني صيانة';majed.secondaryRole='';}const technicianAntonios=users.find(u=>String(u.username||'').trim().toLowerCase()==='ant.tech');if(technicianAntonios){technicianAntonios.role='فني صيانة';technicianAntonios.secondaryRole='';}const adminTony=users.find(u=>String(u.username||'').trim().toLowerCase()==='antonios');if(adminTony){adminTony.role='مدير النظام';adminTony.secondaryRole='';}}";
bundleSource=bundleSource.replace(normalizeHook,rolePolicy);
const bundle=Buffer.from(bundleSource,"utf8");
const imported=await import("data:text/javascript;base64,"+bundle.toString("base64"));
const appServer=imported.default;
export default function handler(req,res){const p=(req.url||"/").split("?")[0];if((req.method==="GET"||req.method==="HEAD")&&(p==="/"||p==="/index.html")){const html=Buffer.from(globalThis.__ALHAMAL_HTML,"utf8");res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Content-Length":String(html.length),"Cache-Control":"no-cache","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"strict-origin-when-cross-origin","Permissions-Policy":"camera=(), microphone=(), geolocation=()"});return req.method==="HEAD"?res.end():res.end(html);}return appServer.emit("request",req,res);}
