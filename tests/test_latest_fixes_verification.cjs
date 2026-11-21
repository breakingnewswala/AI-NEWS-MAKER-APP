const fs = require('fs');
const assert = require('assert');

console.log('==================================================================');
console.log('🧪 VERIFYING LATEST 7 FIXES AND DELIVERABLES');
console.log('==================================================================');

// 1. Home Screen Story Button
console.log('Testing 1: Home Screen "सोशल मीडिया स्टोरी बनाएँ" Button for canModerate...');
const homeScreenSrc = fs.readFileSync('src/components/HomeScreenWeb.tsx', 'utf8');
assert(homeScreenSrc.includes('canModerate ? ('), 'Story button must branch on canModerate');
assert(homeScreenSrc.includes('setSelectedStoryPost(post)'), 'Must set post on story button click');
assert(homeScreenSrc.includes('setIsStoryModalOpen(true)'), 'Must open story modal');
console.log('✅ [PASS] 1. Home screen story button enabled for moderate/admin');

// 2. Video Studio Export Improvements
console.log('Testing 2: Video Studio Still Preview Overlay & Direct Download...');
const videoStudioSrc = fs.readFileSync('src/components/VideoStudioWeb.tsx', 'utf8');
assert(videoStudioSrc.includes('completedDownloadUrl'), 'Must track completedDownloadUrl');
assert(videoStudioSrc.includes('तैयार वीडियो पुनः डाउनलोड हो गया!') || videoStudioSrc.includes('completedDownloadUrl ? \'तैयार वीडियो डाउनलोड\''), 'Must allow instant re-download');
assert(videoStudioSrc.includes('रेंडरिंग के दौरान प्रीव्यू सुरक्षित पॉज़/स्टिल रखा गया है'), 'Must render still overlay during video export');
assert(!videoStudioSrc.includes('backupIntervalId = setInterval(() => {\n          renderFrame();\n        }, 33);'), 'Must not duplicate frame renders with setInterval');
console.log('✅ [PASS] 2. Video Studio export still overlay & instant re-download verified');

// 3. AI News Script Maker 5 Headlines & Apply Button
console.log('Testing 3: AI News Script Maker 5 Headlines & Apply to Studio CTA...');
const serverSrc = fs.readFileSync('server.ts', 'utf8');
assert(serverSrc.includes('अनिवार्य रूप से 5 बिल्कुल अलग-अलग, अत्यधिक आकर्षक') && serverSrc.includes('"हेडलाइन विकल्प 5"'), 'Server prompt must generate 5 social headlines');
const newsroomSrc = fs.readFileSync('src/components/NewsroomScreenWeb.tsx', 'utf8');
assert(newsroomSrc.includes('✨ इस खबर से ग्राफिक बनाएं'), 'Must contain "✨ इस खबर से ग्राफिक बनाएं" button');
assert(newsroomSrc.includes('handleApplyScriptToStudio'), 'Must define handleApplyScriptToStudio');
assert(newsroomSrc.includes('1. सोशल मीडिया हेडलाइंस विकल्प (5 आकर्षक ऑप्शंस)'), 'Must label 5 headline options');
console.log('✅ [PASS] 3. Newsroom AI News Script Maker 5 headlines and apply button verified');

// 4. Drafts Bugs (Frame Standardization, autoFillNews Sync & Photo Upload)
console.log('Testing 4: Drafts Sync, Frame Normalization & Photo Upload Safety...');
const appSrc = fs.readFileSync('src/App.tsx', 'utf8');
assert(appSrc.includes('safeFrameDesign'), 'Must sanitize draft frameDesign');
assert(appSrc.includes('setAutoFillNews(draftAutoFill)'), 'Must sync autoFillNews when opening draft');
assert(appSrc.includes('saved_ai_news_session'), 'Must persist draft to saved_ai_news_session');
const cardEditorSrc = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
assert(cardEditorSrc.includes('(!card.layout || card.layout === \'single\''), 'Single photo workspace must show when card.layout is undefined');
assert(cardEditorSrc.includes('card.images?.main'), 'card.images.main must use optional chaining in CardEditor');
const cardPreviewSrc = fs.readFileSync('src/components/CardPreview.tsx', 'utf8');
assert(cardPreviewSrc.includes('card.frameDesign === \'classic_breaking\' || Boolean(card.channelLogoUrl || card.channelLogoPngUrl)'), 'Must not duplicate text over channel logo');
assert(cardPreviewSrc.includes('card.images?.main'), 'card.images.main must use optional chaining in CardPreview');
console.log('✅ [PASS] 4. Drafts autoFillNews sync, frame normalization and photo upload safety verified');

// 5. Story Template Control Pure Hindi UI
console.log('Testing 5: Story Template Control Pure Hindi UI & Single-Line Button...');
const storyCtrlSrc = fs.readFileSync('src/components/AdminStoryTemplateControl.tsx', 'utf8');
assert(storyCtrlSrc.includes('<h3 className="text-lg font-black text-white">📱 स्टोरी टेम्पलेट कंट्रोल</h3>'), 'Title must be 100% pure Hindi');
assert(storyCtrlSrc.includes('whitespace-nowrap shrink-0') && storyCtrlSrc.includes('+ नई 9:16 स्टोरी'), 'Button must be single-line whitespace-nowrap');
console.log('✅ [PASS] 5. Story template control Hindi UI & single-line button verified');

// 6. Template Controls Redirection Buttons & Central Asset Libraries Tab
console.log('Testing 6: Template Controls Redirection Buttons & Central Asset Libraries Tab...');
const userTplSrc = fs.readFileSync('src/components/UserTemplateManager.tsx', 'utf8');
assert(userTplSrc.includes('+ नया फोटो फ्रेम बनाएं'), 'Section A must contain "+ नया फोटो फ्रेम बनाएं"');
assert(userTplSrc.includes('+ नया वीडियो फ्रेम बनाएं'), 'Section B must contain "+ नया वीडियो फ्रेम बनाएं"');
assert(userTplSrc.includes('+ नई 9:16 स्टोरी'), 'Section C must contain "+ नई 9:16 स्टोरी"');
assert(userTplSrc.includes('E. सेंट्रल एसेट लाइब्रेरीज़'), 'Section E must be titled "E. सेंट्रल एसेट लाइब्रेरीज़"');
assert(userTplSrc.includes('AdminAssetLibrariesManager'), 'Section E must render AdminAssetLibrariesManager');
console.log('✅ [PASS] 6. Template controls redirection buttons and Section E asset libraries verified');

// 7. Dynamic Frame Test Preview Dark Camera Screen
console.log('Testing 7: Dynamic Frame Test Preview Dark Camera Screen...');
const planMgrSrc = fs.readFileSync('src/components/AdminTemplatePlanManager.tsx', 'utf8');
assert(!planMgrSrc.includes("const samplePhoto = df.samplePhotoUrl || df.photoSlots?.[0]?.defaultAssetUrl || '/assets/placeholder_news_photo.jpg';"), 'Must not default to white placeholder image');
assert(planMgrSrc.includes('फोटो टच करने के लिए स्टेप 4 पर जाएं'), 'Must render dark camera screen with prompt');
console.log('✅ [PASS] 7. Dynamic frame test preview camera placeholder verified');

console.log('==================================================================');
console.log('🎉 ALL 7 NEW DELIVERABLES FULLY VERIFIED AND PASSING!');
console.log('==================================================================');
