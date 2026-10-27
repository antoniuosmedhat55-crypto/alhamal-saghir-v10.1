import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import vm from 'node:vm';
const root=path.dirname(new URL(import.meta.url).pathname);
const readParts=dir=>fs.readdirSync(path.join(root,dir)).filter(n=>n.endsWith('.txt')).sort((a,b)=>Number(a.slice(0,-4))-Number(b.slice(0,-4))).map(n=>fs.readFileSync(path.join(root,dir,n),'utf8')).join('');
const html=zlib.brotliDecompressSync(Buffer.from(readParts('public/html-chunks'),'base64')).toString('utf8');
const server=zlib.brotliDecompressSync(Buffer.from(readParts('bundle-chunks'),'base64')).toString('utf8');
const wrapper=fs.readFileSync(path.join(root,'server.js'),'utf8');
const checks=[];
function test(name,fn){fn();checks.push(name)}
test('compiled HTML has secure username/password fields and no embedded password shortcut',()=>{
  assert.match(html,/id="lu"/); assert.match(html,/id="lp"/); assert.doesNotMatch(html,/LOGIN_USERS|pickLoginUser|buildQuickUsers|quickUsers|تسجيل سريع|اختار الحساب من القائمة/);
  for(const term of ['LOGIN_USERS','pickLoginUser','buildQuickUsers','quickUsers','TEMP_PASSWORD_HASH','TEMP_PASSWORD_SALT']) assert.equal(html.includes(term),false,`public HTML contains ${term}`);
  assert.doesNotMatch(html,/(^|[^A-Za-z0-9._-])ata([^A-Za-z0-9._-]|$)/);
});
test('password reveal toggle and remember-me save username only',()=>{
  assert.match(html,/toggleLoginPassword\(\)/); assert.match(html,/autocomplete="current-password"/); assert.match(html,/rememberMe/); assert.match(html,/alhamal-remember-username/);
  assert.match(html,/localStorage\.setItem\('alhamal-remember-username',username\)/);
  assert.doesNotMatch(html,/localStorage\.setItem\('alhamal-remember-username',[^)]*password/i);
  assert.doesNotMatch(html,/sessionStorage\.setItem\([^)]*password/i);
});
test('generic login error appears in public code',()=>assert.match(html,/بيانات الدخول غير صحيحة/));
test('all inline browser scripts parse',()=>{const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];assert.ok(scripts.length>=1);scripts.forEach((m,i)=>new vm.Script(m[1],{filename:`client-inline-${i}.js`}))});
test('mobile navigation contains five tabs and More menu; 100dvh/safe-area/touch targets present',()=>{
  assert.match(html,/aria-label="التنقل الرئيسي"/); assert.match(html,/openMoreMenu\(\)/); assert.match(html,/openMoreSection\(v\)/);
  for(const label of ['الرئيسية','الأعمال','شراء','الجروب','المزيد']) assert.ok(html.includes(label),`missing mobile label ${label}`);
  assert.match(html,/100dvh/); assert.match(html,/safe-area-inset-bottom/); assert.match(html,/max-width:620px/); assert.match(html,/max-width:390px/); assert.match(html,/min-height:48px/);
});
test('More draws all sections available to the current role',()=>{assert.match(html,/querySelectorAll\('#nav \.nav'\)/);assert.match(html,/x\.style\.display!=='none'/);assert.match(html,/function applyNav\(\)/)});
test('server authenticates server-side with scrypt+timingSafeEqual and username only',()=>{
  assert.match(server,/crypto\.scryptSync/); assert.match(server,/crypto\.timingSafeEqual/); assert.match(server,/d\.users\.find\(z=>z\.username\.toLowerCase\(\)===loginKey\)/);
  assert.doesNotMatch(server,/find\(z=>clean\(z\.name,100\)\.toLowerCase\(\)===loginKey/); assert.match(server,/بيانات الدخول غير صحيحة/);
});
test('no compiled static password/hash/salt or hardcoded account usernames',()=>{
  for(const term of ['TEMP_PASSWORD_HASH','TEMP_PASSWORD_SALT','TEMP_PASSWORD=','resetToTemporary','LOGIN_USERS','pickLoginUser']) assert.equal(server.includes(term),false,`server contains ${term}`);
  assert.match(server,/ALHAMAL_INITIAL_ADMIN_USERNAME/); assert.match(server,/ALHAMAL_INITIAL_ADMIN_PASSWORD/);
});
test('account creation and reset require server-supplied 12+ character temporary password',()=>{
  assert.ok(server.includes("const supplied=String(b.password||'')")); assert.match(server,/supplied\.length<12/); assert.match(server,/pw\.length<12/); assert.doesNotMatch(server,/resetToTemporary/);
});
test('old auto-reset migrations cannot overwrite passwords at startup',()=>{
  assert.doesNotMatch(server,/u\.salt=TEMP_PASSWORD/); assert.doesNotMatch(server,/u\.hash=TEMP_PASSWORD/); assert.doesNotMatch(server,/sharedTemporaryPasswordVersion\|\|0\)<3/);
  assert.match(server,/Never rewrite existing password hashes on startup/);
});
test('retired credential forces password change with limited bootstrap',()=>{
  assert.match(server,/ALHAMAL_RETIRED_PASSWORD_SHA256/); assert.match(server,/ALHAMAL_REQUIRE_PASSWORD_ROTATION/); assert.match(server,/passwordRotationCompletedAt/); assert.match(server,/vp\(pw,me\)/); assert.match(server,/if\(me\.mustChangePassword\)return send\(res,200,\{user:safe\(me\),mustChangePassword:true\}/); assert.match(server,/me\.mustChangePassword&&!\['\/api\/me','\/api\/logout','\/api\/bootstrap'\]/);
});

test('account picker runtime is inserted after the document script stack, not inside a JS string',()=>{
  assert.ok(wrapper.includes('html.lastIndexOf("</body>")'));
  assert.ok(!wrapper.includes('html.replace("</body>",accountChoiceScript+"</body>")'));
  const lineStart=wrapper.indexOf('const accountRuntimeScript=');
  const lineEnd=wrapper.indexOf(String.fromCharCode(10),lineStart);
  assert.ok(lineStart>=0&&lineEnd>lineStart);
  const line=wrapper.slice(lineStart,lineEnd);
  const literal=line.slice('const accountRuntimeScript='.length,line.lastIndexOf(';'));
  const injected=JSON.parse(literal);
  const openTag='<script id="alhamal-executive-runtime">';
  const closeTag='</script>';
  const tagStart=injected.indexOf(openTag);
  const tagEnd=injected.indexOf(closeTag,tagStart+openTag.length);
  assert.ok(tagStart>=0&&tagEnd>tagStart,'runtime script should be present in the injected block');
  new vm.Script(injected.slice(tagStart+openTag.length,tagEnd),{filename:'alhamal-executive-runtime.js'});
});;
test('public login never enumerates accounts or exposes account names',()=>{
  assert.doesNotMatch(wrapper,/alhamalAccountPicker|api\\/login-options|account-choice|اختيار الحساب/);
  assert.doesNotMatch(wrapper,/users:d\\.users\\.filter\\(x=>x\\.active\\)/);
  assert.doesNotMatch(wrapper,/quick login|تسجيل سريع/i);
});
test('account role policy leaves Admin with Tony and makes Majed and technician Antonios technicians',()=>{
  assert.match(wrapper,/majed\.role='فني صيانة'/);
  assert.match(wrapper,/majed\.secondaryRole=''/);
  assert.match(wrapper,/adminTony\.role='مدير النظام'/); assert.match(wrapper,/adminTony\.name='توني — أنطونيوس مدحت'/);
  assert.match(wrapper,/technicianAntonios\.role='فني صيانة'/);
  assert.match(wrapper,/technicianAntonios\.secondaryRole=''/);
});
test('neon motion remains subtle and respects reduced-motion preferences',()=>{
  assert.match(wrapper,/alhamalIconGlow/);
  assert.ok(wrapper.includes('replaceAll("10.6.1","10.6.5")')); assert.match(wrapper,/activeAdmins\.length<=1/); assert.match(wrapper,/accountPolicyVersion/); assert.match(wrapper,/max-width:780px/); assert.match(wrapper,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(wrapper,/prefers-reduced-motion:reduce/);
});
const sw=fs.readFileSync(path.join(root,'public','sw.js'),'utf8');assert.match(sw,/alhamal-v10\.6\.5/);
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));assert.equal(pkg.version,'10.6.5');
console.log(`PASS ${checks.length} test groups\n- ${checks.join('\n- ')}`);
