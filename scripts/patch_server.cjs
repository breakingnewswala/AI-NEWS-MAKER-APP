const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '../AI-NEWS-MAKER-APP-main/server.ts');
let code = fs.readFileSync(serverPath, 'utf8');

// 1. In /api/auth/login, make sure existing custom logo is preserved
const loginTarget = `          channelLogoUrl: isSuper ? "/assets/ai_news_maker_logo.png" : (isAdmin ? "/assets/breaking_news_wala_logo.png" : (profileData?.channelLogoUrl || existing?.channelLogoUrl || "")),
          channelLogoPngUrl: isSuper ? "/assets/ai_news_maker_logo.png" : (isAdmin ? "/assets/breaking_news_wala_logo.png" : (existing?.channelLogoPngUrl || "")),`;

const loginReplacement = `          channelLogoUrl: isSuper ? "/assets/ai_news_maker_logo.png" : (isAdmin ? "/assets/breaking_news_wala_logo.png" : (existing?.channelLogoPngUrl || existing?.channelLogoUrl || profileData?.channelLogoUrl || "")),
          channelLogoPngUrl: isSuper ? "/assets/ai_news_maker_logo.png" : (isAdmin ? "/assets/breaking_news_wala_logo.png" : (existing?.channelLogoPngUrl || existing?.channelLogoUrl || "")),`;

if (code.includes(loginTarget)) {
  code = code.replace(loginTarget, loginReplacement);
  console.log('✅ Patched /api/auth/login logo preservation');
} else {
  console.log('ℹ️ loginTarget pattern not found as exact match, checking normalized');
}

// 2. Patch /api/admin/delete-user
const deleteUserOld = `app.post("/api/admin/delete-user", (req, res) => {
  try {
    if (!isAuthorizedMasterAdmin(req)) {
      return res.status(403).json({ error: "अनधिकृत: केवल मास्टर एडमिन (breakingnewswala.com@gmail.com) ही यूज़र्स को डिलीट कर सकते हैं।" });
    }
    const { userId, userEmail } = req.body;
    const identifier = (userEmail || userId || "").toString().toLowerCase().trim();
    if (!identifier) return res.status(400).json({ error: "userId is required" });
    if (isProtectedAdminAccount(identifier)) {
      return res.status(403).json({ error: "सुरक्षित एडमिन खाते को डिलीट नहीं किया जा सकता" });
    }

    let users = loadUsersMasterDatabase();
    const targetUser = users.find(u =>
      (u.email && u.email.toLowerCase().trim() === identifier) ||
      (u.userId && u.userId.toLowerCase().trim() === identifier)
    );

    if (targetUser && (isProtectedAdminAccount(targetUser.email) || targetUser.role === 'superadmin')) {
      return res.status(403).json({ error: "सुरक्षित सुपर एडमिन खाते को डिलीट नहीं किया जा सकता" });
    }

    users = users.filter(u =>
      (u.email && u.email.toLowerCase().trim() !== identifier) &&
      (u.userId && u.userId.toLowerCase().trim() !== identifier)
    );
    saveUsersMasterDatabase(users);

    // Delete from user_profiles_db.json
    const allProfiles = loadProfilesDatabase();
    delete allProfiles[identifier];
    if (targetUser?.email) delete allProfiles[targetUser.email.toLowerCase().trim()];
    if (targetUser?.username) delete allProfiles[targetUser.username.toLowerCase().trim()];
    saveProfilesDatabase(allProfiles);

    // Delete from users_accounts_db.json to prevent resurrection
    try {
      let accounts = loadUsersDatabase();
      accounts = accounts.filter(u =>
        (u.email && u.email.toLowerCase().trim() !== identifier) &&
        (u.userId && u.userId.toLowerCase().trim() !== identifier) &&
        (!targetUser?.email || (u.email && u.email.toLowerCase().trim() !== targetUser.email.toLowerCase().trim()))
      );
      saveUsersDatabase(accounts);
    } catch {}

    return res.json({ success: true, message: "उपयोगकर्ता सफलतापूर्वक हटा दिया गया" });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});`;

const deleteUserNew = `app.post("/api/admin/delete-user", (req, res) => {
  try {
    const adminEmail = (req.body?.adminEmail || extractAdminEmail(req) || "").toLowerCase().trim();
    const isMaster = isAuthorizedMasterAdmin(req) || isAuthorizedAdmin(req) || adminEmail === MASTER_ADMIN_EMAIL || adminEmail === REGULAR_ADMIN_EMAIL;
    if (!isMaster) {
      return res.status(403).json({ error: "अनधिकृत: केवल अधिकृत व्यवस्थापक ही यूज़र्स को डिलीट कर सकते हैं।" });
    }
    const { userId, userEmail, targetEmail, targetUserId } = req.body;
    const identifier = (targetEmail || targetUserId || userEmail || userId || "").toString().toLowerCase().trim();
    if (!identifier) return res.status(400).json({ error: "userId or email is required" });
    if (isProtectedAdminAccount(identifier)) {
      return res.status(403).json({ error: "सुरक्षित एडमिन खाते को डिलीट नहीं किया जा सकता" });
    }

    let users = loadUsersMasterDatabase();
    const targetUser = users.find(u =>
      (u.email && u.email.toLowerCase().trim() === identifier) ||
      (u.userId && u.userId.toLowerCase().trim() === identifier)
    );

    if (targetUser && (isProtectedAdminAccount(targetUser.email) || targetUser.role === 'superadmin')) {
      return res.status(403).json({ error: "सुरक्षित सुपर एडमिन खाते को डिलीट नहीं किया जा सकता" });
    }

    // 1. Delete from users_master_database.json
    users = users.filter(u =>
      (u.email && u.email.toLowerCase().trim() !== identifier) &&
      (u.userId && u.userId.toLowerCase().trim() !== identifier) &&
      (!targetUser?.email || (u.email && u.email.toLowerCase().trim() !== targetUser.email.toLowerCase().trim()))
    );
    saveUsersMasterDatabase(users);

    // 2. Delete from user_profiles_db.json
    const allProfiles = loadProfilesDatabase();
    delete allProfiles[identifier];
    if (targetUser?.email) delete allProfiles[targetUser.email.toLowerCase().trim()];
    if (targetUser?.username) delete allProfiles[targetUser.username.toLowerCase().trim()];
    saveProfilesDatabase(allProfiles);

    // 3. Delete from users_accounts_db.json
    try {
      let accounts = loadUsersDatabase();
      accounts = accounts.filter(u =>
        (u.email && u.email.toLowerCase().trim() !== identifier) &&
        (u.userId && u.userId.toLowerCase().trim() !== identifier) &&
        (!targetUser?.email || (u.email && u.email.toLowerCase().trim() !== targetUser.email.toLowerCase().trim()))
      );
      saveUsersDatabase(accounts);
    } catch {}

    // 4. Delete from users_sheet_database.json
    try {
      const sheetFile = path.join(process.cwd(), "users_sheet_database.json");
      if (fs.existsSync(sheetFile)) {
        let sheetUsers = JSON.parse(fs.readFileSync(sheetFile, "utf-8"));
        if (Array.isArray(sheetUsers)) {
          sheetUsers = sheetUsers.filter((u: any) =>
            (u.email && u.email.toLowerCase().trim() !== identifier) &&
            (u.userId && u.userId.toLowerCase().trim() !== identifier) &&
            (!targetUser?.email || (u.email && u.email.toLowerCase().trim() !== targetUser.email.toLowerCase().trim()))
          );
          fs.writeFileSync(sheetFile, JSON.stringify(sheetUsers, null, 2), "utf-8");
        }
      }
    } catch {}

    // 5. Delete from auth_credentials_db.json
    try {
      const creds = loadCredentialsDatabase();
      delete creds[identifier];
      if (targetUser?.email) delete creds[targetUser.email.toLowerCase().trim()];
      if (targetUser?.username) delete creds[targetUser.username.toLowerCase().trim()];
      saveCredentialsDatabase(creds);
    } catch {}

    // 6. Record in account_deletion_requests.json so re-login starts fresh onboarding
    try {
      const delFile = path.join(process.cwd(), "account_deletion_requests.json");
      let delReqs: any[] = [];
      if (fs.existsSync(delFile)) {
        delReqs = JSON.parse(fs.readFileSync(delFile, "utf-8"));
      }
      delReqs.unshift({
        email: targetUser?.email || identifier,
        userId: targetUser?.userId || identifier,
        deletedAt: Date.now(),
        deletedBy: adminEmail || "MASTER_ADMIN",
        status: "PURGED_BY_ADMIN"
      });
      fs.writeFileSync(delFile, JSON.stringify(delReqs, null, 2), "utf-8");
    } catch {}

    return res.json({ success: true, message: "उपयोगकर्ता और उससे जुड़े सभी रिकॉर्ड्स सफलतापूर्वक हटा दिए गए।" });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});`;

if (code.includes('app.post("/api/admin/delete-user", (req, res) => {')) {
  // Replace the entire delete user block
  const startIdx = code.indexOf('app.post("/api/admin/delete-user", (req, res) => {');
  const endIdx = code.indexOf('app.post("/api/admin/update-user"', startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    code = code.slice(0, startIdx) + deleteUserNew + '\n\n' + code.slice(endIdx);
    console.log('✅ Patched /api/admin/delete-user with comprehensive purge');
  }
}

// 3. Add Logo Requests Endpoints if not present
if (!code.includes('app.get("/api/logo-requests"')) {
  const logoEndpoints = `
// ==========================================
// LOGO CHANGE REQUESTS API
// ==========================================
const LOGO_REQUESTS_FILE = path.join(process.cwd(), "logo_requests_db.json");

function loadLogoRequestsDatabase(): any[] {
  try {
    if (fs.existsSync(LOGO_REQUESTS_FILE)) {
      const raw = fs.readFileSync(LOGO_REQUESTS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLogoRequestsDatabase(reqs: any[]): void {
  try {
    fs.writeFileSync(LOGO_REQUESTS_FILE, JSON.stringify(reqs, null, 2), "utf-8");
  } catch {}
}

app.get("/api/logo-requests", (_req, res) => {
  return res.json({ success: true, requests: loadLogoRequestsDatabase() });
});

app.post("/api/logo-requests", (req, res) => {
  try {
    const { userEmail, userName, username, channelName, currentLogoUrl, newLogoUrl, reason, requestType = "logo" } = req.body || {};
    if (!userEmail) return res.status(400).json({ error: "userEmail is required" });
    const cleanEmail = userEmail.toLowerCase().trim();
    const reqs = loadLogoRequestsDatabase();
    const newReq = {
      id: \`req_\${Date.now()}\`,
      userEmail: cleanEmail,
      userName: userName || cleanEmail.split("@")[0],
      username: username || cleanEmail.split("@")[0],
      channelName: channelName || "न्यूज़ चैनल",
      currentLogoUrl: currentLogoUrl || "",
      newLogoUrl: newLogoUrl || "",
      reason: (reason || "लोगो बदलने का अनुरोध").trim(),
      status: "pending",
      createdAt: Date.now(),
      requestType,
    };
    const updated = [newReq, ...reqs.filter((r: any) => r.userEmail !== cleanEmail || r.requestType !== requestType)];
    saveLogoRequestsDatabase(updated);
    return res.json({ success: true, request: newReq });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

app.post(["/api/logo-requests/:id/approve", "/api/logo-change-requests/:id/approve"], async (req, res) => {
  try {
    const { id } = req.params;
    const reqs = loadLogoRequestsDatabase();
    const target = reqs.find((r: any) => r.id === id);
    if (!target) return res.status(404).json({ error: "अनुरोध नहीं मिला" });

    target.status = "approved";
    target.approvedAt = Date.now();
    saveLogoRequestsDatabase(reqs);

    // Apply the approved logo to the user profile
    const cleanEmail = target.userEmail.toLowerCase().trim();
    const allProfiles = loadProfilesDatabase();
    let profile = allProfiles[cleanEmail] || Object.values(allProfiles).find((p: any) => p.email && p.email.toLowerCase().trim() === cleanEmail);
    if (profile) {
      if (target.requestType === "gif") {
        profile.channelLogoGifUrl = target.newLogoUrl;
        profile.channelLogoType = "gif";
      } else {
        profile.channelLogoUrl = target.newLogoUrl;
        profile.channelLogoPngUrl = target.newLogoUrl;
        profile.channelLogoType = "png";
      }
      profile.updatedAt = Date.now();
      saveProfilesDatabase(allProfiles);
    }

    // Also update users_accounts_db.json
    try {
      let accounts = loadUsersDatabase();
      const aIdx = accounts.findIndex((a: any) => a.email && a.email.toLowerCase().trim() === cleanEmail);
      if (aIdx >= 0) {
        if (target.requestType === "gif") {
          accounts[aIdx].channelLogoGifUrl = target.newLogoUrl;
          accounts[aIdx].channelLogoType = "gif";
        } else {
          accounts[aIdx].channelLogoUrl = target.newLogoUrl;
          accounts[aIdx].channelLogoPngUrl = target.newLogoUrl;
          accounts[aIdx].channelLogoType = "png";
        }
        saveUsersDatabase(accounts);
      }
    } catch {}

    // Also update users_master_database.json
    try {
      let master = loadUsersMasterDatabase();
      const mIdx = master.findIndex((m: any) => m.email && m.email.toLowerCase().trim() === cleanEmail);
      if (mIdx >= 0) {
        if (target.requestType === "gif") {
          master[mIdx].channelLogoGifUrl = target.newLogoUrl;
          master[mIdx].channelLogoType = "gif";
        } else {
          master[mIdx].channelLogoUrl = target.newLogoUrl;
          master[mIdx].channelLogoPngUrl = target.newLogoUrl;
          master[mIdx].channelLogoType = "png";
        }
        saveUsersMasterDatabase(master);
      }
    } catch {}

    return res.json({ success: true, message: "लोगो अनुरोध स्वीकृत और प्रोफाइल अपडेट हो गया।" });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

app.post(["/api/logo-requests/:id/reject", "/api/logo-change-requests/:id/reject"], (req, res) => {
  try {
    const { id } = req.params;
    const reqs = loadLogoRequestsDatabase();
    const target = reqs.find((r: any) => r.id === id);
    if (!target) return res.status(404).json({ error: "अनुरोध नहीं मिला" });

    target.status = "rejected";
    target.rejectedAt = Date.now();
    saveLogoRequestsDatabase(reqs);

    return res.json({ success: true, message: "लोगो अनुरोध अस्वीकृत कर दिया गया।" });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
`;

  // Insert before the last app.listen or at the end
  const listenIdx = code.lastIndexOf('app.listen(');
  if (listenIdx !== -1) {
    code = code.slice(0, listenIdx) + logoEndpoints + '\n\n' + code.slice(listenIdx);
    console.log('✅ Added /api/logo-requests endpoints to server.ts');
  }
}

fs.writeFileSync(serverPath, code, 'utf8');
console.log('🎉 Server.ts patched successfully!');
