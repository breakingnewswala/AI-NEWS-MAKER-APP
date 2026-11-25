import{o as oa,_ as ui}from"./vendor-Bg_btqvK.js";const aa=()=>{};var kr={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vs=function(i){const e=[];let n=0;for(let r=0;r<i.length;r++){let o=i.charCodeAt(r);o<128?e[n++]=o:o<2048?(e[n++]=o>>6|192,e[n++]=o&63|128):(o&64512)===55296&&r+1<i.length&&(i.charCodeAt(r+1)&64512)===56320?(o=65536+((o&1023)<<10)+(i.charCodeAt(++r)&1023),e[n++]=o>>18|240,e[n++]=o>>12&63|128,e[n++]=o>>6&63|128,e[n++]=o&63|128):(e[n++]=o>>12|224,e[n++]=o>>6&63|128,e[n++]=o&63|128)}return e},ha=function(i){const e=[];let n=0,r=0;for(;n<i.length;){const o=i[n++];if(o<128)e[r++]=String.fromCharCode(o);else if(o>191&&o<224){const h=i[n++];e[r++]=String.fromCharCode((o&31)<<6|h&63)}else if(o>239&&o<365){const h=i[n++],l=i[n++],g=i[n++],I=((o&7)<<18|(h&63)<<12|(l&63)<<6|g&63)-65536;e[r++]=String.fromCharCode(55296+(I>>10)),e[r++]=String.fromCharCode(56320+(I&1023))}else{const h=i[n++],l=i[n++];e[r++]=String.fromCharCode((o&15)<<12|(h&63)<<6|l&63)}}return e.join("")},ys={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(i,e){if(!Array.isArray(i))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let o=0;o<i.length;o+=3){const h=i[o],l=o+1<i.length,g=l?i[o+1]:0,I=o+2<i.length,E=I?i[o+2]:0,A=h>>2,C=(h&3)<<4|g>>4;let S=(g&15)<<2|E>>6,x=E&63;I||(x=64,l||(S=64)),r.push(n[A],n[C],n[S],n[x])}return r.join("")},encodeString(i,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(i):this.encodeByteArray(vs(i),e)},decodeString(i,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(i):ha(this.decodeStringToByteArray(i,e))},decodeStringToByteArray(i,e){this.init_();const n=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let o=0;o<i.length;){const h=n[i.charAt(o++)],g=o<i.length?n[i.charAt(o)]:0;++o;const E=o<i.length?n[i.charAt(o)]:64;++o;const C=o<i.length?n[i.charAt(o)]:64;if(++o,h==null||g==null||E==null||C==null)throw new ca;const S=h<<2|g>>4;if(r.push(S),E!==64){const x=g<<4&240|E>>2;if(r.push(x),C!==64){const P=E<<6&192|C;r.push(P)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let i=0;i<this.ENCODED_VALS.length;i++)this.byteToCharMap_[i]=this.ENCODED_VALS.charAt(i),this.charToByteMap_[this.byteToCharMap_[i]]=i,this.byteToCharMapWebSafe_[i]=this.ENCODED_VALS_WEBSAFE.charAt(i),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]]=i,i>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)]=i,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)]=i)}}};class ca extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const la=function(i){const e=vs(i);return ys.encodeByteArray(e,!0)},mn=function(i){return la(i).replace(/\./g,"")},ws=function(i){try{return ys.decodeString(i,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ua(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const da=()=>ua().__FIREBASE_DEFAULTS__,fa=()=>{if(typeof process>"u"||typeof kr>"u")return;const i=kr.__FIREBASE_DEFAULTS__;if(i)return JSON.parse(i)},pa=()=>{if(typeof document>"u")return;let i;try{i=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=i&&ws(i[1]);return e&&JSON.parse(e)},di=()=>{try{return aa()||da()||fa()||pa()}catch(i){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${i}`);return}},Is=i=>{var e,n;return(n=(e=di())===null||e===void 0?void 0:e.emulatorHosts)===null||n===void 0?void 0:n[i]},ga=i=>{const e=Is(i);if(!e)return;const n=e.lastIndexOf(":");if(n<=0||n+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const r=parseInt(e.substring(n+1),10);return e[0]==="["?[e.substring(1,n-1),r]:[e.substring(0,n),r]},Es=()=>{var i;return(i=di())===null||i===void 0?void 0:i.config},Ts=i=>{var e;return(e=di())===null||e===void 0?void 0:e[`_${i}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ma{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,n)=>{this.resolve=e,this.reject=n})}wrapCallback(e){return(n,r)=>{n?this.reject(n):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(n):e(n,r))}}}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ut(i){try{return(i.startsWith("http://")||i.startsWith("https://")?new URL(i).hostname:i).endsWith(".cloudworkstations.dev")}catch{return!1}}async function Ss(i){return(await fetch(i,{credentials:"include"})).ok}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _a(i,e){if(i.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const n={alg:"none",type:"JWT"},r=e||"demo-project",o=i.iat||0,h=i.sub||i.user_id;if(!h)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const l=Object.assign({iss:`https://securetoken.google.com/${r}`,aud:r,iat:o,exp:o+3600,auth_time:o,sub:h,user_id:h,firebase:{sign_in_provider:"custom",identities:{}}},i);return[mn(JSON.stringify(n)),mn(JSON.stringify(l)),""].join(".")}const Ct={};function va(){const i={prod:[],emulator:[]};for(const e of Object.keys(Ct))Ct[e]?i.emulator.push(e):i.prod.push(e);return i}function ya(i){let e=document.getElementById(i),n=!1;return e||(e=document.createElement("div"),e.setAttribute("id",i),n=!0),{created:n,element:e}}let Or=!1;function As(i,e){if(typeof window>"u"||typeof document>"u"||!Ut(window.location.host)||Ct[i]===e||Ct[i]||Or)return;Ct[i]=e;function n(S){return`__firebase__banner__${S}`}const r="__firebase__banner",h=va().prod.length>0;function l(){const S=document.getElementById(r);S&&S.remove()}function g(S){S.style.display="flex",S.style.background="#7faaf0",S.style.position="fixed",S.style.bottom="5px",S.style.left="5px",S.style.padding=".5em",S.style.borderRadius="5px",S.style.alignItems="center"}function I(S,x){S.setAttribute("width","24"),S.setAttribute("id",x),S.setAttribute("height","24"),S.setAttribute("viewBox","0 0 24 24"),S.setAttribute("fill","none"),S.style.marginLeft="-6px"}function E(){const S=document.createElement("span");return S.style.cursor="pointer",S.style.marginLeft="16px",S.style.fontSize="24px",S.innerHTML=" &times;",S.onclick=()=>{Or=!0,l()},S}function A(S,x){S.setAttribute("id",x),S.innerText="Learn more",S.href="https://firebase.google.com/docs/studio/preview-apps#preview-backend",S.setAttribute("target","__blank"),S.style.paddingLeft="5px",S.style.textDecoration="underline"}function C(){const S=ya(r),x=n("text"),P=document.getElementById(x)||document.createElement("span"),j=n("learnmore"),L=document.getElementById(j)||document.createElement("a"),ee=n("preprendIcon"),H=document.getElementById(ee)||document.createElementNS("http://www.w3.org/2000/svg","svg");if(S.created){const V=S.element;g(V),A(L,j);const Q=E();I(H,ee),V.append(H,P,L,Q),document.body.appendChild(V)}h?(P.innerText="Preview backend disconnected.",H.innerHTML=`<g clip-path="url(#clip0_6013_33858)">
<path d="M4.8 17.6L12 5.6L19.2 17.6H4.8ZM6.91667 16.4H17.0833L12 7.93333L6.91667 16.4ZM12 15.6C12.1667 15.6 12.3056 15.5444 12.4167 15.4333C12.5389 15.3111 12.6 15.1667 12.6 15C12.6 14.8333 12.5389 14.6944 12.4167 14.5833C12.3056 14.4611 12.1667 14.4 12 14.4C11.8333 14.4 11.6889 14.4611 11.5667 14.5833C11.4556 14.6944 11.4 14.8333 11.4 15C11.4 15.1667 11.4556 15.3111 11.5667 15.4333C11.6889 15.5444 11.8333 15.6 12 15.6ZM11.4 13.6H12.6V10.4H11.4V13.6Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6013_33858">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`):(H.innerHTML=`<g clip-path="url(#clip0_6083_34804)">
<path d="M11.4 15.2H12.6V11.2H11.4V15.2ZM12 10C12.1667 10 12.3056 9.94444 12.4167 9.83333C12.5389 9.71111 12.6 9.56667 12.6 9.4C12.6 9.23333 12.5389 9.09444 12.4167 8.98333C12.3056 8.86111 12.1667 8.8 12 8.8C11.8333 8.8 11.6889 8.86111 11.5667 8.98333C11.4556 9.09444 11.4 9.23333 11.4 9.4C11.4 9.56667 11.4556 9.71111 11.5667 9.83333C11.6889 9.94444 11.8333 10 12 10ZM12 18.4C11.1222 18.4 10.2944 18.2333 9.51667 17.9C8.73889 17.5667 8.05556 17.1111 7.46667 16.5333C6.88889 15.9444 6.43333 15.2611 6.1 14.4833C5.76667 13.7056 5.6 12.8778 5.6 12C5.6 11.1111 5.76667 10.2833 6.1 9.51667C6.43333 8.73889 6.88889 8.06111 7.46667 7.48333C8.05556 6.89444 8.73889 6.43333 9.51667 6.1C10.2944 5.76667 11.1222 5.6 12 5.6C12.8889 5.6 13.7167 5.76667 14.4833 6.1C15.2611 6.43333 15.9389 6.89444 16.5167 7.48333C17.1056 8.06111 17.5667 8.73889 17.9 9.51667C18.2333 10.2833 18.4 11.1111 18.4 12C18.4 12.8778 18.2333 13.7056 17.9 14.4833C17.5667 15.2611 17.1056 15.9444 16.5167 16.5333C15.9389 17.1111 15.2611 17.5667 14.4833 17.9C13.7167 18.2333 12.8889 18.4 12 18.4ZM12 17.2C13.4444 17.2 14.6722 16.6944 15.6833 15.6833C16.6944 14.6722 17.2 13.4444 17.2 12C17.2 10.5556 16.6944 9.32778 15.6833 8.31667C14.6722 7.30555 13.4444 6.8 12 6.8C10.5556 6.8 9.32778 7.30555 8.31667 8.31667C7.30556 9.32778 6.8 10.5556 6.8 12C6.8 13.4444 7.30556 14.6722 8.31667 15.6833C9.32778 16.6944 10.5556 17.2 12 17.2Z" fill="#212121"/>
</g>
<defs>
<clipPath id="clip0_6083_34804">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>`,P.innerText="Preview backend running in this workspace."),P.setAttribute("id",x)}document.readyState==="loading"?window.addEventListener("DOMContentLoaded",C):C()}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Y(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function wa(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(Y())}function Ia(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function Ea(){const i=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof i=="object"&&i.id!==void 0}function Ta(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function Sa(){const i=Y();return i.indexOf("MSIE ")>=0||i.indexOf("Trident/")>=0}function Aa(){try{return typeof indexedDB=="object"}catch{return!1}}function ba(){return new Promise((i,e)=>{try{let n=!0;const r="validate-browser-context-for-indexeddb-analytics-module",o=self.indexedDB.open(r);o.onsuccess=()=>{o.result.close(),n||self.indexedDB.deleteDatabase(r),i(!0)},o.onupgradeneeded=()=>{n=!1},o.onerror=()=>{var h;e(((h=o.error)===null||h===void 0?void 0:h.message)||"")}}catch(n){e(n)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ca="FirebaseError";class be extends Error{constructor(e,n,r){super(n),this.code=e,this.customData=r,this.name=Ca,Object.setPrototypeOf(this,be.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,xt.prototype.create)}}class xt{constructor(e,n,r){this.service=e,this.serviceName=n,this.errors=r}create(e,...n){const r=n[0]||{},o=`${this.service}/${e}`,h=this.errors[e],l=h?Pa(h,r):"Error",g=`${this.serviceName}: ${l} (${o}).`;return new be(o,g,r)}}function Pa(i,e){return i.replace(Ra,(n,r)=>{const o=e[r];return o!=null?String(o):`<${r}?>`})}const Ra=/\{\$([^}]+)}/g;function ka(i){for(const e in i)if(Object.prototype.hasOwnProperty.call(i,e))return!1;return!0}function qe(i,e){if(i===e)return!0;const n=Object.keys(i),r=Object.keys(e);for(const o of n){if(!r.includes(o))return!1;const h=i[o],l=e[o];if(Nr(h)&&Nr(l)){if(!qe(h,l))return!1}else if(h!==l)return!1}for(const o of r)if(!n.includes(o))return!1;return!0}function Nr(i){return i!==null&&typeof i=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function jt(i){const e=[];for(const[n,r]of Object.entries(i))Array.isArray(r)?r.forEach(o=>{e.push(encodeURIComponent(n)+"="+encodeURIComponent(o))}):e.push(encodeURIComponent(n)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function Oa(i,e){const n=new Na(i,e);return n.subscribe.bind(n)}class Na{constructor(e,n){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=n,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(n=>{n.next(e)})}error(e){this.forEachObserver(n=>{n.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,n,r){let o;if(e===void 0&&n===void 0&&r===void 0)throw new Error("Missing Observer.");Da(e,["next","error","complete"])?o=e:o={next:e,error:n,complete:r},o.next===void 0&&(o.next=Zn),o.error===void 0&&(o.error=Zn),o.complete===void 0&&(o.complete=Zn);const h=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?o.error(this.finalError):o.complete()}catch{}}),this.observers.push(o),h}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let n=0;n<this.observers.length;n++)this.sendOne(n,e)}sendOne(e,n){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{n(this.observers[e])}catch(r){typeof console<"u"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function Da(i,e){if(typeof i!="object"||i===null)return!1;for(const n of e)if(n in i&&typeof i[n]=="function")return!0;return!1}function Zn(){}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Me(i){return i&&i._delegate?i._delegate:i}class Ke{constructor(e,n,r){this.name=e,this.instanceFactory=n,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ve="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class La{constructor(e,n){this.name=e,this.container=n,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const n=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(n)){const r=new ma;if(this.instancesDeferred.set(n,r),this.isInitialized(n)||this.shouldAutoInitialize())try{const o=this.getOrInitializeService({instanceIdentifier:n});o&&r.resolve(o)}catch{}}return this.instancesDeferred.get(n).promise}getImmediate(e){var n;const r=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),o=(n=e==null?void 0:e.optional)!==null&&n!==void 0?n:!1;if(this.isInitialized(r)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:r})}catch(h){if(o)return null;throw h}else{if(o)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(Ua(e))try{this.getOrInitializeService({instanceIdentifier:Ve})}catch{}for(const[n,r]of this.instancesDeferred.entries()){const o=this.normalizeInstanceIdentifier(n);try{const h=this.getOrInitializeService({instanceIdentifier:o});r.resolve(h)}catch{}}}}clearInstance(e=Ve){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(n=>"INTERNAL"in n).map(n=>n.INTERNAL.delete()),...e.filter(n=>"_delete"in n).map(n=>n._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=Ve){return this.instances.has(e)}getOptions(e=Ve){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:n={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const o=this.getOrInitializeService({instanceIdentifier:r,options:n});for(const[h,l]of this.instancesDeferred.entries()){const g=this.normalizeInstanceIdentifier(h);r===g&&l.resolve(o)}return o}onInit(e,n){var r;const o=this.normalizeInstanceIdentifier(n),h=(r=this.onInitCallbacks.get(o))!==null&&r!==void 0?r:new Set;h.add(e),this.onInitCallbacks.set(o,h);const l=this.instances.get(o);return l&&e(l,o),()=>{h.delete(e)}}invokeOnInitCallbacks(e,n){const r=this.onInitCallbacks.get(n);if(r)for(const o of r)try{o(e,n)}catch{}}getOrInitializeService({instanceIdentifier:e,options:n={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:Ma(e),options:n}),this.instances.set(e,r),this.instancesOptions.set(e,n),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=Ve){return this.component?this.component.multipleInstances?e:Ve:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function Ma(i){return i===Ve?void 0:i}function Ua(i){return i.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xa{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const n=this.getProvider(e.name);if(n.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);n.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const n=new La(e,this);return this.providers.set(e,n),n}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var D;(function(i){i[i.DEBUG=0]="DEBUG",i[i.VERBOSE=1]="VERBOSE",i[i.INFO=2]="INFO",i[i.WARN=3]="WARN",i[i.ERROR=4]="ERROR",i[i.SILENT=5]="SILENT"})(D||(D={}));const ja={debug:D.DEBUG,verbose:D.VERBOSE,info:D.INFO,warn:D.WARN,error:D.ERROR,silent:D.SILENT},Fa=D.INFO,Va={[D.DEBUG]:"log",[D.VERBOSE]:"log",[D.INFO]:"info",[D.WARN]:"warn",[D.ERROR]:"error"},Ba=(i,e,...n)=>{if(e<i.logLevel)return;const r=new Date().toISOString(),o=Va[e];if(o)console[o](`[${r}]  ${i.name}:`,...n);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class fi{constructor(e){this.name=e,this._logLevel=Fa,this._logHandler=Ba,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in D))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?ja[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,D.DEBUG,...e),this._logHandler(this,D.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,D.VERBOSE,...e),this._logHandler(this,D.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,D.INFO,...e),this._logHandler(this,D.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,D.WARN,...e),this._logHandler(this,D.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,D.ERROR,...e),this._logHandler(this,D.ERROR,...e)}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ha{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(n=>{if($a(n)){const r=n.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(n=>n).join(" ")}}function $a(i){const e=i.getComponent();return(e==null?void 0:e.type)==="VERSION"}const ii="@firebase/app",Dr="0.13.2";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Se=new fi("@firebase/app"),Wa="@firebase/app-compat",za="@firebase/analytics-compat",Ga="@firebase/analytics",qa="@firebase/app-check-compat",Ka="@firebase/app-check",Ja="@firebase/auth",Xa="@firebase/auth-compat",Ya="@firebase/database",Za="@firebase/data-connect",Qa="@firebase/database-compat",eh="@firebase/functions",th="@firebase/functions-compat",nh="@firebase/installations",ih="@firebase/installations-compat",rh="@firebase/messaging",sh="@firebase/messaging-compat",oh="@firebase/performance",ah="@firebase/performance-compat",hh="@firebase/remote-config",ch="@firebase/remote-config-compat",lh="@firebase/storage",uh="@firebase/storage-compat",dh="@firebase/firestore",fh="@firebase/ai",ph="@firebase/firestore-compat",gh="firebase",mh="11.10.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ri="[DEFAULT]",_h={[ii]:"fire-core",[Wa]:"fire-core-compat",[Ga]:"fire-analytics",[za]:"fire-analytics-compat",[Ka]:"fire-app-check",[qa]:"fire-app-check-compat",[Ja]:"fire-auth",[Xa]:"fire-auth-compat",[Ya]:"fire-rtdb",[Za]:"fire-data-connect",[Qa]:"fire-rtdb-compat",[eh]:"fire-fn",[th]:"fire-fn-compat",[nh]:"fire-iid",[ih]:"fire-iid-compat",[rh]:"fire-fcm",[sh]:"fire-fcm-compat",[oh]:"fire-perf",[ah]:"fire-perf-compat",[hh]:"fire-rc",[ch]:"fire-rc-compat",[lh]:"fire-gcs",[uh]:"fire-gcs-compat",[dh]:"fire-fst",[ph]:"fire-fst-compat",[fh]:"fire-vertex","fire-js":"fire-js",[gh]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Nt=new Map,vh=new Map,si=new Map;function Lr(i,e){try{i.container.addComponent(e)}catch(n){Se.debug(`Component ${e.name} failed to register with FirebaseApp ${i.name}`,n)}}function st(i){const e=i.name;if(si.has(e))return Se.debug(`There were multiple attempts to register component ${e}.`),!1;si.set(e,i);for(const n of Nt.values())Lr(n,i);for(const n of vh.values())Lr(n,i);return!0}function pi(i,e){const n=i.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),i.container.getProvider(e)}function re(i){return i==null?!1:i.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yh={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},Ne=new xt("app","Firebase",yh);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wh{constructor(e,n,r){this._isDeleted=!1,this._options=Object.assign({},e),this._config=Object.assign({},n),this._name=n.name,this._automaticDataCollectionEnabled=n.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new Ke("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw Ne.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ht=mh;function Ih(i,e={}){let n=i;typeof e!="object"&&(e={name:e});const r=Object.assign({name:ri,automaticDataCollectionEnabled:!0},e),o=r.name;if(typeof o!="string"||!o)throw Ne.create("bad-app-name",{appName:String(o)});if(n||(n=Es()),!n)throw Ne.create("no-options");const h=Nt.get(o);if(h){if(qe(n,h.options)&&qe(r,h.config))return h;throw Ne.create("duplicate-app",{appName:o})}const l=new xa(o);for(const I of si.values())l.addComponent(I);const g=new wh(n,r,l);return Nt.set(o,g),g}function bs(i=ri){const e=Nt.get(i);if(!e&&i===ri&&Es())return Ih();if(!e)throw Ne.create("no-app",{appName:i});return e}function iu(){return Array.from(Nt.values())}function De(i,e,n){var r;let o=(r=_h[i])!==null&&r!==void 0?r:i;n&&(o+=`-${n}`);const h=o.match(/\s|\//),l=e.match(/\s|\//);if(h||l){const g=[`Unable to register library "${o}" with version "${e}":`];h&&g.push(`library name "${o}" contains illegal characters (whitespace or "/")`),h&&l&&g.push("and"),l&&g.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Se.warn(g.join(" "));return}st(new Ke(`${o}-version`,()=>({library:o,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Eh="firebase-heartbeat-database",Th=1,Dt="firebase-heartbeat-store";let Qn=null;function Cs(){return Qn||(Qn=oa(Eh,Th,{upgrade:(i,e)=>{switch(e){case 0:try{i.createObjectStore(Dt)}catch(n){console.warn(n)}}}}).catch(i=>{throw Ne.create("idb-open",{originalErrorMessage:i.message})})),Qn}async function Sh(i){try{const n=(await Cs()).transaction(Dt),r=await n.objectStore(Dt).get(Ps(i));return await n.done,r}catch(e){if(e instanceof be)Se.warn(e.message);else{const n=Ne.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});Se.warn(n.message)}}}async function Mr(i,e){try{const r=(await Cs()).transaction(Dt,"readwrite");await r.objectStore(Dt).put(e,Ps(i)),await r.done}catch(n){if(n instanceof be)Se.warn(n.message);else{const r=Ne.create("idb-set",{originalErrorMessage:n==null?void 0:n.message});Se.warn(r.message)}}}function Ps(i){return`${i.name}!${i.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ah=1024,bh=30;class Ch{constructor(e){this.container=e,this._heartbeatsCache=null;const n=this.container.getProvider("app").getImmediate();this._storage=new Rh(n),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,n;try{const o=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),h=Ur();if(((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((n=this._heartbeatsCache)===null||n===void 0?void 0:n.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===h||this._heartbeatsCache.heartbeats.some(l=>l.date===h))return;if(this._heartbeatsCache.heartbeats.push({date:h,agent:o}),this._heartbeatsCache.heartbeats.length>bh){const l=kh(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(l,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(r){Se.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const n=Ur(),{heartbeatsToSend:r,unsentEntries:o}=Ph(this._heartbeatsCache.heartbeats),h=mn(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=n,o.length>0?(this._heartbeatsCache.heartbeats=o,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),h}catch(n){return Se.warn(n),""}}}function Ur(){return new Date().toISOString().substring(0,10)}function Ph(i,e=Ah){const n=[];let r=i.slice();for(const o of i){const h=n.find(l=>l.agent===o.agent);if(h){if(h.dates.push(o.date),xr(n)>e){h.dates.pop();break}}else if(n.push({agent:o.agent,dates:[o.date]}),xr(n)>e){n.pop();break}r=r.slice(1)}return{heartbeatsToSend:n,unsentEntries:r}}class Rh{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Aa()?ba().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const n=await Sh(this.app);return n!=null&&n.heartbeats?n:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var n;if(await this._canUseIndexedDBPromise){const o=await this.read();return Mr(this.app,{lastSentHeartbeatDate:(n=e.lastSentHeartbeatDate)!==null&&n!==void 0?n:o.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var n;if(await this._canUseIndexedDBPromise){const o=await this.read();return Mr(this.app,{lastSentHeartbeatDate:(n=e.lastSentHeartbeatDate)!==null&&n!==void 0?n:o.lastSentHeartbeatDate,heartbeats:[...o.heartbeats,...e.heartbeats]})}else return}}function xr(i){return mn(JSON.stringify({version:2,heartbeats:i})).length}function kh(i){if(i.length===0)return-1;let e=0,n=i[0].date;for(let r=1;r<i.length;r++)i[r].date<n&&(n=i[r].date,e=r);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Oh(i){st(new Ke("platform-logger",e=>new Ha(e),"PRIVATE")),st(new Ke("heartbeat",e=>new Ch(e),"PRIVATE")),De(ii,Dr,i),De(ii,Dr,"esm2017"),De("fire-js","")}Oh("");var Nh="firebase",Dh="11.10.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */De(Nh,Dh,"app");function Rs(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const ks=Rs,Os=new xt("auth","Firebase",Rs());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _n=new fi("@firebase/auth");function Lh(i,...e){_n.logLevel<=D.WARN&&_n.warn(`Auth (${ht}): ${i}`,...e)}function un(i,...e){_n.logLevel<=D.ERROR&&_n.error(`Auth (${ht}): ${i}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fe(i,...e){throw mi(i,...e)}function ae(i,...e){return mi(i,...e)}function gi(i,e,n){const r=Object.assign(Object.assign({},ks()),{[e]:n});return new xt("auth","Firebase",r).create(e,{appName:i.name})}function We(i){return gi(i,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function Mh(i,e,n){const r=n;if(!(e instanceof r))throw r.name!==e.constructor.name&&fe(i,"argument-error"),gi(i,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function mi(i,...e){if(typeof i!="string"){const n=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=i.name),i._errorFactory.create(n,...r)}return Os.create(i,...e)}function b(i,e,...n){if(!i)throw mi(e,...n)}function Ee(i){const e="INTERNAL ASSERTION FAILED: "+i;throw un(e),new Error(e)}function Ae(i,e){i||Ee(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function oi(){var i;return typeof self<"u"&&((i=self.location)===null||i===void 0?void 0:i.href)||""}function Uh(){return jr()==="http:"||jr()==="https:"}function jr(){var i;return typeof self<"u"&&((i=self.location)===null||i===void 0?void 0:i.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function xh(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(Uh()||Ea()||"connection"in navigator)?navigator.onLine:!0}function jh(){if(typeof navigator>"u")return null;const i=navigator;return i.languages&&i.languages[0]||i.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ft{constructor(e,n){this.shortDelay=e,this.longDelay=n,Ae(n>e,"Short delay should be less than long delay!"),this.isMobile=wa()||Ta()}get(){return xh()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function _i(i,e){Ae(i.emulator,"Emulator should always be set here");const{url:n}=i.emulator;return e?`${n}${e.startsWith("/")?e.slice(1):e}`:n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ns{static initialize(e,n,r){this.fetchImpl=e,n&&(this.headersImpl=n),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;Ee("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;Ee("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;Ee("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fh={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vh=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],Bh=new Ft(3e4,6e4);function vi(i,e){return i.tenantId&&!e.tenantId?Object.assign(Object.assign({},e),{tenantId:i.tenantId}):e}async function ct(i,e,n,r,o={}){return Ds(i,o,async()=>{let h={},l={};r&&(e==="GET"?l=r:h={body:JSON.stringify(r)});const g=jt(Object.assign({key:i.config.apiKey},l)).slice(1),I=await i._getAdditionalHeaders();I["Content-Type"]="application/json",i.languageCode&&(I["X-Firebase-Locale"]=i.languageCode);const E=Object.assign({method:e,headers:I},h);return Ia()||(E.referrerPolicy="no-referrer"),i.emulatorConfig&&Ut(i.emulatorConfig.host)&&(E.credentials="include"),Ns.fetch()(await Ls(i,i.config.apiHost,n,g),E)})}async function Ds(i,e,n){i._canInitEmulator=!1;const r=Object.assign(Object.assign({},Fh),e);try{const o=new $h(i),h=await Promise.race([n(),o.promise]);o.clearNetworkTimeout();const l=await h.json();if("needConfirmation"in l)throw hn(i,"account-exists-with-different-credential",l);if(h.ok&&!("errorMessage"in l))return l;{const g=h.ok?l.errorMessage:l.error.message,[I,E]=g.split(" : ");if(I==="FEDERATED_USER_ID_ALREADY_LINKED")throw hn(i,"credential-already-in-use",l);if(I==="EMAIL_EXISTS")throw hn(i,"email-already-in-use",l);if(I==="USER_DISABLED")throw hn(i,"user-disabled",l);const A=r[I]||I.toLowerCase().replace(/[_\s]+/g,"-");if(E)throw gi(i,A,E);fe(i,A)}}catch(o){if(o instanceof be)throw o;fe(i,"network-request-failed",{message:String(o)})}}async function Hh(i,e,n,r,o={}){const h=await ct(i,e,n,r,o);return"mfaPendingCredential"in h&&fe(i,"multi-factor-auth-required",{_serverResponse:h}),h}async function Ls(i,e,n,r){const o=`${e}${n}?${r}`,h=i,l=h.config.emulator?_i(i.config,o):`${i.config.apiScheme}://${o}`;return Vh.includes(n)&&(await h._persistenceManagerAvailable,h._getPersistenceType()==="COOKIE")?h._getPersistence()._getFinalTarget(l).toString():l}class $h{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((n,r)=>{this.timer=setTimeout(()=>r(ae(this.auth,"network-request-failed")),Bh.get())})}}function hn(i,e,n){const r={appName:i.name};n.email&&(r.email=n.email),n.phoneNumber&&(r.phoneNumber=n.phoneNumber);const o=ae(i,e,r);return o.customData._tokenResponse=n,o}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Wh(i,e){return ct(i,"POST","/v1/accounts:delete",e)}async function vn(i,e){return ct(i,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pt(i){if(i)try{const e=new Date(Number(i));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function Ms(i,e=!1){const n=Me(i),r=await n.getIdToken(e),o=yi(r);b(o&&o.exp&&o.auth_time&&o.iat,n.auth,"internal-error");const h=typeof o.firebase=="object"?o.firebase:void 0,l=h==null?void 0:h.sign_in_provider;return{claims:o,token:r,authTime:Pt(ei(o.auth_time)),issuedAtTime:Pt(ei(o.iat)),expirationTime:Pt(ei(o.exp)),signInProvider:l||null,signInSecondFactor:(h==null?void 0:h.sign_in_second_factor)||null}}function ei(i){return Number(i)*1e3}function yi(i){const[e,n,r]=i.split(".");if(e===void 0||n===void 0||r===void 0)return un("JWT malformed, contained fewer than 3 sections"),null;try{const o=ws(n);return o?JSON.parse(o):(un("Failed to decode base64 JWT payload"),null)}catch(o){return un("Caught error parsing JWT payload as JSON",o==null?void 0:o.toString()),null}}function Fr(i){const e=yi(i);return b(e,"internal-error"),b(typeof e.exp<"u","internal-error"),b(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Lt(i,e,n=!1){if(n)return e;try{return await e}catch(r){throw r instanceof be&&zh(r)&&i.auth.currentUser===i&&await i.auth.signOut(),r}}function zh({code:i}){return i==="auth/user-disabled"||i==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gh{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){var n;if(e){const r=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),r}else{this.errorBackoff=3e4;const o=((n=this.user.stsTokenManager.expirationTime)!==null&&n!==void 0?n:0)-Date.now()-3e5;return Math.max(0,o)}}schedule(e=!1){if(!this.isRunning)return;const n=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},n)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ai{constructor(e,n){this.createdAt=e,this.lastLoginAt=n,this._initializeTime()}_initializeTime(){this.lastSignInTime=Pt(this.lastLoginAt),this.creationTime=Pt(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function yn(i){var e;const n=i.auth,r=await i.getIdToken(),o=await Lt(i,vn(n,{idToken:r}));b(o==null?void 0:o.users.length,n,"internal-error");const h=o.users[0];i._notifyReloadListener(h);const l=!((e=h.providerUserInfo)===null||e===void 0)&&e.length?xs(h.providerUserInfo):[],g=qh(i.providerData,l),I=i.isAnonymous,E=!(i.email&&h.passwordHash)&&!(g!=null&&g.length),A=I?E:!1,C={uid:h.localId,displayName:h.displayName||null,photoURL:h.photoUrl||null,email:h.email||null,emailVerified:h.emailVerified||!1,phoneNumber:h.phoneNumber||null,tenantId:h.tenantId||null,providerData:g,metadata:new ai(h.createdAt,h.lastLoginAt),isAnonymous:A};Object.assign(i,C)}async function Us(i){const e=Me(i);await yn(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function qh(i,e){return[...i.filter(r=>!e.some(o=>o.providerId===r.providerId)),...e]}function xs(i){return i.map(e=>{var{providerId:n}=e,r=ui(e,["providerId"]);return{providerId:n,uid:r.rawId||"",displayName:r.displayName||null,email:r.email||null,phoneNumber:r.phoneNumber||null,photoURL:r.photoUrl||null}})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Kh(i,e){const n=await Ds(i,{},async()=>{const r=jt({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:o,apiKey:h}=i.config,l=await Ls(i,o,"/v1/token",`key=${h}`),g=await i._getAdditionalHeaders();g["Content-Type"]="application/x-www-form-urlencoded";const I={method:"POST",headers:g,body:r};return i.emulatorConfig&&Ut(i.emulatorConfig.host)&&(I.credentials="include"),Ns.fetch()(l,I)});return{accessToken:n.access_token,expiresIn:n.expires_in,refreshToken:n.refresh_token}}async function Jh(i,e){return ct(i,"POST","/v2/accounts:revokeToken",vi(i,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tt{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){b(e.idToken,"internal-error"),b(typeof e.idToken<"u","internal-error"),b(typeof e.refreshToken<"u","internal-error");const n="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):Fr(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,n)}updateFromIdToken(e){b(e.length!==0,"internal-error");const n=Fr(e);this.updateTokensAndExpiration(e,null,n)}async getToken(e,n=!1){return!n&&this.accessToken&&!this.isExpired?this.accessToken:(b(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,n){const{accessToken:r,refreshToken:o,expiresIn:h}=await Kh(e,n);this.updateTokensAndExpiration(r,o,Number(h))}updateTokensAndExpiration(e,n,r){this.refreshToken=n||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,n){const{refreshToken:r,accessToken:o,expirationTime:h}=n,l=new tt;return r&&(b(typeof r=="string","internal-error",{appName:e}),l.refreshToken=r),o&&(b(typeof o=="string","internal-error",{appName:e}),l.accessToken=o),h&&(b(typeof h=="number","internal-error",{appName:e}),l.expirationTime=h),l}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new tt,this.toJSON())}_performRefresh(){return Ee("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Oe(i,e){b(typeof i=="string"||typeof i>"u","internal-error",{appName:e})}class se{constructor(e){var{uid:n,auth:r,stsTokenManager:o}=e,h=ui(e,["uid","auth","stsTokenManager"]);this.providerId="firebase",this.proactiveRefresh=new Gh(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=n,this.auth=r,this.stsTokenManager=o,this.accessToken=o.accessToken,this.displayName=h.displayName||null,this.email=h.email||null,this.emailVerified=h.emailVerified||!1,this.phoneNumber=h.phoneNumber||null,this.photoURL=h.photoURL||null,this.isAnonymous=h.isAnonymous||!1,this.tenantId=h.tenantId||null,this.providerData=h.providerData?[...h.providerData]:[],this.metadata=new ai(h.createdAt||void 0,h.lastLoginAt||void 0)}async getIdToken(e){const n=await Lt(this,this.stsTokenManager.getToken(this.auth,e));return b(n,this.auth,"internal-error"),this.accessToken!==n&&(this.accessToken=n,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),n}getIdTokenResult(e){return Ms(this,e)}reload(){return Us(this)}_assign(e){this!==e&&(b(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(n=>Object.assign({},n)),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const n=new se(Object.assign(Object.assign({},this),{auth:e,stsTokenManager:this.stsTokenManager._clone()}));return n.metadata._copy(this.metadata),n}_onReload(e){b(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,n=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),n&&await yn(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(re(this.auth.app))return Promise.reject(We(this.auth));const e=await this.getIdToken();return await Lt(this,Wh(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return Object.assign(Object.assign({uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>Object.assign({},e)),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId},this.metadata.toJSON()),{apiKey:this.auth.config.apiKey,appName:this.auth.name})}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,n){var r,o,h,l,g,I,E,A;const C=(r=n.displayName)!==null&&r!==void 0?r:void 0,S=(o=n.email)!==null&&o!==void 0?o:void 0,x=(h=n.phoneNumber)!==null&&h!==void 0?h:void 0,P=(l=n.photoURL)!==null&&l!==void 0?l:void 0,j=(g=n.tenantId)!==null&&g!==void 0?g:void 0,L=(I=n._redirectEventId)!==null&&I!==void 0?I:void 0,ee=(E=n.createdAt)!==null&&E!==void 0?E:void 0,H=(A=n.lastLoginAt)!==null&&A!==void 0?A:void 0,{uid:V,emailVerified:Q,isAnonymous:Ue,providerData:Z,stsTokenManager:_}=n;b(V&&_,e,"internal-error");const u=tt.fromJSON(this.name,_);b(typeof V=="string",e,"internal-error"),Oe(C,e.name),Oe(S,e.name),b(typeof Q=="boolean",e,"internal-error"),b(typeof Ue=="boolean",e,"internal-error"),Oe(x,e.name),Oe(P,e.name),Oe(j,e.name),Oe(L,e.name),Oe(ee,e.name),Oe(H,e.name);const f=new se({uid:V,auth:e,email:S,emailVerified:Q,displayName:C,isAnonymous:Ue,photoURL:P,phoneNumber:x,tenantId:j,stsTokenManager:u,createdAt:ee,lastLoginAt:H});return Z&&Array.isArray(Z)&&(f.providerData=Z.map(p=>Object.assign({},p))),L&&(f._redirectEventId=L),f}static async _fromIdTokenResponse(e,n,r=!1){const o=new tt;o.updateFromServerResponse(n);const h=new se({uid:n.localId,auth:e,stsTokenManager:o,isAnonymous:r});return await yn(h),h}static async _fromGetAccountInfoResponse(e,n,r){const o=n.users[0];b(o.localId!==void 0,"internal-error");const h=o.providerUserInfo!==void 0?xs(o.providerUserInfo):[],l=!(o.email&&o.passwordHash)&&!(h!=null&&h.length),g=new tt;g.updateFromIdToken(r);const I=new se({uid:o.localId,auth:e,stsTokenManager:g,isAnonymous:l}),E={uid:o.localId,displayName:o.displayName||null,photoURL:o.photoUrl||null,email:o.email||null,emailVerified:o.emailVerified||!1,phoneNumber:o.phoneNumber||null,tenantId:o.tenantId||null,providerData:h,metadata:new ai(o.createdAt,o.lastLoginAt),isAnonymous:!(o.email&&o.passwordHash)&&!(h!=null&&h.length)};return Object.assign(I,E),I}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vr=new Map;function Te(i){Ae(i instanceof Function,"Expected a class definition");let e=Vr.get(i);return e?(Ae(e instanceof i,"Instance stored in cache mismatched with class"),e):(e=new i,Vr.set(i,e),e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class js{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,n){this.storage[e]=n}async _get(e){const n=this.storage[e];return n===void 0?null:n}async _remove(e){delete this.storage[e]}_addListener(e,n){}_removeListener(e,n){}}js.type="NONE";const hi=js;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dn(i,e,n){return`firebase:${i}:${e}:${n}`}class nt{constructor(e,n,r){this.persistence=e,this.auth=n,this.userKey=r;const{config:o,name:h}=this.auth;this.fullUserKey=dn(this.userKey,o.apiKey,h),this.fullPersistenceKey=dn("persistence",o.apiKey,h),this.boundEventHandler=n._onStorageEvent.bind(n),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const n=await vn(this.auth,{idToken:e}).catch(()=>{});return n?se._fromGetAccountInfoResponse(this.auth,n,e):null}return se._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const n=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,n)return this.setCurrentUser(n)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,n,r="authUser"){if(!n.length)return new nt(Te(hi),e,r);const o=(await Promise.all(n.map(async E=>{if(await E._isAvailable())return E}))).filter(E=>E);let h=o[0]||Te(hi);const l=dn(r,e.config.apiKey,e.name);let g=null;for(const E of n)try{const A=await E._get(l);if(A){let C;if(typeof A=="string"){const S=await vn(e,{idToken:A}).catch(()=>{});if(!S)break;C=await se._fromGetAccountInfoResponse(e,S,A)}else C=se._fromJSON(e,A);E!==h&&(g=C),h=E;break}}catch{}const I=o.filter(E=>E._shouldAllowMigration);return!h._shouldAllowMigration||!I.length?new nt(h,e,r):(h=I[0],g&&await h._set(l,g.toJSON()),await Promise.all(n.map(async E=>{if(E!==h)try{await E._remove(l)}catch{}})),new nt(h,e,r))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Br(i){const e=i.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Hs(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(Fs(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(Ws(e))return"Blackberry";if(zs(e))return"Webos";if(Vs(e))return"Safari";if((e.includes("chrome/")||Bs(e))&&!e.includes("edge/"))return"Chrome";if($s(e))return"Android";{const n=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=i.match(n);if((r==null?void 0:r.length)===2)return r[1]}return"Other"}function Fs(i=Y()){return/firefox\//i.test(i)}function Vs(i=Y()){const e=i.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function Bs(i=Y()){return/crios\//i.test(i)}function Hs(i=Y()){return/iemobile/i.test(i)}function $s(i=Y()){return/android/i.test(i)}function Ws(i=Y()){return/blackberry/i.test(i)}function zs(i=Y()){return/webos/i.test(i)}function wi(i=Y()){return/iphone|ipad|ipod/i.test(i)||/macintosh/i.test(i)&&/mobile/i.test(i)}function Xh(i=Y()){var e;return wi(i)&&!!(!((e=window.navigator)===null||e===void 0)&&e.standalone)}function Yh(){return Sa()&&document.documentMode===10}function Gs(i=Y()){return wi(i)||$s(i)||zs(i)||Ws(i)||/windows phone/i.test(i)||Hs(i)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qs(i,e=[]){let n;switch(i){case"Browser":n=Br(Y());break;case"Worker":n=`${Br(Y())}-${i}`;break;default:n=i}const r=e.length?e.join(","):"FirebaseCore-web";return`${n}/JsCore/${ht}/${r}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zh{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,n){const r=h=>new Promise((l,g)=>{try{const I=e(h);l(I)}catch(I){g(I)}});r.onAbort=n,this.queue.push(r);const o=this.queue.length-1;return()=>{this.queue[o]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const n=[];try{for(const r of this.queue)await r(e),r.onAbort&&n.push(r.onAbort)}catch(r){n.reverse();for(const o of n)try{o()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r==null?void 0:r.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Qh(i,e={}){return ct(i,"GET","/v2/passwordPolicy",vi(i,e))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ec=6;class tc{constructor(e){var n,r,o,h;const l=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=(n=l.minPasswordLength)!==null&&n!==void 0?n:ec,l.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=l.maxPasswordLength),l.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=l.containsLowercaseCharacter),l.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=l.containsUppercaseCharacter),l.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=l.containsNumericCharacter),l.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=l.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=(o=(r=e.allowedNonAlphanumericCharacters)===null||r===void 0?void 0:r.join(""))!==null&&o!==void 0?o:"",this.forceUpgradeOnSignin=(h=e.forceUpgradeOnSignin)!==null&&h!==void 0?h:!1,this.schemaVersion=e.schemaVersion}validatePassword(e){var n,r,o,h,l,g;const I={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,I),this.validatePasswordCharacterOptions(e,I),I.isValid&&(I.isValid=(n=I.meetsMinPasswordLength)!==null&&n!==void 0?n:!0),I.isValid&&(I.isValid=(r=I.meetsMaxPasswordLength)!==null&&r!==void 0?r:!0),I.isValid&&(I.isValid=(o=I.containsLowercaseLetter)!==null&&o!==void 0?o:!0),I.isValid&&(I.isValid=(h=I.containsUppercaseLetter)!==null&&h!==void 0?h:!0),I.isValid&&(I.isValid=(l=I.containsNumericCharacter)!==null&&l!==void 0?l:!0),I.isValid&&(I.isValid=(g=I.containsNonAlphanumericCharacter)!==null&&g!==void 0?g:!0),I}validatePasswordLengthOptions(e,n){const r=this.customStrengthOptions.minPasswordLength,o=this.customStrengthOptions.maxPasswordLength;r&&(n.meetsMinPasswordLength=e.length>=r),o&&(n.meetsMaxPasswordLength=e.length<=o)}validatePasswordCharacterOptions(e,n){this.updatePasswordCharacterOptionsStatuses(n,!1,!1,!1,!1);let r;for(let o=0;o<e.length;o++)r=e.charAt(o),this.updatePasswordCharacterOptionsStatuses(n,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,n,r,o,h){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=n)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=o)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=h))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nc{constructor(e,n,r,o){this.app=e,this.heartbeatServiceProvider=n,this.appCheckServiceProvider=r,this.config=o,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Hr(this),this.idTokenSubscription=new Hr(this),this.beforeStateQueue=new Zh(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=Os,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=o.sdkClientVersion,this._persistenceManagerAvailable=new Promise(h=>this._resolvePersistenceManagerAvailable=h)}_initializeWithPersistence(e,n){return n&&(this._popupRedirectResolver=Te(n)),this._initializationPromise=this.queue(async()=>{var r,o,h;if(!this._deleted&&(this.persistenceManager=await nt.create(this,e),(r=this._resolvePersistenceManagerAvailable)===null||r===void 0||r.call(this),!this._deleted)){if(!((o=this._popupRedirectResolver)===null||o===void 0)&&o._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(n),this.lastNotifiedUid=((h=this.currentUser)===null||h===void 0?void 0:h.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const n=await vn(this,{idToken:e}),r=await se._fromGetAccountInfoResponse(this,n,e);await this.directlySetCurrentUser(r)}catch(n){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",n),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var n;if(re(this.app)){const l=this.app.settings.authIdToken;return l?new Promise(g=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(l).then(g,g))}):this.directlySetCurrentUser(null)}const r=await this.assertedPersistence.getCurrentUser();let o=r,h=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const l=(n=this.redirectUser)===null||n===void 0?void 0:n._redirectEventId,g=o==null?void 0:o._redirectEventId,I=await this.tryRedirectSignIn(e);(!l||l===g)&&(I!=null&&I.user)&&(o=I.user,h=!0)}if(!o)return this.directlySetCurrentUser(null);if(!o._redirectEventId){if(h)try{await this.beforeStateQueue.runMiddleware(o)}catch(l){o=r,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(l))}return o?this.reloadAndSetCurrentUserOrClear(o):this.directlySetCurrentUser(null)}return b(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===o._redirectEventId?this.directlySetCurrentUser(o):this.reloadAndSetCurrentUserOrClear(o)}async tryRedirectSignIn(e){let n=null;try{n=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return n}async reloadAndSetCurrentUserOrClear(e){try{await yn(e)}catch(n){if((n==null?void 0:n.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=jh()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(re(this.app))return Promise.reject(We(this));const n=e?Me(e):null;return n&&b(n.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(n&&n._clone(this))}async _updateCurrentUser(e,n=!1){if(!this._deleted)return e&&b(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),n||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return re(this.app)?Promise.reject(We(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return re(this.app)?Promise.reject(We(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(Te(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const n=this._getPasswordPolicyInternal();return n.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):n.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await Qh(this),n=new tc(e);this.tenantId===null?this._projectPasswordPolicy=n:this._tenantPasswordPolicies[this.tenantId]=n}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new xt("auth","Firebase",e())}onAuthStateChanged(e,n,r){return this.registerStateListener(this.authStateSubscription,e,n,r)}beforeAuthStateChanged(e,n){return this.beforeStateQueue.pushCallback(e,n)}onIdTokenChanged(e,n,r){return this.registerStateListener(this.idTokenSubscription,e,n,r)}authStateReady(){return new Promise((e,n)=>{if(this.currentUser)e();else{const r=this.onAuthStateChanged(()=>{r(),e()},n)}})}async revokeAccessToken(e){if(this.currentUser){const n=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:n};this.tenantId!=null&&(r.tenantId=this.tenantId),await Jh(this,r)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)===null||e===void 0?void 0:e.toJSON()}}async _setRedirectUser(e,n){const r=await this.getOrInitRedirectPersistenceManager(n);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const n=e&&Te(e)||this._popupRedirectResolver;b(n,this,"argument-error"),this.redirectPersistenceManager=await nt.create(this,[Te(n._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var n,r;return this._isInitialized&&await this.queue(async()=>{}),((n=this._currentUser)===null||n===void 0?void 0:n._redirectEventId)===e?this._currentUser:((r=this.redirectUser)===null||r===void 0?void 0:r._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var e,n;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const r=(n=(e=this.currentUser)===null||e===void 0?void 0:e.uid)!==null&&n!==void 0?n:null;this.lastNotifiedUid!==r&&(this.lastNotifiedUid=r,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,n,r,o){if(this._deleted)return()=>{};const h=typeof n=="function"?n:n.next.bind(n);let l=!1;const g=this._isInitialized?Promise.resolve():this._initializationPromise;if(b(g,this,"internal-error"),g.then(()=>{l||h(this.currentUser)}),typeof n=="function"){const I=e.addObserver(n,r,o);return()=>{l=!0,I()}}else{const I=e.addObserver(n);return()=>{l=!0,I()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return b(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=qs(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var e;const n={"X-Client-Version":this.clientVersion};this.app.options.appId&&(n["X-Firebase-gmpid"]=this.app.options.appId);const r=await((e=this.heartbeatServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getHeartbeatsHeader());r&&(n["X-Firebase-Client"]=r);const o=await this._getAppCheckToken();return o&&(n["X-Firebase-AppCheck"]=o),n}async _getAppCheckToken(){var e;if(re(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const n=await((e=this.appCheckServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getToken());return n!=null&&n.error&&Lh(`Error while retrieving App Check token: ${n.error}`),n==null?void 0:n.token}}function Vt(i){return Me(i)}class Hr{constructor(e){this.auth=e,this.observer=null,this.addObserver=Oa(n=>this.observer=n)}get next(){return b(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let Ii={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function ic(i){Ii=i}function rc(i){return Ii.loadJS(i)}function sc(){return Ii.gapiScript}function oc(i){return`__${i}${Math.floor(Math.random()*1e6)}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ks(i,e){const n=pi(i,"auth");if(n.isInitialized()){const o=n.getImmediate(),h=n.getOptions();if(qe(h,e??{}))return o;fe(o,"already-initialized")}return n.initialize({options:e})}function ac(i,e){const n=(e==null?void 0:e.persistence)||[],r=(Array.isArray(n)?n:[n]).map(Te);e!=null&&e.errorMap&&i._updateErrorMap(e.errorMap),i._initializeWithPersistence(r,e==null?void 0:e.popupRedirectResolver)}function Js(i,e,n){const r=Vt(i);b(/^https?:\/\//.test(e),r,"invalid-emulator-scheme");const o=!1,h=Xs(e),{host:l,port:g}=hc(e),I=g===null?"":`:${g}`,E={url:`${h}//${l}${I}/`},A=Object.freeze({host:l,port:g,protocol:h.replace(":",""),options:Object.freeze({disableWarnings:o})});if(!r._canInitEmulator){b(r.config.emulator&&r.emulatorConfig,r,"emulator-config-failed"),b(qe(E,r.config.emulator)&&qe(A,r.emulatorConfig),r,"emulator-config-failed");return}r.config.emulator=E,r.emulatorConfig=A,r.settings.appVerificationDisabledForTesting=!0,Ut(l)?(Ss(`${h}//${l}${I}`),As("Auth",!0)):cc()}function Xs(i){const e=i.indexOf(":");return e<0?"":i.substr(0,e+1)}function hc(i){const e=Xs(i),n=/(\/\/)?([^?#/]+)/.exec(i.substr(e.length));if(!n)return{host:"",port:null};const r=n[2].split("@").pop()||"",o=/^(\[[^\]]+\])(:|$)/.exec(r);if(o){const h=o[1];return{host:h,port:$r(r.substr(h.length+1))}}else{const[h,l]=r.split(":");return{host:h,port:$r(l)}}}function $r(i){if(!i)return null;const e=Number(i);return isNaN(e)?null:e}function cc(){function i(){const e=document.createElement("p"),n=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",n.position="fixed",n.width="100%",n.backgroundColor="#ffffff",n.border=".1em solid #000000",n.color="#b50000",n.bottom="0px",n.left="0px",n.margin="0px",n.zIndex="10000",n.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",i):i())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ei{constructor(e,n){this.providerId=e,this.signInMethod=n}toJSON(){return Ee("not implemented")}_getIdTokenResponse(e){return Ee("not implemented")}_linkToIdToken(e,n){return Ee("not implemented")}_getReauthenticationResolver(e){return Ee("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function it(i,e){return Hh(i,"POST","/v1/accounts:signInWithIdp",vi(i,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lc="http://localhost";class Le extends Ei{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const n=new Le(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(n.idToken=e.idToken),e.accessToken&&(n.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(n.nonce=e.nonce),e.pendingToken&&(n.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(n.accessToken=e.oauthToken,n.secret=e.oauthTokenSecret):fe("argument-error"),n}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const n=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:o}=n,h=ui(n,["providerId","signInMethod"]);if(!r||!o)return null;const l=new Le(r,o);return l.idToken=h.idToken||void 0,l.accessToken=h.accessToken||void 0,l.secret=h.secret,l.nonce=h.nonce,l.pendingToken=h.pendingToken||null,l}_getIdTokenResponse(e){const n=this.buildRequest();return it(e,n)}_linkToIdToken(e,n){const r=this.buildRequest();return r.idToken=n,it(e,r)}_getReauthenticationResolver(e){const n=this.buildRequest();return n.autoCreate=!1,it(e,n)}buildRequest(){const e={requestUri:lc,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const n={};this.idToken&&(n.id_token=this.idToken),this.accessToken&&(n.access_token=this.accessToken),this.secret&&(n.oauth_token_secret=this.secret),n.providerId=this.providerId,this.nonce&&!this.pendingToken&&(n.nonce=this.nonce),e.postBody=jt(n)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ti{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bt extends Ti{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _e extends Bt{constructor(){super("facebook.com")}static credential(e){return Le._fromParams({providerId:_e.PROVIDER_ID,signInMethod:_e.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return _e.credentialFromTaggedObject(e)}static credentialFromError(e){return _e.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return _e.credential(e.oauthAccessToken)}catch{return null}}}_e.FACEBOOK_SIGN_IN_METHOD="facebook.com";_e.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ve extends Bt{constructor(){super("google.com"),this.addScope("profile")}static credential(e,n){return Le._fromParams({providerId:ve.PROVIDER_ID,signInMethod:ve.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:n})}static credentialFromResult(e){return ve.credentialFromTaggedObject(e)}static credentialFromError(e){return ve.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:n,oauthAccessToken:r}=e;if(!n&&!r)return null;try{return ve.credential(n,r)}catch{return null}}}ve.GOOGLE_SIGN_IN_METHOD="google.com";ve.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ye extends Bt{constructor(){super("github.com")}static credential(e){return Le._fromParams({providerId:ye.PROVIDER_ID,signInMethod:ye.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return ye.credentialFromTaggedObject(e)}static credentialFromError(e){return ye.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return ye.credential(e.oauthAccessToken)}catch{return null}}}ye.GITHUB_SIGN_IN_METHOD="github.com";ye.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class we extends Bt{constructor(){super("twitter.com")}static credential(e,n){return Le._fromParams({providerId:we.PROVIDER_ID,signInMethod:we.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:n})}static credentialFromResult(e){return we.credentialFromTaggedObject(e)}static credentialFromError(e){return we.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:n,oauthTokenSecret:r}=e;if(!n||!r)return null;try{return we.credential(n,r)}catch{return null}}}we.TWITTER_SIGN_IN_METHOD="twitter.com";we.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ot{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,n,r,o=!1){const h=await se._fromIdTokenResponse(e,r,o),l=Wr(r);return new ot({user:h,providerId:l,_tokenResponse:r,operationType:n})}static async _forOperation(e,n,r){await e._updateTokensIfNecessary(r,!0);const o=Wr(r);return new ot({user:e,providerId:o,_tokenResponse:r,operationType:n})}}function Wr(i){return i.providerId?i.providerId:"phoneNumber"in i?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wn extends be{constructor(e,n,r,o){var h;super(n.code,n.message),this.operationType=r,this.user=o,Object.setPrototypeOf(this,wn.prototype),this.customData={appName:e.name,tenantId:(h=e.tenantId)!==null&&h!==void 0?h:void 0,_serverResponse:n.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,n,r,o){return new wn(e,n,r,o)}}function Ys(i,e,n,r){return(e==="reauthenticate"?n._getReauthenticationResolver(i):n._getIdTokenResponse(i)).catch(h=>{throw h.code==="auth/multi-factor-auth-required"?wn._fromErrorAndOperation(i,h,e,r):h})}async function uc(i,e,n=!1){const r=await Lt(i,e._linkToIdToken(i.auth,await i.getIdToken()),n);return ot._forOperation(i,"link",r)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function dc(i,e,n=!1){const{auth:r}=i;if(re(r.app))return Promise.reject(We(r));const o="reauthenticate";try{const h=await Lt(i,Ys(r,o,e,i),n);b(h.idToken,r,"internal-error");const l=yi(h.idToken);b(l,r,"internal-error");const{sub:g}=l;return b(i.uid===g,r,"user-mismatch"),ot._forOperation(i,o,h)}catch(h){throw(h==null?void 0:h.code)==="auth/user-not-found"&&fe(r,"user-mismatch"),h}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Zs(i,e,n=!1){if(re(i.app))return Promise.reject(We(i));const r="signIn",o=await Ys(i,r,e),h=await ot._fromIdTokenResponse(i,r,o);return n||await i._updateCurrentUser(h.user),h}async function fc(i,e){return Zs(Vt(i),e)}function Qs(i,e,n,r){return Me(i).onIdTokenChanged(e,n,r)}function eo(i,e,n){return Me(i).beforeAuthStateChanged(e,n)}function pc(i,e,n,r){return Me(i).onAuthStateChanged(e,n,r)}function gc(i){return Me(i).signOut()}const In="__sak";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class to{constructor(e,n){this.storageRetriever=e,this.type=n}_isAvailable(){try{return this.storage?(this.storage.setItem(In,"1"),this.storage.removeItem(In),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,n){return this.storage.setItem(e,JSON.stringify(n)),Promise.resolve()}_get(e){const n=this.storage.getItem(e);return Promise.resolve(n?JSON.parse(n):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const mc=1e3,_c=10;class no extends to{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,n)=>this.onStorageEvent(e,n),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=Gs(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const n of Object.keys(this.listeners)){const r=this.storage.getItem(n),o=this.localCache[n];r!==o&&e(n,o,r)}}onStorageEvent(e,n=!1){if(!e.key){this.forAllChangedKeys((l,g,I)=>{this.notifyListeners(l,I)});return}const r=e.key;n?this.detachListener():this.stopPolling();const o=()=>{const l=this.storage.getItem(r);!n&&this.localCache[r]===l||this.notifyListeners(r,l)},h=this.storage.getItem(r);Yh()&&h!==e.newValue&&e.newValue!==e.oldValue?setTimeout(o,_c):o()}notifyListeners(e,n){this.localCache[e]=n;const r=this.listeners[e];if(r)for(const o of Array.from(r))o(n&&JSON.parse(n))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,n,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:n,newValue:r}),!0)})},mc)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,n){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(n)}_removeListener(e,n){this.listeners[e]&&(this.listeners[e].delete(n),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,n){await super._set(e,n),this.localCache[e]=JSON.stringify(n)}async _get(e){const n=await super._get(e);return this.localCache[e]=JSON.stringify(n),n}async _remove(e){await super._remove(e),delete this.localCache[e]}}no.type="LOCAL";const io=no;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ro extends to{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,n){}_removeListener(e,n){}}ro.type="SESSION";const Si=ro;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vc(i){return Promise.all(i.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(n){return{fulfilled:!1,reason:n}}}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sn{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const n=this.receivers.find(o=>o.isListeningto(e));if(n)return n;const r=new Sn(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const n=e,{eventId:r,eventType:o,data:h}=n.data,l=this.handlersMap[o];if(!(l!=null&&l.size))return;n.ports[0].postMessage({status:"ack",eventId:r,eventType:o});const g=Array.from(l).map(async E=>E(n.origin,h)),I=await vc(g);n.ports[0].postMessage({status:"done",eventId:r,eventType:o,response:I})}_subscribe(e,n){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(n)}_unsubscribe(e,n){this.handlersMap[e]&&n&&this.handlersMap[e].delete(n),(!n||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}Sn.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ai(i="",e=10){let n="";for(let r=0;r<e;r++)n+=Math.floor(Math.random()*10);return i+n}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yc{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,n,r=50){const o=typeof MessageChannel<"u"?new MessageChannel:null;if(!o)throw new Error("connection_unavailable");let h,l;return new Promise((g,I)=>{const E=Ai("",20);o.port1.start();const A=setTimeout(()=>{I(new Error("unsupported_event"))},r);l={messageChannel:o,onMessage(C){const S=C;if(S.data.eventId===E)switch(S.data.status){case"ack":clearTimeout(A),h=setTimeout(()=>{I(new Error("timeout"))},3e3);break;case"done":clearTimeout(h),g(S.data.response);break;default:clearTimeout(A),clearTimeout(h),I(new Error("invalid_response"));break}}},this.handlers.add(l),o.port1.addEventListener("message",l.onMessage),this.target.postMessage({eventType:e,eventId:E,data:n},[o.port2])}).finally(()=>{l&&this.removeMessageHandler(l)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function de(){return window}function wc(i){de().location.href=i}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function so(){return typeof de().WorkerGlobalScope<"u"&&typeof de().importScripts=="function"}async function Ic(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function Ec(){var i;return((i=navigator==null?void 0:navigator.serviceWorker)===null||i===void 0?void 0:i.controller)||null}function Tc(){return so()?self:null}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const oo="firebaseLocalStorageDb",Sc=1,En="firebaseLocalStorage",ao="fbase_key";class Ht{constructor(e){this.request=e}toPromise(){return new Promise((e,n)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{n(this.request.error)})})}}function An(i,e){return i.transaction([En],e?"readwrite":"readonly").objectStore(En)}function Ac(){const i=indexedDB.deleteDatabase(oo);return new Ht(i).toPromise()}function ci(){const i=indexedDB.open(oo,Sc);return new Promise((e,n)=>{i.addEventListener("error",()=>{n(i.error)}),i.addEventListener("upgradeneeded",()=>{const r=i.result;try{r.createObjectStore(En,{keyPath:ao})}catch(o){n(o)}}),i.addEventListener("success",async()=>{const r=i.result;r.objectStoreNames.contains(En)?e(r):(r.close(),await Ac(),e(await ci()))})})}async function zr(i,e,n){const r=An(i,!0).put({[ao]:e,value:n});return new Ht(r).toPromise()}async function bc(i,e){const n=An(i,!1).get(e),r=await new Ht(n).toPromise();return r===void 0?null:r.value}function Gr(i,e){const n=An(i,!0).delete(e);return new Ht(n).toPromise()}const Cc=800,Pc=3;class ho{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await ci(),this.db)}async _withRetries(e){let n=0;for(;;)try{const r=await this._openDb();return await e(r)}catch(r){if(n++>Pc)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return so()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=Sn._getInstance(Tc()),this.receiver._subscribe("keyChanged",async(e,n)=>({keyProcessed:(await this._poll()).includes(n.key)})),this.receiver._subscribe("ping",async(e,n)=>["keyChanged"])}async initializeSender(){var e,n;if(this.activeServiceWorker=await Ic(),!this.activeServiceWorker)return;this.sender=new yc(this.activeServiceWorker);const r=await this.sender._send("ping",{},800);r&&!((e=r[0])===null||e===void 0)&&e.fulfilled&&!((n=r[0])===null||n===void 0)&&n.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||Ec()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await ci();return await zr(e,In,"1"),await Gr(e,In),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,n){return this._withPendingWrite(async()=>(await this._withRetries(r=>zr(r,e,n)),this.localCache[e]=n,this.notifyServiceWorker(e)))}async _get(e){const n=await this._withRetries(r=>bc(r,e));return this.localCache[e]=n,n}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(n=>Gr(n,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(o=>{const h=An(o,!1).getAll();return new Ht(h).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const n=[],r=new Set;if(e.length!==0)for(const{fbase_key:o,value:h}of e)r.add(o),JSON.stringify(this.localCache[o])!==JSON.stringify(h)&&(this.notifyListeners(o,h),n.push(o));for(const o of Object.keys(this.localCache))this.localCache[o]&&!r.has(o)&&(this.notifyListeners(o,null),n.push(o));return n}notifyListeners(e,n){this.localCache[e]=n;const r=this.listeners[e];if(r)for(const o of Array.from(r))o(n)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),Cc)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,n){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(n)}_removeListener(e,n){this.listeners[e]&&(this.listeners[e].delete(n),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}ho.type="LOCAL";const co=ho;new Ft(3e4,6e4);/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lo(i,e){return e?Te(e):(b(i._popupRedirectResolver,i,"argument-error"),i._popupRedirectResolver)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bi extends Ei{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return it(e,this._buildIdpRequest())}_linkToIdToken(e,n){return it(e,this._buildIdpRequest(n))}_getReauthenticationResolver(e){return it(e,this._buildIdpRequest())}_buildIdpRequest(e){const n={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(n.idToken=e),n}}function Rc(i){return Zs(i.auth,new bi(i),i.bypassAuthState)}function kc(i){const{auth:e,user:n}=i;return b(n,e,"internal-error"),dc(n,new bi(i),i.bypassAuthState)}async function Oc(i){const{auth:e,user:n}=i;return b(n,e,"internal-error"),uc(n,new bi(i),i.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uo{constructor(e,n,r,o,h=!1){this.auth=e,this.resolver=r,this.user=o,this.bypassAuthState=h,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(n)?n:[n]}execute(){return new Promise(async(e,n)=>{this.pendingPromise={resolve:e,reject:n};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){const{urlResponse:n,sessionId:r,postBody:o,tenantId:h,error:l,type:g}=e;if(l){this.reject(l);return}const I={auth:this.auth,requestUri:n,sessionId:r,tenantId:h||void 0,postBody:o||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(g)(I))}catch(E){this.reject(E)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return Rc;case"linkViaPopup":case"linkViaRedirect":return Oc;case"reauthViaPopup":case"reauthViaRedirect":return kc;default:fe(this.auth,"internal-error")}}resolve(e){Ae(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){Ae(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Nc=new Ft(2e3,1e4);async function Dc(i,e,n){if(re(i.app))return Promise.reject(ae(i,"operation-not-supported-in-this-environment"));const r=Vt(i);Mh(i,e,Ti);const o=lo(r,n);return new He(r,"signInViaPopup",e,o).executeNotNull()}class He extends uo{constructor(e,n,r,o,h){super(e,n,o,h),this.provider=r,this.authWindow=null,this.pollId=null,He.currentPopupAction&&He.currentPopupAction.cancel(),He.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return b(e,this.auth,"internal-error"),e}async onExecution(){Ae(this.filter.length===1,"Popup operations only handle one event");const e=Ai();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(n=>{this.reject(n)}),this.resolver._isIframeWebStorageSupported(this.auth,n=>{n||this.reject(ae(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)===null||e===void 0?void 0:e.associatedEvent)||null}cancel(){this.reject(ae(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,He.currentPopupAction=null}pollUserCancellation(){const e=()=>{var n,r;if(!((r=(n=this.authWindow)===null||n===void 0?void 0:n.window)===null||r===void 0)&&r.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(ae(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,Nc.get())};e()}}He.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Lc="pendingRedirect",fn=new Map;class Mc extends uo{constructor(e,n,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],n,void 0,r),this.eventId=null}async execute(){let e=fn.get(this.auth._key());if(!e){try{const r=await Uc(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(n){e=()=>Promise.reject(n)}fn.set(this.auth._key(),e)}return this.bypassAuthState||fn.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const n=await this.auth._redirectUserForId(e.eventId);if(n)return this.user=n,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function Uc(i,e){const n=Fc(e),r=jc(i);if(!await r._isAvailable())return!1;const o=await r._get(n)==="true";return await r._remove(n),o}function xc(i,e){fn.set(i._key(),e)}function jc(i){return Te(i._redirectPersistence)}function Fc(i){return dn(Lc,i.config.apiKey,i.name)}async function Vc(i,e,n=!1){if(re(i.app))return Promise.reject(We(i));const r=Vt(i),o=lo(r,e),l=await new Mc(r,o,n).execute();return l&&!n&&(delete l.user._redirectEventId,await r._persistUserIfCurrent(l.user),await r._setRedirectUser(null,e)),l}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bc=600*1e3;class Hc{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let n=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(n=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!$c(e)||(this.hasHandledPotentialRedirect=!0,n||(this.queuedRedirectEvent=e,n=!0)),n}sendToConsumer(e,n){var r;if(e.error&&!fo(e)){const o=((r=e.error.code)===null||r===void 0?void 0:r.split("auth/")[1])||"internal-error";n.onError(ae(this.auth,o))}else n.onAuthEvent(e)}isEventForConsumer(e,n){const r=n.eventId===null||!!e.eventId&&e.eventId===n.eventId;return n.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=Bc&&this.cachedEventUids.clear(),this.cachedEventUids.has(qr(e))}saveEventToCache(e){this.cachedEventUids.add(qr(e)),this.lastProcessedEventTime=Date.now()}}function qr(i){return[i.type,i.eventId,i.sessionId,i.tenantId].filter(e=>e).join("-")}function fo({type:i,error:e}){return i==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function $c(i){switch(i.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return fo(i);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Wc(i,e={}){return ct(i,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zc=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,Gc=/^https?/;async function qc(i){if(i.config.emulator)return;const{authorizedDomains:e}=await Wc(i);for(const n of e)try{if(Kc(n))return}catch{}fe(i,"unauthorized-domain")}function Kc(i){const e=oi(),{protocol:n,hostname:r}=new URL(e);if(i.startsWith("chrome-extension://")){const l=new URL(i);return l.hostname===""&&r===""?n==="chrome-extension:"&&i.replace("chrome-extension://","")===e.replace("chrome-extension://",""):n==="chrome-extension:"&&l.hostname===r}if(!Gc.test(n))return!1;if(zc.test(i))return r===i;const o=i.replace(/\./g,"\\.");return new RegExp("^(.+\\."+o+"|"+o+")$","i").test(r)}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Jc=new Ft(3e4,6e4);function Kr(){const i=de().___jsl;if(i!=null&&i.H){for(const e of Object.keys(i.H))if(i.H[e].r=i.H[e].r||[],i.H[e].L=i.H[e].L||[],i.H[e].r=[...i.H[e].L],i.CP)for(let n=0;n<i.CP.length;n++)i.CP[n]=null}}function Xc(i){return new Promise((e,n)=>{var r,o,h;function l(){Kr(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{Kr(),n(ae(i,"network-request-failed"))},timeout:Jc.get()})}if(!((o=(r=de().gapi)===null||r===void 0?void 0:r.iframes)===null||o===void 0)&&o.Iframe)e(gapi.iframes.getContext());else if(!((h=de().gapi)===null||h===void 0)&&h.load)l();else{const g=oc("iframefcb");return de()[g]=()=>{gapi.load?l():n(ae(i,"network-request-failed"))},rc(`${sc()}?onload=${g}`).catch(I=>n(I))}}).catch(e=>{throw pn=null,e})}let pn=null;function Yc(i){return pn=pn||Xc(i),pn}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Zc=new Ft(5e3,15e3),Qc="__/auth/iframe",el="emulator/auth/iframe",tl={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},nl=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function il(i){const e=i.config;b(e.authDomain,i,"auth-domain-config-required");const n=e.emulator?_i(e,el):`https://${i.config.authDomain}/${Qc}`,r={apiKey:e.apiKey,appName:i.name,v:ht},o=nl.get(i.config.apiHost);o&&(r.eid=o);const h=i._getFrameworks();return h.length&&(r.fw=h.join(",")),`${n}?${jt(r).slice(1)}`}async function rl(i){const e=await Yc(i),n=de().gapi;return b(n,i,"internal-error"),e.open({where:document.body,url:il(i),messageHandlersFilter:n.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:tl,dontclear:!0},r=>new Promise(async(o,h)=>{await r.restyle({setHideOnLeave:!1});const l=ae(i,"network-request-failed"),g=de().setTimeout(()=>{h(l)},Zc.get());function I(){de().clearTimeout(g),o(r)}r.ping(I).then(I,()=>{h(l)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sl={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},ol=500,al=600,hl="_blank",cl="http://localhost";class Jr{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function ll(i,e,n,r=ol,o=al){const h=Math.max((window.screen.availHeight-o)/2,0).toString(),l=Math.max((window.screen.availWidth-r)/2,0).toString();let g="";const I=Object.assign(Object.assign({},sl),{width:r.toString(),height:o.toString(),top:h,left:l}),E=Y().toLowerCase();n&&(g=Bs(E)?hl:n),Fs(E)&&(e=e||cl,I.scrollbars="yes");const A=Object.entries(I).reduce((S,[x,P])=>`${S}${x}=${P},`,"");if(Xh(E)&&g!=="_self")return ul(e||"",g),new Jr(null);const C=window.open(e||"",g,A);b(C,i,"popup-blocked");try{C.focus()}catch{}return new Jr(C)}function ul(i,e){const n=document.createElement("a");n.href=i,n.target=e;const r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),n.dispatchEvent(r)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const dl="__/auth/handler",fl="emulator/auth/handler",pl=encodeURIComponent("fac");async function Xr(i,e,n,r,o,h){b(i.config.authDomain,i,"auth-domain-config-required"),b(i.config.apiKey,i,"invalid-api-key");const l={apiKey:i.config.apiKey,appName:i.name,authType:n,redirectUrl:r,v:ht,eventId:o};if(e instanceof Ti){e.setDefaultLanguage(i.languageCode),l.providerId=e.providerId||"",ka(e.getCustomParameters())||(l.customParameters=JSON.stringify(e.getCustomParameters()));for(const[A,C]of Object.entries({}))l[A]=C}if(e instanceof Bt){const A=e.getScopes().filter(C=>C!=="");A.length>0&&(l.scopes=A.join(","))}i.tenantId&&(l.tid=i.tenantId);const g=l;for(const A of Object.keys(g))g[A]===void 0&&delete g[A];const I=await i._getAppCheckToken(),E=I?`#${pl}=${encodeURIComponent(I)}`:"";return`${gl(i)}?${jt(g).slice(1)}${E}`}function gl({config:i}){return i.emulator?_i(i,fl):`https://${i.authDomain}/${dl}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ti="webStorageSupport";class ml{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=Si,this._completeRedirectFn=Vc,this._overrideRedirectResult=xc}async _openPopup(e,n,r,o){var h;Ae((h=this.eventManagers[e._key()])===null||h===void 0?void 0:h.manager,"_initialize() not called before _openPopup()");const l=await Xr(e,n,r,oi(),o);return ll(e,l,Ai())}async _openRedirect(e,n,r,o){await this._originValidation(e);const h=await Xr(e,n,r,oi(),o);return wc(h),new Promise(()=>{})}_initialize(e){const n=e._key();if(this.eventManagers[n]){const{manager:o,promise:h}=this.eventManagers[n];return o?Promise.resolve(o):(Ae(h,"If manager is not set, promise should be"),h)}const r=this.initAndGetManager(e);return this.eventManagers[n]={promise:r},r.catch(()=>{delete this.eventManagers[n]}),r}async initAndGetManager(e){const n=await rl(e),r=new Hc(e);return n.register("authEvent",o=>(b(o==null?void 0:o.authEvent,e,"invalid-auth-event"),{status:r.onEvent(o.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=n,r}_isIframeWebStorageSupported(e,n){this.iframes[e._key()].send(ti,{type:ti},o=>{var h;const l=(h=o==null?void 0:o[0])===null||h===void 0?void 0:h[ti];l!==void 0&&n(!!l),fe(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const n=e._key();return this.originValidationPromises[n]||(this.originValidationPromises[n]=qc(e)),this.originValidationPromises[n]}get _shouldInitProactively(){return Gs()||Vs()||wi()}}const po=ml;var Yr="@firebase/auth",Zr="1.10.8";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _l{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)===null||e===void 0?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const n=this.auth.onIdTokenChanged(r=>{e((r==null?void 0:r.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,n),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const n=this.internalListeners.get(e);n&&(this.internalListeners.delete(e),n(),this.updateProactiveRefresh())}assertAuthConfigured(){b(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function vl(i){switch(i){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function yl(i){st(new Ke("auth",(e,{options:n})=>{const r=e.getProvider("app").getImmediate(),o=e.getProvider("heartbeat"),h=e.getProvider("app-check-internal"),{apiKey:l,authDomain:g}=r.options;b(l&&!l.includes(":"),"invalid-api-key",{appName:r.name});const I={apiKey:l,authDomain:g,clientPlatform:i,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:qs(i)},E=new nc(r,o,h,I);return ac(E,n),E},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,n,r)=>{e.getProvider("auth-internal").initialize()})),st(new Ke("auth-internal",e=>{const n=Vt(e.getProvider("auth").getImmediate());return(r=>new _l(r))(n)},"PRIVATE").setInstantiationMode("EXPLICIT")),De(Yr,Zr,vl(i)),De(Yr,Zr,"esm2017")}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wl=300,Il=Ts("authIdTokenMaxAge")||wl;let Qr=null;const El=i=>async e=>{const n=e&&await e.getIdTokenResult(),r=n&&(new Date().getTime()-Date.parse(n.issuedAtTime))/1e3;if(r&&r>Il)return;const o=n==null?void 0:n.token;Qr!==o&&(Qr=o,await fetch(i,{method:o?"POST":"DELETE",headers:o?{Authorization:`Bearer ${o}`}:{}}))};function Tl(i=bs()){const e=pi(i,"auth");if(e.isInitialized())return e.getImmediate();const n=Ks(i,{popupRedirectResolver:po,persistence:[co,io,Si]}),r=Ts("authTokenSyncURL");if(r&&typeof isSecureContext=="boolean"&&isSecureContext){const h=new URL(r,location.origin);if(location.origin===h.origin){const l=El(h.toString());eo(n,l,()=>l(n.currentUser)),Qs(n,g=>l(g))}}const o=Is("auth");return o&&Js(n,`http://${o}`),n}function Sl(){var i,e;return(e=(i=document.getElementsByTagName("head"))===null||i===void 0?void 0:i[0])!==null&&e!==void 0?e:document}ic({loadJS(i){return new Promise((e,n)=>{const r=document.createElement("script");r.setAttribute("src",i),r.onload=e,r.onerror=o=>{const h=ae("internal-error");h.customData=o,n(h)},r.type="text/javascript",r.charset="UTF-8",Sl().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});yl("Browser");const ru=Object.freeze(Object.defineProperty({__proto__:null,AuthCredential:Ei,FacebookAuthProvider:_e,GithubAuthProvider:ye,GoogleAuthProvider:ve,OAuthCredential:Le,TwitterAuthProvider:we,beforeAuthStateChanged:eo,browserLocalPersistence:io,browserPopupRedirectResolver:po,browserSessionPersistence:Si,connectAuthEmulator:Js,getAuth:Tl,getIdTokenResult:Ms,inMemoryPersistence:hi,indexedDBLocalPersistence:co,initializeAuth:Ks,onAuthStateChanged:pc,onIdTokenChanged:Qs,prodErrorMap:ks,reload:Us,signInWithCredential:fc,signInWithPopup:Dc,signOut:gc},Symbol.toStringTag,{value:"Module"}));var es=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Ci;(function(){var i;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(_,u){function f(){}f.prototype=u.prototype,_.D=u.prototype,_.prototype=new f,_.prototype.constructor=_,_.C=function(p,m,y){for(var d=Array(arguments.length-2),pe=2;pe<arguments.length;pe++)d[pe-2]=arguments[pe];return u.prototype[m].apply(p,d)}}function n(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.B=Array(this.blockSize),this.o=this.h=0,this.s()}e(r,n),r.prototype.s=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function o(_,u,f){f||(f=0);var p=Array(16);if(typeof u=="string")for(var m=0;16>m;++m)p[m]=u.charCodeAt(f++)|u.charCodeAt(f++)<<8|u.charCodeAt(f++)<<16|u.charCodeAt(f++)<<24;else for(m=0;16>m;++m)p[m]=u[f++]|u[f++]<<8|u[f++]<<16|u[f++]<<24;u=_.g[0],f=_.g[1],m=_.g[2];var y=_.g[3],d=u+(y^f&(m^y))+p[0]+3614090360&4294967295;u=f+(d<<7&4294967295|d>>>25),d=y+(m^u&(f^m))+p[1]+3905402710&4294967295,y=u+(d<<12&4294967295|d>>>20),d=m+(f^y&(u^f))+p[2]+606105819&4294967295,m=y+(d<<17&4294967295|d>>>15),d=f+(u^m&(y^u))+p[3]+3250441966&4294967295,f=m+(d<<22&4294967295|d>>>10),d=u+(y^f&(m^y))+p[4]+4118548399&4294967295,u=f+(d<<7&4294967295|d>>>25),d=y+(m^u&(f^m))+p[5]+1200080426&4294967295,y=u+(d<<12&4294967295|d>>>20),d=m+(f^y&(u^f))+p[6]+2821735955&4294967295,m=y+(d<<17&4294967295|d>>>15),d=f+(u^m&(y^u))+p[7]+4249261313&4294967295,f=m+(d<<22&4294967295|d>>>10),d=u+(y^f&(m^y))+p[8]+1770035416&4294967295,u=f+(d<<7&4294967295|d>>>25),d=y+(m^u&(f^m))+p[9]+2336552879&4294967295,y=u+(d<<12&4294967295|d>>>20),d=m+(f^y&(u^f))+p[10]+4294925233&4294967295,m=y+(d<<17&4294967295|d>>>15),d=f+(u^m&(y^u))+p[11]+2304563134&4294967295,f=m+(d<<22&4294967295|d>>>10),d=u+(y^f&(m^y))+p[12]+1804603682&4294967295,u=f+(d<<7&4294967295|d>>>25),d=y+(m^u&(f^m))+p[13]+4254626195&4294967295,y=u+(d<<12&4294967295|d>>>20),d=m+(f^y&(u^f))+p[14]+2792965006&4294967295,m=y+(d<<17&4294967295|d>>>15),d=f+(u^m&(y^u))+p[15]+1236535329&4294967295,f=m+(d<<22&4294967295|d>>>10),d=u+(m^y&(f^m))+p[1]+4129170786&4294967295,u=f+(d<<5&4294967295|d>>>27),d=y+(f^m&(u^f))+p[6]+3225465664&4294967295,y=u+(d<<9&4294967295|d>>>23),d=m+(u^f&(y^u))+p[11]+643717713&4294967295,m=y+(d<<14&4294967295|d>>>18),d=f+(y^u&(m^y))+p[0]+3921069994&4294967295,f=m+(d<<20&4294967295|d>>>12),d=u+(m^y&(f^m))+p[5]+3593408605&4294967295,u=f+(d<<5&4294967295|d>>>27),d=y+(f^m&(u^f))+p[10]+38016083&4294967295,y=u+(d<<9&4294967295|d>>>23),d=m+(u^f&(y^u))+p[15]+3634488961&4294967295,m=y+(d<<14&4294967295|d>>>18),d=f+(y^u&(m^y))+p[4]+3889429448&4294967295,f=m+(d<<20&4294967295|d>>>12),d=u+(m^y&(f^m))+p[9]+568446438&4294967295,u=f+(d<<5&4294967295|d>>>27),d=y+(f^m&(u^f))+p[14]+3275163606&4294967295,y=u+(d<<9&4294967295|d>>>23),d=m+(u^f&(y^u))+p[3]+4107603335&4294967295,m=y+(d<<14&4294967295|d>>>18),d=f+(y^u&(m^y))+p[8]+1163531501&4294967295,f=m+(d<<20&4294967295|d>>>12),d=u+(m^y&(f^m))+p[13]+2850285829&4294967295,u=f+(d<<5&4294967295|d>>>27),d=y+(f^m&(u^f))+p[2]+4243563512&4294967295,y=u+(d<<9&4294967295|d>>>23),d=m+(u^f&(y^u))+p[7]+1735328473&4294967295,m=y+(d<<14&4294967295|d>>>18),d=f+(y^u&(m^y))+p[12]+2368359562&4294967295,f=m+(d<<20&4294967295|d>>>12),d=u+(f^m^y)+p[5]+4294588738&4294967295,u=f+(d<<4&4294967295|d>>>28),d=y+(u^f^m)+p[8]+2272392833&4294967295,y=u+(d<<11&4294967295|d>>>21),d=m+(y^u^f)+p[11]+1839030562&4294967295,m=y+(d<<16&4294967295|d>>>16),d=f+(m^y^u)+p[14]+4259657740&4294967295,f=m+(d<<23&4294967295|d>>>9),d=u+(f^m^y)+p[1]+2763975236&4294967295,u=f+(d<<4&4294967295|d>>>28),d=y+(u^f^m)+p[4]+1272893353&4294967295,y=u+(d<<11&4294967295|d>>>21),d=m+(y^u^f)+p[7]+4139469664&4294967295,m=y+(d<<16&4294967295|d>>>16),d=f+(m^y^u)+p[10]+3200236656&4294967295,f=m+(d<<23&4294967295|d>>>9),d=u+(f^m^y)+p[13]+681279174&4294967295,u=f+(d<<4&4294967295|d>>>28),d=y+(u^f^m)+p[0]+3936430074&4294967295,y=u+(d<<11&4294967295|d>>>21),d=m+(y^u^f)+p[3]+3572445317&4294967295,m=y+(d<<16&4294967295|d>>>16),d=f+(m^y^u)+p[6]+76029189&4294967295,f=m+(d<<23&4294967295|d>>>9),d=u+(f^m^y)+p[9]+3654602809&4294967295,u=f+(d<<4&4294967295|d>>>28),d=y+(u^f^m)+p[12]+3873151461&4294967295,y=u+(d<<11&4294967295|d>>>21),d=m+(y^u^f)+p[15]+530742520&4294967295,m=y+(d<<16&4294967295|d>>>16),d=f+(m^y^u)+p[2]+3299628645&4294967295,f=m+(d<<23&4294967295|d>>>9),d=u+(m^(f|~y))+p[0]+4096336452&4294967295,u=f+(d<<6&4294967295|d>>>26),d=y+(f^(u|~m))+p[7]+1126891415&4294967295,y=u+(d<<10&4294967295|d>>>22),d=m+(u^(y|~f))+p[14]+2878612391&4294967295,m=y+(d<<15&4294967295|d>>>17),d=f+(y^(m|~u))+p[5]+4237533241&4294967295,f=m+(d<<21&4294967295|d>>>11),d=u+(m^(f|~y))+p[12]+1700485571&4294967295,u=f+(d<<6&4294967295|d>>>26),d=y+(f^(u|~m))+p[3]+2399980690&4294967295,y=u+(d<<10&4294967295|d>>>22),d=m+(u^(y|~f))+p[10]+4293915773&4294967295,m=y+(d<<15&4294967295|d>>>17),d=f+(y^(m|~u))+p[1]+2240044497&4294967295,f=m+(d<<21&4294967295|d>>>11),d=u+(m^(f|~y))+p[8]+1873313359&4294967295,u=f+(d<<6&4294967295|d>>>26),d=y+(f^(u|~m))+p[15]+4264355552&4294967295,y=u+(d<<10&4294967295|d>>>22),d=m+(u^(y|~f))+p[6]+2734768916&4294967295,m=y+(d<<15&4294967295|d>>>17),d=f+(y^(m|~u))+p[13]+1309151649&4294967295,f=m+(d<<21&4294967295|d>>>11),d=u+(m^(f|~y))+p[4]+4149444226&4294967295,u=f+(d<<6&4294967295|d>>>26),d=y+(f^(u|~m))+p[11]+3174756917&4294967295,y=u+(d<<10&4294967295|d>>>22),d=m+(u^(y|~f))+p[2]+718787259&4294967295,m=y+(d<<15&4294967295|d>>>17),d=f+(y^(m|~u))+p[9]+3951481745&4294967295,_.g[0]=_.g[0]+u&4294967295,_.g[1]=_.g[1]+(m+(d<<21&4294967295|d>>>11))&4294967295,_.g[2]=_.g[2]+m&4294967295,_.g[3]=_.g[3]+y&4294967295}r.prototype.u=function(_,u){u===void 0&&(u=_.length);for(var f=u-this.blockSize,p=this.B,m=this.h,y=0;y<u;){if(m==0)for(;y<=f;)o(this,_,y),y+=this.blockSize;if(typeof _=="string"){for(;y<u;)if(p[m++]=_.charCodeAt(y++),m==this.blockSize){o(this,p),m=0;break}}else for(;y<u;)if(p[m++]=_[y++],m==this.blockSize){o(this,p),m=0;break}}this.h=m,this.o+=u},r.prototype.v=function(){var _=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);_[0]=128;for(var u=1;u<_.length-8;++u)_[u]=0;var f=8*this.o;for(u=_.length-8;u<_.length;++u)_[u]=f&255,f/=256;for(this.u(_),_=Array(16),u=f=0;4>u;++u)for(var p=0;32>p;p+=8)_[f++]=this.g[u]>>>p&255;return _};function h(_,u){var f=g;return Object.prototype.hasOwnProperty.call(f,_)?f[_]:f[_]=u(_)}function l(_,u){this.h=u;for(var f=[],p=!0,m=_.length-1;0<=m;m--){var y=_[m]|0;p&&y==u||(f[m]=y,p=!1)}this.g=f}var g={};function I(_){return-128<=_&&128>_?h(_,function(u){return new l([u|0],0>u?-1:0)}):new l([_|0],0>_?-1:0)}function E(_){if(isNaN(_)||!isFinite(_))return C;if(0>_)return L(E(-_));for(var u=[],f=1,p=0;_>=f;p++)u[p]=_/f|0,f*=4294967296;return new l(u,0)}function A(_,u){if(_.length==0)throw Error("number format error: empty string");if(u=u||10,2>u||36<u)throw Error("radix out of range: "+u);if(_.charAt(0)=="-")return L(A(_.substring(1),u));if(0<=_.indexOf("-"))throw Error('number format error: interior "-" character');for(var f=E(Math.pow(u,8)),p=C,m=0;m<_.length;m+=8){var y=Math.min(8,_.length-m),d=parseInt(_.substring(m,m+y),u);8>y?(y=E(Math.pow(u,y)),p=p.j(y).add(E(d))):(p=p.j(f),p=p.add(E(d)))}return p}var C=I(0),S=I(1),x=I(16777216);i=l.prototype,i.m=function(){if(j(this))return-L(this).m();for(var _=0,u=1,f=0;f<this.g.length;f++){var p=this.i(f);_+=(0<=p?p:4294967296+p)*u,u*=4294967296}return _},i.toString=function(_){if(_=_||10,2>_||36<_)throw Error("radix out of range: "+_);if(P(this))return"0";if(j(this))return"-"+L(this).toString(_);for(var u=E(Math.pow(_,6)),f=this,p="";;){var m=Q(f,u).g;f=ee(f,m.j(u));var y=((0<f.g.length?f.g[0]:f.h)>>>0).toString(_);if(f=m,P(f))return y+p;for(;6>y.length;)y="0"+y;p=y+p}},i.i=function(_){return 0>_?0:_<this.g.length?this.g[_]:this.h};function P(_){if(_.h!=0)return!1;for(var u=0;u<_.g.length;u++)if(_.g[u]!=0)return!1;return!0}function j(_){return _.h==-1}i.l=function(_){return _=ee(this,_),j(_)?-1:P(_)?0:1};function L(_){for(var u=_.g.length,f=[],p=0;p<u;p++)f[p]=~_.g[p];return new l(f,~_.h).add(S)}i.abs=function(){return j(this)?L(this):this},i.add=function(_){for(var u=Math.max(this.g.length,_.g.length),f=[],p=0,m=0;m<=u;m++){var y=p+(this.i(m)&65535)+(_.i(m)&65535),d=(y>>>16)+(this.i(m)>>>16)+(_.i(m)>>>16);p=d>>>16,y&=65535,d&=65535,f[m]=d<<16|y}return new l(f,f[f.length-1]&-2147483648?-1:0)};function ee(_,u){return _.add(L(u))}i.j=function(_){if(P(this)||P(_))return C;if(j(this))return j(_)?L(this).j(L(_)):L(L(this).j(_));if(j(_))return L(this.j(L(_)));if(0>this.l(x)&&0>_.l(x))return E(this.m()*_.m());for(var u=this.g.length+_.g.length,f=[],p=0;p<2*u;p++)f[p]=0;for(p=0;p<this.g.length;p++)for(var m=0;m<_.g.length;m++){var y=this.i(p)>>>16,d=this.i(p)&65535,pe=_.i(m)>>>16,lt=_.i(m)&65535;f[2*p+2*m]+=d*lt,H(f,2*p+2*m),f[2*p+2*m+1]+=y*lt,H(f,2*p+2*m+1),f[2*p+2*m+1]+=d*pe,H(f,2*p+2*m+1),f[2*p+2*m+2]+=y*pe,H(f,2*p+2*m+2)}for(p=0;p<u;p++)f[p]=f[2*p+1]<<16|f[2*p];for(p=u;p<2*u;p++)f[p]=0;return new l(f,0)};function H(_,u){for(;(_[u]&65535)!=_[u];)_[u+1]+=_[u]>>>16,_[u]&=65535,u++}function V(_,u){this.g=_,this.h=u}function Q(_,u){if(P(u))throw Error("division by zero");if(P(_))return new V(C,C);if(j(_))return u=Q(L(_),u),new V(L(u.g),L(u.h));if(j(u))return u=Q(_,L(u)),new V(L(u.g),u.h);if(30<_.g.length){if(j(_)||j(u))throw Error("slowDivide_ only works with positive integers.");for(var f=S,p=u;0>=p.l(_);)f=Ue(f),p=Ue(p);var m=Z(f,1),y=Z(p,1);for(p=Z(p,2),f=Z(f,2);!P(p);){var d=y.add(p);0>=d.l(_)&&(m=m.add(f),y=d),p=Z(p,1),f=Z(f,1)}return u=ee(_,m.j(u)),new V(m,u)}for(m=C;0<=_.l(u);){for(f=Math.max(1,Math.floor(_.m()/u.m())),p=Math.ceil(Math.log(f)/Math.LN2),p=48>=p?1:Math.pow(2,p-48),y=E(f),d=y.j(u);j(d)||0<d.l(_);)f-=p,y=E(f),d=y.j(u);P(y)&&(y=S),m=m.add(y),_=ee(_,d)}return new V(m,_)}i.A=function(_){return Q(this,_).h},i.and=function(_){for(var u=Math.max(this.g.length,_.g.length),f=[],p=0;p<u;p++)f[p]=this.i(p)&_.i(p);return new l(f,this.h&_.h)},i.or=function(_){for(var u=Math.max(this.g.length,_.g.length),f=[],p=0;p<u;p++)f[p]=this.i(p)|_.i(p);return new l(f,this.h|_.h)},i.xor=function(_){for(var u=Math.max(this.g.length,_.g.length),f=[],p=0;p<u;p++)f[p]=this.i(p)^_.i(p);return new l(f,this.h^_.h)};function Ue(_){for(var u=_.g.length+1,f=[],p=0;p<u;p++)f[p]=_.i(p)<<1|_.i(p-1)>>>31;return new l(f,_.h)}function Z(_,u){var f=u>>5;u%=32;for(var p=_.g.length-f,m=[],y=0;y<p;y++)m[y]=0<u?_.i(y+f)>>>u|_.i(y+f+1)<<32-u:_.i(y+f);return new l(m,_.h)}r.prototype.digest=r.prototype.v,r.prototype.reset=r.prototype.s,r.prototype.update=r.prototype.u,l.prototype.add=l.prototype.add,l.prototype.multiply=l.prototype.j,l.prototype.modulo=l.prototype.A,l.prototype.compare=l.prototype.l,l.prototype.toNumber=l.prototype.m,l.prototype.toString=l.prototype.toString,l.prototype.getBits=l.prototype.i,l.fromNumber=E,l.fromString=A,Ci=l}).apply(typeof es<"u"?es:typeof self<"u"?self:typeof window<"u"?window:{});var cn=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};(function(){var i,e=typeof Object.defineProperties=="function"?Object.defineProperty:function(t,s,a){return t==Array.prototype||t==Object.prototype||(t[s]=a.value),t};function n(t){t=[typeof globalThis=="object"&&globalThis,t,typeof window=="object"&&window,typeof self=="object"&&self,typeof cn=="object"&&cn];for(var s=0;s<t.length;++s){var a=t[s];if(a&&a.Math==Math)return a}throw Error("Cannot find global object")}var r=n(this);function o(t,s){if(s)e:{var a=r;t=t.split(".");for(var c=0;c<t.length-1;c++){var v=t[c];if(!(v in a))break e;a=a[v]}t=t[t.length-1],c=a[t],s=s(c),s!=c&&s!=null&&e(a,t,{configurable:!0,writable:!0,value:s})}}function h(t,s){t instanceof String&&(t+="");var a=0,c=!1,v={next:function(){if(!c&&a<t.length){var w=a++;return{value:s(w,t[w]),done:!1}}return c=!0,{done:!0,value:void 0}}};return v[Symbol.iterator]=function(){return v},v}o("Array.prototype.values",function(t){return t||function(){return h(this,function(s,a){return a})}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var l=l||{},g=this||self;function I(t){var s=typeof t;return s=s!="object"?s:t?Array.isArray(t)?"array":s:"null",s=="array"||s=="object"&&typeof t.length=="number"}function E(t){var s=typeof t;return s=="object"&&t!=null||s=="function"}function A(t,s,a){return t.call.apply(t.bind,arguments)}function C(t,s,a){if(!t)throw Error();if(2<arguments.length){var c=Array.prototype.slice.call(arguments,2);return function(){var v=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(v,c),t.apply(s,v)}}return function(){return t.apply(s,arguments)}}function S(t,s,a){return S=Function.prototype.bind&&Function.prototype.bind.toString().indexOf("native code")!=-1?A:C,S.apply(null,arguments)}function x(t,s){var a=Array.prototype.slice.call(arguments,1);return function(){var c=a.slice();return c.push.apply(c,arguments),t.apply(this,c)}}function P(t,s){function a(){}a.prototype=s.prototype,t.aa=s.prototype,t.prototype=new a,t.prototype.constructor=t,t.Qb=function(c,v,w){for(var T=Array(arguments.length-2),M=2;M<arguments.length;M++)T[M-2]=arguments[M];return s.prototype[v].apply(c,T)}}function j(t){const s=t.length;if(0<s){const a=Array(s);for(let c=0;c<s;c++)a[c]=t[c];return a}return[]}function L(t,s){for(let a=1;a<arguments.length;a++){const c=arguments[a];if(I(c)){const v=t.length||0,w=c.length||0;t.length=v+w;for(let T=0;T<w;T++)t[v+T]=c[T]}else t.push(c)}}class ee{constructor(s,a){this.i=s,this.j=a,this.h=0,this.g=null}get(){let s;return 0<this.h?(this.h--,s=this.g,this.g=s.next,s.next=null):s=this.i(),s}}function H(t){return/^[\s\xa0]*$/.test(t)}function V(){var t=g.navigator;return t&&(t=t.userAgent)?t:""}function Q(t){return Q[" "](t),t}Q[" "]=function(){};var Ue=V().indexOf("Gecko")!=-1&&!(V().toLowerCase().indexOf("webkit")!=-1&&V().indexOf("Edge")==-1)&&!(V().indexOf("Trident")!=-1||V().indexOf("MSIE")!=-1)&&V().indexOf("Edge")==-1;function Z(t,s,a){for(const c in t)s.call(a,t[c],c,t)}function _(t,s){for(const a in t)s.call(void 0,t[a],a,t)}function u(t){const s={};for(const a in t)s[a]=t[a];return s}const f="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function p(t,s){let a,c;for(let v=1;v<arguments.length;v++){c=arguments[v];for(a in c)t[a]=c[a];for(let w=0;w<f.length;w++)a=f[w],Object.prototype.hasOwnProperty.call(c,a)&&(t[a]=c[a])}}function m(t){var s=1;t=t.split(":");const a=[];for(;0<s&&t.length;)a.push(t.shift()),s--;return t.length&&a.push(t.join(":")),a}function y(t){g.setTimeout(()=>{throw t},0)}function d(){var t=bn;let s=null;return t.g&&(s=t.g,t.g=t.g.next,t.g||(t.h=null),s.next=null),s}class pe{constructor(){this.h=this.g=null}add(s,a){const c=lt.get();c.set(s,a),this.h?this.h.next=c:this.g=c,this.h=c}}var lt=new ee(()=>new To,t=>t.reset());class To{constructor(){this.next=this.g=this.h=null}set(s,a){this.h=s,this.g=a,this.next=null}reset(){this.next=this.g=this.h=null}}let ut,dt=!1,bn=new pe,Ni=()=>{const t=g.Promise.resolve(void 0);ut=()=>{t.then(So)}};var So=()=>{for(var t;t=d();){try{t.h.call(t.g)}catch(a){y(a)}var s=lt;s.j(t),100>s.h&&(s.h++,t.next=s.g,s.g=t)}dt=!1};function Ce(){this.s=this.s,this.C=this.C}Ce.prototype.s=!1,Ce.prototype.ma=function(){this.s||(this.s=!0,this.N())},Ce.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function W(t,s){this.type=t,this.g=this.target=s,this.defaultPrevented=!1}W.prototype.h=function(){this.defaultPrevented=!0};var Ao=(function(){if(!g.addEventListener||!Object.defineProperty)return!1;var t=!1,s=Object.defineProperty({},"passive",{get:function(){t=!0}});try{const a=()=>{};g.addEventListener("test",a,s),g.removeEventListener("test",a,s)}catch{}return t})();function ft(t,s){if(W.call(this,t?t.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,t){var a=this.type=t.type,c=t.changedTouches&&t.changedTouches.length?t.changedTouches[0]:null;if(this.target=t.target||t.srcElement,this.g=s,s=t.relatedTarget){if(Ue){e:{try{Q(s.nodeName);var v=!0;break e}catch{}v=!1}v||(s=null)}}else a=="mouseover"?s=t.fromElement:a=="mouseout"&&(s=t.toElement);this.relatedTarget=s,c?(this.clientX=c.clientX!==void 0?c.clientX:c.pageX,this.clientY=c.clientY!==void 0?c.clientY:c.pageY,this.screenX=c.screenX||0,this.screenY=c.screenY||0):(this.clientX=t.clientX!==void 0?t.clientX:t.pageX,this.clientY=t.clientY!==void 0?t.clientY:t.pageY,this.screenX=t.screenX||0,this.screenY=t.screenY||0),this.button=t.button,this.key=t.key||"",this.ctrlKey=t.ctrlKey,this.altKey=t.altKey,this.shiftKey=t.shiftKey,this.metaKey=t.metaKey,this.pointerId=t.pointerId||0,this.pointerType=typeof t.pointerType=="string"?t.pointerType:bo[t.pointerType]||"",this.state=t.state,this.i=t,t.defaultPrevented&&ft.aa.h.call(this)}}P(ft,W);var bo={2:"touch",3:"pen",4:"mouse"};ft.prototype.h=function(){ft.aa.h.call(this);var t=this.i;t.preventDefault?t.preventDefault():t.returnValue=!1};var zt="closure_listenable_"+(1e6*Math.random()|0),Co=0;function Po(t,s,a,c,v){this.listener=t,this.proxy=null,this.src=s,this.type=a,this.capture=!!c,this.ha=v,this.key=++Co,this.da=this.fa=!1}function Gt(t){t.da=!0,t.listener=null,t.proxy=null,t.src=null,t.ha=null}function qt(t){this.src=t,this.g={},this.h=0}qt.prototype.add=function(t,s,a,c,v){var w=t.toString();t=this.g[w],t||(t=this.g[w]=[],this.h++);var T=Pn(t,s,c,v);return-1<T?(s=t[T],a||(s.fa=!1)):(s=new Po(s,this.src,w,!!c,v),s.fa=a,t.push(s)),s};function Cn(t,s){var a=s.type;if(a in t.g){var c=t.g[a],v=Array.prototype.indexOf.call(c,s,void 0),w;(w=0<=v)&&Array.prototype.splice.call(c,v,1),w&&(Gt(s),t.g[a].length==0&&(delete t.g[a],t.h--))}}function Pn(t,s,a,c){for(var v=0;v<t.length;++v){var w=t[v];if(!w.da&&w.listener==s&&w.capture==!!a&&w.ha==c)return v}return-1}var Rn="closure_lm_"+(1e6*Math.random()|0),kn={};function Di(t,s,a,c,v){if(Array.isArray(s)){for(var w=0;w<s.length;w++)Di(t,s[w],a,c,v);return null}return a=Ui(a),t&&t[zt]?t.K(s,a,E(c)?!!c.capture:!1,v):Ro(t,s,a,!1,c,v)}function Ro(t,s,a,c,v,w){if(!s)throw Error("Invalid event type");var T=E(v)?!!v.capture:!!v,M=Nn(t);if(M||(t[Rn]=M=new qt(t)),a=M.add(s,a,c,T,w),a.proxy)return a;if(c=ko(),a.proxy=c,c.src=t,c.listener=a,t.addEventListener)Ao||(v=T),v===void 0&&(v=!1),t.addEventListener(s.toString(),c,v);else if(t.attachEvent)t.attachEvent(Mi(s.toString()),c);else if(t.addListener&&t.removeListener)t.addListener(c);else throw Error("addEventListener and attachEvent are unavailable.");return a}function ko(){function t(a){return s.call(t.src,t.listener,a)}const s=Oo;return t}function Li(t,s,a,c,v){if(Array.isArray(s))for(var w=0;w<s.length;w++)Li(t,s[w],a,c,v);else c=E(c)?!!c.capture:!!c,a=Ui(a),t&&t[zt]?(t=t.i,s=String(s).toString(),s in t.g&&(w=t.g[s],a=Pn(w,a,c,v),-1<a&&(Gt(w[a]),Array.prototype.splice.call(w,a,1),w.length==0&&(delete t.g[s],t.h--)))):t&&(t=Nn(t))&&(s=t.g[s.toString()],t=-1,s&&(t=Pn(s,a,c,v)),(a=-1<t?s[t]:null)&&On(a))}function On(t){if(typeof t!="number"&&t&&!t.da){var s=t.src;if(s&&s[zt])Cn(s.i,t);else{var a=t.type,c=t.proxy;s.removeEventListener?s.removeEventListener(a,c,t.capture):s.detachEvent?s.detachEvent(Mi(a),c):s.addListener&&s.removeListener&&s.removeListener(c),(a=Nn(s))?(Cn(a,t),a.h==0&&(a.src=null,s[Rn]=null)):Gt(t)}}}function Mi(t){return t in kn?kn[t]:kn[t]="on"+t}function Oo(t,s){if(t.da)t=!0;else{s=new ft(s,this);var a=t.listener,c=t.ha||t.src;t.fa&&On(t),t=a.call(c,s)}return t}function Nn(t){return t=t[Rn],t instanceof qt?t:null}var Dn="__closure_events_fn_"+(1e9*Math.random()>>>0);function Ui(t){return typeof t=="function"?t:(t[Dn]||(t[Dn]=function(s){return t.handleEvent(s)}),t[Dn])}function z(){Ce.call(this),this.i=new qt(this),this.M=this,this.F=null}P(z,Ce),z.prototype[zt]=!0,z.prototype.removeEventListener=function(t,s,a,c){Li(this,t,s,a,c)};function K(t,s){var a,c=t.F;if(c)for(a=[];c;c=c.F)a.push(c);if(t=t.M,c=s.type||s,typeof s=="string")s=new W(s,t);else if(s instanceof W)s.target=s.target||t;else{var v=s;s=new W(c,t),p(s,v)}if(v=!0,a)for(var w=a.length-1;0<=w;w--){var T=s.g=a[w];v=Kt(T,c,!0,s)&&v}if(T=s.g=t,v=Kt(T,c,!0,s)&&v,v=Kt(T,c,!1,s)&&v,a)for(w=0;w<a.length;w++)T=s.g=a[w],v=Kt(T,c,!1,s)&&v}z.prototype.N=function(){if(z.aa.N.call(this),this.i){var t=this.i,s;for(s in t.g){for(var a=t.g[s],c=0;c<a.length;c++)Gt(a[c]);delete t.g[s],t.h--}}this.F=null},z.prototype.K=function(t,s,a,c){return this.i.add(String(t),s,!1,a,c)},z.prototype.L=function(t,s,a,c){return this.i.add(String(t),s,!0,a,c)};function Kt(t,s,a,c){if(s=t.i.g[String(s)],!s)return!0;s=s.concat();for(var v=!0,w=0;w<s.length;++w){var T=s[w];if(T&&!T.da&&T.capture==a){var M=T.listener,$=T.ha||T.src;T.fa&&Cn(t.i,T),v=M.call($,c)!==!1&&v}}return v&&!c.defaultPrevented}function xi(t,s,a){if(typeof t=="function")a&&(t=S(t,a));else if(t&&typeof t.handleEvent=="function")t=S(t.handleEvent,t);else throw Error("Invalid listener argument");return 2147483647<Number(s)?-1:g.setTimeout(t,s||0)}function ji(t){t.g=xi(()=>{t.g=null,t.i&&(t.i=!1,ji(t))},t.l);const s=t.h;t.h=null,t.m.apply(null,s)}class No extends Ce{constructor(s,a){super(),this.m=s,this.l=a,this.h=null,this.i=!1,this.g=null}j(s){this.h=arguments,this.g?this.i=!0:ji(this)}N(){super.N(),this.g&&(g.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function pt(t){Ce.call(this),this.h=t,this.g={}}P(pt,Ce);var Fi=[];function Vi(t){Z(t.g,function(s,a){this.g.hasOwnProperty(a)&&On(s)},t),t.g={}}pt.prototype.N=function(){pt.aa.N.call(this),Vi(this)},pt.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Ln=g.JSON.stringify,Do=g.JSON.parse,Lo=class{stringify(t){return g.JSON.stringify(t,void 0)}parse(t){return g.JSON.parse(t,void 0)}};function Mn(){}Mn.prototype.h=null;function Bi(t){return t.h||(t.h=t.i())}function Mo(){}var gt={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function Un(){W.call(this,"d")}P(Un,W);function xn(){W.call(this,"c")}P(xn,W);var Xe={},Hi=null;function jn(){return Hi=Hi||new z}Xe.La="serverreachability";function $i(t){W.call(this,Xe.La,t)}P($i,W);function mt(t){const s=jn();K(s,new $i(s))}Xe.STAT_EVENT="statevent";function Wi(t,s){W.call(this,Xe.STAT_EVENT,t),this.stat=s}P(Wi,W);function J(t){const s=jn();K(s,new Wi(s,t))}Xe.Ma="timingevent";function zi(t,s){W.call(this,Xe.Ma,t),this.size=s}P(zi,W);function _t(t,s){if(typeof t!="function")throw Error("Fn must not be null and must be a function");return g.setTimeout(function(){t()},s)}function vt(){this.g=!0}vt.prototype.xa=function(){this.g=!1};function Uo(t,s,a,c,v,w){t.info(function(){if(t.g)if(w)for(var T="",M=w.split("&"),$=0;$<M.length;$++){var N=M[$].split("=");if(1<N.length){var G=N[0];N=N[1];var q=G.split("_");T=2<=q.length&&q[1]=="type"?T+(G+"="+N+"&"):T+(G+"=redacted&")}}else T=null;else T=w;return"XMLHTTP REQ ("+c+") [attempt "+v+"]: "+s+`
`+a+`
`+T})}function xo(t,s,a,c,v,w,T){t.info(function(){return"XMLHTTP RESP ("+c+") [ attempt "+v+"]: "+s+`
`+a+`
`+w+" "+T})}function Ye(t,s,a,c){t.info(function(){return"XMLHTTP TEXT ("+s+"): "+Fo(t,a)+(c?" "+c:"")})}function jo(t,s){t.info(function(){return"TIMEOUT: "+s})}vt.prototype.info=function(){};function Fo(t,s){if(!t.g)return s;if(!s)return null;try{var a=JSON.parse(s);if(a){for(t=0;t<a.length;t++)if(Array.isArray(a[t])){var c=a[t];if(!(2>c.length)){var v=c[1];if(Array.isArray(v)&&!(1>v.length)){var w=v[0];if(w!="noop"&&w!="stop"&&w!="close")for(var T=1;T<v.length;T++)v[T]=""}}}}return Ln(a)}catch{return s}}var Fn={NO_ERROR:0,TIMEOUT:8},Vo={},Vn;function Jt(){}P(Jt,Mn),Jt.prototype.g=function(){return new XMLHttpRequest},Jt.prototype.i=function(){return{}},Vn=new Jt;function Pe(t,s,a,c){this.j=t,this.i=s,this.l=a,this.R=c||1,this.U=new pt(this),this.I=45e3,this.H=null,this.o=!1,this.m=this.A=this.v=this.L=this.F=this.S=this.B=null,this.D=[],this.g=null,this.C=0,this.s=this.u=null,this.X=-1,this.J=!1,this.O=0,this.M=null,this.W=this.K=this.T=this.P=!1,this.h=new Gi}function Gi(){this.i=null,this.g="",this.h=!1}var qi={},Bn={};function Hn(t,s,a){t.L=1,t.v=Qt(ge(s)),t.m=a,t.P=!0,Ki(t,null)}function Ki(t,s){t.F=Date.now(),Xt(t),t.A=ge(t.v);var a=t.A,c=t.R;Array.isArray(c)||(c=[String(c)]),hr(a.i,"t",c),t.C=0,a=t.j.J,t.h=new Gi,t.g=br(t.j,a?s:null,!t.m),0<t.O&&(t.M=new No(S(t.Y,t,t.g),t.O)),s=t.U,a=t.g,c=t.ca;var v="readystatechange";Array.isArray(v)||(v&&(Fi[0]=v.toString()),v=Fi);for(var w=0;w<v.length;w++){var T=Di(a,v[w],c||s.handleEvent,!1,s.h||s);if(!T)break;s.g[T.key]=T}s=t.H?u(t.H):{},t.m?(t.u||(t.u="POST"),s["Content-Type"]="application/x-www-form-urlencoded",t.g.ea(t.A,t.u,t.m,s)):(t.u="GET",t.g.ea(t.A,t.u,null,s)),mt(),Uo(t.i,t.u,t.A,t.l,t.R,t.m)}Pe.prototype.ca=function(t){t=t.target;const s=this.M;s&&me(t)==3?s.j():this.Y(t)},Pe.prototype.Y=function(t){try{if(t==this.g)e:{const q=me(this.g);var s=this.g.Ba();const et=this.g.Z();if(!(3>q)&&(q!=3||this.g&&(this.h.h||this.g.oa()||gr(this.g)))){this.J||q!=4||s==7||(s==8||0>=et?mt(3):mt(2)),$n(this);var a=this.g.Z();this.X=a;t:if(Ji(this)){var c=gr(this.g);t="";var v=c.length,w=me(this.g)==4;if(!this.h.i){if(typeof TextDecoder>"u"){xe(this),yt(this);var T="";break t}this.h.i=new g.TextDecoder}for(s=0;s<v;s++)this.h.h=!0,t+=this.h.i.decode(c[s],{stream:!(w&&s==v-1)});c.length=0,this.h.g+=t,this.C=0,T=this.h.g}else T=this.g.oa();if(this.o=a==200,xo(this.i,this.u,this.A,this.l,this.R,q,a),this.o){if(this.T&&!this.K){t:{if(this.g){var M,$=this.g;if((M=$.g?$.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!H(M)){var N=M;break t}}N=null}if(a=N)Ye(this.i,this.l,a,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,Wn(this,a);else{this.o=!1,this.s=3,J(12),xe(this),yt(this);break e}}if(this.P){a=!0;let ne;for(;!this.J&&this.C<T.length;)if(ne=Bo(this,T),ne==Bn){q==4&&(this.s=4,J(14),a=!1),Ye(this.i,this.l,null,"[Incomplete Response]");break}else if(ne==qi){this.s=4,J(15),Ye(this.i,this.l,T,"[Invalid Chunk]"),a=!1;break}else Ye(this.i,this.l,ne,null),Wn(this,ne);if(Ji(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),q!=4||T.length!=0||this.h.h||(this.s=1,J(16),a=!1),this.o=this.o&&a,!a)Ye(this.i,this.l,T,"[Invalid Chunked Response]"),xe(this),yt(this);else if(0<T.length&&!this.W){this.W=!0;var G=this.j;G.g==this&&G.ba&&!G.M&&(G.j.info("Great, no buffering proxy detected. Bytes received: "+T.length),Xn(G),G.M=!0,J(11))}}else Ye(this.i,this.l,T,null),Wn(this,T);q==4&&xe(this),this.o&&!this.J&&(q==4?Er(this.j,this):(this.o=!1,Xt(this)))}else ra(this.g),a==400&&0<T.indexOf("Unknown SID")?(this.s=3,J(12)):(this.s=0,J(13)),xe(this),yt(this)}}}catch{}finally{}};function Ji(t){return t.g?t.u=="GET"&&t.L!=2&&t.j.Ca:!1}function Bo(t,s){var a=t.C,c=s.indexOf(`
`,a);return c==-1?Bn:(a=Number(s.substring(a,c)),isNaN(a)?qi:(c+=1,c+a>s.length?Bn:(s=s.slice(c,c+a),t.C=c+a,s)))}Pe.prototype.cancel=function(){this.J=!0,xe(this)};function Xt(t){t.S=Date.now()+t.I,Xi(t,t.I)}function Xi(t,s){if(t.B!=null)throw Error("WatchDog timer not null");t.B=_t(S(t.ba,t),s)}function $n(t){t.B&&(g.clearTimeout(t.B),t.B=null)}Pe.prototype.ba=function(){this.B=null;const t=Date.now();0<=t-this.S?(jo(this.i,this.A),this.L!=2&&(mt(),J(17)),xe(this),this.s=2,yt(this)):Xi(this,this.S-t)};function yt(t){t.j.G==0||t.J||Er(t.j,t)}function xe(t){$n(t);var s=t.M;s&&typeof s.ma=="function"&&s.ma(),t.M=null,Vi(t.U),t.g&&(s=t.g,t.g=null,s.abort(),s.ma())}function Wn(t,s){try{var a=t.j;if(a.G!=0&&(a.g==t||zn(a.h,t))){if(!t.K&&zn(a.h,t)&&a.G==3){try{var c=a.Da.g.parse(s)}catch{c=null}if(Array.isArray(c)&&c.length==3){var v=c;if(v[0]==0){e:if(!a.u){if(a.g)if(a.g.F+3e3<t.F)on(a),rn(a);else break e;Jn(a),J(18)}}else a.za=v[1],0<a.za-a.T&&37500>v[2]&&a.F&&a.v==0&&!a.C&&(a.C=_t(S(a.Za,a),6e3));if(1>=Qi(a.h)&&a.ca){try{a.ca()}catch{}a.ca=void 0}}else Fe(a,11)}else if((t.K||a.g==t)&&on(a),!H(s))for(v=a.Da.g.parse(s),s=0;s<v.length;s++){let N=v[s];if(a.T=N[0],N=N[1],a.G==2)if(N[0]=="c"){a.K=N[1],a.ia=N[2];const G=N[3];G!=null&&(a.la=G,a.j.info("VER="+a.la));const q=N[4];q!=null&&(a.Aa=q,a.j.info("SVER="+a.Aa));const et=N[5];et!=null&&typeof et=="number"&&0<et&&(c=1.5*et,a.L=c,a.j.info("backChannelRequestTimeoutMs_="+c)),c=a;const ne=t.g;if(ne){const an=ne.g?ne.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(an){var w=c.h;w.g||an.indexOf("spdy")==-1&&an.indexOf("quic")==-1&&an.indexOf("h2")==-1||(w.j=w.l,w.g=new Set,w.h&&(Gn(w,w.h),w.h=null))}if(c.D){const Yn=ne.g?ne.g.getResponseHeader("X-HTTP-Session-Id"):null;Yn&&(c.ya=Yn,U(c.I,c.D,Yn))}}a.G=3,a.l&&a.l.ua(),a.ba&&(a.R=Date.now()-t.F,a.j.info("Handshake RTT: "+a.R+"ms")),c=a;var T=t;if(c.qa=Ar(c,c.J?c.ia:null,c.W),T.K){er(c.h,T);var M=T,$=c.L;$&&(M.I=$),M.B&&($n(M),Xt(M)),c.g=T}else wr(c);0<a.i.length&&sn(a)}else N[0]!="stop"&&N[0]!="close"||Fe(a,7);else a.G==3&&(N[0]=="stop"||N[0]=="close"?N[0]=="stop"?Fe(a,7):Kn(a):N[0]!="noop"&&a.l&&a.l.ta(N),a.v=0)}}mt(4)}catch{}}var Ho=class{constructor(t,s){this.g=t,this.map=s}};function Yi(t){this.l=t||10,g.PerformanceNavigationTiming?(t=g.performance.getEntriesByType("navigation"),t=0<t.length&&(t[0].nextHopProtocol=="hq"||t[0].nextHopProtocol=="h2")):t=!!(g.chrome&&g.chrome.loadTimes&&g.chrome.loadTimes()&&g.chrome.loadTimes().wasFetchedViaSpdy),this.j=t?this.l:1,this.g=null,1<this.j&&(this.g=new Set),this.h=null,this.i=[]}function Zi(t){return t.h?!0:t.g?t.g.size>=t.j:!1}function Qi(t){return t.h?1:t.g?t.g.size:0}function zn(t,s){return t.h?t.h==s:t.g?t.g.has(s):!1}function Gn(t,s){t.g?t.g.add(s):t.h=s}function er(t,s){t.h&&t.h==s?t.h=null:t.g&&t.g.has(s)&&t.g.delete(s)}Yi.prototype.cancel=function(){if(this.i=tr(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const t of this.g.values())t.cancel();this.g.clear()}};function tr(t){if(t.h!=null)return t.i.concat(t.h.D);if(t.g!=null&&t.g.size!==0){let s=t.i;for(const a of t.g.values())s=s.concat(a.D);return s}return j(t.i)}function $o(t){if(t.V&&typeof t.V=="function")return t.V();if(typeof Map<"u"&&t instanceof Map||typeof Set<"u"&&t instanceof Set)return Array.from(t.values());if(typeof t=="string")return t.split("");if(I(t)){for(var s=[],a=t.length,c=0;c<a;c++)s.push(t[c]);return s}s=[],a=0;for(c in t)s[a++]=t[c];return s}function Wo(t){if(t.na&&typeof t.na=="function")return t.na();if(!t.V||typeof t.V!="function"){if(typeof Map<"u"&&t instanceof Map)return Array.from(t.keys());if(!(typeof Set<"u"&&t instanceof Set)){if(I(t)||typeof t=="string"){var s=[];t=t.length;for(var a=0;a<t;a++)s.push(a);return s}s=[],a=0;for(const c in t)s[a++]=c;return s}}}function nr(t,s){if(t.forEach&&typeof t.forEach=="function")t.forEach(s,void 0);else if(I(t)||typeof t=="string")Array.prototype.forEach.call(t,s,void 0);else for(var a=Wo(t),c=$o(t),v=c.length,w=0;w<v;w++)s.call(void 0,c[w],a&&a[w],t)}var ir=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function zo(t,s){if(t){t=t.split("&");for(var a=0;a<t.length;a++){var c=t[a].indexOf("="),v=null;if(0<=c){var w=t[a].substring(0,c);v=t[a].substring(c+1)}else w=t[a];s(w,v?decodeURIComponent(v.replace(/\+/g," ")):"")}}}function je(t){if(this.g=this.o=this.j="",this.s=null,this.m=this.l="",this.h=!1,t instanceof je){this.h=t.h,Yt(this,t.j),this.o=t.o,this.g=t.g,Zt(this,t.s),this.l=t.l;var s=t.i,a=new Et;a.i=s.i,s.g&&(a.g=new Map(s.g),a.h=s.h),rr(this,a),this.m=t.m}else t&&(s=String(t).match(ir))?(this.h=!1,Yt(this,s[1]||"",!0),this.o=wt(s[2]||""),this.g=wt(s[3]||"",!0),Zt(this,s[4]),this.l=wt(s[5]||"",!0),rr(this,s[6]||"",!0),this.m=wt(s[7]||"")):(this.h=!1,this.i=new Et(null,this.h))}je.prototype.toString=function(){var t=[],s=this.j;s&&t.push(It(s,sr,!0),":");var a=this.g;return(a||s=="file")&&(t.push("//"),(s=this.o)&&t.push(It(s,sr,!0),"@"),t.push(encodeURIComponent(String(a)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),a=this.s,a!=null&&t.push(":",String(a))),(a=this.l)&&(this.g&&a.charAt(0)!="/"&&t.push("/"),t.push(It(a,a.charAt(0)=="/"?Ko:qo,!0))),(a=this.i.toString())&&t.push("?",a),(a=this.m)&&t.push("#",It(a,Xo)),t.join("")};function ge(t){return new je(t)}function Yt(t,s,a){t.j=a?wt(s,!0):s,t.j&&(t.j=t.j.replace(/:$/,""))}function Zt(t,s){if(s){if(s=Number(s),isNaN(s)||0>s)throw Error("Bad port number "+s);t.s=s}else t.s=null}function rr(t,s,a){s instanceof Et?(t.i=s,Yo(t.i,t.h)):(a||(s=It(s,Jo)),t.i=new Et(s,t.h))}function U(t,s,a){t.i.set(s,a)}function Qt(t){return U(t,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),t}function wt(t,s){return t?s?decodeURI(t.replace(/%25/g,"%2525")):decodeURIComponent(t):""}function It(t,s,a){return typeof t=="string"?(t=encodeURI(t).replace(s,Go),a&&(t=t.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),t):null}function Go(t){return t=t.charCodeAt(0),"%"+(t>>4&15).toString(16)+(t&15).toString(16)}var sr=/[#\/\?@]/g,qo=/[#\?:]/g,Ko=/[#\?]/g,Jo=/[#\?@]/g,Xo=/#/g;function Et(t,s){this.h=this.g=null,this.i=t||null,this.j=!!s}function Re(t){t.g||(t.g=new Map,t.h=0,t.i&&zo(t.i,function(s,a){t.add(decodeURIComponent(s.replace(/\+/g," ")),a)}))}i=Et.prototype,i.add=function(t,s){Re(this),this.i=null,t=Ze(this,t);var a=this.g.get(t);return a||this.g.set(t,a=[]),a.push(s),this.h+=1,this};function or(t,s){Re(t),s=Ze(t,s),t.g.has(s)&&(t.i=null,t.h-=t.g.get(s).length,t.g.delete(s))}function ar(t,s){return Re(t),s=Ze(t,s),t.g.has(s)}i.forEach=function(t,s){Re(this),this.g.forEach(function(a,c){a.forEach(function(v){t.call(s,v,c,this)},this)},this)},i.na=function(){Re(this);const t=Array.from(this.g.values()),s=Array.from(this.g.keys()),a=[];for(let c=0;c<s.length;c++){const v=t[c];for(let w=0;w<v.length;w++)a.push(s[c])}return a},i.V=function(t){Re(this);let s=[];if(typeof t=="string")ar(this,t)&&(s=s.concat(this.g.get(Ze(this,t))));else{t=Array.from(this.g.values());for(let a=0;a<t.length;a++)s=s.concat(t[a])}return s},i.set=function(t,s){return Re(this),this.i=null,t=Ze(this,t),ar(this,t)&&(this.h-=this.g.get(t).length),this.g.set(t,[s]),this.h+=1,this},i.get=function(t,s){return t?(t=this.V(t),0<t.length?String(t[0]):s):s};function hr(t,s,a){or(t,s),0<a.length&&(t.i=null,t.g.set(Ze(t,s),j(a)),t.h+=a.length)}i.toString=function(){if(this.i)return this.i;if(!this.g)return"";const t=[],s=Array.from(this.g.keys());for(var a=0;a<s.length;a++){var c=s[a];const w=encodeURIComponent(String(c)),T=this.V(c);for(c=0;c<T.length;c++){var v=w;T[c]!==""&&(v+="="+encodeURIComponent(String(T[c]))),t.push(v)}}return this.i=t.join("&")};function Ze(t,s){return s=String(s),t.j&&(s=s.toLowerCase()),s}function Yo(t,s){s&&!t.j&&(Re(t),t.i=null,t.g.forEach(function(a,c){var v=c.toLowerCase();c!=v&&(or(this,c),hr(this,v,a))},t)),t.j=s}function Zo(t,s){const a=new vt;if(g.Image){const c=new Image;c.onload=x(ke,a,"TestLoadImage: loaded",!0,s,c),c.onerror=x(ke,a,"TestLoadImage: error",!1,s,c),c.onabort=x(ke,a,"TestLoadImage: abort",!1,s,c),c.ontimeout=x(ke,a,"TestLoadImage: timeout",!1,s,c),g.setTimeout(function(){c.ontimeout&&c.ontimeout()},1e4),c.src=t}else s(!1)}function Qo(t,s){const a=new vt,c=new AbortController,v=setTimeout(()=>{c.abort(),ke(a,"TestPingServer: timeout",!1,s)},1e4);fetch(t,{signal:c.signal}).then(w=>{clearTimeout(v),w.ok?ke(a,"TestPingServer: ok",!0,s):ke(a,"TestPingServer: server error",!1,s)}).catch(()=>{clearTimeout(v),ke(a,"TestPingServer: error",!1,s)})}function ke(t,s,a,c,v){try{v&&(v.onload=null,v.onerror=null,v.onabort=null,v.ontimeout=null),c(a)}catch{}}function ea(){this.g=new Lo}function ta(t,s,a){const c=a||"";try{nr(t,function(v,w){let T=v;E(v)&&(T=Ln(v)),s.push(c+w+"="+encodeURIComponent(T))})}catch(v){throw s.push(c+"type="+encodeURIComponent("_badmap")),v}}function en(t){this.l=t.Ub||null,this.j=t.eb||!1}P(en,Mn),en.prototype.g=function(){return new tn(this.l,this.j)},en.prototype.i=(function(t){return function(){return t}})({});function tn(t,s){z.call(this),this.D=t,this.o=s,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.u=new Headers,this.h=null,this.B="GET",this.A="",this.g=!1,this.v=this.j=this.l=null}P(tn,z),i=tn.prototype,i.open=function(t,s){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.B=t,this.A=s,this.readyState=1,St(this)},i.send=function(t){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");this.g=!0;const s={headers:this.u,method:this.B,credentials:this.m,cache:void 0};t&&(s.body=t),(this.D||g).fetch(new Request(this.A,s)).then(this.Sa.bind(this),this.ga.bind(this))},i.abort=function(){this.response=this.responseText="",this.u=new Headers,this.status=0,this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),1<=this.readyState&&this.g&&this.readyState!=4&&(this.g=!1,Tt(this)),this.readyState=0},i.Sa=function(t){if(this.g&&(this.l=t,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=t.headers,this.readyState=2,St(this)),this.g&&(this.readyState=3,St(this),this.g)))if(this.responseType==="arraybuffer")t.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if(typeof g.ReadableStream<"u"&&"body"in t){if(this.j=t.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.v=new TextDecoder;cr(this)}else t.text().then(this.Ra.bind(this),this.ga.bind(this))};function cr(t){t.j.read().then(t.Pa.bind(t)).catch(t.ga.bind(t))}i.Pa=function(t){if(this.g){if(this.o&&t.value)this.response.push(t.value);else if(!this.o){var s=t.value?t.value:new Uint8Array(0);(s=this.v.decode(s,{stream:!t.done}))&&(this.response=this.responseText+=s)}t.done?Tt(this):St(this),this.readyState==3&&cr(this)}},i.Ra=function(t){this.g&&(this.response=this.responseText=t,Tt(this))},i.Qa=function(t){this.g&&(this.response=t,Tt(this))},i.ga=function(){this.g&&Tt(this)};function Tt(t){t.readyState=4,t.l=null,t.j=null,t.v=null,St(t)}i.setRequestHeader=function(t,s){this.u.append(t,s)},i.getResponseHeader=function(t){return this.h&&this.h.get(t.toLowerCase())||""},i.getAllResponseHeaders=function(){if(!this.h)return"";const t=[],s=this.h.entries();for(var a=s.next();!a.done;)a=a.value,t.push(a[0]+": "+a[1]),a=s.next();return t.join(`\r
`)};function St(t){t.onreadystatechange&&t.onreadystatechange.call(t)}Object.defineProperty(tn.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(t){this.m=t?"include":"same-origin"}});function lr(t){let s="";return Z(t,function(a,c){s+=c,s+=":",s+=a,s+=`\r
`}),s}function qn(t,s,a){e:{for(c in a){var c=!1;break e}c=!0}c||(a=lr(a),typeof t=="string"?a!=null&&encodeURIComponent(String(a)):U(t,s,a))}function F(t){z.call(this),this.headers=new Map,this.o=t||null,this.h=!1,this.v=this.g=null,this.D="",this.m=0,this.l="",this.j=this.B=this.u=this.A=!1,this.I=null,this.H="",this.J=!1}P(F,z);var na=/^https?$/i,ia=["POST","PUT"];i=F.prototype,i.Ha=function(t){this.J=t},i.ea=function(t,s,a,c){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+t);s=s?s.toUpperCase():"GET",this.D=t,this.l="",this.m=0,this.A=!1,this.h=!0,this.g=this.o?this.o.g():Vn.g(),this.v=this.o?Bi(this.o):Bi(Vn),this.g.onreadystatechange=S(this.Ea,this);try{this.B=!0,this.g.open(s,String(t),!0),this.B=!1}catch(w){ur(this,w);return}if(t=a||"",a=new Map(this.headers),c)if(Object.getPrototypeOf(c)===Object.prototype)for(var v in c)a.set(v,c[v]);else if(typeof c.keys=="function"&&typeof c.get=="function")for(const w of c.keys())a.set(w,c.get(w));else throw Error("Unknown input type for opt_headers: "+String(c));c=Array.from(a.keys()).find(w=>w.toLowerCase()=="content-type"),v=g.FormData&&t instanceof g.FormData,!(0<=Array.prototype.indexOf.call(ia,s,void 0))||c||v||a.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[w,T]of a)this.g.setRequestHeader(w,T);this.H&&(this.g.responseType=this.H),"withCredentials"in this.g&&this.g.withCredentials!==this.J&&(this.g.withCredentials=this.J);try{pr(this),this.u=!0,this.g.send(t),this.u=!1}catch(w){ur(this,w)}};function ur(t,s){t.h=!1,t.g&&(t.j=!0,t.g.abort(),t.j=!1),t.l=s,t.m=5,dr(t),nn(t)}function dr(t){t.A||(t.A=!0,K(t,"complete"),K(t,"error"))}i.abort=function(t){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.m=t||7,K(this,"complete"),K(this,"abort"),nn(this))},i.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),nn(this,!0)),F.aa.N.call(this)},i.Ea=function(){this.s||(this.B||this.u||this.j?fr(this):this.bb())},i.bb=function(){fr(this)};function fr(t){if(t.h&&typeof l<"u"&&(!t.v[1]||me(t)!=4||t.Z()!=2)){if(t.u&&me(t)==4)xi(t.Ea,0,t);else if(K(t,"readystatechange"),me(t)==4){t.h=!1;try{const T=t.Z();e:switch(T){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var s=!0;break e;default:s=!1}var a;if(!(a=s)){var c;if(c=T===0){var v=String(t.D).match(ir)[1]||null;!v&&g.self&&g.self.location&&(v=g.self.location.protocol.slice(0,-1)),c=!na.test(v?v.toLowerCase():"")}a=c}if(a)K(t,"complete"),K(t,"success");else{t.m=6;try{var w=2<me(t)?t.g.statusText:""}catch{w=""}t.l=w+" ["+t.Z()+"]",dr(t)}}finally{nn(t)}}}}function nn(t,s){if(t.g){pr(t);const a=t.g,c=t.v[0]?()=>{}:null;t.g=null,t.v=null,s||K(t,"ready");try{a.onreadystatechange=c}catch{}}}function pr(t){t.I&&(g.clearTimeout(t.I),t.I=null)}i.isActive=function(){return!!this.g};function me(t){return t.g?t.g.readyState:0}i.Z=function(){try{return 2<me(this)?this.g.status:-1}catch{return-1}},i.oa=function(){try{return this.g?this.g.responseText:""}catch{return""}},i.Oa=function(t){if(this.g){var s=this.g.responseText;return t&&s.indexOf(t)==0&&(s=s.substring(t.length)),Do(s)}};function gr(t){try{if(!t.g)return null;if("response"in t.g)return t.g.response;switch(t.H){case"":case"text":return t.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in t.g)return t.g.mozResponseArrayBuffer}return null}catch{return null}}function ra(t){const s={};t=(t.g&&2<=me(t)&&t.g.getAllResponseHeaders()||"").split(`\r
`);for(let c=0;c<t.length;c++){if(H(t[c]))continue;var a=m(t[c]);const v=a[0];if(a=a[1],typeof a!="string")continue;a=a.trim();const w=s[v]||[];s[v]=w,w.push(a)}_(s,function(c){return c.join(", ")})}i.Ba=function(){return this.m},i.Ka=function(){return typeof this.l=="string"?this.l:String(this.l)};function At(t,s,a){return a&&a.internalChannelParams&&a.internalChannelParams[t]||s}function mr(t){this.Aa=0,this.i=[],this.j=new vt,this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null,this.Ya=this.U=0,this.Va=At("failFast",!1,t),this.F=this.C=this.u=this.s=this.l=null,this.X=!0,this.za=this.T=-1,this.Y=this.v=this.B=0,this.Ta=At("baseRetryDelayMs",5e3,t),this.cb=At("retryDelaySeedMs",1e4,t),this.Wa=At("forwardChannelMaxRetries",2,t),this.wa=At("forwardChannelRequestTimeoutMs",2e4,t),this.pa=t&&t.xmlHttpFactory||void 0,this.Xa=t&&t.Tb||void 0,this.Ca=t&&t.useFetchStreams||!1,this.L=void 0,this.J=t&&t.supportsCrossDomainXhr||!1,this.K="",this.h=new Yi(t&&t.concurrentRequestLimit),this.Da=new ea,this.P=t&&t.fastHandshake||!1,this.O=t&&t.encodeInitMessageHeaders||!1,this.P&&this.O&&(this.O=!1),this.Ua=t&&t.Rb||!1,t&&t.xa&&this.j.xa(),t&&t.forceLongPolling&&(this.X=!1),this.ba=!this.P&&this.X&&t&&t.detectBufferingProxy||!1,this.ja=void 0,t&&t.longPollingTimeout&&0<t.longPollingTimeout&&(this.ja=t.longPollingTimeout),this.ca=void 0,this.R=0,this.M=!1,this.ka=this.A=null}i=mr.prototype,i.la=8,i.G=1,i.connect=function(t,s,a,c){J(0),this.W=t,this.H=s||{},a&&c!==void 0&&(this.H.OSID=a,this.H.OAID=c),this.F=this.X,this.I=Ar(this,null,this.W),sn(this)};function Kn(t){if(_r(t),t.G==3){var s=t.U++,a=ge(t.I);if(U(a,"SID",t.K),U(a,"RID",s),U(a,"TYPE","terminate"),bt(t,a),s=new Pe(t,t.j,s),s.L=2,s.v=Qt(ge(a)),a=!1,g.navigator&&g.navigator.sendBeacon)try{a=g.navigator.sendBeacon(s.v.toString(),"")}catch{}!a&&g.Image&&(new Image().src=s.v,a=!0),a||(s.g=br(s.j,null),s.g.ea(s.v)),s.F=Date.now(),Xt(s)}Sr(t)}function rn(t){t.g&&(Xn(t),t.g.cancel(),t.g=null)}function _r(t){rn(t),t.u&&(g.clearTimeout(t.u),t.u=null),on(t),t.h.cancel(),t.s&&(typeof t.s=="number"&&g.clearTimeout(t.s),t.s=null)}function sn(t){if(!Zi(t.h)&&!t.s){t.s=!0;var s=t.Ga;ut||Ni(),dt||(ut(),dt=!0),bn.add(s,t),t.B=0}}function sa(t,s){return Qi(t.h)>=t.h.j-(t.s?1:0)?!1:t.s?(t.i=s.D.concat(t.i),!0):t.G==1||t.G==2||t.B>=(t.Va?0:t.Wa)?!1:(t.s=_t(S(t.Ga,t,s),Tr(t,t.B)),t.B++,!0)}i.Ga=function(t){if(this.s)if(this.s=null,this.G==1){if(!t){this.U=Math.floor(1e5*Math.random()),t=this.U++;const v=new Pe(this,this.j,t);let w=this.o;if(this.S&&(w?(w=u(w),p(w,this.S)):w=this.S),this.m!==null||this.O||(v.H=w,w=null),this.P)e:{for(var s=0,a=0;a<this.i.length;a++){t:{var c=this.i[a];if("__data__"in c.map&&(c=c.map.__data__,typeof c=="string")){c=c.length;break t}c=void 0}if(c===void 0)break;if(s+=c,4096<s){s=a;break e}if(s===4096||a===this.i.length-1){s=a+1;break e}}s=1e3}else s=1e3;s=yr(this,v,s),a=ge(this.I),U(a,"RID",t),U(a,"CVER",22),this.D&&U(a,"X-HTTP-Session-Id",this.D),bt(this,a),w&&(this.O?s="headers="+encodeURIComponent(String(lr(w)))+"&"+s:this.m&&qn(a,this.m,w)),Gn(this.h,v),this.Ua&&U(a,"TYPE","init"),this.P?(U(a,"$req",s),U(a,"SID","null"),v.T=!0,Hn(v,a,null)):Hn(v,a,s),this.G=2}}else this.G==3&&(t?vr(this,t):this.i.length==0||Zi(this.h)||vr(this))};function vr(t,s){var a;s?a=s.l:a=t.U++;const c=ge(t.I);U(c,"SID",t.K),U(c,"RID",a),U(c,"AID",t.T),bt(t,c),t.m&&t.o&&qn(c,t.m,t.o),a=new Pe(t,t.j,a,t.B+1),t.m===null&&(a.H=t.o),s&&(t.i=s.D.concat(t.i)),s=yr(t,a,1e3),a.I=Math.round(.5*t.wa)+Math.round(.5*t.wa*Math.random()),Gn(t.h,a),Hn(a,c,s)}function bt(t,s){t.H&&Z(t.H,function(a,c){U(s,c,a)}),t.l&&nr({},function(a,c){U(s,c,a)})}function yr(t,s,a){a=Math.min(t.i.length,a);var c=t.l?S(t.l.Na,t.l,t):null;e:{var v=t.i;let w=-1;for(;;){const T=["count="+a];w==-1?0<a?(w=v[0].g,T.push("ofs="+w)):w=0:T.push("ofs="+w);let M=!0;for(let $=0;$<a;$++){let N=v[$].g;const G=v[$].map;if(N-=w,0>N)w=Math.max(0,v[$].g-100),M=!1;else try{ta(G,T,"req"+N+"_")}catch{c&&c(G)}}if(M){c=T.join("&");break e}}}return t=t.i.splice(0,a),s.D=t,c}function wr(t){if(!t.g&&!t.u){t.Y=1;var s=t.Fa;ut||Ni(),dt||(ut(),dt=!0),bn.add(s,t),t.v=0}}function Jn(t){return t.g||t.u||3<=t.v?!1:(t.Y++,t.u=_t(S(t.Fa,t),Tr(t,t.v)),t.v++,!0)}i.Fa=function(){if(this.u=null,Ir(this),this.ba&&!(this.M||this.g==null||0>=this.R)){var t=2*this.R;this.j.info("BP detection timer enabled: "+t),this.A=_t(S(this.ab,this),t)}},i.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.M=!0,J(10),rn(this),Ir(this))};function Xn(t){t.A!=null&&(g.clearTimeout(t.A),t.A=null)}function Ir(t){t.g=new Pe(t,t.j,"rpc",t.Y),t.m===null&&(t.g.H=t.o),t.g.O=0;var s=ge(t.qa);U(s,"RID","rpc"),U(s,"SID",t.K),U(s,"AID",t.T),U(s,"CI",t.F?"0":"1"),!t.F&&t.ja&&U(s,"TO",t.ja),U(s,"TYPE","xmlhttp"),bt(t,s),t.m&&t.o&&qn(s,t.m,t.o),t.L&&(t.g.I=t.L);var a=t.g;t=t.ia,a.L=1,a.v=Qt(ge(s)),a.m=null,a.P=!0,Ki(a,t)}i.Za=function(){this.C!=null&&(this.C=null,rn(this),Jn(this),J(19))};function on(t){t.C!=null&&(g.clearTimeout(t.C),t.C=null)}function Er(t,s){var a=null;if(t.g==s){on(t),Xn(t),t.g=null;var c=2}else if(zn(t.h,s))a=s.D,er(t.h,s),c=1;else return;if(t.G!=0){if(s.o)if(c==1){a=s.m?s.m.length:0,s=Date.now()-s.F;var v=t.B;c=jn(),K(c,new zi(c,a)),sn(t)}else wr(t);else if(v=s.s,v==3||v==0&&0<s.X||!(c==1&&sa(t,s)||c==2&&Jn(t)))switch(a&&0<a.length&&(s=t.h,s.i=s.i.concat(a)),v){case 1:Fe(t,5);break;case 4:Fe(t,10);break;case 3:Fe(t,6);break;default:Fe(t,2)}}}function Tr(t,s){let a=t.Ta+Math.floor(Math.random()*t.cb);return t.isActive()||(a*=2),a*s}function Fe(t,s){if(t.j.info("Error code "+s),s==2){var a=S(t.fb,t),c=t.Xa;const v=!c;c=new je(c||"//www.google.com/images/cleardot.gif"),g.location&&g.location.protocol=="http"||Yt(c,"https"),Qt(c),v?Zo(c.toString(),a):Qo(c.toString(),a)}else J(2);t.G=0,t.l&&t.l.sa(s),Sr(t),_r(t)}i.fb=function(t){t?(this.j.info("Successfully pinged google.com"),J(2)):(this.j.info("Failed to ping google.com"),J(1))};function Sr(t){if(t.G=0,t.ka=[],t.l){const s=tr(t.h);(s.length!=0||t.i.length!=0)&&(L(t.ka,s),L(t.ka,t.i),t.h.i.length=0,j(t.i),t.i.length=0),t.l.ra()}}function Ar(t,s,a){var c=a instanceof je?ge(a):new je(a);if(c.g!="")s&&(c.g=s+"."+c.g),Zt(c,c.s);else{var v=g.location;c=v.protocol,s=s?s+"."+v.hostname:v.hostname,v=+v.port;var w=new je(null);c&&Yt(w,c),s&&(w.g=s),v&&Zt(w,v),a&&(w.l=a),c=w}return a=t.D,s=t.ya,a&&s&&U(c,a,s),U(c,"VER",t.la),bt(t,c),c}function br(t,s,a){if(s&&!t.J)throw Error("Can't create secondary domain capable XhrIo object.");return s=t.Ca&&!t.pa?new F(new en({eb:a})):new F(t.pa),s.Ha(t.J),s}i.isActive=function(){return!!this.l&&this.l.isActive(this)};function Cr(){}i=Cr.prototype,i.ua=function(){},i.ta=function(){},i.sa=function(){},i.ra=function(){},i.isActive=function(){return!0},i.Na=function(){};function te(t,s){z.call(this),this.g=new mr(s),this.l=t,this.h=s&&s.messageUrlParams||null,t=s&&s.messageHeaders||null,s&&s.clientProtocolHeaderRequired&&(t?t["X-Client-Protocol"]="webchannel":t={"X-Client-Protocol":"webchannel"}),this.g.o=t,t=s&&s.initMessageHeaders||null,s&&s.messageContentType&&(t?t["X-WebChannel-Content-Type"]=s.messageContentType:t={"X-WebChannel-Content-Type":s.messageContentType}),s&&s.va&&(t?t["X-WebChannel-Client-Profile"]=s.va:t={"X-WebChannel-Client-Profile":s.va}),this.g.S=t,(t=s&&s.Sb)&&!H(t)&&(this.g.m=t),this.v=s&&s.supportsCrossDomainXhr||!1,this.u=s&&s.sendRawJson||!1,(s=s&&s.httpSessionIdParam)&&!H(s)&&(this.g.D=s,t=this.h,t!==null&&s in t&&(t=this.h,s in t&&delete t[s])),this.j=new Qe(this)}P(te,z),te.prototype.m=function(){this.g.l=this.j,this.v&&(this.g.J=!0),this.g.connect(this.l,this.h||void 0)},te.prototype.close=function(){Kn(this.g)},te.prototype.o=function(t){var s=this.g;if(typeof t=="string"){var a={};a.__data__=t,t=a}else this.u&&(a={},a.__data__=Ln(t),t=a);s.i.push(new Ho(s.Ya++,t)),s.G==3&&sn(s)},te.prototype.N=function(){this.g.l=null,delete this.j,Kn(this.g),delete this.g,te.aa.N.call(this)};function Pr(t){Un.call(this),t.__headers__&&(this.headers=t.__headers__,this.statusCode=t.__status__,delete t.__headers__,delete t.__status__);var s=t.__sm__;if(s){e:{for(const a in s){t=a;break e}t=void 0}(this.i=t)&&(t=this.i,s=s!==null&&t in s?s[t]:void 0),this.data=s}else this.data=t}P(Pr,Un);function Rr(){xn.call(this),this.status=1}P(Rr,xn);function Qe(t){this.g=t}P(Qe,Cr),Qe.prototype.ua=function(){K(this.g,"a")},Qe.prototype.ta=function(t){K(this.g,new Pr(t))},Qe.prototype.sa=function(t){K(this.g,new Rr)},Qe.prototype.ra=function(){K(this.g,"b")},te.prototype.send=te.prototype.o,te.prototype.open=te.prototype.m,te.prototype.close=te.prototype.close,Fn.NO_ERROR=0,Fn.TIMEOUT=8,Fn.HTTP_ERROR=6,Vo.COMPLETE="complete",Mo.EventType=gt,gt.OPEN="a",gt.CLOSE="b",gt.ERROR="c",gt.MESSAGE="d",z.prototype.listen=z.prototype.K,F.prototype.listenOnce=F.prototype.L,F.prototype.getLastError=F.prototype.Ka,F.prototype.getLastErrorCode=F.prototype.Ba,F.prototype.getStatus=F.prototype.Z,F.prototype.getResponseJson=F.prototype.Oa,F.prototype.getResponseText=F.prototype.oa,F.prototype.send=F.prototype.ea,F.prototype.setWithCredentials=F.prototype.Ha}).apply(typeof cn<"u"?cn:typeof self<"u"?self:typeof window<"u"?window:{});const ts="@firebase/firestore",ns="4.8.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class X{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}X.UNAUTHENTICATED=new X(null),X.GOOGLE_CREDENTIALS=new X("google-credentials-uid"),X.FIRST_PARTY=new X("first-party-uid"),X.MOCK_USER=new X("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let $t="11.10.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const at=new fi("@firebase/firestore");function oe(i,...e){if(at.logLevel<=D.DEBUG){const n=e.map(Pi);at.debug(`Firestore (${$t}): ${i}`,...n)}}function go(i,...e){if(at.logLevel<=D.ERROR){const n=e.map(Pi);at.error(`Firestore (${$t}): ${i}`,...n)}}function Al(i,...e){if(at.logLevel<=D.WARN){const n=e.map(Pi);at.warn(`Firestore (${$t}): ${i}`,...n)}}function Pi(i){if(typeof i=="string")return i;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/return(function(n){return JSON.stringify(n)})(i)}catch{return i}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Mt(i,e,n){let r="Unexpected state";typeof e=="string"?r=e:n=e,mo(i,r,n)}function mo(i,e,n){let r=`FIRESTORE (${$t}) INTERNAL ASSERTION FAILED: ${e} (ID: ${i.toString(16)})`;if(n!==void 0)try{r+=" CONTEXT: "+JSON.stringify(n)}catch{r+=" CONTEXT: "+n}throw go(r),new Error(r)}function Rt(i,e,n,r){let o="Unexpected state";typeof n=="string"?o=n:r=n,i||mo(e,o,r)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const k={CANCELLED:"cancelled",INVALID_ARGUMENT:"invalid-argument",FAILED_PRECONDITION:"failed-precondition"};class O extends be{constructor(e,n){super(e,n),this.code=e,this.message=n,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kt{constructor(){this.promise=new Promise(((e,n)=>{this.resolve=e,this.reject=n}))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _o{constructor(e,n){this.user=n,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class bl{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,n){e.enqueueRetryable((()=>n(X.UNAUTHENTICATED)))}shutdown(){}}class Cl{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,n){this.changeListener=n,e.enqueueRetryable((()=>n(this.token.user)))}shutdown(){this.changeListener=null}}class Pl{constructor(e){this.t=e,this.currentUser=X.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,n){Rt(this.o===void 0,42304);let r=this.i;const o=I=>this.i!==r?(r=this.i,n(I)):Promise.resolve();let h=new kt;this.o=()=>{this.i++,this.currentUser=this.u(),h.resolve(),h=new kt,e.enqueueRetryable((()=>o(this.currentUser)))};const l=()=>{const I=h;e.enqueueRetryable((async()=>{await I.promise,await o(this.currentUser)}))},g=I=>{oe("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=I,this.o&&(this.auth.addAuthTokenListener(this.o),l())};this.t.onInit((I=>g(I))),setTimeout((()=>{if(!this.auth){const I=this.t.getImmediate({optional:!0});I?g(I):(oe("FirebaseAuthCredentialsProvider","Auth not yet detected"),h.resolve(),h=new kt)}}),0),l()}getToken(){const e=this.i,n=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(n).then((r=>this.i!==e?(oe("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(Rt(typeof r.accessToken=="string",31837,{l:r}),new _o(r.accessToken,this.currentUser)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return Rt(e===null||typeof e=="string",2055,{h:e}),new X(e)}}class Rl{constructor(e,n,r){this.P=e,this.T=n,this.I=r,this.type="FirstParty",this.user=X.FIRST_PARTY,this.A=new Map}R(){return this.I?this.I():null}get headers(){this.A.set("X-Goog-AuthUser",this.P);const e=this.R();return e&&this.A.set("Authorization",e),this.T&&this.A.set("X-Goog-Iam-Authorization-Token",this.T),this.A}}class kl{constructor(e,n,r){this.P=e,this.T=n,this.I=r}getToken(){return Promise.resolve(new Rl(this.P,this.T,this.I))}start(e,n){e.enqueueRetryable((()=>n(X.FIRST_PARTY)))}shutdown(){}invalidateToken(){}}class is{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class Ol{constructor(e,n){this.V=n,this.forceRefresh=!1,this.appCheck=null,this.m=null,this.p=null,re(e)&&e.settings.appCheckToken&&(this.p=e.settings.appCheckToken)}start(e,n){Rt(this.o===void 0,3512);const r=h=>{h.error!=null&&oe("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${h.error.message}`);const l=h.token!==this.m;return this.m=h.token,oe("FirebaseAppCheckTokenProvider",`Received ${l?"new":"existing"} token.`),l?n(h.token):Promise.resolve()};this.o=h=>{e.enqueueRetryable((()=>r(h)))};const o=h=>{oe("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=h,this.o&&this.appCheck.addTokenListener(this.o)};this.V.onInit((h=>o(h))),setTimeout((()=>{if(!this.appCheck){const h=this.V.getImmediate({optional:!0});h?o(h):oe("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}}),0)}getToken(){if(this.p)return Promise.resolve(new is(this.p));const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then((n=>n?(Rt(typeof n.token=="string",44558,{tokenResult:n}),this.m=n.token,new is(n.token)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nl(i){const e=typeof self<"u"&&(self.crypto||self.msCrypto),n=new Uint8Array(i);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(n);else for(let r=0;r<i;r++)n[r]=Math.floor(256*Math.random());return n}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Dl(){return new TextEncoder}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ll{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",n=62*Math.floor(4.129032258064516);let r="";for(;r.length<20;){const o=Nl(40);for(let h=0;h<o.length;++h)r.length<20&&o[h]<n&&(r+=e.charAt(o[h]%62))}return r}}function he(i,e){return i<e?-1:i>e?1:0}function Ml(i,e){let n=0;for(;n<i.length&&n<e.length;){const r=i.codePointAt(n),o=e.codePointAt(n);if(r!==o){if(r<128&&o<128)return he(r,o);{const h=Dl(),l=Ul(h.encode(rs(i,n)),h.encode(rs(e,n)));return l!==0?l:he(r,o)}}n+=r>65535?2:1}return he(i.length,e.length)}function rs(i,e){return i.codePointAt(e)>65535?i.substring(e,e+2):i.substring(e,e+1)}function Ul(i,e){for(let n=0;n<i.length&&n<e.length;++n)if(i[n]!==e[n])return he(i[n],e[n]);return he(i.length,e.length)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ss="__name__";class ce{constructor(e,n,r){n===void 0?n=0:n>e.length&&Mt(637,{offset:n,range:e.length}),r===void 0?r=e.length-n:r>e.length-n&&Mt(1746,{length:r,range:e.length-n}),this.segments=e,this.offset=n,this.len=r}get length(){return this.len}isEqual(e){return ce.comparator(this,e)===0}child(e){const n=this.segments.slice(this.offset,this.limit());return e instanceof ce?e.forEach((r=>{n.push(r)})):n.push(e),this.construct(n)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let n=0;n<this.length;n++)if(this.get(n)!==e.get(n))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let n=0;n<this.length;n++)if(this.get(n)!==e.get(n))return!1;return!0}forEach(e){for(let n=this.offset,r=this.limit();n<r;n++)e(this.segments[n])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,n){const r=Math.min(e.length,n.length);for(let o=0;o<r;o++){const h=ce.compareSegments(e.get(o),n.get(o));if(h!==0)return h}return he(e.length,n.length)}static compareSegments(e,n){const r=ce.isNumericId(e),o=ce.isNumericId(n);return r&&!o?-1:!r&&o?1:r&&o?ce.extractNumericId(e).compare(ce.extractNumericId(n)):Ml(e,n)}static isNumericId(e){return e.startsWith("__id")&&e.endsWith("__")}static extractNumericId(e){return Ci.fromString(e.substring(4,e.length-2))}}class ie extends ce{construct(e,n,r){return new ie(e,n,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const n=[];for(const r of e){if(r.indexOf("//")>=0)throw new O(k.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);n.push(...r.split("/").filter((o=>o.length>0)))}return new ie(n)}static emptyPath(){return new ie([])}}const xl=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class Be extends ce{construct(e,n,r){return new Be(e,n,r)}static isValidIdentifier(e){return xl.test(e)}canonicalString(){return this.toArray().map((e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),Be.isValidIdentifier(e)||(e="`"+e+"`"),e))).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)===ss}static keyField(){return new Be([ss])}static fromServerFormat(e){const n=[];let r="",o=0;const h=()=>{if(r.length===0)throw new O(k.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);n.push(r),r=""};let l=!1;for(;o<e.length;){const g=e[o];if(g==="\\"){if(o+1===e.length)throw new O(k.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const I=e[o+1];if(I!=="\\"&&I!=="."&&I!=="`")throw new O(k.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=I,o+=2}else g==="`"?(l=!l,o++):g!=="."||l?(r+=g,o++):(h(),o++)}if(h(),l)throw new O(k.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new Be(n)}static emptyPath(){return new Be([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $e{constructor(e){this.path=e}static fromPath(e){return new $e(ie.fromString(e))}static fromName(e){return new $e(ie.fromString(e).popFirst(5))}static empty(){return new $e(ie.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&ie.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,n){return ie.comparator(e.path,n.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new $e(new ie(e.slice()))}}function jl(i,e,n,r){if(e===!0&&r===!0)throw new O(k.INVALID_ARGUMENT,`${i} and ${n} cannot be used together.`)}function Fl(i){return typeof i=="object"&&i!==null&&(Object.getPrototypeOf(i)===Object.prototype||Object.getPrototypeOf(i)===null)}function Vl(i){if(i===void 0)return"undefined";if(i===null)return"null";if(typeof i=="string")return i.length>20&&(i=`${i.substring(0,20)}...`),JSON.stringify(i);if(typeof i=="number"||typeof i=="boolean")return""+i;if(typeof i=="object"){if(i instanceof Array)return"an array";{const e=(function(r){return r.constructor?r.constructor.name:null})(i);return e?`a custom ${e} object`:"an object"}}return typeof i=="function"?"a function":Mt(12329,{type:typeof i})}function Bl(i,e){if("_delegate"in i&&(i=i._delegate),!(i instanceof e)){if(e.name===i.constructor.name)throw new O(k.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const n=Vl(i);throw new O(k.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${n}`)}}return i}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function B(i,e){const n={typeString:i};return e&&(n.value=e),n}function Wt(i,e){if(!Fl(i))throw new O(k.INVALID_ARGUMENT,"JSON must be an object");let n;for(const r in e)if(e[r]){const o=e[r].typeString,h="value"in e[r]?{value:e[r].value}:void 0;if(!(r in i)){n=`JSON missing required field: '${r}'`;break}const l=i[r];if(o&&typeof l!==o){n=`JSON field '${r}' must be a ${o}.`;break}if(h!==void 0&&l!==h.value){n=`Expected '${r}' field to equal '${h.value}'`;break}}if(n)throw new O(k.INVALID_ARGUMENT,n);return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const os=-62135596800,as=1e6;class le{static now(){return le.fromMillis(Date.now())}static fromDate(e){return le.fromMillis(e.getTime())}static fromMillis(e){const n=Math.floor(e/1e3),r=Math.floor((e-1e3*n)*as);return new le(n,r)}constructor(e,n){if(this.seconds=e,this.nanoseconds=n,n<0)throw new O(k.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+n);if(n>=1e9)throw new O(k.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+n);if(e<os)throw new O(k.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new O(k.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/as}_compareTo(e){return this.seconds===e.seconds?he(this.nanoseconds,e.nanoseconds):he(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{type:le._jsonSchemaVersion,seconds:this.seconds,nanoseconds:this.nanoseconds}}static fromJSON(e){if(Wt(e,le._jsonSchema))return new le(e.seconds,e.nanoseconds)}valueOf(){const e=this.seconds-os;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}le._jsonSchemaVersion="firestore/timestamp/1.0",le._jsonSchema={type:B("string",le._jsonSchemaVersion),seconds:B("number"),nanoseconds:B("number")};function Hl(i){return i.name==="IndexedDbTransactionError"}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $l extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Je{constructor(e){this.binaryString=e}static fromBase64String(e){const n=(function(o){try{return atob(o)}catch(h){throw typeof DOMException<"u"&&h instanceof DOMException?new $l("Invalid base64 string: "+h):h}})(e);return new Je(n)}static fromUint8Array(e){const n=(function(o){let h="";for(let l=0;l<o.length;++l)h+=String.fromCharCode(o[l]);return h})(e);return new Je(n)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return(function(n){return btoa(n)})(this.binaryString)}toUint8Array(){return(function(n){const r=new Uint8Array(n.length);for(let o=0;o<n.length;o++)r[o]=n.charCodeAt(o);return r})(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return he(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}Je.EMPTY_BYTE_STRING=new Je("");const li="(default)";class Tn{constructor(e,n){this.projectId=e,this.database=n||li}static empty(){return new Tn("","")}get isDefaultDatabase(){return this.database===li}isEqual(e){return e instanceof Tn&&e.projectId===this.projectId&&e.database===this.database}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wl{constructor(e,n=null,r=[],o=[],h=null,l="F",g=null,I=null){this.path=e,this.collectionGroup=n,this.explicitOrderBy=r,this.filters=o,this.limit=h,this.limitType=l,this.startAt=g,this.endAt=I,this.Te=null,this.Ie=null,this.de=null,this.startAt,this.endAt}}function zl(i){return new Wl(i)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var hs,R;(R=hs||(hs={}))[R.OK=0]="OK",R[R.CANCELLED=1]="CANCELLED",R[R.UNKNOWN=2]="UNKNOWN",R[R.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",R[R.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",R[R.NOT_FOUND=5]="NOT_FOUND",R[R.ALREADY_EXISTS=6]="ALREADY_EXISTS",R[R.PERMISSION_DENIED=7]="PERMISSION_DENIED",R[R.UNAUTHENTICATED=16]="UNAUTHENTICATED",R[R.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",R[R.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",R[R.ABORTED=10]="ABORTED",R[R.OUT_OF_RANGE=11]="OUT_OF_RANGE",R[R.UNIMPLEMENTED=12]="UNIMPLEMENTED",R[R.INTERNAL=13]="INTERNAL",R[R.UNAVAILABLE=14]="UNAVAILABLE",R[R.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */new Ci([4294967295,4294967295],0);/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gl=41943040;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ql=1048576;function ni(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kl{constructor(e,n,r=1e3,o=1.5,h=6e4){this.Fi=e,this.timerId=n,this.d_=r,this.E_=o,this.A_=h,this.R_=0,this.V_=null,this.m_=Date.now(),this.reset()}reset(){this.R_=0}f_(){this.R_=this.A_}g_(e){this.cancel();const n=Math.floor(this.R_+this.p_()),r=Math.max(0,Date.now()-this.m_),o=Math.max(0,n-r);o>0&&oe("ExponentialBackoff",`Backing off for ${o} ms (base delay: ${this.R_} ms, delay with jitter: ${n} ms, last attempt: ${r} ms ago)`),this.V_=this.Fi.enqueueAfterDelay(this.timerId,o,(()=>(this.m_=Date.now(),e()))),this.R_*=this.E_,this.R_<this.d_&&(this.R_=this.d_),this.R_>this.A_&&(this.R_=this.A_)}y_(){this.V_!==null&&(this.V_.skipDelay(),this.V_=null)}cancel(){this.V_!==null&&(this.V_.cancel(),this.V_=null)}p_(){return(Math.random()-.5)*this.R_}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ri{constructor(e,n,r,o,h){this.asyncQueue=e,this.timerId=n,this.targetTimeMs=r,this.op=o,this.removalCallback=h,this.deferred=new kt,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch((l=>{}))}get promise(){return this.deferred.promise}static createAndSchedule(e,n,r,o,h){const l=Date.now()+r,g=new Ri(e,n,l,o,h);return g.start(r),g}start(e){this.timerHandle=setTimeout((()=>this.handleDelayElapsed()),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new O(k.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget((()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then((e=>this.deferred.resolve(e)))):Promise.resolve()))}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}var cs,ls;(ls=cs||(cs={})).Fa="default",ls.Cache="cache";/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Jl(i){const e={};return i.timeoutSeconds!==void 0&&(e.timeoutSeconds=i.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const us=new Map;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vo="firestore.googleapis.com",ds=!0;class fs{constructor(e){var n,r;if(e.host===void 0){if(e.ssl!==void 0)throw new O(k.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host=vo,this.ssl=ds}else this.host=e.host,this.ssl=(n=e.ssl)!==null&&n!==void 0?n:ds;if(this.isUsingEmulator=e.emulatorOptions!==void 0,this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=Gl;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<ql)throw new O(k.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}jl("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=Jl((r=e.experimentalLongPollingOptions)!==null&&r!==void 0?r:{}),(function(h){if(h.timeoutSeconds!==void 0){if(isNaN(h.timeoutSeconds))throw new O(k.INVALID_ARGUMENT,`invalid long polling timeout: ${h.timeoutSeconds} (must not be NaN)`);if(h.timeoutSeconds<5)throw new O(k.INVALID_ARGUMENT,`invalid long polling timeout: ${h.timeoutSeconds} (minimum allowed value is 5)`);if(h.timeoutSeconds>30)throw new O(k.INVALID_ARGUMENT,`invalid long polling timeout: ${h.timeoutSeconds} (maximum allowed value is 30)`)}})(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&(function(r,o){return r.timeoutSeconds===o.timeoutSeconds})(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class yo{constructor(e,n,r,o){this._authCredentials=e,this._appCheckCredentials=n,this._databaseId=r,this._app=o,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new fs({}),this._settingsFrozen=!1,this._emulatorOptions={},this._terminateTask="notTerminated"}get app(){if(!this._app)throw new O(k.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new O(k.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new fs(e),this._emulatorOptions=e.emulatorOptions||{},e.credentials!==void 0&&(this._authCredentials=(function(r){if(!r)return new bl;switch(r.type){case"firstParty":return new kl(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new O(k.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}})(e.credentials))}_getSettings(){return this._settings}_getEmulatorOptions(){return this._emulatorOptions}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return(function(n){const r=us.get(n);r&&(oe("ComponentProvider","Removing Datastore"),us.delete(n),r.terminate())})(this),Promise.resolve()}}function Xl(i,e,n,r={}){var o;i=Bl(i,yo);const h=Ut(e),l=i._getSettings(),g=Object.assign(Object.assign({},l),{emulatorOptions:i._getEmulatorOptions()}),I=`${e}:${n}`;h&&(Ss(`https://${I}`),As("Firestore",!0)),l.host!==vo&&l.host!==I&&Al("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used.");const E=Object.assign(Object.assign({},l),{host:I,ssl:h,emulatorOptions:r});if(!qe(E,g)&&(i._setSettings(E),r.mockUserToken)){let A,C;if(typeof r.mockUserToken=="string")A=r.mockUserToken,C=X.MOCK_USER;else{A=_a(r.mockUserToken,(o=i._app)===null||o===void 0?void 0:o.options.projectId);const S=r.mockUserToken.sub||r.mockUserToken.user_id;if(!S)throw new O(k.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");C=new X(S)}i._authCredentials=new Cl(new _o(A,C))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ki{constructor(e,n,r){this.converter=n,this._query=r,this.type="query",this.firestore=e}withConverter(e){return new ki(this.firestore,e,this._query)}}class ue{constructor(e,n,r){this.converter=n,this._key=r,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new Oi(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new ue(this.firestore,e,this._key)}toJSON(){return{type:ue._jsonSchemaVersion,referencePath:this._key.toString()}}static fromJSON(e,n,r){if(Wt(n,ue._jsonSchema))return new ue(e,r||null,new $e(ie.fromString(n.referencePath)))}}ue._jsonSchemaVersion="firestore/documentReference/1.0",ue._jsonSchema={type:B("string",ue._jsonSchemaVersion),referencePath:B("string")};class Oi extends ki{constructor(e,n,r){super(e,n,zl(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new ue(this.firestore,null,new $e(e))}withConverter(e){return new Oi(this.firestore,e,this._path)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ps="AsyncQueue";class gs{constructor(e=Promise.resolve()){this.Zu=[],this.Xu=!1,this.ec=[],this.tc=null,this.nc=!1,this.rc=!1,this.sc=[],this.F_=new Kl(this,"async_queue_retry"),this.oc=()=>{const r=ni();r&&oe(ps,"Visibility state changed to "+r.visibilityState),this.F_.y_()},this._c=e;const n=ni();n&&typeof n.addEventListener=="function"&&n.addEventListener("visibilitychange",this.oc)}get isShuttingDown(){return this.Xu}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.ac(),this.uc(e)}enterRestrictedMode(e){if(!this.Xu){this.Xu=!0,this.rc=e||!1;const n=ni();n&&typeof n.removeEventListener=="function"&&n.removeEventListener("visibilitychange",this.oc)}}enqueue(e){if(this.ac(),this.Xu)return new Promise((()=>{}));const n=new kt;return this.uc((()=>this.Xu&&this.rc?Promise.resolve():(e().then(n.resolve,n.reject),n.promise))).then((()=>n.promise))}enqueueRetryable(e){this.enqueueAndForget((()=>(this.Zu.push(e),this.cc())))}async cc(){if(this.Zu.length!==0){try{await this.Zu[0](),this.Zu.shift(),this.F_.reset()}catch(e){if(!Hl(e))throw e;oe(ps,"Operation failed with retryable error: "+e)}this.Zu.length>0&&this.F_.g_((()=>this.cc()))}}uc(e){const n=this._c.then((()=>(this.nc=!0,e().catch((r=>{throw this.tc=r,this.nc=!1,go("INTERNAL UNHANDLED ERROR: ",ms(r)),r})).then((r=>(this.nc=!1,r))))));return this._c=n,n}enqueueAfterDelay(e,n,r){this.ac(),this.sc.indexOf(e)>-1&&(n=0);const o=Ri.createAndSchedule(this,e,n,r,(h=>this.lc(h)));return this.ec.push(o),o}ac(){this.tc&&Mt(47125,{hc:ms(this.tc)})}verifyOperationInProgress(){}async Pc(){let e;do e=this._c,await e;while(e!==this._c)}Tc(e){for(const n of this.ec)if(n.timerId===e)return!0;return!1}Ic(e){return this.Pc().then((()=>{this.ec.sort(((n,r)=>n.targetTimeMs-r.targetTimeMs));for(const n of this.ec)if(n.skipDelay(),e!=="all"&&n.timerId===e)break;return this.Pc()}))}dc(e){this.sc.push(e)}lc(e){const n=this.ec.indexOf(e);this.ec.splice(n,1)}}function ms(i){let e=i.message||"";return i.stack&&(e=i.stack.includes(i.message)?i.stack:i.message+`
`+i.stack),e}class Yl extends yo{constructor(e,n,r,o){super(e,n,r,o),this.type="firestore",this._queue=new gs,this._persistenceKey=(o==null?void 0:o.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new gs(e),this._firestoreClient=void 0,await e}}}function su(i,e){const n=typeof i=="object"?i:bs(),r=typeof i=="string"?i:e||li,o=pi(n,"firestore").getImmediate({identifier:r});if(!o._initialized){const h=ga("firestore");h&&Xl(o,...h)}return o}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ie{constructor(e){this._byteString=e}static fromBase64String(e){try{return new Ie(Je.fromBase64String(e))}catch(n){throw new O(k.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+n)}}static fromUint8Array(e){return new Ie(Je.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}toJSON(){return{type:Ie._jsonSchemaVersion,bytes:this.toBase64()}}static fromJSON(e){if(Wt(e,Ie._jsonSchema))return Ie.fromBase64String(e.bytes)}}Ie._jsonSchemaVersion="firestore/bytes/1.0",Ie._jsonSchema={type:B("string",Ie._jsonSchemaVersion),bytes:B("string")};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wo{constructor(...e){for(let n=0;n<e.length;++n)if(e[n].length===0)throw new O(k.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new Be(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ze{constructor(e,n){if(!isFinite(e)||e<-90||e>90)throw new O(k.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(n)||n<-180||n>180)throw new O(k.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+n);this._lat=e,this._long=n}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}_compareTo(e){return he(this._lat,e._lat)||he(this._long,e._long)}toJSON(){return{latitude:this._lat,longitude:this._long,type:ze._jsonSchemaVersion}}static fromJSON(e){if(Wt(e,ze._jsonSchema))return new ze(e.latitude,e.longitude)}}ze._jsonSchemaVersion="firestore/geoPoint/1.0",ze._jsonSchema={type:B("string",ze._jsonSchemaVersion),latitude:B("number"),longitude:B("number")};/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ge{constructor(e){this._values=(e||[]).map((n=>n))}toArray(){return this._values.map((e=>e))}isEqual(e){return(function(r,o){if(r.length!==o.length)return!1;for(let h=0;h<r.length;++h)if(r[h]!==o[h])return!1;return!0})(this._values,e._values)}toJSON(){return{type:Ge._jsonSchemaVersion,vectorValues:this._values}}static fromJSON(e){if(Wt(e,Ge._jsonSchema)){if(Array.isArray(e.vectorValues)&&e.vectorValues.every((n=>typeof n=="number")))return new Ge(e.vectorValues);throw new O(k.INVALID_ARGUMENT,"Expected 'vectorValues' field to be a number array")}}}Ge._jsonSchemaVersion="firestore/vectorValue/1.0",Ge._jsonSchema={type:B("string",Ge._jsonSchemaVersion),vectorValues:B("object")};const Zl=new RegExp("[~\\*/\\[\\]]");function Ql(i,e,n){if(e.search(Zl)>=0)throw _s(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,i);try{return new wo(...e.split("."))._internalPath}catch{throw _s(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,i)}}function _s(i,e,n,r,o){let h=`Function ${e}() called with invalid data`;h+=". ";let l="";return new O(k.INVALID_ARGUMENT,h+i+l)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Io{constructor(e,n,r,o,h){this._firestore=e,this._userDataWriter=n,this._key=r,this._document=o,this._converter=h}get id(){return this._key.path.lastSegment()}get ref(){return new ue(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new eu(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const n=this._document.data.field(Eo("DocumentSnapshot.get",e));if(n!==null)return this._userDataWriter.convertValue(n)}}}class eu extends Io{data(){return super.data()}}function Eo(i,e){return typeof e=="string"?Ql(i,e):e instanceof wo?e._internalPath:e._delegate._internalPath}class ln{constructor(e,n){this.hasPendingWrites=e,this.fromCache=n}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class rt extends Io{constructor(e,n,r,o,h,l){super(e,n,r,o,l),this._firestore=e,this._firestoreImpl=e,this.metadata=h}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const n=new gn(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(n,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,n={}){if(this._document){const r=this._document.data.field(Eo("DocumentSnapshot.get",e));if(r!==null)return this._userDataWriter.convertValue(r,n.serverTimestamps)}}toJSON(){if(this.metadata.hasPendingWrites)throw new O(k.FAILED_PRECONDITION,"DocumentSnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e=this._document,n={};return n.type=rt._jsonSchemaVersion,n.bundle="",n.bundleSource="DocumentSnapshot",n.bundleName=this._key.toString(),!e||!e.isValidDocument()||!e.isFoundDocument()?n:(this._userDataWriter.convertObjectMap(e.data.value.mapValue.fields,"previous"),n.bundle=(this._firestore,this.ref.path,"NOT SUPPORTED"),n)}}rt._jsonSchemaVersion="firestore/documentSnapshot/1.0",rt._jsonSchema={type:B("string",rt._jsonSchemaVersion),bundleSource:B("string","DocumentSnapshot"),bundleName:B("string"),bundle:B("string")};class gn extends rt{data(e={}){return super.data(e)}}class Ot{constructor(e,n,r,o){this._firestore=e,this._userDataWriter=n,this._snapshot=o,this.metadata=new ln(o.hasPendingWrites,o.fromCache),this.query=r}get docs(){const e=[];return this.forEach((n=>e.push(n))),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,n){this._snapshot.docs.forEach((r=>{e.call(n,new gn(this._firestore,this._userDataWriter,r.key,r,new ln(this._snapshot.mutatedKeys.has(r.key),this._snapshot.fromCache),this.query.converter))}))}docChanges(e={}){const n=!!e.includeMetadataChanges;if(n&&this._snapshot.excludesMetadataChanges)throw new O(k.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===n||(this._cachedChanges=(function(o,h){if(o._snapshot.oldDocs.isEmpty()){let l=0;return o._snapshot.docChanges.map((g=>{const I=new gn(o._firestore,o._userDataWriter,g.doc.key,g.doc,new ln(o._snapshot.mutatedKeys.has(g.doc.key),o._snapshot.fromCache),o.query.converter);return g.doc,{type:"added",doc:I,oldIndex:-1,newIndex:l++}}))}{let l=o._snapshot.oldDocs;return o._snapshot.docChanges.filter((g=>h||g.type!==3)).map((g=>{const I=new gn(o._firestore,o._userDataWriter,g.doc.key,g.doc,new ln(o._snapshot.mutatedKeys.has(g.doc.key),o._snapshot.fromCache),o.query.converter);let E=-1,A=-1;return g.type!==0&&(E=l.indexOf(g.doc.key),l=l.delete(g.doc.key)),g.type!==1&&(l=l.add(g.doc),A=l.indexOf(g.doc.key)),{type:tu(g.type),doc:I,oldIndex:E,newIndex:A}}))}})(this,n),this._cachedChangesIncludeMetadataChanges=n),this._cachedChanges}toJSON(){if(this.metadata.hasPendingWrites)throw new O(k.FAILED_PRECONDITION,"QuerySnapshot.toJSON() attempted to serialize a document with pending writes. Await waitForPendingWrites() before invoking toJSON().");const e={};e.type=Ot._jsonSchemaVersion,e.bundleSource="QuerySnapshot",e.bundleName=Ll.newId(),this._firestore._databaseId.database,this._firestore._databaseId.projectId;const n=[],r=[],o=[];return this.docs.forEach((h=>{h._document!==null&&(n.push(h._document),r.push(this._userDataWriter.convertObjectMap(h._document.data.value.mapValue.fields,"previous")),o.push(h.ref.path))})),e.bundle=(this._firestore,this.query._query,e.bundleName,"NOT SUPPORTED"),e}}function tu(i){switch(i){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return Mt(61501,{type:i})}}Ot._jsonSchemaVersion="firestore/querySnapshot/1.0",Ot._jsonSchema={type:B("string",Ot._jsonSchemaVersion),bundleSource:B("string","QuerySnapshot"),bundleName:B("string"),bundle:B("string")};(function(e,n=!0){(function(o){$t=o})(ht),st(new Ke("firestore",((r,{instanceIdentifier:o,options:h})=>{const l=r.getProvider("app").getImmediate(),g=new Yl(new Pl(r.getProvider("auth-internal")),new Ol(l,r.getProvider("app-check-internal")),(function(E,A){if(!Object.prototype.hasOwnProperty.apply(E.options,["projectId"]))throw new O(k.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new Tn(E.options.projectId,A)})(l,o),l);return h=Object.assign({useFetchStreams:n},h),g._setSettings(h),g}),"PUBLIC").setMultipleInstances(!0)),De(ts,ns,e),De(ts,ns,"esm2017")})();export{ve as G,bs as a,su as b,Tl as c,fc as d,ru as e,iu as g,Ih as i,Dc as s};
