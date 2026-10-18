import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import vm from 'node:vm';
const root=path.dirname(new URL(import.meta.url).pathname);
const readParts=dir=>fs.readdirSync(path.join(root,dir)).filter(n=>n.endsWith('.txt')).sort((a,b)=>Number(a.slice(0,-4))-Number(b.slice(0,-4))).map(n=>fs.readFileSync(path.join(root,dir,n),'utf8')).join('');
const html=zlib.brotliDecompressSync(Buffer.from(readParts('public/html-chunks'),'base64')).toString('utf8');
const server=zlib.brotliDecompressSync(Buffer.from(readParts('bundle-chunks'),'base64')).toString('utf8');
const checks=[];
function test(name,fn){fn();checks.push(name)}
test('public login has username+password only and no account chooser/passwordless shortcut',()=>{
  assert.match(html,/id="lu"/); assert.match(html,/id="lp"/); assert.doesNotMatch(html,/LOGIN_USERS|pickLoginUser|buildQuickUsers|quickUsers|تسجيل سريع|اختار الحساب من القائمة/);
  for(const term of ['2008125','antonios','assistant','ihab','supervisor','ant.tech','solib','romany','TEMP_PASSWORD_HASH','TEMP_PASSWORD_SALT']) assert.equal(html.includes(term),false,`public HTML contains ${term}`);
  assert.doesNotMatch(html,/(^|[^A-Za-z0-9._-])ata([^A-Za-z0-9._-]|$)/);
});
test('password reveal toggle and remember-me save username only',()=>{
  assert.match(html,/toggleLoginPassword\(\)/); assert.match(html,/autocomplete="current-password"/); assert.match(html,/remem���q�^