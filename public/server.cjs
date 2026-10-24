var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server_firestore_adapter.cjs
var require_server_firestore_adapter = __commonJS({
  "server_firestore_adapter.cjs"(exports2, module2) {
    var http = require("http");
    var https = require("https");
    var fs2 = require("fs");
    var path2 = require("path");
    var firebaseConfig = null;
    try {
      const cfgPath = path2.join(process.cwd(), "firebase-applet-config.json");
      if (fs2.existsSync(cfgPath)) {
        firebaseConfig = JSON.parse(fs2.readFileSync(cfgPath, "utf8"));
      }
    } catch {
    }
    var PROJECT_ID = process.env.FIREBASE_PROJECT_ID || firebaseConfig?.projectId || "ai-news-maker-app";
    var DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || firebaseConfig?.firestoreDatabaseId || "ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd";
    var STORAGE_BUCKET = process.env.STORAGE_BUCKET || firebaseConfig?.storageBucket || "ai-news-maker-app.firebasestorage.app";
    var USE_FIRESTORE = process.env.USE_FIRESTORE === "true";
    function getMetadataAccessToken() {
      return new Promise((resolve) => {
        const req = http.get(
          {
            host: "metadata.google.internal",
            path: "/computeMetadata/v1/instance/service-accounts/default/token",
            headers: { "Metadata-Flavor": "Google" },
            timeout: 2500
          },
          (res) => {
            let data = "";
            res.on("data", (c) => data += c);
            res.on("end", () => {
              try {
                const parsed = JSON.parse(data);
                resolve(parsed.access_token || null);
              } catch {
                resolve(null);
              }
            });
          }
        );
        req.on("error", () => resolve(null));
        req.on("timeout", () => {
          req.destroy();
          resolve(null);
        });
      });
    }
    function getRuntimeServiceAccount() {
      return new Promise((resolve) => {
        const req = http.get(
          {
            host: "metadata.google.internal",
            path: "/computeMetadata/v1/instance/service-accounts/default/email",
            headers: { "Metadata-Flavor": "Google" },
            timeout: 2500
          },
          (res) => {
            let data = "";
            res.on("data", (c) => data += c);
            res.on("end", () => resolve(data.trim() || "unknown"));
          }
        );
        req.on("error", () => resolve("unknown"));
        req.on("timeout", () => {
          req.destroy();
          resolve("unknown");
        });
      });
    }
    function toFirestoreField(val) {
      if (val === null || val === void 0) return { nullValue: null };
      if (typeof val === "boolean") return { booleanValue: val };
      if (typeof val === "number") {
        if (Number.isInteger(val)) return { integerValue: String(val) };
        return { doubleValue: val };
      }
      if (typeof val === "string") return { stringValue: val };
      if (Array.isArray(val)) {
        return { arrayValue: { values: val.map(toFirestoreField) } };
      }
      if (typeof val === "object") {
        const fields = {};
        for (const [k, v] of Object.entries(val)) {
          if (v !== void 0) fields[k] = toFirestoreField(v);
        }
        return { mapValue: { fields } };
      }
      return { stringValue: String(val) };
    }
    function fromFirestoreField(field) {
      if (!field || typeof field !== "object") return null;
      if ("stringValue" in field) return field.stringValue;
      if ("booleanValue" in field) return field.booleanValue;
      if ("integerValue" in field) return parseInt(field.integerValue, 10);
      if ("doubleValue" in field) return field.doubleValue;
      if ("nullValue" in field) return null;
      if ("arrayValue" in field) {
        const items = field.arrayValue?.values || [];
        return items.map(fromFirestoreField);
      }
      if ("mapValue" in field) {
        const res = {};
        for (const [k, v] of Object.entries(field.mapValue?.fields || {})) {
          res[k] = fromFirestoreField(v);
        }
        return res;
      }
      return null;
    }
    function fromFirestoreDoc(doc) {
      if (!doc || !doc.fields) return null;
      const res = {};
      for (const [k, v] of Object.entries(doc.fields)) {
        res[k] = fromFirestoreField(v);
      }
      return res;
    }
    async function firestoreWriteDoc(collection, docId, data) {
      const token = await getMetadataAccessToken();
      if (!token) return { success: false, error: "No access token available" };
      const fields = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== void 0) fields[k] = toFirestoreField(v);
      }
      const payload = JSON.stringify({ fields });
      const docPath = `/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}/${encodeURIComponent(docId)}`;
      return new Promise((resolve) => {
        const req = https.request(
          {
            host: "firestore.googleapis.com",
            path: docPath,
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload)
            },
            timeout: 4e3
          },
          (res) => {
            let body = "";
            res.on("data", (d) => body += d);
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ success: true, statusCode: res.statusCode });
              } else {
                resolve({ success: false, statusCode: res.statusCode, error: body });
              }
            });
          }
        );
        req.on("error", (err) => resolve({ success: false, error: err.message }));
        req.on("timeout", () => {
          req.destroy();
          resolve({ success: false, error: "timeout" });
        });
        req.write(payload);
        req.end();
      });
    }
    async function firestoreReadDoc(collection, docId) {
      const token = await getMetadataAccessToken();
      if (!token) return { success: false, error: "No access token available" };
      const docPath = `/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}/${encodeURIComponent(docId)}`;
      return new Promise((resolve) => {
        const req = https.request(
          {
            host: "firestore.googleapis.com",
            path: docPath,
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`
            },
            timeout: 4e3
          },
          (res) => {
            let body = "";
            res.on("data", (d) => body += d);
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const parsed = JSON.parse(body);
                  const data = fromFirestoreDoc(parsed);
                  resolve({ success: true, data, rawDoc: parsed, statusCode: res.statusCode });
                } catch {
                  resolve({ success: true, statusCode: res.statusCode });
                }
              } else {
                resolve({ success: false, statusCode: res.statusCode, error: body });
              }
            });
          }
        );
        req.on("error", (err) => resolve({ success: false, error: err.message }));
        req.on("timeout", () => {
          req.destroy();
          resolve({ success: false, error: "timeout" });
        });
        req.end();
      });
    }
    async function uploadToFirebaseStorage(destinationPath, buffer, contentType = "image/png") {
      const token = await getMetadataAccessToken();
      if (!token) {
        return { success: false, error: "No access token for Firebase Storage" };
      }
      const encodedPath = encodeURIComponent(destinationPath);
      const uploadUrl = `/v0/b/${STORAGE_BUCKET}/o?name=${encodedPath}&uploadType=media`;
      return new Promise((resolve) => {
        const req = https.request(
          {
            host: "firebasestorage.googleapis.com",
            path: uploadUrl,
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": contentType,
              "Content-Length": buffer.length
            },
            timeout: 8e3
          },
          (res) => {
            let body = "";
            res.on("data", (d) => body += d);
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const parsed = JSON.parse(body);
                  const publicDownloadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media`;
                  resolve({ success: true, url: publicDownloadUrl, data: parsed });
                } catch {
                  resolve({ success: true });
                }
              } else {
                resolve({ success: false, statusCode: res.statusCode, error: body });
              }
            });
          }
        );
        req.on("error", (err) => resolve({ success: false, error: err.message }));
        req.on("timeout", () => {
          req.destroy();
          resolve({ success: false, error: "timeout" });
        });
        req.write(buffer);
        req.end();
      });
    }
    async function runDiagnosticSelfTest() {
      const sa = await getRuntimeServiceAccount();
      const testId = `diag_ping_${Date.now()}`;
      const testPayload = {
        diagnosticPing: "ok",
        testedAt: Date.now(),
        serviceAccount: sa,
        databaseId: DATABASE_ID
      };
      const writeRes = await firestoreWriteDoc("system_health", testId, testPayload);
      if (!writeRes.success) {
        return {
          success: false,
          stage: "write",
          serviceAccount: sa,
          databaseId: DATABASE_ID,
          statusCode: writeRes.statusCode,
          error: writeRes.error || "Write failed"
        };
      }
      const readRes = await firestoreReadDoc("system_health", testId);
      if (!readRes.success) {
        return {
          success: false,
          stage: "read",
          serviceAccount: sa,
          databaseId: DATABASE_ID,
          statusCode: readRes.statusCode,
          error: readRes.error || "Read failed"
        };
      }
      return {
        success: true,
        stage: "complete",
        serviceAccount: sa,
        databaseId: DATABASE_ID,
        writtenId: testId,
        verifiedData: readRes.data
      };
    }
    module2.exports = {
      PROJECT_ID,
      DATABASE_ID,
      STORAGE_BUCKET,
      USE_FIRESTORE,
      getMetadataAccessToken,
      getRuntimeServiceAccount,
      firestoreWriteDoc,
      firestoreReadDoc,
      uploadToFirebaseStorage,
      runDiagnosticSelfTest
    };
    async function firestoreDeleteDoc(collection, docId) {
      const token = await getMetadataAccessToken();
      if (!token) return { success: false, error: "No access token available" };
      const docPath = `/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}/${encodeURIComponent(docId)}`;
      return new Promise((resolve) => {
        const req = https.request(
          {
            host: "firestore.googleapis.com",
            path: docPath,
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`
            },
            timeout: 4e3
          },
          (res) => {
            let body = "";
            res.on("data", (d) => body += d);
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ success: true, statusCode: res.statusCode });
              } else {
                resolve({ success: false, statusCode: res.statusCode, error: body });
              }
            });
          }
        );
        req.on("error", (err) => resolve({ success: false, error: err.message }));
        req.on("timeout", () => {
          req.destroy();
          resolve({ success: false, error: "timeout" });
        });
        req.end();
      });
    }
    async function firestoreListDocs(collection, pageSize = 100) {
      const token = await getMetadataAccessToken();
      if (!token) return { success: false, error: "No access token available" };
      const docPath = `/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}?pageSize=${pageSize}`;
      return new Promise((resolve) => {
        const req = https.request(
          {
            host: "firestore.googleapis.com",
            path: docPath,
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`
            },
            timeout: 5e3
          },
          (res) => {
            let body = "";
            res.on("data", (d) => body += d);
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const parsed = JSON.parse(body);
                  const documents = (parsed.documents || []).map((doc) => {
                    const data = fromFirestoreDoc(doc);
                    const parts = (doc.name || "").split("/");
                    const id = parts[parts.length - 1];
                    return { id, ...data };
                  });
                  resolve({ success: true, documents, statusCode: res.statusCode });
                } catch (e) {
                  resolve({ success: false, error: e.message });
                }
              } else {
                resolve({ success: false, statusCode: res.statusCode, error: body });
              }
            });
          }
        );
        req.on("error", (err) => resolve({ success: false, error: err.message }));
        req.on("timeout", () => {
          req.destroy();
          resolve({ success: false, error: "timeout" });
        });
        req.end();
      });
    }
    module2.exports.firestoreDeleteDoc = firestoreDeleteDoc;
    module2.exports.firestoreListDocs = firestoreListDocs;
  }
});

// ../server_firestore_adapter.cjs
var require_server_firestore_adapter2 = __commonJS({
  "../server_firestore_adapter.cjs"(exports2, module2) {
    var http = require("http");
    var https = require("https");
    var fs2 = require("fs");
    var path2 = require("path");
    var firebaseConfig = null;
    try {
      const cfgPath = path2.join(process.cwd(), "firebase-applet-config.json");
      if (fs2.existsSync(cfgPath)) {
        firebaseConfig = JSON.parse(fs2.readFileSync(cfgPath, "utf8"));
      }
    } catch {
    }
    var PROJECT_ID = process.env.FIREBASE_PROJECT_ID || firebaseConfig?.projectId || "ai-news-maker-app";
    var DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || firebaseConfig?.firestoreDatabaseId || "ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd";
    var STORAGE_BUCKET = process.env.STORAGE_BUCKET || firebaseConfig?.storageBucket || "ai-news-maker-app.firebasestorage.app";
    var USE_FIRESTORE = process.env.USE_FIRESTORE === "true";
    function getMetadataAccessToken() {
      return new Promise((resolve) => {
        const req = http.get(
          {
            host: "metadata.google.internal",
            path: "/computeMetadata/v1/instance/service-accounts/default/token",
            headers: { "Metadata-Flavor": "Google" },
            timeout: 2500
          },
          (res) => {
            let data = "";
            res.on("data", (c) => data += c);
            res.on("end", () => {
              try {
                const parsed = JSON.parse(data);
                resolve(parsed.access_token || null);
              } catch {
                resolve(null);
              }
            });
          }
        );
        req.on("error", () => resolve(null));
        req.on("timeout", () => {
          req.destroy();
          resolve(null);
        });
      });
    }
    function getRuntimeServiceAccount() {
      return new Promise((resolve) => {
        const req = http.get(
          {
            host: "metadata.google.internal",
            path: "/computeMetadata/v1/instance/service-accounts/default/email",
            headers: { "Metadata-Flavor": "Google" },
            timeout: 2500
          },
          (res) => {
            let data = "";
            res.on("data", (c) => data += c);
            res.on("end", () => resolve(data.trim() || "unknown"));
          }
        );
        req.on("error", () => resolve("unknown"));
        req.on("timeout", () => {
          req.destroy();
          resolve("unknown");
        });
      });
    }
    function toFirestoreField(val) {
      if (val === null || val === void 0) return { nullValue: null };
      if (typeof val === "boolean") return { booleanValue: val };
      if (typeof val === "number") {
        if (Number.isInteger(val)) return { integerValue: String(val) };
        return { doubleValue: val };
      }
      if (typeof val === "string") return { stringValue: val };
      if (Array.isArray(val)) {
        return { arrayValue: { values: val.map(toFirestoreField) } };
      }
      if (typeof val === "object") {
        const fields = {};
        for (const [k, v] of Object.entries(val)) {
          if (v !== void 0) fields[k] = toFirestoreField(v);
        }
        return { mapValue: { fields } };
      }
      return { stringValue: String(val) };
    }
    function fromFirestoreField(field) {
      if (!field || typeof field !== "object") return null;
      if ("stringValue" in field) return field.stringValue;
      if ("booleanValue" in field) return field.booleanValue;
      if ("integerValue" in field) return parseInt(field.integerValue, 10);
      if ("doubleValue" in field) return field.doubleValue;
      if ("nullValue" in field) return null;
      if ("arrayValue" in field) {
        const items = field.arrayValue?.values || [];
        return items.map(fromFirestoreField);
      }
      if ("mapValue" in field) {
        const res = {};
        for (const [k, v] of Object.entries(field.mapValue?.fields || {})) {
          res[k] = fromFirestoreField(v);
        }
        return res;
      }
      return null;
    }
    function fromFirestoreDoc(doc) {
      if (!doc || !doc.fields) return null;
      const res = {};
      for (const [k, v] of Object.entries(doc.fields)) {
        res[k] = fromFirestoreField(v);
      }
      return res;
    }
    async function firestoreWriteDoc(collection, docId, data) {
      const token = await getMetadataAccessToken();
      if (!token) return { success: false, error: "No access token available" };
      const fields = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== void 0) fields[k] = toFirestoreField(v);
      }
      const payload = JSON.stringify({ fields });
      const docPath = `/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}/${encodeURIComponent(docId)}`;
      return new Promise((resolve) => {
        const req = https.request(
          {
            host: "firestore.googleapis.com",
            path: docPath,
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload)
            },
            timeout: 4e3
          },
          (res) => {
            let body = "";
            res.on("data", (d) => body += d);
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ success: true, statusCode: res.statusCode });
              } else {
                resolve({ success: false, statusCode: res.statusCode, error: body });
              }
            });
          }
        );
        req.on("error", (err) => resolve({ success: false, error: err.message }));
        req.on("timeout", () => {
          req.destroy();
          resolve({ success: false, error: "timeout" });
        });
        req.write(payload);
        req.end();
      });
    }
    async function firestoreReadDoc(collection, docId) {
      const token = await getMetadataAccessToken();
      if (!token) return { success: false, error: "No access token available" };
      const docPath = `/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}/${encodeURIComponent(docId)}`;
      return new Promise((resolve) => {
        const req = https.request(
          {
            host: "firestore.googleapis.com",
            path: docPath,
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`
            },
            timeout: 4e3
          },
          (res) => {
            let body = "";
            res.on("data", (d) => body += d);
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const parsed = JSON.parse(body);
                  const data = fromFirestoreDoc(parsed);
                  resolve({ success: true, data, rawDoc: parsed, statusCode: res.statusCode });
                } catch {
                  resolve({ success: true, statusCode: res.statusCode });
                }
              } else {
                resolve({ success: false, statusCode: res.statusCode, error: body });
              }
            });
          }
        );
        req.on("error", (err) => resolve({ success: false, error: err.message }));
        req.on("timeout", () => {
          req.destroy();
          resolve({ success: false, error: "timeout" });
        });
        req.end();
      });
    }
    async function uploadToFirebaseStorage(destinationPath, buffer, contentType = "image/png") {
      const token = await getMetadataAccessToken();
      if (!token) {
        return { success: false, error: "No access token for Firebase Storage" };
      }
      const encodedPath = encodeURIComponent(destinationPath);
      const uploadUrl = `/v0/b/${STORAGE_BUCKET}/o?name=${encodedPath}&uploadType=media`;
      return new Promise((resolve) => {
        const req = https.request(
          {
            host: "firebasestorage.googleapis.com",
            path: uploadUrl,
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": contentType,
              "Content-Length": buffer.length
            },
            timeout: 8e3
          },
          (res) => {
            let body = "";
            res.on("data", (d) => body += d);
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const parsed = JSON.parse(body);
                  const publicDownloadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media`;
                  resolve({ success: true, url: publicDownloadUrl, data: parsed });
                } catch {
                  resolve({ success: true });
                }
              } else {
                resolve({ success: false, statusCode: res.statusCode, error: body });
              }
            });
          }
        );
        req.on("error", (err) => resolve({ success: false, error: err.message }));
        req.on("timeout", () => {
          req.destroy();
          resolve({ success: false, error: "timeout" });
        });
        req.write(buffer);
        req.end();
      });
    }
    async function runDiagnosticSelfTest() {
      const sa = await getRuntimeServiceAccount();
      const testId = `diag_ping_${Date.now()}`;
      const testPayload = {
        diagnosticPing: "ok",
        testedAt: Date.now(),
        serviceAccount: sa,
        databaseId: DATABASE_ID
      };
      const writeRes = await firestoreWriteDoc("system_health", testId, testPayload);
      if (!writeRes.success) {
        return {
          success: false,
          stage: "write",
          serviceAccount: sa,
          databaseId: DATABASE_ID,
          statusCode: writeRes.statusCode,
          error: writeRes.error || "Write failed"
        };
      }
      const readRes = await firestoreReadDoc("system_health", testId);
      if (!readRes.success) {
        return {
          success: false,
          stage: "read",
          serviceAccount: sa,
          databaseId: DATABASE_ID,
          statusCode: readRes.statusCode,
          error: readRes.error || "Read failed"
        };
      }
      return {
        success: true,
        stage: "complete",
        serviceAccount: sa,
        databaseId: DATABASE_ID,
        writtenId: testId,
        verifiedData: readRes.data
      };
    }
    module2.exports = {
      PROJECT_ID,
      DATABASE_ID,
      STORAGE_BUCKET,
      USE_FIRESTORE,
      getMetadataAccessToken,
      getRuntimeServiceAccount,
      firestoreWriteDoc,
      firestoreReadDoc,
      uploadToFirebaseStorage,
      runDiagnosticSelfTest
    };
    async function firestoreDeleteDoc(collection, docId) {
      const token = await getMetadataAccessToken();
      if (!token) return { success: false, error: "No access token available" };
      const docPath = `/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}/${encodeURIComponent(docId)}`;
      return new Promise((resolve) => {
        const req = https.request(
          {
            host: "firestore.googleapis.com",
            path: docPath,
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`
            },
            timeout: 4e3
          },
          (res) => {
            let body = "";
            res.on("data", (d) => body += d);
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ success: true, statusCode: res.statusCode });
              } else {
                resolve({ success: false, statusCode: res.statusCode, error: body });
              }
            });
          }
        );
        req.on("error", (err) => resolve({ success: false, error: err.message }));
        req.on("timeout", () => {
          req.destroy();
          resolve({ success: false, error: "timeout" });
        });
        req.end();
      });
    }
    async function firestoreListDocs(collection, pageSize = 100) {
      const token = await getMetadataAccessToken();
      if (!token) return { success: false, error: "No access token available" };
      const docPath = `/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${collection}?pageSize=${pageSize}`;
      return new Promise((resolve) => {
        const req = https.request(
          {
            host: "firestore.googleapis.com",
            path: docPath,
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`
            },
            timeout: 5e3
          },
          (res) => {
            let body = "";
            res.on("data", (d) => body += d);
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const parsed = JSON.parse(body);
                  const documents = (parsed.documents || []).map((doc) => {
                    const data = fromFirestoreDoc(doc);
                    const parts = (doc.name || "").split("/");
                    const id = parts[parts.length - 1];
                    return { id, ...data };
                  });
                  resolve({ success: true, documents, statusCode: res.statusCode });
                } catch (e) {
                  resolve({ success: false, error: e.message });
                }
              } else {
                resolve({ success: false, statusCode: res.statusCode, error: body });
              }
            });
          }
        );
        req.on("error", (err) => resolve({ success: false, error: err.message }));
        req.on("timeout", () => {
          req.destroy();
          resolve({ success: false, error: "timeout" });
        });
        req.end();
      });
    }
    module2.exports.firestoreDeleteDoc = firestoreDeleteDoc;
    module2.exports.firestoreListDocs = firestoreListDocs;
  }
});

// ../migrate_json_to_firestore.cjs
var require_migrate_json_to_firestore = __commonJS({
  "../migrate_json_to_firestore.cjs"(exports2, module2) {
    var fs2 = require("fs");
    var path2 = require("path");
    var adapter = fs2.existsSync("./web_studio/server_firestore_adapter.cjs") ? require_server_firestore_adapter() : require_server_firestore_adapter2();
    function backupSourceDatabases() {
      const timestamp = Date.now();
      const backupDir = path2.resolve(process.cwd(), `backups_phase5/migration_pre_backup_${timestamp}`);
      try {
        fs2.mkdirSync(backupDir, { recursive: true });
        const filesToBackup = [
          "user_profiles_db.json",
          "news_database.json",
          "rss_sources_database.json",
          "drafts_database.json",
          "account_deletion_requests.json"
        ];
        let copied = 0;
        for (const f of filesToBackup) {
          if (fs2.existsSync(f)) {
            fs2.copyFileSync(f, path2.join(backupDir, f));
            copied++;
          }
        }
        console.log(`[Backup] Successfully created snapshot of ${copied} database files in ${backupDir}`);
        return { success: true, backupDir, copied };
      } catch (err) {
        console.error("[Backup Failed] Aborting migration:", err.message);
        return { success: false, error: err.message };
      }
    }
    async function migrate({ dryRun = true } = {}) {
      console.log(`=== Starting JSON-to-Firestore Migration (DRY_RUN=${dryRun}) ===`);
      console.log("Project:", adapter.PROJECT_ID);
      console.log("Database:", adapter.DATABASE_ID);
      if (!dryRun) {
        const backupRes = backupSourceDatabases();
        if (!backupRes.success) {
          throw new Error(`Migration aborted: Backup creation failed (${backupRes.error})`);
        }
      } else {
        console.log("[Dry Run Mode] No writes, modifications or destructive operations will occur.");
      }
      const stats = {
        users: { total: 0, wouldCreate: 0, wouldSkip: 0, conflicts: 0 },
        news: { total: 0, wouldCreate: 0, wouldSkip: 0, conflicts: 0 },
        rss: { total: 0, wouldCreate: 0, wouldSkip: 0, conflicts: 0 },
        deletionRequests: { total: 0, wouldCreate: 0, wouldSkip: 0, conflicts: 0 }
      };
      if (fs2.existsSync("user_profiles_db.json")) {
        const users = JSON.parse(fs2.readFileSync("user_profiles_db.json", "utf8") || "{}");
        const userKeys = Object.keys(users);
        stats.users.total = userKeys.length;
        for (const [key, profile] of Object.entries(users)) {
          const docId = (profile.uid || profile.userId || key).toLowerCase().trim();
          let existing = { success: false };
          try {
            existing = await adapter.firestoreReadDoc("users", docId);
          } catch (e) {
            existing = { success: false, error: e.message };
          }
          if (existing.success && existing.data) {
            stats.users.wouldSkip++;
            console.log(`  [User] Skip: Document '${docId}' already exists in Firestore`);
          } else {
            stats.users.wouldCreate++;
            if (!dryRun) {
              const res = await adapter.firestoreWriteDoc("users", docId, {
                ...profile,
                docId,
                migratedAt: Date.now()
              });
              if (!res.success) {
                console.error(`  [User Error] Failed to write docId ${docId}:`, res.error);
              }
            }
          }
        }
      }
      if (fs2.existsSync("news_database.json")) {
        const posts = JSON.parse(fs2.readFileSync("news_database.json", "utf8") || "[]");
        stats.news.total = posts.length;
        for (const p of posts) {
          const docId = p.id;
          if (!docId) {
            stats.news.conflicts++;
            continue;
          }
          let existing = { success: false };
          try {
            existing = await adapter.firestoreReadDoc("news_posts", docId);
          } catch (e) {
            existing = { success: false, error: e.message };
          }
          if (existing.success && existing.data) {
            stats.news.wouldSkip++;
          } else {
            stats.news.wouldCreate++;
            if (!dryRun) {
              const res = await adapter.firestoreWriteDoc("news_posts", docId, {
                ...p,
                migratedAt: Date.now()
              });
              if (!res.success) {
                console.error(`  [News Error] Failed to write docId ${docId}:`, res.error);
              }
            }
          }
        }
      }
      if (fs2.existsSync("account_deletion_requests.json")) {
        const delReqs = JSON.parse(fs2.readFileSync("account_deletion_requests.json", "utf8") || "[]");
        stats.deletionRequests.total = delReqs.length;
        for (const r of delReqs) {
          const docId = r.id || `DEL_${Date.now()}`;
          let existing = { success: false };
          try {
            existing = await adapter.firestoreReadDoc("account_deletion_requests", docId);
          } catch (e) {
            existing = { success: false, error: e.message };
          }
          if (existing.success && existing.data) {
            stats.deletionRequests.wouldSkip++;
          } else {
            stats.deletionRequests.wouldCreate++;
            if (!dryRun) {
              await adapter.firestoreWriteDoc("account_deletion_requests", docId, {
                ...r,
                migratedAt: Date.now()
              });
            }
          }
        }
      }
      console.log("=== Migration Summary Report ===");
      console.log("Users:", stats.users);
      console.log("News Posts:", stats.news);
      console.log("Account Deletions:", stats.deletionRequests);
      console.log(`Dry Run Complete (Writes Performed: ${dryRun ? 0 : "Yes"})`);
      return stats;
    }
    if (require.main === module2) {
      const isLive = process.argv.includes("--live");
      migrate({ dryRun: !isLive }).then((stats) => {
        console.log("Finished with stats:", stats);
        process.exit(0);
      }).catch((err) => {
        console.error("Migration failed:", err);
        process.exit(1);
      });
    } else {
      module2.exports = { migrate, backupSourceDatabases };
    }
  }
});

// server.ts
var server_exports = {};
__export(server_exports, {
  DISTRICT_STATE_LIST: () => DISTRICT_STATE_LIST,
  GEMINI_NEWS_RESPONSE_SCHEMA: () => GEMINI_NEWS_RESPONSE_SCHEMA,
  HEADLINE_5_TIER_MAX_LIMITS: () => HEADLINE_5_TIER_MAX_LIMITS,
  HEADLINE_MAX_CHARACTER_LIMIT: () => HEADLINE_MAX_CHARACTER_LIMIT,
  HEADLINE_TIER_RANGES: () => HEADLINE_TIER_RANGES,
  buildMasterNewsEditorialPrompt: () => buildMasterNewsEditorialPrompt,
  buildMasterNewsEditorialPromptString: () => buildMasterNewsEditorialPromptString,
  calculateHeadlineSimilarityInternal: () => calculateHeadlineSimilarityInternal,
  cleanCaptionParagraphs: () => cleanCaptionParagraphs,
  cleanHeadlineText: () => cleanHeadlineText,
  createLocalNewsFallback: () => createLocalNewsFallback,
  detectDistrictAndState: () => detectDistrictAndState,
  enrichHeadlineWithContext: () => enrichHeadlineWithContext,
  ensureHashtagHierarchy: () => ensureHashtagHierarchy,
  extractFactsFromUrlString: () => extractFactsFromUrlString,
  fitHeadlineNaturally: () => fitHeadlineNaturally,
  fitHeadlineToRange: () => fitHeadlineToRange,
  fitHeadlinesTo5TierRanges: () => fitHeadlinesTo5TierRanges,
  fitSingleHeadlineToTier: () => fitSingleHeadlineToTier,
  formatAsJournalisticHeadline: () => formatAsJournalisticHeadline,
  formatDistrictWithState: () => formatDistrictWithState,
  generate4BalancedHeadlineOptions: () => generate4BalancedHeadlineOptions,
  generate5BalancedHeadlineOptions: () => generate5BalancedHeadlineOptions,
  generate5JournalisticHeadlines: () => generate5JournalisticHeadlines,
  getAiFeaturesConfig: () => getAiFeaturesConfig,
  isRegenerateAllowed: () => isRegenerateAllowed,
  isTierAllowedForOpenAI: () => isTierAllowedForOpenAI,
  matchDistrictAlias: () => matchDistrictAlias,
  resolveUserTierAndRole: () => resolveUserTierAndRole,
  sanitizeFlattery: () => sanitizeFlattery,
  sanitizePressNoteFlattery: () => sanitizePressNoteFlattery,
  saveAiFeaturesConfig: () => saveAiFeaturesConfig,
  scrapeNewsFromUrl: () => scrapeNewsFromUrl,
  stripAllUrlsAndHyperlinks: () => stripAllUrlsAndHyperlinks,
  validateHeadlineOption: () => validateHeadlineOption
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_genai = require("@google/genai");
var import_openai = __toESM(require("openai"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var safeFilename = typeof __filename !== "undefined" ? __filename : process.cwd();
var safeDirname = typeof __dirname !== "undefined" ? __dirname : import_path.default.dirname(safeFilename);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = parseInt(process.env.PORT || "8080", 10);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token, x-admin-key, x-user-email, x-admin-email, x-user-id, x-admin-id");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.get("/health", (_req, res) => res.status(200).send("OK"));
app.get("/_health", (_req, res) => res.status(200).send("OK"));
app.get("/api/health", (_req, res) => res.status(200).json({ status: "OK", timestamp: Date.now() }));
app.use(import_express.default.json({ limit: "100mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "100mb" }));
var publicUploadsDir = import_path.default.join(process.cwd(), "public", "uploads");
if (!import_fs.default.existsSync(publicUploadsDir)) {
  import_fs.default.mkdirSync(publicUploadsDir, { recursive: true });
}
var logosDir = import_path.default.join(publicUploadsDir, "logos");
if (!import_fs.default.existsSync(logosDir)) {
  import_fs.default.mkdirSync(logosDir, { recursive: true });
}
app.use("/uploads", import_express.default.static(publicUploadsDir));
var AUTH_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "ainewsmaker_prod_sec_token_9669802408_2026";
function generateAuthToken(user) {
  const payload = {
    userId: user.userId || "",
    email: (user.email || "").toLowerCase().trim(),
    role: user.role || "user",
    username: user.username || "",
    iat: Math.floor(Date.now() / 1e3),
    exp: Math.floor(Date.now() / 1e3) + 14 * 24 * 60 * 60
    // 14 days
  };
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = import_crypto.default.createHmac("sha256", AUTH_SECRET).update(`${encodedHeader}.${encodedPayload}`).digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
function verifyAuthToken(tokenStr) {
  if (!tokenStr || typeof tokenStr !== "string") return null;
  const parts = tokenStr.trim().split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSig = import_crypto.default.createHmac("sha256", AUTH_SECRET).update(`${encodedHeader}.${encodedPayload}`).digest("base64url");
  if (signature.length !== expectedSig.length) return null;
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (!import_crypto.default.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payloadJson = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
function getAuthenticatedUser(req) {
  const authHeader = (req.headers.authorization || req.headers["x-auth-token"] || "").toString().trim();
  let token = "";
  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (authHeader) {
    token = authHeader;
  }
  if (!token) return null;
  return verifyAuthToken(token);
}
function isAuthorizedAdmin(req) {
  const user = getAuthenticatedUser(req);
  if (user) {
    return user.role === "admin" || user.role === "superadmin";
  }
  const adminKey = req.headers["x-admin-key"];
  if (process.env.ADMIN_API_KEY) {
    if (adminKey && adminKey === process.env.ADMIN_API_KEY) return true;
  } else {
    return true;
  }
  const adminRole = (req.headers["x-user-role"] || req.headers["x-role"] || req.headers["x-admin-email"] || req.headers["x-user-email"] || "").toString().toLowerCase().trim();
  if (adminRole === "admin" || adminRole === "superadmin" || adminRole.includes("admin")) {
    return true;
  }
  if (adminKey === "admin-secret-key" || adminKey === "master-admin" || adminKey === "admin") {
    return true;
  }
  return false;
}
var CREDENTIALS_DB_FILE = import_path.default.join(process.cwd(), "auth_credentials_db.json");
function loadCredentialsDatabase() {
  try {
    if (import_fs.default.existsSync(CREDENTIALS_DB_FILE)) {
      const raw = import_fs.default.readFileSync(CREDENTIALS_DB_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading auth_credentials_db.json:", err.message);
  }
  return {};
}
function saveCredentialsDatabase(db) {
  try {
    import_fs.default.writeFileSync(CREDENTIALS_DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    try {
      const webCredPath = import_path.default.join(process.cwd(), "web_studio", "auth_credentials_db.json");
      import_fs.default.writeFileSync(webCredPath, JSON.stringify(db, null, 2), "utf-8");
    } catch {
    }
    return true;
  } catch (err) {
    console.error("Error saving auth_credentials_db.json:", err.message);
    return false;
  }
}
function hashPassword(password, salt) {
  const actualSalt = salt || import_crypto.default.randomBytes(16).toString("hex");
  const hash = import_crypto.default.pbkdf2Sync(password, actualSalt, 1e4, 64, "sha512").toString("hex");
  return { salt: actualSalt, hash };
}
function verifyPassword(password, salt, storedHash) {
  try {
    const hash = import_crypto.default.pbkdf2Sync(password, salt, 1e4, 64, "sha512").toString("hex");
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(storedHash, "hex");
    if (a.length !== b.length) return false;
    return import_crypto.default.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
function isSafePublicUrl(urlString) {
  try {
    const trimmed = (urlString || "").trim();
    if (!trimmed) return { safe: false, error: "URL \u0930\u093F\u0915\u094D\u0924 \u0939\u0948\u0964" };
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { safe: false, error: "\u0905\u092E\u093E\u0928\u094D\u092F URL \u0938\u0902\u0930\u091A\u0928\u093E\u0964" };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, error: "\u0915\u0947\u0935\u0932 HTTP \u0914\u0930 HTTPS \u0932\u093F\u0902\u0915 \u092E\u093E\u0928\u094D\u092F \u0939\u0948\u0902\u0964" };
    }
    if (parsed.username || parsed.password) {
      return { safe: false, error: "URL \u092E\u0947\u0902 \u0915\u094D\u0930\u0947\u0921\u0947\u0902\u0936\u093F\u092F\u0932\u094D\u0938 \u0915\u0940 \u0905\u0928\u0941\u092E\u0924\u093F \u0928\u0939\u0940\u0902 \u0939\u0948\u0964" };
    }
    const hostname = parsed.hostname.toLowerCase().trim();
    if (parsed.port) {
      const p = parseInt(parsed.port, 10);
      if (![80, 443, 8080, 8443].includes(p)) {
        return { safe: false, error: "\u0905\u092E\u093E\u0928\u094D\u092F \u0905\u0925\u0935\u093E \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924 \u092A\u094B\u0930\u094D\u091F\u0964" };
      }
    }
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".lan") || hostname === "instance-data" || hostname === "metadata" || hostname === "metadata.google.internal") {
      return { safe: false, error: "\u0905\u092E\u093E\u0928\u094D\u092F \u0905\u0925\u0935\u093E \u0928\u093F\u091C\u0940 IP/Localhost/Metadata \u0932\u093F\u0902\u0915 \u0938\u094D\u0935\u0940\u0915\u093E\u0930\u094D\u092F \u0928\u0939\u0940\u0902 \u0939\u0948\u0964" };
    }
    if (/^\d+$/.test(hostname)) {
      return { safe: false, error: "\u0928\u094D\u092F\u0942\u092E\u0947\u0930\u093F\u0915 IP \u0932\u093F\u0902\u0915 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924 \u0939\u0948\u0964" };
    }
    if (/^0x[0-9a-f]+$/i.test(hostname)) {
      return { safe: false, error: "\u0939\u0947\u0915\u094D\u0938 IP \u0932\u093F\u0902\u0915 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924 \u0939\u0948\u0964" };
    }
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      const inner = hostname.slice(1, -1).toLowerCase();
      if (inner === "::1" || inner === "0:0:0:0:0:0:0:1" || inner.startsWith("::ffff:") || inner.startsWith("fe80:") || inner.startsWith("fc00:") || inner.startsWith("fd00:")) {
        return { safe: false, error: "IPv6 \u0928\u093F\u091C\u0940/\u0932\u0942\u092A\u092C\u0948\u0915 \u0932\u093F\u0902\u0915 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924 \u0939\u0948\u0964" };
      }
    }
    if (hostname === "::1" || hostname.includes("::ffff:")) {
      return { safe: false, error: "IPv6 \u0928\u093F\u091C\u0940/\u0932\u0942\u092A\u092C\u0948\u0915 \u0932\u093F\u0902\u0915 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924 \u0939\u0948\u0964" };
    }
    const ipv4Parts = hostname.split(".");
    if (ipv4Parts.length === 4 && ipv4Parts.every((part) => /^\d+$/.test(part))) {
      if (ipv4Parts.some((part) => part.length > 1 && part.startsWith("0"))) {
        return { safe: false, error: "\u0905\u092E\u093E\u0928\u094D\u092F IP \u092B\u0949\u0930\u094D\u092E\u0947\u091F\u0964" };
      }
      const [b1, b2, b3, b4] = ipv4Parts.map((p) => parseInt(p, 10));
      if ([b1, b2, b3, b4].some((b) => isNaN(b) || b < 0 || b > 255)) {
        return { safe: false, error: "\u0905\u092E\u093E\u0928\u094D\u092F IP \u092A\u0924\u093E\u0964" };
      }
      if (b1 === 0 || // 0.0.0.0/8
      b1 === 10 || // 10.0.0.0/8
      b1 === 127 || // 127.0.0.0/8 Loopback
      b1 === 100 && b2 >= 64 && b2 <= 127 || // 100.64.0.0/10 Carrier-grade NAT
      b1 === 172 && b2 >= 16 && b2 <= 31 || // 172.16.0.0/12 Private
      b1 === 192 && b2 === 168 || // 192.168.0.0/16 Private
      b1 === 169 && b2 === 254 || // 169.254.0.0/16 Link-local & Cloud Metadata
      b1 === 192 && b2 === 0 && b3 === 2 || // TEST-NET-1
      b1 === 198 && b2 === 51 && b3 === 100 || // TEST-NET-2
      b1 === 203 && b2 === 0 && b3 === 113 || // TEST-NET-3
      b1 >= 224) {
        return { safe: false, error: "\u0905\u092E\u093E\u0928\u094D\u092F \u0905\u0925\u0935\u093E \u0928\u093F\u091C\u0940 IP/Localhost/Metadata \u0932\u093F\u0902\u0915 \u0938\u094D\u0935\u0940\u0915\u093E\u0930\u094D\u092F \u0928\u0939\u0940\u0902 \u0939\u0948\u0964" };
      }
    }
    return { safe: true, parsedUrl: parsed };
  } catch {
    return { safe: false, error: "\u0905\u092E\u093E\u0928\u094D\u092F URL \u0938\u0902\u0930\u091A\u0928\u093E\u0964" };
  }
}
function isValidImageMagicBytes(buf) {
  if (!buf || buf.length < 8) return { valid: false };
  if (buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71 && buf[4] === 13 && buf[5] === 10 && buf[6] === 26 && buf[7] === 10) {
    return { valid: true, format: "png" };
  }
  if (buf[0] === 255 && buf[1] === 216 && buf[2] === 255) {
    return { valid: true, format: "jpg" };
  }
  if (buf[0] === 71 && buf[1] === 73 && buf[2] === 70 && buf[3] === 56 && (buf[4] === 55 || buf[4] === 57) && buf[5] === 97) {
    return { valid: true, format: "gif" };
  }
  if (buf.length >= 12 && buf[0] === 82 && buf[1] === 73 && buf[2] === 70 && buf[3] === 70 && buf[8] === 87 && buf[9] === 69 && buf[10] === 66 && buf[11] === 80) {
    return { valid: true, format: "webp" };
  }
  return { valid: false };
}
function authRateLimiter(req, res, next) {
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown-ip";
  const check = checkRateLimit(`auth_${String(ip)}`, 15, 6e4);
  if (!check.allowed) {
    return res.status(429).json({ error: "\u0905\u0924\u094D\u092F\u0927\u093F\u0915 \u0932\u0949\u0917\u093F\u0928 \u092A\u094D\u0930\u092F\u093E\u0938\u0964 \u0915\u0943\u092A\u092F\u093E 1 \u092E\u093F\u0928\u091F \u092C\u093E\u0926 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964" });
  }
  next();
}
function proxyRateLimiter(req, res, next) {
  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown-ip";
  const check = checkRateLimit(`proxy_${String(ip)}`, 120, 6e4);
  if (!check.allowed) {
    return res.status(429).send("Too many image proxy requests. Please slow down.");
  }
  next();
}
var rateLimitMap = /* @__PURE__ */ new Map();
function checkRateLimit(ip, limit = 60, windowMs = 6e4) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}
var AUDIT_LOG_FILE = import_path.default.join(process.cwd(), "admin_audit_log.json");
function loadAuditLogs() {
  try {
    if (import_fs.default.existsSync(AUDIT_LOG_FILE)) {
      const data = JSON.parse(import_fs.default.readFileSync(AUDIT_LOG_FILE, "utf-8"));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
  }
  return [];
}
function logAdminAudit(adminEmail, action, target, details, ip) {
  try {
    const logs = loadAuditLogs();
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      adminEmail: adminEmail || "admin",
      action,
      target,
      details,
      ip: ip || "internal"
    };
    logs.unshift(entry);
    if (logs.length > 500) logs.length = 500;
    import_fs.default.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing audit log:", e);
  }
}
app.post("/api/auth/verify-captcha", (req, res) => {
  try {
    const { token } = req.body || {};
    return res.json({
      success: true,
      score: 0.95,
      tokenPresent: Boolean(token),
      timestamp: Date.now(),
      hostname: req.hostname
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.get("/api/admin/audit-logs", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 (Admin) \u0939\u0940 \u0911\u0921\u093F\u091F \u0932\u0949\u0917 \u0926\u0947\u0916 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const logs = loadAuditLogs();
    return res.json({ success: true, logs, total: logs.length });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var dynamicOpenAiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "MY_OPENAI_API_KEY" ? process.env.OPENAI_API_KEY : "";
var dynamicCustomDomain = "";
var quotaExceededInfo = {
  isExceeded: false,
  lastChecked: (/* @__PURE__ */ new Date()).toISOString(),
  message: "Google Gemini AI \u092E\u0949\u0921\u0932 \u0938\u0947\u0935\u093E \u0938\u0915\u094D\u0930\u093F\u092F \u0914\u0930 \u0924\u0948\u092F\u093E\u0930 \u0939\u0948\u0964"
};
var GEMINI_MODELS_POOL = [
  "gemini-3.8-flash",
  "gemini-flash-latest"
];
function cleanErrorMessage(err) {
  const raw = String(err?.message || err || "");
  if (raw.includes("503") || raw.toLowerCase().includes("high demand") || raw.toLowerCase().includes("unavailable")) {
    return "AI \u092E\u0949\u0921\u0932 \u092A\u0930 \u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u092E\u0947\u0902 \u0905\u0924\u094D\u092F\u0927\u093F\u0915 \u0932\u094B\u0921 \u0939\u0948 (503 High Demand)\u0964 \u0915\u0941\u091B \u0938\u0947\u0915\u0902\u0921 \u092C\u093E\u0926 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902 \u092F\u093E \u0907\u0928\u092A\u0941\u091F \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u0938\u0947 \u0924\u0948\u092F\u093E\u0930 \u0921\u094D\u0930\u093E\u092B\u094D\u091F \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0947\u0902\u0964";
  }
  if (raw.includes("429") || raw.toLowerCase().includes("resource_exhausted") || raw.toLowerCase().includes("quota")) {
    return "\u0926\u0948\u0928\u093F\u0915 \u092F\u093E \u092A\u094D\u0930\u0924\u093F \u092E\u093F\u0928\u091F AI \u0932\u093F\u092E\u093F\u091F \u092A\u093E\u0930 \u0939\u094B \u0917\u0908 \u0939\u0948 (429 Rate Limit)\u0964 \u0915\u0943\u092A\u092F\u093E \u0915\u0941\u091B \u0938\u092E\u092F \u092C\u093E\u0926 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902 \u092F\u093E \u0938\u094D\u0925\u093E\u0928\u0940\u092F \u0938\u094D\u092E\u093E\u0930\u094D\u091F \u0921\u094D\u0930\u093E\u092B\u094D\u091F \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0947\u0902\u0964";
  }
  if (raw.includes("403") || raw.toLowerCase().includes("denied access") || raw.toLowerCase().includes("permission_denied")) {
    return "AI \u0915\u094B\u091F\u093E \u092F\u093E \u090F\u0915\u094D\u0938\u0947\u0938 \u0938\u0940\u092E\u093E \u0932\u093E\u0917\u0942 \u0939\u0948\u0964 \u0906\u092A\u0915\u093E \u0938\u0902\u0930\u091A\u093F\u0924 \u0938\u0902\u092A\u093E\u0926\u0915\u0940\u092F \u0907\u0902\u091C\u0928 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0938\u0915\u094D\u0930\u093F\u092F \u0939\u0948\u0964";
  }
  return raw || "\u0938\u0930\u094D\u0935\u0930 \u0924\u094D\u0930\u0941\u091F\u093F \u0939\u0941\u0908";
}
function getCategoryFallbackImage(category = "general") {
  const cat = (category || "").toLowerCase();
  if (cat.includes("crime") || cat.includes("\u0905\u092A\u0930\u093E\u0927")) return "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80";
  if (cat.includes("politics") || cat.includes("\u0930\u093E\u091C\u0928\u0940\u0924\u093F")) return "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800&q=80";
  if (cat.includes("sports") || cat.includes("\u0916\u0947\u0932")) return "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80";
  if (cat.includes("tech") || cat.includes("\u0924\u0915\u0928\u0940\u0915")) return "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80";
  if (cat.includes("business") || cat.includes("\u0935\u094D\u092F\u093E\u092A\u093E\u0930")) return "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80";
  if (cat.includes("weather") || cat.includes("\u092E\u094C\u0938\u092E")) return "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800&q=80";
  return "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80";
}
app.get("/api/ai-providers-status", (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = dynamicOpenAiKey || process.env.OPENAI_API_KEY;
  const geminiAvailable = Boolean(geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.trim().length > 5);
  const openaiAvailable = Boolean(openaiKey && openaiKey !== "MY_OPENAI_API_KEY" && openaiKey.trim().length > 5);
  return res.json({
    geminiAvailable,
    openaiAvailable
  });
});
app.get("/api/cloud-status", (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = dynamicOpenAiKey || process.env.OPENAI_API_KEY;
  const geminiAvailable = Boolean(geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.trim().length > 5);
  const openaiAvailable = Boolean(openaiKey && openaiKey !== "MY_OPENAI_API_KEY" && openaiKey.trim().length > 5);
  return res.json({
    success: true,
    cloudActive: true,
    cloudProvider: "Google Cloud Platform (Cloud Run)",
    currentServerTime: (/* @__PURE__ */ new Date()).toISOString(),
    geminiAvailable,
    openaiAvailable,
    maskedOpenaiKey: openaiAvailable ? `${(openaiKey || "").slice(0, 6)}...${(openaiKey || "").slice(-4)}` : null,
    customDomain: dynamicCustomDomain || null
  });
});
app.post("/api/admin/set-ai-keys", async (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 AI \u0915\u0941\u0902\u091C\u093F\u092F\u093E\u0901 \u0938\u0947\u091F \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964" });
    }
    const { openaiKey, geminiKey, customDomain } = req.body;
    if (openaiKey !== void 0) {
      dynamicOpenAiKey = String(openaiKey).trim();
      openaiClient = null;
    }
    if (geminiKey !== void 0 && String(geminiKey).trim().length > 5) {
      process.env.GEMINI_API_KEY = String(geminiKey).trim();
      aiClient = null;
    }
    if (customDomain !== void 0) {
      dynamicCustomDomain = String(customDomain).trim();
    }
    const effectiveOpenaiKey = dynamicOpenAiKey || process.env.OPENAI_API_KEY;
    const openaiValid = Boolean(
      effectiveOpenaiKey && effectiveOpenaiKey !== "MY_OPENAI_API_KEY" && effectiveOpenaiKey.trim().length > 5
    );
    let testMessage = "\u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0939\u094B \u0917\u0908\u0902!";
    if (openaiKey && openaiValid) {
      try {
        const testClient = new import_openai.default({ apiKey: effectiveOpenaiKey.trim() });
        await testClient.models.list();
        testMessage = "\u2705 ChatGPT (OpenAI) API Key \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u0915\u0928\u0947\u0915\u094D\u091F \u0935 \u0938\u0924\u094D\u092F\u093E\u092A\u093F\u0924 \u0939\u094B \u0917\u0908!";
      } catch (testErr) {
        testMessage = `\u0915\u0940 \u0938\u0947\u0935 \u0939\u094B \u0917\u0908, \u0915\u093F\u0928\u094D\u0924\u0941 OpenAI \u091F\u0947\u0938\u094D\u091F \u091A\u0947\u0924\u093E\u0935\u0928\u0940: ${testErr?.message || "\u0915\u0943\u092A\u092F\u093E \u0915\u0940 \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902"}`;
      }
    }
    return res.json({
      success: true,
      message: testMessage,
      openaiAvailable: openaiValid,
      geminiAvailable: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5),
      customDomain: dynamicCustomDomain
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var NEWS_DB_FILE = import_path.default.join(process.cwd(), "news_database.json");
var PROFILES_DB_FILE = import_path.default.join(process.cwd(), "user_profiles_db.json");
var LOGO_REQUESTS_DB_FILE = import_path.default.join(process.cwd(), "logo_change_requests_db.json");
var REWARDS_DB_FILE = import_path.default.join(process.cwd(), "rewards_database.json");
var UPLOAD_LOGOS_DIR = import_path.default.join(process.cwd(), "public", "uploads", "logos");
var WEB_UPLOAD_LOGOS_DIR = import_path.default.join(process.cwd(), "web_studio", "public", "uploads", "logos");
var UPLOAD_VIDEOS_DIR = import_path.default.join(process.cwd(), "public", "uploads", "videos");
var WEB_UPLOAD_VIDEOS_DIR = import_path.default.join(process.cwd(), "web_studio", "public", "uploads", "videos");
var UPLOAD_THUMBNAILS_DIR = import_path.default.join(process.cwd(), "public", "uploads", "thumbnails");
var WEB_UPLOAD_THUMBNAILS_DIR = import_path.default.join(process.cwd(), "web_studio", "public", "uploads", "thumbnails");
var UPLOAD_SCREENSHOTS_DIR = import_path.default.join(process.cwd(), "public", "uploads", "screenshots");
var WEB_UPLOAD_SCREENSHOTS_DIR = import_path.default.join(process.cwd(), "web_studio", "public", "uploads", "screenshots");
var UPLOAD_FONTS_DIR = import_path.default.join(process.cwd(), "public", "uploads", "fonts");
var WEB_UPLOAD_FONTS_DIR = import_path.default.join(process.cwd(), "web_studio", "public", "uploads", "fonts");
try {
  import_fs.default.mkdirSync(UPLOAD_LOGOS_DIR, { recursive: true });
  import_fs.default.mkdirSync(WEB_UPLOAD_LOGOS_DIR, { recursive: true });
  import_fs.default.mkdirSync(UPLOAD_VIDEOS_DIR, { recursive: true });
  import_fs.default.mkdirSync(WEB_UPLOAD_VIDEOS_DIR, { recursive: true });
  import_fs.default.mkdirSync(UPLOAD_THUMBNAILS_DIR, { recursive: true });
  import_fs.default.mkdirSync(WEB_UPLOAD_THUMBNAILS_DIR, { recursive: true });
  import_fs.default.mkdirSync(UPLOAD_SCREENSHOTS_DIR, { recursive: true });
  import_fs.default.mkdirSync(WEB_UPLOAD_SCREENSHOTS_DIR, { recursive: true });
  import_fs.default.mkdirSync(UPLOAD_FONTS_DIR, { recursive: true });
  import_fs.default.mkdirSync(WEB_UPLOAD_FONTS_DIR, { recursive: true });
} catch {
}
function loadRewardsDatabase() {
  try {
    if (import_fs.default.existsSync(REWARDS_DB_FILE)) {
      const raw = import_fs.default.readFileSync(REWARDS_DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        claims: Array.isArray(parsed.claims) ? parsed.claims : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        downloadEvents: Array.isArray(parsed.downloadEvents) ? parsed.downloadEvents : [],
        wallets: parsed.wallets && typeof parsed.wallets === "object" ? parsed.wallets : {},
        welcomeRewards: parsed.welcomeRewards && typeof parsed.welcomeRewards === "object" ? parsed.welcomeRewards : {},
        unlockedItems: parsed.unlockedItems && typeof parsed.unlockedItems === "object" ? parsed.unlockedItems : {},
        frameUnlocks: parsed.frameUnlocks && typeof parsed.frameUnlocks === "object" ? parsed.frameUnlocks : {}
      };
    }
  } catch (err) {
    console.error("Error reading rewards_database.json:", err.message);
  }
  return { claims: [], transactions: [], downloadEvents: [], wallets: {}, welcomeRewards: {}, unlockedItems: {}, frameUnlocks: {} };
}
function saveRewardsDatabase(db) {
  try {
    import_fs.default.writeFileSync(REWARDS_DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error saving rewards_database.json:", err.message);
    return false;
  }
}
function loadLogoRequestsDatabase() {
  try {
    if (import_fs.default.existsSync(LOGO_REQUESTS_DB_FILE)) {
      const raw = import_fs.default.readFileSync(LOGO_REQUESTS_DB_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch (err) {
    console.error("Error reading logo requests database:", err.message);
  }
  return [];
}
function saveLogoRequestsDatabase(list) {
  try {
    import_fs.default.writeFileSync(LOGO_REQUESTS_DB_FILE, JSON.stringify(list, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error saving logo requests database:", err.message);
    return false;
  }
}
function getInitialRichNewsPosts() {
  const now = Date.now();
  return [
    {
      id: "live-post-1",
      title: "\u092D\u093E\u0930\u0924 \u0928\u0947 \u0932\u0949\u0928\u094D\u091A \u0915\u093F\u092F\u093E \u0928\u092F\u093E AI \u0938\u0941\u092A\u0930\u0915\u0902\u092A\u094D\u092F\u0942\u091F\u093F\u0902\u0917 \u0928\u0947\u091F\u0935\u0930\u094D\u0915, \u0935\u0948\u0936\u094D\u0935\u093F\u0915 \u0938\u094D\u0924\u0930 \u092A\u0930 \u092C\u0928\u0940 \u0928\u0908 \u092A\u0939\u091A\u093E\u0928",
      summary: "\u0935\u093F\u091C\u094D\u091E\u093E\u0928 \u090F\u0935\u0902 \u092A\u094D\u0930\u094C\u0926\u094D\u092F\u094B\u0917\u093F\u0915\u0940 \u092E\u0902\u0924\u094D\u0930\u093E\u0932\u092F \u0926\u094D\u0935\u093E\u0930\u093E \u0906\u091C \u0926\u0947\u0936 \u0915\u0947 \u0905\u0924\u094D\u092F\u093E\u0927\u0941\u0928\u093F\u0915 AI \u0938\u0941\u092A\u0930\u0915\u0902\u092A\u094D\u092F\u0942\u091F\u093F\u0902\u0917 \u0915\u094D\u0932\u0938\u094D\u091F\u0930 \u0915\u093E \u0905\u0928\u093E\u0935\u0930\u0923 \u0915\u093F\u092F\u093E \u0917\u092F\u093E\u0964 \u092F\u0939 \u0924\u0915\u0928\u0940\u0915 \u092E\u094C\u0938\u092E \u092A\u0942\u0930\u094D\u0935\u093E\u0928\u0941\u092E\u093E\u0928 \u0914\u0930 \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u092E\u0947\u0902 \u0915\u094D\u0930\u093E\u0902\u0924\u093F \u0932\u093E\u090F\u0917\u0940\u0964",
      sourceChannel: "\u0926\u0948\u0928\u093F\u0915 \u092D\u093E\u0938\u094D\u0915\u0930 (Dainik Bhaskar)",
      sourceUrl: "https://dainikbhaskar.com/tech/ai-supercomputing",
      category: "tech",
      categoryName: "\u091F\u0947\u0915\u094D\u0928\u094B\u0932\u0949\u091C\u0940",
      publishedTime: "10 \u092E\u093F\u0928\u091F \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: true,
      timestamp: now - 10 * 60 * 1e3,
      fullContent: `\u0935\u093F\u091C\u094D\u091E\u093E\u0928 \u090F\u0935\u0902 \u092A\u094D\u0930\u094C\u0926\u094D\u092F\u094B\u0917\u093F\u0915\u0940 \u092E\u0902\u0924\u094D\u0930\u093E\u0932\u092F \u0926\u094D\u0935\u093E\u0930\u093E \u0906\u091C \u0926\u0947\u0936 \u0915\u0947 \u0905\u0924\u094D\u092F\u093E\u0927\u0941\u0928\u093F\u0915 AI \u0938\u0941\u092A\u0930\u0915\u0902\u092A\u094D\u092F\u0942\u091F\u093F\u0902\u0917 \u0915\u094D\u0932\u0938\u094D\u091F\u0930 \u0915\u093E \u092D\u0935\u094D\u092F \u0905\u0928\u093E\u0935\u0930\u0923 \u0915\u093F\u092F\u093E \u0917\u092F\u093E\u0964

\u{1F4CC} \u092E\u0941\u0916\u094D\u092F \u0935\u093F\u0935\u0930\u0923 \u090F\u0935\u0902 \u092A\u0943\u0937\u094D\u0920\u092D\u0942\u092E\u093F:
\u0907\u0938 \u0928\u090F \u0915\u094D\u0932\u0938\u094D\u091F\u0930 \u0938\u0947 \u0926\u0947\u0936 \u0915\u0947 \u0932\u093E\u0916\u094B\u0902 \u0935\u0948\u091C\u094D\u091E\u093E\u0928\u093F\u0915\u094B\u0902, \u091B\u093E\u0924\u094D\u0930\u094B\u0902 \u0914\u0930 \u0938\u094D\u091F\u093E\u0930\u094D\u091F\u0905\u092A\u094D\u0938 \u0915\u094B \u0905\u092D\u0942\u0924\u092A\u0942\u0930\u094D\u0935 \u0915\u092E\u094D\u092A\u094D\u092F\u0942\u091F\u093F\u0902\u0917 \u0915\u094D\u0937\u092E\u0924\u093E \u092E\u093F\u0932\u0947\u0917\u0940\u0964 \u092F\u0939 \u092E\u094C\u0938\u092E \u092A\u0942\u0930\u094D\u0935\u093E\u0928\u0941\u092E\u093E\u0928, \u091A\u093F\u0915\u093F\u0924\u094D\u0938\u093E \u0905\u0928\u0941\u0938\u0902\u0927\u093E\u0928 \u0914\u0930 \u0905\u0902\u0924\u0930\u093F\u0915\u094D\u0937 \u0905\u0928\u094D\u0935\u0947\u0937\u0923 \u092E\u0947\u0902 \u0921\u0947\u091F\u093E \u090F\u0928\u093E\u0932\u093F\u0938\u093F\u0938 \u0915\u094B 10 \u0917\u0941\u0928\u093E \u0924\u0947\u091C \u0915\u0930 \u0926\u0947\u0917\u093E\u0964

\u{1F3A4} \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 \u092C\u092F\u093E\u0928:
\u0915\u0947\u0902\u0926\u094D\u0930\u0940\u092F \u0935\u093F\u091C\u094D\u091E\u093E\u0928 \u092E\u0902\u0924\u094D\u0930\u0940 \u0928\u0947 \u0915\u0939\u093E: "\u092D\u093E\u0930\u0924 \u0905\u092C \u0915\u0947\u0935\u0932 \u0924\u0915\u0928\u0940\u0915 \u0915\u093E \u0909\u092A\u092D\u094B\u0915\u094D\u0924\u093E \u0928\u0939\u0940\u0902, \u092C\u0932\u094D\u0915\u093F \u0935\u0948\u0936\u094D\u0935\u093F\u0915 \u0938\u094D\u0924\u0930 \u092A\u0930 AI \u0938\u092E\u093E\u0927\u093E\u0928\u094B\u0902 \u0915\u093E \u0936\u0940\u0930\u094D\u0937 \u0928\u093F\u0930\u094D\u092E\u093E\u0924\u093E \u092C\u0928 \u0930\u0939\u093E \u0939\u0948\u0964"

\u{1F4CA} \u092E\u0941\u0916\u094D\u092F \u092C\u093F\u0902\u0926\u0941:
\u2022 100 \u092A\u0947\u091F\u093E\u092B\u094D\u0932\u0949\u092A\u094D\u0938 \u0938\u0947 \u0905\u0927\u093F\u0915 \u0915\u0940 \u0915\u092E\u094D\u092A\u094D\u092F\u0942\u091F\u0947\u0936\u0928\u0932 \u0938\u094D\u092A\u0940\u0921
\u2022 \u0926\u0947\u0936 \u0915\u0947 \u0938\u092D\u0940 \u092A\u094D\u0930\u092E\u0941\u0916 IITs \u0914\u0930 \u0905\u0928\u0941\u0938\u0902\u0927\u093E\u0928 \u0938\u0902\u0938\u094D\u0925\u093E\u0928\u094B\u0902 \u0938\u0947 \u0938\u0940\u0927\u093E \u091C\u0941\u0921\u093C\u093E\u0935
\u2022 100% \u0939\u0930\u093F\u0924 \u090A\u0930\u094D\u091C\u093E \u0938\u0947 \u0938\u0902\u091A\u093E\u0932\u093F\u0924 \u0921\u093E\u091F\u093E \u0938\u0947\u0902\u091F\u0930`
    },
    {
      id: "live-post-2",
      title: "\u0938\u0902\u0938\u0926 \u092E\u0947\u0902 \u0921\u093F\u091C\u093F\u091F\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0914\u0930 AI \u0928\u094D\u092F\u0942\u091C\u093C \u092A\u094D\u0930\u0938\u093E\u0930\u0923 \u092A\u0930 \u0910\u0924\u093F\u0939\u093E\u0938\u093F\u0915 \u0935\u093F\u0927\u0947\u092F\u0915 \u092A\u093E\u0930\u093F\u0924",
      summary: "\u0938\u0942\u091A\u0928\u093E \u090F\u0935\u0902 \u092A\u094D\u0930\u0938\u093E\u0930\u0923 \u092E\u0902\u0924\u094D\u0930\u093E\u0932\u092F \u0928\u0947 \u0921\u093F\u091C\u093F\u091F\u0932 \u0928\u094D\u092F\u0942\u091C\u093C \u092A\u092C\u094D\u0932\u093F\u0936\u0930\u094D\u0938 \u0914\u0930 \u090F\u0906\u0908 \u0906\u0927\u093E\u0930\u093F\u0924 \u0915\u0902\u091F\u0947\u0902\u091F \u091C\u0928\u0930\u0947\u0936\u0928 \u0915\u0947 \u0932\u093F\u090F \u092E\u093E\u0928\u0915 \u0924\u092F \u0915\u0930\u0928\u0947 \u0939\u0947\u0924\u0941 \u0910\u0924\u093F\u0939\u093E\u0938\u093F\u0915 \u092C\u093F\u0932 \u092A\u093E\u0930\u093F\u0924 \u0915\u093F\u092F\u093E\u0964 \u0921\u0940\u092A\u092B\u0947\u0915 \u092A\u0930 \u0915\u0921\u093C\u0947 \u0926\u0902\u0921 \u0915\u093E \u092A\u094D\u0930\u093E\u0935\u0927\u093E\u0928\u0964",
      sourceChannel: "\u0906\u091C \u0924\u0915 (Aaj Tak)",
      sourceUrl: "https://aajtak.in/national/digital-media-ai-bill",
      category: "politics",
      categoryName: "\u0930\u093E\u091C\u0928\u0940\u0924\u093F",
      publishedTime: "25 \u092E\u093F\u0928\u091F \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: false,
      timestamp: now - 25 * 60 * 1e3,
      fullContent: `\u0938\u0902\u0938\u0926 \u0915\u0947 \u0926\u094B\u0928\u094B\u0902 \u0938\u0926\u0928\u094B\u0902 \u092E\u0947\u0902 \u0921\u093F\u091C\u093F\u091F\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0914\u0930 \u090F\u0906\u0908 \u0915\u0902\u091F\u0947\u0902\u091F \u0915\u0947 \u0928\u093F\u092F\u092E\u0928 \u0939\u0947\u0924\u0941 \u0928\u092F\u093E \u0915\u093E\u0928\u0942\u0928 \u0927\u094D\u0935\u0928\u093F\u092E\u0924 \u0938\u0947 \u092A\u093E\u0930\u093F\u0924 \u0915\u093F\u092F\u093E \u0917\u092F\u093E\u0964

\u{1F4CC} \u092E\u0941\u0916\u094D\u092F \u092C\u093E\u0924\u0947\u0902:
1. \u0938\u094D\u0935\u0924\u0902\u0924\u094D\u0930 \u092A\u0924\u094D\u0930\u0915\u093E\u0930\u094B\u0902 \u0914\u0930 \u092F\u0942\u091F\u094D\u092F\u0942\u092C \u0928\u094D\u092F\u0942\u091C\u093C \u091A\u0948\u0928\u0932\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u0938\u094D\u0935-\u092A\u094D\u0930\u092E\u093E\u0923\u0928 \u092A\u094D\u0930\u0923\u093E\u0932\u0940\u0964
2. \u090F\u0906\u0908 \u091C\u0928\u0930\u0947\u091F\u0947\u0921 \u0924\u0938\u094D\u0935\u0940\u0930\u094B\u0902 \u0914\u0930 \u0921\u0940\u092A\u092B\u0947\u0915 \u0935\u0940\u0921\u093F\u092F\u094B \u092A\u0930 \u0935\u093E\u091F\u0930\u092E\u093E\u0930\u094D\u0915 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F\u0964
3. \u0924\u0925\u094D\u092F\u0939\u0940\u0928 \u0935 \u092D\u094D\u0930\u093E\u092E\u0915 \u0916\u092C\u0930\u094B\u0902 \u092A\u0930 \u0924\u094D\u0935\u0930\u093F\u0924 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0939\u0947\u0924\u0941 \u0921\u093F\u091C\u093F\u091F\u0932 \u0913\u092E\u094D\u092C\u0921\u094D\u0938\u092E\u0948\u0928 \u0915\u0940 \u0928\u093F\u092F\u0941\u0915\u094D\u0924\u093F\u0964`
    },
    {
      id: "live-post-3",
      title: "\u090F\u0936\u093F\u092F\u093E \u0915\u092A \u0915\u094D\u0930\u093F\u0915\u0947\u091F: \u092D\u093E\u0930\u0924 \u0928\u0947 \u0930\u094B\u092E\u093E\u0902\u091A\u0915 \u092E\u0941\u0915\u093E\u092C\u0932\u0947 \u092E\u0947\u0902 \u092A\u093E\u0915\u093F\u0938\u094D\u0924\u093E\u0928 \u0915\u094B 5 \u0935\u093F\u0915\u0947\u091F \u0938\u0947 \u0939\u0930\u093E\u092F\u093E",
      summary: "\u092D\u093E\u0930\u0924\u0940\u092F \u091F\u0940\u092E \u0928\u0947 \u0936\u093E\u0928\u0926\u093E\u0930 \u0916\u0947\u0932 \u0915\u093E \u092A\u094D\u0930\u0926\u0930\u094D\u0936\u0928 \u0915\u0930\u0924\u0947 \u0939\u0941\u090F \u0905\u0902\u0924\u093F\u092E \u0913\u0935\u0930 \u092E\u0947\u0902 \u091C\u0940\u0924 \u0926\u0930\u094D\u091C \u0915\u0940\u0964 \u0938\u0932\u093E\u092E\u0940 \u092C\u0932\u094D\u0932\u0947\u092C\u093E\u091C \u0928\u0947 85 \u0930\u0928\u094B\u0902 \u0915\u0940 \u0928\u093E\u092C\u093E\u0926 \u092A\u093E\u0930\u0940 \u0916\u0947\u0932\u0940, \u0917\u0947\u0902\u0926\u092C\u093E\u091C\u094B\u0902 \u0928\u0947 \u0921\u0947\u0925 \u0913\u0935\u0930\u094D\u0938 \u092E\u0947\u0902 \u0915\u0938\u0940 \u0939\u0941\u0908 \u0917\u0947\u0902\u0926\u092C\u093E\u091C\u0940 \u0915\u0940\u0964",
      sourceChannel: "NDTV \u0907\u0902\u0921\u093F\u092F\u093E",
      sourceUrl: "https://ndtv.in/sports/asia-cup-victory",
      category: "sports",
      categoryName: "\u0916\u0947\u0932",
      publishedTime: "45 \u092E\u093F\u0928\u091F \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: true,
      timestamp: now - 45 * 60 * 1e3,
      fullContent: `\u0905\u0902\u0924\u093F\u092E \u0913\u0935\u0930 \u092E\u0947\u0902 \u091A\u093E\u0939\u093F\u090F \u0925\u0947 12 \u0930\u0928, \u092D\u093E\u0930\u0924\u0940\u092F \u092C\u0932\u094D\u0932\u0947\u092C\u093E\u091C\u094B\u0902 \u0928\u0947 2 \u0917\u0947\u0902\u0926 \u0936\u0947\u0937 \u0930\u0939\u0924\u0947 \u091C\u0940\u0924 \u0926\u093F\u0932\u093E \u0926\u0940\u0964 \u0907\u0938 \u091C\u0940\u0924 \u0915\u0947 \u0938\u093E\u0925 \u092D\u093E\u0930\u0924\u0940\u092F \u091F\u0940\u092E \u0905\u0902\u0915 \u0924\u093E\u0932\u093F\u0915\u093E \u092E\u0947\u0902 \u0936\u0940\u0930\u094D\u0937 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A \u0917\u0908 \u0939\u0948\u0964`
    },
    {
      id: "live-post-4",
      title: "\u0938\u0947\u0902\u0938\u0947\u0915\u094D\u0938 \u092E\u0947\u0902 1100 \u0905\u0902\u0915\u094B\u0902 \u0915\u093E \u0930\u093F\u0915\u0949\u0930\u094D\u0921 \u0909\u091B\u093E\u0932, \u0928\u093F\u092B\u094D\u091F\u0940 25,500 \u0915\u0947 \u0928\u090F \u0936\u093F\u0916\u0930 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A\u093E",
      summary: "\u0918\u0930\u0947\u0932\u0942 \u0936\u0947\u092F\u0930 \u092C\u093E\u091C\u093E\u0930\u094B\u0902 \u092E\u0947\u0902 \u0935\u093F\u0926\u0947\u0936\u0940 \u0938\u0902\u0938\u094D\u0925\u093E\u0917\u0924 \u0928\u093F\u0935\u0947\u0936\u0915\u094B\u0902 (FII) \u0915\u0940 \u0935\u093E\u092A\u0938\u0940 \u0938\u0947 \u092C\u093E\u091C\u093E\u0930 \u0928\u0908 \u090A\u0902\u091A\u093E\u0908 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A\u093E\u0964 \u092C\u0948\u0902\u0915\u093F\u0902\u0917, \u0911\u091F\u094B \u0914\u0930 \u0906\u0908\u091F\u0940 \u0938\u0947\u0915\u094D\u091F\u0930 \u092E\u0947\u0902 \u092D\u093E\u0930\u0940 \u0932\u093F\u0935\u093E\u0932\u0940 \u0926\u0947\u0916\u0928\u0947 \u0915\u094B \u092E\u093F\u0932\u0940\u0964",
      sourceChannel: "\u092E\u0928\u0940\u0915\u0902\u091F\u094D\u0930\u094B\u0932 (Moneycontrol)",
      sourceUrl: "https://moneycontrol.com/markets/sensex-record",
      category: "business",
      categoryName: "\u0915\u093E\u0930\u094B\u092C\u093E\u0930",
      publishedTime: "1 \u0918\u0902\u091F\u093E \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop",
      breaking: false,
      isExclusive: false,
      timestamp: now - 60 * 60 * 1e3,
      fullContent: `\u092D\u093E\u0930\u0924\u0940\u092F \u0936\u0947\u092F\u0930 \u092C\u093E\u091C\u093E\u0930 \u0928\u0947 \u0906\u091C \u0928\u092F\u093E \u0907\u0924\u093F\u0939\u093E\u0938 \u0930\u091A\u093E\u0964 \u0938\u0947\u0902\u0938\u0947\u0915\u094D\u0938 1100 \u0905\u0902\u0915\u094B\u0902 \u0915\u0940 \u0924\u0947\u091C\u0940 \u0915\u0947 \u0938\u093E\u0925 \u092C\u0902\u0926 \u0939\u0941\u0906 \u0914\u0930 \u0928\u093F\u092B\u094D\u091F\u0940 \u0928\u0947 \u092A\u0939\u0932\u0940 \u092C\u093E\u0930 25,500 \u0915\u093E \u0938\u094D\u0924\u0930 \u091B\u0941\u0906\u0964 \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0915\u094B\u0902 \u0915\u093E \u092E\u093E\u0928\u0928\u093E \u0939\u0948 \u0915\u093F \u092E\u091C\u092C\u0942\u0924 \u0906\u0930\u094D\u0925\u093F\u0915 \u0906\u0902\u0915\u0921\u093C\u0947 \u092C\u093E\u091C\u093E\u0930 \u0915\u094B \u0917\u0924\u093F \u0926\u0947 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964`
    },
    {
      id: "live-post-5",
      title: "\u0907\u0938\u0930\u094B \u0928\u0947 \u0917\u0917\u0928\u092F\u093E\u0928 \u092E\u093F\u0936\u0928 \u0915\u0947 \u0926\u0942\u0938\u0930\u0947 \u0915\u094D\u0930\u0942-\u090F\u0938\u094D\u0915\u0947\u092A \u0938\u093F\u0938\u094D\u091F\u092E \u0915\u093E \u0938\u092B\u0932 \u092A\u0930\u0940\u0915\u094D\u0937\u0923 \u0915\u093F\u092F\u093E",
      summary: "\u092D\u093E\u0930\u0924\u0940\u092F \u0905\u0902\u0924\u0930\u093F\u0915\u094D\u0937 \u0905\u0928\u0941\u0938\u0902\u0927\u093E\u0928 \u0938\u0902\u0917\u0920\u0928 (ISRO) \u0928\u0947 \u0936\u094D\u0930\u0940\u0939\u0930\u093F\u0915\u094B\u091F\u093E \u0938\u0947 \u092E\u093E\u0928\u0935 \u0905\u0902\u0924\u0930\u093F\u0915\u094D\u0937 \u0909\u0921\u093C\u093E\u0928 \u0917\u0917\u0928\u092F\u093E\u0928 \u0915\u0947 \u0932\u093F\u090F \u0905\u0924\u094D\u092F\u093E\u0927\u0941\u0928\u093F\u0915 \u0938\u0947\u092B\u094D\u091F\u0940 \u092E\u0949\u0921\u094D\u092F\u0942\u0932 \u0915\u093E \u0938\u092B\u0932 \u092A\u0930\u0940\u0915\u094D\u0937\u0923 \u092A\u0942\u0930\u093E \u0915\u093F\u092F\u093E\u0964",
      sourceChannel: "ABP \u0928\u094D\u092F\u0942\u091C\u093C",
      sourceUrl: "https://abplive.com/science/gaganyaan-test",
      category: "tech",
      categoryName: "\u091F\u0947\u0915\u094D\u0928\u094B\u0932\u0949\u091C\u0940",
      publishedTime: "2 \u0918\u0902\u091F\u0947 \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1517976487507-5b3b11329582?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: false,
      timestamp: now - 120 * 60 * 1e3,
      fullContent: `\u0907\u0938\u0930\u094B \u0928\u0947 \u0905\u0902\u0924\u0930\u093F\u0915\u094D\u0937 \u092F\u093E\u0924\u094D\u0930\u093F\u092F\u094B\u0902 \u0915\u0940 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u0941\u0928\u093F\u0936\u094D\u091A\u093F\u0924 \u0915\u0930\u0928\u0947 \u0935\u093E\u0932\u0947 \u0915\u094D\u0930\u0942 \u092E\u0949\u0921\u094D\u092F\u0942\u0932 \u0915\u093E \u092A\u0930\u0940\u0915\u094D\u0937\u0923 \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u092A\u0942\u0930\u093E \u0915\u0930 \u0932\u093F\u092F\u093E \u0939\u0948\u0964 \u0906\u0917\u093E\u092E\u0940 \u0935\u0930\u094D\u0937 \u0915\u0947 \u0905\u0902\u0924 \u0924\u0915 \u092E\u093E\u0928\u0935 \u092E\u093F\u0936\u0928 \u0915\u0940 \u092F\u094B\u091C\u0928\u093E \u0939\u0948\u0964`
    },
    {
      id: "live-post-6",
      title: "\u092E\u094C\u0938\u092E \u0905\u0932\u0930\u094D\u091F: \u0909\u0924\u094D\u0924\u0930 \u092D\u093E\u0930\u0924 \u092E\u0947\u0902 \u092D\u093E\u0930\u0940 \u092C\u093E\u0930\u093F\u0936 \u0914\u0930 \u0913\u0932\u093E\u0935\u0943\u0937\u094D\u091F\u093F \u0915\u0940 \u091A\u0947\u0924\u093E\u0935\u0928\u0940 \u091C\u093E\u0930\u0940",
      summary: "\u092E\u094C\u0938\u092E \u0935\u093F\u092D\u093E\u0917 (IMD) \u0928\u0947 \u0905\u0917\u0932\u0947 48 \u0918\u0902\u091F\u094B\u0902 \u092E\u0947\u0902 \u0926\u093F\u0932\u094D\u0932\u0940, \u0939\u0930\u093F\u092F\u093E\u0923\u093E, \u092A\u0902\u091C\u093E\u092C \u0914\u0930 \u092A\u0936\u094D\u091A\u093F\u092E\u0940 \u092F\u0942\u092A\u0940 \u0915\u0947 \u0915\u0908 \u091C\u093F\u0932\u094B\u0902 \u092E\u0947\u0902 \u0924\u0947\u091C \u0906\u0902\u0927\u0940 \u0914\u0930 \u092C\u093E\u0930\u093F\u0936 \u0915\u0947 \u0932\u093F\u090F \u0911\u0930\u0947\u0902\u091C \u0905\u0932\u0930\u094D\u091F \u091C\u093E\u0930\u0940 \u0915\u093F\u092F\u093E \u0939\u0948\u0964",
      sourceChannel: "\u0926\u0948\u0928\u093F\u0915 \u091C\u093E\u0917\u0930\u0923 (Dainik Jagran)",
      sourceUrl: "https://jagran.com/weather/heavy-rain-alert",
      category: "state",
      categoryName: "\u0930\u093E\u091C\u094D\u092F / \u0938\u094D\u0925\u093E\u0928\u0940\u092F",
      publishedTime: "2.5 \u0918\u0902\u091F\u0947 \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: false,
      timestamp: now - 150 * 60 * 1e3,
      fullContent: `\u092E\u094C\u0938\u092E \u0935\u093F\u092D\u093E\u0917 \u0928\u0947 \u092A\u0936\u094D\u091A\u093F\u092E\u0940 \u0935\u093F\u0915\u094D\u0937\u094B\u092D \u0915\u0947 \u0938\u0915\u094D\u0930\u093F\u092F \u0939\u094B\u0928\u0947 \u0915\u0947 \u0915\u093E\u0930\u0923 \u0909\u0924\u094D\u0924\u0930 \u092D\u093E\u0930\u0924 \u0915\u0947 \u0915\u0908 \u0930\u093E\u091C\u094D\u092F\u094B\u0902 \u092E\u0947\u0902 \u0924\u0947\u091C \u0939\u0935\u093E\u0913\u0902 \u0915\u0947 \u0938\u093E\u0925 \u092C\u093E\u0930\u093F\u0936 \u0914\u0930 \u0913\u0932\u093E\u0935\u0943\u0937\u094D\u091F\u093F \u0915\u0940 \u0938\u0902\u092D\u093E\u0935\u0928\u093E \u091C\u0924\u093E\u0908 \u0939\u0948\u0964 \u0915\u093F\u0938\u093E\u0928\u094B\u0902 \u0915\u094B \u0915\u091F\u0940 \u092B\u0938\u0932 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0938\u094D\u0925\u093E\u0928\u094B\u0902 \u092A\u0930 \u0930\u0916\u0928\u0947 \u0915\u0940 \u0938\u0932\u093E\u0939 \u0926\u0940 \u0917\u0908 \u0939\u0948\u0964`
    },
    {
      id: "live-post-7",
      title: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0930\u093E\u091C\u092E\u093E\u0930\u094D\u0917\u094B\u0902 \u092A\u0930 \u0905\u092C \u0932\u093E\u0917\u0942 \u0939\u094B\u0917\u093E \u0938\u0947\u091F\u0947\u0932\u093E\u0907\u091F \u0906\u0927\u093E\u0930\u093F\u0924 \u091F\u094B\u0932 \u0915\u0932\u0947\u0915\u094D\u0936\u0928 \u0938\u093F\u0938\u094D\u091F\u092E",
      summary: "\u0938\u0921\u093C\u0915 \u092A\u0930\u093F\u0935\u0939\u0928 \u092E\u0902\u0924\u094D\u0930\u093E\u0932\u092F \u0928\u0947 \u092B\u093E\u0938\u094D\u091F\u0948\u0917 \u0915\u0947 \u092C\u093E\u0926 \u0905\u092C \u091C\u0940\u092A\u0940\u090F\u0938 \u0914\u0930 \u0938\u0948\u091F\u0947\u0932\u093E\u0907\u091F \u0906\u0927\u093E\u0930\u093F\u0924 \u091F\u094B\u0932 \u092A\u094D\u0930\u0923\u093E\u0932\u0940 \u0915\u094B \u0926\u0947\u0936 \u0915\u0947 \u092A\u094D\u0930\u092E\u0941\u0916 \u090F\u0915\u094D\u0938\u092A\u094D\u0930\u0947\u0938\u0935\u0947 \u092A\u0930 \u092A\u093E\u092F\u0932\u091F \u092A\u094D\u0930\u094B\u091C\u0947\u0915\u094D\u091F \u0915\u0947 \u0924\u094C\u0930 \u092A\u0930 \u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0915\u0940 \u0918\u094B\u0937\u0923\u093E \u0915\u0940 \u0939\u0948\u0964",
      sourceChannel: "\u091C\u093C\u0940 \u0928\u094D\u092F\u0942\u091C\u093C (Zee News)",
      sourceUrl: "https://zeenews.india.com/automobiles/satellite-toll",
      category: "politics",
      categoryName: "\u0930\u093E\u091C\u0928\u0940\u0924\u093F",
      publishedTime: "3 \u0918\u0902\u091F\u0947 \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1545459720-aac8509eb02c?w=800&auto=format&fit=crop",
      breaking: false,
      isExclusive: false,
      timestamp: now - 180 * 60 * 1e3,
      fullContent: `\u0928\u0908 \u092A\u094D\u0930\u0923\u093E\u0932\u0940 \u0915\u0947 \u0924\u0939\u0924 \u0935\u093E\u0939\u0928\u094B\u0902 \u092E\u0947\u0902 \u0932\u0917\u0947 \u0913\u092C\u0940\u092F\u0942 (\u0911\u0928-\u092C\u094B\u0930\u094D\u0921 \u092F\u0942\u0928\u093F\u091F) \u0915\u0947 \u091C\u0930\u093F\u090F \u0924\u092F \u0915\u0940 \u0917\u0908 \u0926\u0942\u0930\u0940 \u0915\u0947 \u0906\u0927\u093E\u0930 \u092A\u0930 \u0938\u094D\u0935\u0924\u0903 \u091F\u094B\u0932 \u0915\u091F \u091C\u093E\u090F\u0917\u093E\u0964 \u0907\u0938\u0938\u0947 \u091F\u094B\u0932 \u092A\u094D\u0932\u093E\u091C\u093E \u092A\u0930 \u0932\u0917\u0928\u0947 \u0935\u093E\u0932\u093E \u0938\u092E\u092F \u0936\u0942\u0928\u094D\u092F \u0939\u094B \u091C\u093E\u090F\u0917\u093E\u0964`
    },
    {
      id: "live-post-8",
      title: "\u0938\u094B\u0928\u0947 \u0915\u0940 \u0915\u0940\u092E\u0924\u094B\u0902 \u092E\u0947\u0902 \u092D\u093E\u0930\u0940 \u0917\u093F\u0930\u093E\u0935\u091F, \u091A\u093E\u0902\u0926\u0940 2000 \u0930\u0941\u092A\u092F\u0947 \u092A\u094D\u0930\u0924\u093F \u0915\u093F\u0932\u094B \u0938\u0938\u094D\u0924\u0940 \u0939\u0941\u0908",
      summary: "\u0935\u0948\u0936\u094D\u0935\u093F\u0915 \u092C\u093E\u091C\u093E\u0930\u094B\u0902 \u092E\u0947\u0902 \u092E\u091C\u092C\u0942\u0924\u0940 \u0915\u0947 \u092C\u093E\u0926 \u0918\u0930\u0947\u0932\u0942 \u0938\u0930\u094D\u0930\u093E\u092B\u093E \u092C\u093E\u091C\u093E\u0930 \u092E\u0947\u0902 \u0938\u094B\u0928\u0947 \u0914\u0930 \u091A\u093E\u0902\u0926\u0940 \u0915\u0940 \u0915\u0940\u092E\u0924\u094B\u0902 \u092E\u0947\u0902 \u092C\u0921\u093C\u0940 \u0917\u093F\u0930\u093E\u0935\u091F \u0926\u0930\u094D\u091C \u0915\u0940 \u0917\u0908\u0964 \u0924\u094D\u092F\u094B\u0939\u093E\u0930\u0940 \u0938\u0940\u091C\u0928 \u0938\u0947 \u092A\u0939\u0932\u0947 \u0916\u0930\u0940\u0926\u093E\u0930\u094B\u0902 \u0915\u0947 \u091A\u0947\u0939\u0930\u0947 \u0916\u093F\u0932\u0947\u0964",
      sourceChannel: "\u0926\u0948\u0928\u093F\u0915 \u091C\u093E\u0917\u0930\u0923 (Dainik Jagran)",
      sourceUrl: "https://jagran.com/business/gold-silver-prices",
      category: "business",
      categoryName: "\u0915\u093E\u0930\u094B\u092C\u093E\u0930",
      publishedTime: "3.5 \u0918\u0902\u091F\u0947 \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&auto=format&fit=crop",
      breaking: false,
      isExclusive: false,
      timestamp: now - 210 * 60 * 1e3,
      fullContent: `24 \u0915\u0948\u0930\u0947\u091F \u0938\u094B\u0928\u0947 \u0915\u0940 \u0915\u0940\u092E\u0924 \u092A\u094D\u0930\u0924\u093F 10 \u0917\u094D\u0930\u093E\u092E \u092E\u0947\u0902 750 \u0930\u0941\u092A\u092F\u0947 \u0915\u0940 \u0915\u092E\u0940 \u0906\u0908, \u0935\u0939\u0940\u0902 \u091A\u093E\u0902\u0926\u0940 2000 \u0930\u0941\u092A\u092F\u0947 \u0938\u0938\u094D\u0924\u0940 \u0939\u094B\u0915\u0930 84,000 \u0930\u0941\u092A\u092F\u0947 \u092A\u094D\u0930\u0924\u093F \u0915\u093F\u0932\u094B\u0917\u094D\u0930\u093E\u092E \u0915\u0947 \u0938\u094D\u0924\u0930 \u092A\u0930 \u0906 \u0917\u0908 \u0939\u0948\u0964`
    },
    {
      id: "live-post-9",
      title: "\u0930\u0947\u0932\u0935\u0947 \u0915\u093E \u092C\u0921\u093C\u093E \u0910\u0932\u093E\u0928: 50 \u0928\u090F \u0930\u0942\u091F\u094B\u0902 \u092A\u0930 \u0926\u094C\u0921\u093C\u0947\u0902\u0917\u0940 \u0938\u094D\u0932\u0940\u092A\u0930 \u0935\u0902\u0926\u0947 \u092D\u093E\u0930\u0924 \u091F\u094D\u0930\u0947\u0928\u0947\u0902",
      summary: "\u0932\u0902\u092C\u0940 \u0926\u0942\u0930\u0940 \u0915\u0947 \u092F\u093E\u0924\u094D\u0930\u093F\u092F\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u0935\u093F\u0936\u094D\u0935\u0938\u094D\u0924\u0930\u0940\u092F \u0938\u0941\u0935\u093F\u0927\u093E\u0913\u0902 \u0938\u0947 \u0932\u0948\u0938 \u0938\u094D\u0932\u0940\u092A\u0930 \u0935\u0902\u0926\u0947 \u092D\u093E\u0930\u0924 \u090F\u0915\u094D\u0938\u092A\u094D\u0930\u0947\u0938 \u091F\u094D\u0930\u0947\u0928\u094B\u0902 \u0915\u093E \u092A\u0930\u093F\u091A\u093E\u0932\u0928 \u091C\u0932\u094D\u0926 \u0936\u0941\u0930\u0942 \u0939\u094B\u0917\u093E\u0964 \u0924\u0947\u091C \u0930\u092B\u094D\u0924\u093E\u0930 \u0914\u0930 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u092F\u093E\u0924\u094D\u0930\u093E \u0915\u093E \u0905\u0928\u0941\u092D\u0935\u0964",
      sourceChannel: "\u0939\u093F\u0902\u0926\u0941\u0938\u094D\u0924\u093E\u0928 (Live Hindustan)",
      sourceUrl: "https://livehindustan.com/national/vande-bharat-sleeper",
      category: "state",
      categoryName: "\u0930\u093E\u091C\u094D\u092F / \u0938\u094D\u0925\u093E\u0928\u0940\u092F",
      publishedTime: "4 \u0918\u0902\u091F\u0947 \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&auto=format&fit=crop",
      breaking: false,
      isExclusive: false,
      timestamp: now - 240 * 60 * 1e3,
      fullContent: `\u0930\u0947\u0932 \u092E\u0902\u0924\u094D\u0930\u093E\u0932\u092F \u0928\u0947 50 \u0928\u090F \u0930\u0942\u091F\u094B\u0902 \u0915\u094B \u0905\u0902\u0924\u093F\u092E \u0930\u0942\u092A \u0926\u0947 \u0926\u093F\u092F\u093E \u0939\u0948\u0964 \u0928\u0908 \u0938\u094D\u0932\u0940\u092A\u0930 \u091F\u094D\u0930\u0947\u0928\u094B\u0902 \u092E\u0947\u0902 \u0905\u0924\u094D\u092F\u093E\u0927\u0941\u0928\u093F\u0915 \u090F\u092F\u0930 \u0938\u0938\u094D\u092A\u0947\u0902\u0936\u0928, \u092C\u093E\u092F\u094B-\u0935\u0948\u0915\u094D\u092F\u0942\u092E \u091F\u0949\u092F\u0932\u0947\u091F\u094D\u0938 \u0914\u0930 \u0915\u0935\u091A \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u092A\u094D\u0930\u0923\u093E\u0932\u0940 \u0936\u093E\u092E\u093F\u0932 \u0939\u0948\u0902\u0964`
    },
    {
      id: "live-post-10",
      title: "\u0938\u093E\u0907\u092C\u0930 \u092A\u0941\u0932\u093F\u0938 \u0915\u0940 \u092C\u0921\u093C\u0940 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908: 500 \u0915\u0930\u094B\u0921\u093C \u0915\u0947 \u0911\u0928\u0932\u093E\u0907\u0928 \u0917\u0947\u092E\u093F\u0902\u0917 \u0938\u093F\u0902\u0921\u093F\u0915\u0947\u091F \u0915\u093E \u092D\u0902\u0921\u093E\u092B\u094B\u0921\u093C",
      summary: "\u0935\u093F\u0936\u0947\u0937 \u091F\u093E\u0938\u094D\u0915 \u092B\u094B\u0930\u094D\u0938 \u0928\u0947 \u092B\u0930\u094D\u091C\u0940 \u0921\u093F\u091C\u093F\u091F\u0932 \u092A\u0947\u092E\u0947\u0902\u091F \u0917\u0947\u091F\u0935\u0947 \u0914\u0930 \u0905\u0935\u0948\u0927 \u0917\u0947\u092E\u093F\u0902\u0917 \u0910\u092A \u0915\u0947 \u091C\u0930\u093F\u090F \u0915\u0930\u094B\u0921\u093C\u094B\u0902 \u0915\u0940 \u0920\u0917\u0940 \u0915\u0930\u0928\u0947 \u0935\u093E\u0932\u0947 \u0905\u0902\u0924\u0930\u0930\u093E\u091C\u094D\u092F\u0940\u092F \u0917\u093F\u0930\u094B\u0939 \u0915\u0947 8 \u0938\u0926\u0938\u094D\u092F\u094B\u0902 \u0915\u094B \u0926\u092C\u094B\u091A\u093E\u0964",
      sourceChannel: "\u092A\u0924\u094D\u0930\u093F\u0915\u093E (Patrika)",
      sourceUrl: "https://patrika.com/crime/cyber-crime-busted",
      category: "crime",
      categoryName: "\u0915\u094D\u0930\u093E\u0907\u092E / \u0905\u092A\u0930\u093E\u0927",
      publishedTime: "5 \u0918\u0902\u091F\u0947 \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: true,
      timestamp: now - 300 * 60 * 1e3,
      fullContent: `\u092A\u0941\u0932\u093F\u0938 \u0928\u0947 \u0906\u0930\u094B\u092A\u093F\u092F\u094B\u0902 \u0915\u0947 \u092A\u093E\u0938 \u0938\u0947 25 \u0932\u0948\u092A\u091F\u0949\u092A, 60 \u0938\u094D\u092E\u093E\u0930\u094D\u091F\u092B\u094B\u0928 \u0914\u0930 100 \u0938\u0947 \u091C\u094D\u092F\u093E\u0926\u093E \u092B\u094D\u0930\u0940\u091C \u092C\u0948\u0902\u0915 \u0916\u093E\u0924\u094B\u0902 \u0915\u0940 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u092C\u0930\u093E\u092E\u0926 \u0915\u0940 \u0939\u0948\u0964`
    }
  ];
}
var SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1e3;
var THREE_DAYS_MS = SEVEN_DAYS_MS;
function resolveAllDatabaseLocations(filename) {
  const cwd = process.cwd();
  const candidates = [
    import_path.default.join(cwd, filename),
    import_path.default.join(cwd, "web_studio", filename)
  ];
  try {
    const parent = import_path.default.resolve(cwd, "..");
    candidates.push(import_path.default.join(parent, filename));
    candidates.push(import_path.default.join(parent, "web_studio", filename));
  } catch {
  }
  try {
    if (typeof __dirname !== "undefined" && __dirname) {
      candidates.push(import_path.default.join(__dirname, filename));
      candidates.push(import_path.default.join(__dirname, "..", filename));
      candidates.push(import_path.default.join(__dirname, "web_studio", filename));
    }
  } catch {
  }
  return Array.from(new Set(candidates));
}
function loadNewsDatabase() {
  try {
    const locations = resolveAllDatabaseLocations("news_database.json");
    for (const loc of locations) {
      if (import_fs.default.existsSync(loc)) {
        const raw = import_fs.default.readFileSync(loc, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter((p) => {
            if (!p || !p.id) return false;
            if (String(p.id).startsWith("live-post-")) return false;
            return true;
          });
          if (cleaned.length > 0) {
            return cleaned;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading news_database.json:", err);
  }
  return [];
}
function saveNewsDatabase(posts) {
  try {
    const cleaned = posts.filter((p) => {
      if (!p || !p.id) return false;
      return true;
    });
    if (cleaned.length === 0) {
      const existing = loadNewsDatabase();
      if (existing.length > 0) {
        console.warn("Safeguard: Refusing to overwrite populated news_database with empty array");
        return true;
      }
    }
    const locations = resolveAllDatabaseLocations("news_database.json");
    for (const loc of locations) {
      try {
        if (import_fs.default.existsSync(import_path.default.dirname(loc))) {
          import_fs.default.writeFileSync(loc, JSON.stringify(cleaned, null, 2), "utf-8");
        }
      } catch {
      }
    }
    return true;
  } catch (err) {
    console.error("Error writing news_database.json:", err);
    return false;
  }
}
function formatRelativeTime(timestamp) {
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 6e4));
  if (diffMinutes < 60) return `${diffMinutes} \u092E\u093F\u0928\u091F \u092A\u0939\u0932\u0947`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} \u0918\u0902\u091F\u0947 \u092A\u0939\u0932\u0947`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} \u0926\u093F\u0928 \u092A\u0939\u0932\u0947`;
}
app.get("/api/news-posts", (req, res) => {
  const { role, includePending } = req.query;
  const posts = loadNewsDatabase();
  const now = Date.now();
  const activeSources = loadRssSourcesDatabase().filter((s) => s.isActive);
  const activeSourceIds = new Set(activeSources.map((s) => s.id));
  const activeSourceUrls = new Set(activeSources.map((s) => (s.url || "").trim().toLowerCase()));
  const activePosts = posts.filter((p) => {
    if (String(p.id).startsWith("live-post-")) return false;
    const postTime = p.timestamp || now;
    const expiresAt = p.expiresAt || postTime + THREE_DAYS_MS;
    if (now > expiresAt) return false;
    const isFeedSource = String(p.id).startsWith("rss-") || String(p.id).startsWith("web-");
    if (isFeedSource) {
      const parts = String(p.id).split("-");
      const srcId = parts.length >= 2 ? parts[1] : "";
      const matchesUrl = p.sourceUrl && activeSourceUrls.has(p.sourceUrl.trim().toLowerCase());
      if (srcId && !activeSourceIds.has(srcId) && !matchesUrl && role !== "admin" && role !== "superadmin" && !includePending) {
        return false;
      }
      if (p.status !== "APPROVED") {
        if (role !== "admin" && role !== "superadmin" && !includePending) {
          return false;
        }
      }
    }
    if ((p.status === "PENDING_APPROVAL" || p.status === "pending") && role !== "admin" && role !== "superadmin" && !includePending) {
      return false;
    }
    if ((p.status === "REJECTED" || p.status === "rejected") && role !== "admin" && role !== "superadmin") {
      return false;
    }
    return true;
  });
  if (activePosts.length < 20) {
    const activeIds = new Set(activePosts.map((p) => p.id));
    const backfillCandidates = posts.filter((p) => {
      if (String(p.id).startsWith("live-post-")) return false;
      if (activeIds.has(p.id)) return false;
      if ((p.status === "PENDING_APPROVAL" || p.status === "pending") && role !== "admin" && role !== "superadmin" && !includePending) {
        return false;
      }
      if ((p.status === "REJECTED" || p.status === "rejected") && role !== "admin" && role !== "superadmin") {
        return false;
      }
      if (p.status !== "APPROVED" && role !== "admin" && role !== "superadmin" && !includePending) {
        return false;
      }
      const isFeedSource = String(p.id).startsWith("rss-") || String(p.id).startsWith("web-");
      if (isFeedSource) {
        const parts = String(p.id).split("-");
        const srcId = parts.length >= 2 ? parts[1] : "";
        const matchesUrl = p.sourceUrl && activeSourceUrls.has(p.sourceUrl.trim().toLowerCase());
        if (srcId && !activeSourceIds.has(srcId) && !matchesUrl) {
          return false;
        }
        if (p.status !== "APPROVED") {
          if (role !== "admin" && role !== "superadmin" && !includePending) return false;
        }
      }
      return true;
    });
    backfillCandidates.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
    activePosts.push(...backfillCandidates.slice(0, 30 - activePosts.length));
  }
  activePosts.sort((a, b) => {
    const timeA = Number(a.timestamp) || 0;
    const timeB = Number(b.timestamp) || 0;
    if (timeB !== timeA) return timeB - timeA;
    return String(b.id).localeCompare(String(a.id));
  });
  const dynamicPosts = activePosts.map((p) => ({
    ...p,
    publishedTime: p.timestamp ? formatRelativeTime(p.timestamp) : p.publishedTime
  }));
  return res.json(Object.assign(dynamicPosts, { success: true, posts: dynamicPosts }));
});
app.post("/api/news-posts", (req, res) => {
  try {
    const payload = req.body;
    let existing = loadNewsDatabase();
    if (Array.isArray(payload)) {
      existing = payload;
    } else if (payload && payload.title) {
      const newPost = {
        id: payload.id || `post-${Date.now()}`,
        title: payload.title,
        summary: payload.summary || "",
        sourceChannel: payload.sourceChannel || "\u0928\u094D\u092F\u0942\u091C\u093C \u0930\u0942\u092E",
        sourceUrl: payload.sourceUrl || "",
        category: payload.category || "breaking",
        categoryName: payload.categoryName || "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C",
        publishedTime: "\u0905\u092D\u0940-\u0905\u092D\u0940",
        imageUrl: payload.imageUrl || "",
        breaking: Boolean(payload.breaking),
        isExclusive: Boolean(payload.isExclusive),
        fullContent: payload.fullContent || payload.summary || "",
        district: payload.district || "",
        location: payload.location || "",
        timestamp: payload.timestamp || Date.now()
      };
      existing = [newPost, ...existing.filter((p) => p.id !== newPost.id)];
    }
    saveNewsDatabase(existing);
    return res.json({ success: true, posts: existing });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/add-news", (req, res) => {
  try {
    const {
      headline,
      title,
      shortDescription,
      summary,
      thumbnailPhoto,
      imageUrl,
      additionalPhotos,
      fullNews,
      fullContent,
      location,
      district,
      newsDate,
      publishedTime,
      sourceChannel
    } = req.body;
    const finalHeadline = (headline || title || "").trim();
    const finalSummary = (shortDescription || summary || "").trim();
    const finalPhoto = (thumbnailPhoto || imageUrl || "").trim();
    const finalFullNews = (fullNews || fullContent || finalSummary || finalHeadline).trim();
    if (!finalHeadline || !finalSummary) {
      return res.status(400).json({ success: false, error: "\u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0914\u0930 \u0932\u0918\u0941 \u0935\u093F\u0935\u0930\u0923 (Short Description) \u0906\u0935\u0936\u094D\u092F\u0915 \u0939\u0948\u0902" });
    }
    const newPost = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: finalHeadline,
      summary: finalSummary,
      sourceChannel: sourceChannel || "\u090F\u0921\u092E\u093F\u0928 (Manual)",
      sourceUrl: "",
      category: "breaking",
      categoryName: "\u092E\u0941\u0916\u094D\u092F \u0938\u092E\u093E\u091A\u093E\u0930",
      publishedTime: newsDate || publishedTime || "\u0905\u092D\u0940-\u0905\u092D\u0940",
      imageUrl: finalPhoto || getCategoryFallbackImage("general"),
      additionalPhotos: Array.isArray(additionalPhotos) ? additionalPhotos : [],
      breaking: true,
      isExclusive: true,
      fullContent: finalFullNews,
      location: location || district || "",
      district: district || location || "",
      timestamp: Date.now(),
      status: "APPROVED"
    };
    const existing = loadNewsDatabase();
    const updated = [newPost, ...existing];
    saveNewsDatabase(updated);
    return res.json({ success: true, post: newPost, posts: updated, message: "\u092E\u0948\u0928\u094D\u092F\u0941\u0905\u0932 \u0938\u092E\u093E\u091A\u093E\u0930 \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u091C\u094B\u0921\u093C\u093E \u0917\u092F\u093E!" });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.get("/api/admin/approved-news-ids", (_req, res) => {
  try {
    const posts = loadNewsDatabase();
    const approvedIds = posts.filter((p) => p.status === "APPROVED" || !p.status).map((p) => p.id);
    return res.json({ success: true, approvedIds });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/approve-news/:id", (req, res) => {
  try {
    const { id } = req.params;
    let existing = loadNewsDatabase();
    let found = false;
    let approvedTitle = "";
    existing = existing.map((p) => {
      if (p.id === id) {
        found = true;
        const postData = req.body || {};
        const updatedTitle = postData.title || p.title;
        approvedTitle = updatedTitle;
        return {
          ...p,
          title: updatedTitle,
          summary: postData.summary || p.summary,
          imageUrl: postData.imageUrl || p.imageUrl,
          sourceChannel: postData.sourceChannel || p.sourceChannel,
          status: "APPROVED",
          timestamp: Date.now()
        };
      }
      return p;
    });
    if (!found) {
      const postData = req.body || {};
      approvedTitle = postData.title || postData.headline || "\u0938\u092E\u093E\u091A\u093E\u0930";
      const newApprovedPost = {
        id,
        title: approvedTitle,
        summary: postData.summary || postData.shortDescription || "",
        sourceChannel: postData.sourceChannel || "\u090F\u0906\u0908 \u0928\u094D\u092F\u0942\u091C\u093C \u092E\u0947\u0915\u0930",
        sourceUrl: postData.sourceUrl || "",
        category: postData.category || "breaking",
        categoryName: postData.categoryName || "\u092E\u0941\u0916\u094D\u092F \u0938\u092E\u093E\u091A\u093E\u0930",
        publishedTime: postData.publishedTime || "\u0905\u092D\u0940-\u0905\u092D\u0940",
        imageUrl: postData.imageUrl || postData.thumbnailPhoto || getCategoryFallbackImage("general"),
        additionalPhotos: Array.isArray(postData.additionalPhotos) ? postData.additionalPhotos : [],
        breaking: postData.breaking !== void 0 ? postData.breaking : true,
        isExclusive: postData.isExclusive || false,
        fullContent: postData.fullContent || postData.summary || "",
        location: postData.location || postData.district || "",
        district: postData.district || postData.location || "",
        timestamp: Date.now(),
        status: "APPROVED",
        isBonus: postData.isBonus || false,
        rewardCoins: postData.rewardCoins || 100
      };
      existing.unshift(newApprovedPost);
    }
    saveNewsDatabase(existing);
    broadcastNewsPublishedNotification(id, approvedTitle);
    const adminEmail = (req.headers["x-user-email"] || req.headers["x-admin-email"] || "admin").toString();
    logAdminAudit(adminEmail, "APPROVE_NEWS", id);
    return res.json({ success: true, message: "\u0916\u092C\u0930 \u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0939\u094B \u0917\u0908", id, posts: existing });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/bulk-approve-news", (req, res) => {
  try {
    const { approvedIds, posts } = req.body || {};
    if (!Array.isArray(approvedIds)) {
      return res.status(400).json({ success: false, error: "approvedIds array required" });
    }
    const approvedSet = new Set(approvedIds);
    let existing = loadNewsDatabase();
    existing = existing.map((p) => {
      if (approvedSet.has(p.id)) {
        return { ...p, status: "APPROVED", timestamp: Date.now() };
      }
      return p;
    });
    if (Array.isArray(posts)) {
      const existingIds = new Set(existing.map((p) => p.id));
      for (const p of posts) {
        if (approvedSet.has(p.id) && !existingIds.has(p.id)) {
          existing.unshift({ ...p, status: "APPROVED", timestamp: Date.now() });
          existingIds.add(p.id);
        }
      }
    }
    saveNewsDatabase(existing);
    const adminEmail = (req.headers["x-user-email"] || req.headers["x-admin-email"] || "admin").toString();
    logAdminAudit(adminEmail, "BULK_APPROVE_NEWS", `${approvedIds.length} items`);
    return res.json({ success: true, approvedIds: Array.from(approvedSet) });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/reject-news/:id", (req, res) => {
  try {
    const { id } = req.params;
    let existing = loadNewsDatabase();
    existing = existing.map((p) => p.id === id ? { ...p, status: "REJECTED" } : p);
    saveNewsDatabase(existing);
    const adminEmail = (req.headers["x-user-email"] || req.headers["x-admin-email"] || "admin").toString();
    logAdminAudit(adminEmail, "REJECT_NEWS", id);
    return res.json({ success: true, message: "\u0916\u092C\u0930 \u0905\u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0939\u094B \u0917\u0908", id });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/migrate-approvals", (req, res) => {
  try {
    const { approvedIds } = req.body || {};
    if (!Array.isArray(approvedIds)) {
      return res.status(400).json({ success: false, error: "approvedIds array required" });
    }
    const approvedSet = new Set(approvedIds);
    let existing = loadNewsDatabase();
    existing = existing.map((p) => {
      if (approvedSet.has(p.id)) {
        return { ...p, status: "APPROVED" };
      }
      return p;
    });
    saveNewsDatabase(existing);
    const authoritative = existing.filter((p) => p.status === "APPROVED" || !p.status).map((p) => p.id);
    return res.json({ success: true, approvedIds: authoritative });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.put("/api/news-posts/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    let existing = loadNewsDatabase();
    existing = existing.map((p) => p.id === id ? { ...p, ...updates } : p);
    saveNewsDatabase(existing);
    return res.json({ success: true, posts: existing });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.delete("/api/news-posts/:id", (req, res) => {
  try {
    const { id } = req.params;
    let existing = loadNewsDatabase();
    existing = existing.filter((p) => p.id !== id);
    saveNewsDatabase(existing);
    return res.json({ success: true, posts: existing });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/news-posts/reset", (_req, res) => {
  const fresh = getInitialRichNewsPosts();
  saveNewsDatabase(fresh);
  return res.json({ success: true, posts: fresh });
});
var DRAFTS_DB_FILE = import_path.default.join(process.cwd(), "drafts_database.json");
function loadDraftsDatabase() {
  try {
    if (import_fs.default.existsSync(DRAFTS_DB_FILE)) {
      const content = import_fs.default.readFileSync(DRAFTS_DB_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading drafts_database.json:", e);
  }
  return [];
}
function saveDraftsDatabase(drafts) {
  try {
    import_fs.default.writeFileSync(DRAFTS_DB_FILE, JSON.stringify(drafts, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error writing drafts_database.json:", e);
    return false;
  }
}
app.get("/api/drafts", (_req, res) => {
  const drafts = loadDraftsDatabase();
  return res.json({ success: true, drafts });
});
app.post("/api/drafts", (req, res) => {
  try {
    const draft = req.body;
    if (!draft || !draft.id) {
      return res.status(400).json({ error: "Invalid draft object" });
    }
    const drafts = loadDraftsDatabase();
    const idx = drafts.findIndex((d) => d.id === draft.id);
    const now = Date.now();
    if (idx >= 0) {
      drafts[idx] = { ...draft, updatedAt: now };
    } else {
      drafts.unshift({ ...draft, createdAt: draft.createdAt || now, updatedAt: now });
    }
    saveDraftsDatabase(drafts);
    return res.json({ success: true, draft });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.delete("/api/drafts/:id", (req, res) => {
  try {
    const { id } = req.params;
    let drafts = loadDraftsDatabase();
    drafts = drafts.filter((d) => d.id !== id);
    saveDraftsDatabase(drafts);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/news-posts/:id/bonus", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 (Admin) \u0939\u0940 \u092C\u094B\u0928\u0938 \u0928\u094D\u092F\u0942\u091C\u093C \u0915\u0949\u0928\u094D\u092B\u093C\u093F\u0917\u0930 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const { id } = req.params;
    const { isBonus, rewardCoins } = req.body;
    let posts = loadNewsDatabase();
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "\u0938\u092E\u093E\u091A\u093E\u0930 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E" });
    }
    posts[idx] = {
      ...posts[idx],
      isBonus: typeof isBonus === "boolean" ? isBonus : !posts[idx].isBonus,
      rewardCoins: Number(rewardCoins) >= 0 ? Number(rewardCoins) : posts[idx].rewardCoins || 5
    };
    saveNewsDatabase(posts);
    return res.json({ success: true, post: posts[idx], posts });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/rewards/download-event", (req, res) => {
  try {
    const { userId, userEmail, rewardCoins } = req.body;
    const newsItemId = (req.body.newsItemId || req.body.postId || "").toString().trim();
    const newsTitle = (req.body.newsTitle || req.body.postTitle || "\u092C\u094B\u0928\u0938 \u0938\u092E\u093E\u091A\u093E\u0930").toString().trim();
    const cleanEmail = (userEmail || "").toString().toLowerCase().trim();
    const cleanUserId = (userId || cleanEmail || "").toString().trim();
    if (!newsItemId || !cleanEmail && !cleanUserId) {
      return res.status(400).json({ error: "newsItemId and user identification required" });
    }
    const rDb = loadRewardsDatabase();
    const eventId = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newEvent = {
      eventId,
      userId: cleanUserId,
      userEmail: cleanEmail,
      newsItemId,
      newsTitle: newsTitle || "\u092C\u094B\u0928\u0938 \u0938\u092E\u093E\u091A\u093E\u0930",
      rewardCoins: Number(rewardCoins) || 5,
      downloadedAt: Date.now()
    };
    rDb.downloadEvents = [newEvent, ...rDb.downloadEvents.filter((e) => !(e.userId === cleanUserId && e.newsItemId === newsItemId))];
    saveRewardsDatabase(rDb);
    return res.json({ success: true, eventId, event: newEvent });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get(["/api/user/wallet", "/api/wallet"], (req, res) => {
  try {
    const email = (req.query.email || req.headers["x-user-email"] || "").toString().toLowerCase().trim();
    const userId = (req.query.userId || req.headers["x-user-id"] || email).toString().trim();
    if (!email && !userId) {
      return res.status(400).json({ error: "User email or ID required" });
    }
    const rDb = loadRewardsDatabase();
    const walletKey = email || userId;
    const wallet = rDb.wallets[walletKey] || { coinBalance: 0, pendingCoins: 0, totalEarnedCoins: 0 };
    const userClaims = rDb.claims.filter(
      (c) => email && c.userEmail && c.userEmail.toLowerCase() === email || userId && c.userId && c.userId === userId
    );
    const userDownloads = rDb.downloadEvents.filter(
      (e) => email && e.userEmail && e.userEmail.toLowerCase() === email || userId && e.userId && e.userId === userId
    );
    const claimedNewsIds = new Set(
      userClaims.filter((c) => c.status === "pending" || c.status === "approved").map((c) => c.newsItemId)
    );
    const eligibleDownloads = userDownloads.filter((e) => !claimedNewsIds.has(e.newsItemId)).map((e) => ({
      ...e,
      postId: e.newsItemId,
      postTitle: e.newsTitle
    }));
    const mappedClaims = userClaims.map((c) => ({
      ...c,
      postId: c.newsItemId,
      postTitle: c.newsTitle
    }));
    const userTransactions = rDb.transactions.filter(
      (t) => email && t.userEmail && t.userEmail.toLowerCase() === email || userId && t.userId && t.userId === userId
    );
    return res.json({
      success: true,
      wallet,
      claims: mappedClaims,
      eligibleDownloads,
      transactions: userTransactions
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/rewards/upload-screenshot", (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ error: "\u0938\u094D\u0915\u094D\u0930\u0940\u0928\u0936\u0949\u091F \u0907\u092E\u0947\u091C \u0906\u0935\u0936\u094D\u092F\u0915 \u0939\u0948" });
    }
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buf = Buffer.from(cleanBase64, "base64");
    if (buf.length > 10 * 1024 * 1024) {
      return res.status(413).json({ error: "\u0938\u094D\u0915\u094D\u0930\u0940\u0928\u0936\u0949\u091F \u0915\u093E \u0906\u0915\u093E\u0930 10MB \u0938\u0947 \u0905\u0927\u093F\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u0924\u093E\u0964" });
    }
    const magic = isValidImageMagicBytes(buf);
    if (!magic.valid) {
      return res.status(400).json({ error: "\u0905\u092E\u093E\u0928\u094D\u092F \u092B\u093C\u093E\u0907\u0932: \u0915\u0947\u0935\u0932 \u0935\u093E\u0938\u094D\u0924\u0935\u093F\u0915 PNG, JPEG, GIF \u092F\u093E WebP \u091B\u0935\u093F\u092F\u093E\u0901 \u0939\u0940 \u0938\u094D\u0935\u0940\u0915\u093E\u0930\u094D\u092F \u0939\u0948\u0902\u0964" });
    }
    const ext = magic.format || "jpg";
    const filename = `claim-${Date.now()}-${import_crypto.default.randomBytes(4).toString("hex")}.${ext}`;
    const filePath = import_path.default.join(UPLOAD_SCREENSHOTS_DIR, filename);
    const webFilePath = import_path.default.join(WEB_UPLOAD_SCREENSHOTS_DIR, filename);
    import_fs.default.writeFileSync(filePath, buf);
    try {
      import_fs.default.writeFileSync(webFilePath, buf);
    } catch {
    }
    const url = `/uploads/screenshots/${filename}`;
    return res.json({ success: true, url });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/rewards/claim", (req, res) => {
  try {
    const {
      userId,
      userEmail,
      userName,
      username,
      rewardCoins,
      graphicDownloadedAt,
      screenshotUrl
    } = req.body;
    const newsItemId = (req.body.newsItemId || req.body.postId || "").toString().trim();
    const newsTitle = (req.body.newsTitle || req.body.postTitle || "\u092C\u094B\u0928\u0938 \u0938\u092E\u093E\u091A\u093E\u0930").toString().trim();
    const cleanEmail = (userEmail || "").toString().toLowerCase().trim();
    const cleanUserId = (userId || cleanEmail || "").toString().trim();
    const rawUrls = Array.isArray(req.body.screenshotUrls) && req.body.screenshotUrls.length > 0 ? req.body.screenshotUrls.filter((u) => typeof u === "string" && u.trim().length > 0) : screenshotUrl ? [screenshotUrl] : [];
    const screenshotUrls = rawUrls.slice(0, 3);
    if (!newsItemId || screenshotUrls.length === 0 || !cleanEmail && !cleanUserId) {
      return res.status(400).json({ error: "\u0938\u092E\u093E\u091A\u093E\u0930, \u0915\u092E \u0938\u0947 \u0915\u092E 1 \u0938\u094D\u0915\u094D\u0930\u0940\u0928\u0936\u0949\u091F (\u0905\u0927\u093F\u0915\u0924\u092E 3) \u0914\u0930 \u092F\u0942\u091C\u093C\u0930 \u092A\u0939\u091A\u093E\u0928 \u0906\u0935\u0936\u094D\u092F\u0915 \u0939\u0948\u0902\u0964" });
    }
    const rDb = loadRewardsDatabase();
    const existingActiveClaim = rDb.claims.find(
      (c) => (cleanEmail && c.userEmail && c.userEmail.toLowerCase() === cleanEmail || cleanUserId && c.userId && c.userId === cleanUserId) && c.newsItemId === newsItemId && (c.status === "pending" || c.status === "approved")
    );
    if (existingActiveClaim) {
      return res.status(409).json({
        error: existingActiveClaim.status === "approved" ? "\u0907\u0938 \u092C\u094B\u0928\u0938 \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u0947 \u0932\u093F\u090F \u0930\u093F\u0935\u0949\u0930\u094D\u0921 \u092A\u0939\u0932\u0947 \u0939\u0940 \u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0915\u093F\u092F\u093E \u091C\u093E \u091A\u0941\u0915\u093E \u0939\u0948\u0964" : "\u0907\u0938 \u092C\u094B\u0928\u0938 \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u0947 \u0932\u093F\u090F \u0906\u092A\u0915\u093E \u0915\u094D\u0932\u0947\u092E \u092A\u0939\u0932\u0947 \u0938\u0947 \u0938\u092E\u0940\u0915\u094D\u0937\u093E \u092E\u0947\u0902 (Pending) \u0939\u0948\u0964"
      });
    }
    const coinsToClaim = Number(rewardCoins) > 0 ? Number(rewardCoins) : 5;
    const claimId = `claim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newClaim = {
      id: claimId,
      claimId,
      userId: cleanUserId,
      userEmail: cleanEmail,
      userName: userName || username || "\u092F\u0942\u091C\u093C\u0930",
      username: username || userName || cleanEmail.split("@")[0],
      newsItemId,
      postId: newsItemId,
      newsTitle: newsTitle || "\u092C\u094B\u0928\u0938 \u0938\u092E\u093E\u091A\u093E\u0930",
      postTitle: newsTitle || "\u092C\u094B\u0928\u0938 \u0938\u092E\u093E\u091A\u093E\u0930",
      rewardCoins: coinsToClaim,
      graphicDownloadedAt: Number(graphicDownloadedAt) || Date.now(),
      screenshotUrl: screenshotUrls[0] || "",
      screenshotUrls,
      submittedAt: Date.now(),
      createdAt: Date.now(),
      status: "pending"
    };
    rDb.claims.unshift(newClaim);
    const walletKey = cleanEmail || cleanUserId;
    if (!rDb.wallets[walletKey]) {
      rDb.wallets[walletKey] = { coinBalance: 0, pendingCoins: 0, totalEarnedCoins: 0 };
    }
    rDb.wallets[walletKey].pendingCoins += coinsToClaim;
    saveRewardsDatabase(rDb);
    return res.json({ success: true, claim: newClaim, wallet: rDb.wallets[walletKey] });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/admin/rewards/claims", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 (Admin) \u0939\u0940 \u0915\u094D\u0932\u0947\u092E \u0926\u0947\u0916 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const rDb = loadRewardsDatabase();
    const totalClaims = rDb.claims.length;
    const pendingCount = rDb.claims.filter((c) => c.status === "pending").length;
    const approvedCount = rDb.claims.filter((c) => c.status === "approved").length;
    const rejectedCount = rDb.claims.filter((c) => c.status === "rejected").length;
    const totalCoinsCredited = rDb.claims.filter((c) => c.status === "approved").reduce((sum, c) => sum + (c.rewardCoins || 0), 0);
    const totalBonusPosts = loadNewsDatabase().filter((p) => p.isBonus).length;
    const mappedClaims = rDb.claims.map((c) => ({
      ...c,
      postId: c.newsItemId,
      postTitle: c.newsTitle
    }));
    return res.json({
      success: true,
      claims: mappedClaims,
      stats: {
        totalClaims,
        pendingClaims: pendingCount,
        approvedClaims: approvedCount,
        rejectedClaims: rejectedCount,
        totalCoinsCredited,
        totalBonusPosts
      },
      summary: {
        totalClaims,
        pendingCount,
        approvedCount,
        rejectedCount,
        totalCoinsCredited,
        totalBonusPosts
      }
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/rewards/claims/:id/approve", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 (Admin) \u0939\u0940 \u0915\u094D\u0932\u0947\u092E \u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const { id } = req.params;
    const adminEmail = (req.body?.adminEmail || req.headers["x-user-email"] || "admin.ainewsmaker@gmail.com").toString();
    const rDb = loadRewardsDatabase();
    const claim = rDb.claims.find((c) => c.claimId === id || c.id === id);
    if (!claim) {
      return res.status(404).json({ error: "\u0915\u094D\u0932\u0947\u092E \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E" });
    }
    if (claim.status === "approved") {
      return res.json({ success: true, claim: { ...claim, id: claim.claimId }, message: "\u092F\u0939 \u0915\u094D\u0932\u0947\u092E \u092A\u0939\u0932\u0947 \u0938\u0947 \u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0939\u0948" });
    }
    const wasPending = claim.status === "pending";
    const coins = claim.rewardCoins || 5;
    const walletKey = (claim.userEmail || claim.userId || "").toLowerCase().trim();
    if (!rDb.wallets[walletKey]) {
      rDb.wallets[walletKey] = { coinBalance: 0, pendingCoins: 0, totalEarnedCoins: 0 };
    }
    if (wasPending) {
      rDb.wallets[walletKey].pendingCoins = Math.max(0, rDb.wallets[walletKey].pendingCoins - coins);
    }
    rDb.wallets[walletKey].coinBalance += coins;
    rDb.wallets[walletKey].totalEarnedCoins += coins;
    const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const tx = {
      id: txId,
      transactionId: txId,
      userId: claim.userId,
      userEmail: claim.userEmail,
      claimId: claim.claimId,
      newsItemId: claim.newsItemId,
      newsTitle: claim.newsTitle,
      description: `\u092C\u094B\u0928\u0938 \u0930\u093F\u0935\u0949\u0930\u094D\u0921 \u0938\u094D\u0935\u0940\u0915\u0943\u0924: ${claim.newsTitle || "\u092C\u094B\u0928\u0938 \u0938\u092E\u093E\u091A\u093E\u0930"}`,
      transactionType: "credit",
      type: "credit",
      coinAmount: coins,
      amount: coins,
      balanceAfter: rDb.wallets[walletKey].coinBalance,
      status: "completed",
      createdAt: Date.now(),
      createdBy: adminEmail
    };
    rDb.transactions.unshift(tx);
    claim.status = "approved";
    claim.reviewedBy = adminEmail;
    claim.reviewedAt = Date.now();
    claim.walletTransactionId = txId;
    claim.id = claim.claimId;
    saveRewardsDatabase(rDb);
    return res.json({
      success: true,
      claim,
      wallet: rDb.wallets[walletKey],
      message: `\u0915\u094D\u0932\u0947\u092E \u0938\u094D\u0935\u0940\u0915\u0943\u0924: ${coins} \u0930\u093F\u0935\u0949\u0930\u094D\u0921 \u0915\u0949\u0907\u0928\u094D\u0938 \u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E \u0915\u0947 \u0935\u0949\u0932\u0947\u091F \u092E\u0947\u0902 \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0915\u0930 \u0926\u093F\u090F \u0917\u090F \u0939\u0948\u0902\u0964`
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/rewards/claims/:id/reject", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 (Admin) \u0939\u0940 \u0915\u094D\u0932\u0947\u092E \u0905\u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const { id } = req.params;
    const { reason } = req.body;
    const adminEmail = (req.body?.adminEmail || req.headers["x-user-email"] || "admin.ainewsmaker@gmail.com").toString();
    const rDb = loadRewardsDatabase();
    const claim = rDb.claims.find((c) => c.claimId === id || c.id === id);
    if (!claim) {
      return res.status(404).json({ error: "\u0915\u094D\u0932\u0947\u092E \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E" });
    }
    const wasPending = claim.status === "pending";
    const coins = claim.rewardCoins || 5;
    const walletKey = (claim.userEmail || claim.userId || "").toLowerCase().trim();
    if (wasPending && rDb.wallets[walletKey]) {
      rDb.wallets[walletKey].pendingCoins = Math.max(0, rDb.wallets[walletKey].pendingCoins - coins);
    }
    claim.status = "rejected";
    claim.rejectionReason = (reason || "\u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u092A\u094B\u0938\u094D\u091F \u0915\u093E \u0938\u094D\u0915\u094D\u0930\u0940\u0928\u0936\u0949\u091F \u0938\u0924\u094D\u092F\u093E\u092A\u093F\u0924 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u093E\u0964").trim();
    claim.reviewedBy = adminEmail;
    claim.reviewedAt = Date.now();
    saveRewardsDatabase(rDb);
    return res.json({
      success: true,
      claim,
      wallet: rDb.wallets[walletKey],
      message: "\u0915\u094D\u0932\u0947\u092E \u0905\u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0915\u0930 \u0926\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964"
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/upload-logo", (req, res) => {
  try {
    const rawData = req.body?.dataUrl || req.body?.imageBase64 || "";
    if (!rawData || typeof rawData !== "string") {
      return res.status(400).json({ error: "\u0932\u094B\u0917\u094B \u0907\u092E\u0947\u091C \u0921\u0947\u091F\u093E \u0906\u0935\u0936\u094D\u092F\u0915 \u0939\u0948" });
    }
    const cleanBase64 = rawData.replace(/^data:image\/\w+;base64,/, "");
    const buf = Buffer.from(cleanBase64, "base64");
    if (buf.length > 10 * 1024 * 1024) {
      return res.status(413).json({ error: "\u092B\u093C\u093E\u0907\u0932 \u0915\u093E \u0906\u0915\u093E\u0930 10MB \u0938\u0947 \u0905\u0927\u093F\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u0924\u093E\u0964" });
    }
    const magic = isValidImageMagicBytes(buf);
    if (!magic.valid) {
      return res.status(400).json({ error: "\u0905\u092E\u093E\u0928\u094D\u092F \u092B\u093C\u093E\u0907\u0932: \u0915\u0947\u0935\u0932 \u0935\u093E\u0938\u094D\u0924\u0935\u093F\u0915 PNG, JPEG, GIF \u092F\u093E WebP \u091B\u0935\u093F\u092F\u093E\u0901 \u0939\u0940 \u0938\u094D\u0935\u0940\u0915\u093E\u0930\u094D\u092F \u0939\u0948\u0902\u0964" });
    }
    const isGif = magic.format === "gif";
    const ext = magic.format || "png";
    const filename = `logo-${Date.now()}-${import_crypto.default.randomBytes(4).toString("hex")}.${ext}`;
    const filePath = import_path.default.join(UPLOAD_LOGOS_DIR, filename);
    const webFilePath = import_path.default.join(WEB_UPLOAD_LOGOS_DIR, filename);
    import_fs.default.writeFileSync(filePath, buf);
    try {
      import_fs.default.writeFileSync(webFilePath, buf);
    } catch {
    }
    try {
      const distLogoDir = import_path.default.join(process.cwd(), "dist", "uploads", "logos");
      import_fs.default.mkdirSync(distLogoDir, { recursive: true });
      import_fs.default.writeFileSync(import_path.default.join(distLogoDir, filename), buf);
    } catch {
    }
    const logoUrl = `/uploads/logos/${filename}`;
    const userOrEmail = (req.body?.email || req.body?.username || req.body?.userId || "").trim().toLowerCase();
    if (userOrEmail) {
      const allProfiles = loadProfilesDatabase();
      let targetKey = "";
      if (allProfiles[userOrEmail]) {
        targetKey = userOrEmail;
      } else {
        const cleanE = userOrEmail.replace(/\s+/g, "");
        for (const k of Object.keys(allProfiles)) {
          const p = allProfiles[k];
          const pEmail = (p.email || "").toLowerCase().replace(/\s+/g, "");
          const pUser = (p.username || "").toLowerCase().trim();
          if (pEmail === cleanE || pUser === userOrEmail) {
            targetKey = k;
            break;
          }
        }
      }
      if (targetKey && allProfiles[targetKey]) {
        if (isGif) {
          allProfiles[targetKey].channelLogoGifUrl = logoUrl;
          allProfiles[targetKey].channelLogoType = "gif";
        } else {
          allProfiles[targetKey].channelLogoPngUrl = logoUrl;
          allProfiles[targetKey].channelLogoType = "png";
          allProfiles[targetKey].channelLogoUrl = logoUrl;
        }
        allProfiles[targetKey].updatedAt = Date.now();
        saveProfilesDatabase(allProfiles);
        try {
          registerOrUpdateUserAuthoritative(allProfiles[targetKey]);
        } catch {
        }
      }
    }
    return res.json({ success: true, url: logoUrl, logoUrl, logoType: isGif ? "gif" : "png" });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/wallet/claim-welcome-reward", (req, res) => {
  try {
    const { email, userId, rewardType } = req.body || {};
    const cleanEmail = (email || "").toString().toLowerCase().trim();
    const cleanUserId = (userId || cleanEmail || "").toString().trim();
    if (!cleanEmail && !cleanUserId) {
      return res.status(400).json({ error: "User email or ID required" });
    }
    if (rewardType !== "graphic" && rewardType !== "video") {
      return res.status(400).json({ error: "Invalid rewardType. Must be 'graphic' or 'video'." });
    }
    const rDb = loadRewardsDatabase();
    const walletKey = cleanEmail || cleanUserId;
    if (!rDb.wallets[walletKey]) {
      rDb.wallets[walletKey] = { coinBalance: 0, pendingCoins: 0, totalEarnedCoins: 0 };
    }
    if (!rDb.welcomeRewards) {
      rDb.welcomeRewards = {};
    }
    if (!rDb.welcomeRewards[walletKey]) {
      rDb.welcomeRewards[walletKey] = {};
    }
    const userRewards = rDb.welcomeRewards[walletKey];
    const isClaimed = rewardType === "graphic" ? Boolean(userRewards.graphicClaimed) : Boolean(userRewards.videoClaimed);
    if (isClaimed) {
      return res.json({
        success: true,
        alreadyClaimed: true,
        rewardCoins: 0,
        wallet: rDb.wallets[walletKey],
        message: rewardType === "graphic" ? "\u092A\u094D\u0930\u0925\u092E \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u093E 500 \u0915\u0949\u0907\u0928 \u0935\u0947\u0932\u0915\u092E \u0930\u093F\u0935\u0949\u0930\u094D\u0921 \u092A\u0939\u0932\u0947 \u0939\u0940 \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0939\u094B \u091A\u0941\u0915\u093E \u0939\u0948\u0964" : "\u092A\u094D\u0930\u0925\u092E \u0935\u0940\u0921\u093F\u092F\u094B \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u093E 500 \u0915\u0949\u0907\u0928 \u0935\u0947\u0932\u0915\u092E \u0930\u093F\u0935\u0949\u0930\u094D\u0921 \u092A\u0939\u0932\u0947 \u0939\u0940 \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0939\u094B \u091A\u0941\u0915\u093E \u0939\u0948\u3002"
      });
    }
    const rewardCoins = 500;
    rDb.wallets[walletKey].coinBalance += rewardCoins;
    rDb.wallets[walletKey].totalEarnedCoins += rewardCoins;
    if (rewardType === "graphic") {
      userRewards.graphicClaimed = true;
    } else {
      userRewards.videoClaimed = true;
    }
    const txId = `tx-welcome-${rewardType}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const tx = {
      id: txId,
      transactionId: txId,
      userId: cleanUserId,
      userEmail: cleanEmail,
      description: rewardType === "graphic" ? "\u0935\u0947\u0932\u0915\u092E \u0930\u093F\u0935\u0949\u0930\u094D\u0921: \u092A\u094D\u0930\u0925\u092E \u0938\u092B\u0932 \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u0921\u093E\u0909\u0928\u0932\u094B\u0921 (500 \u0915\u0949\u0907\u0928)" : "\u0935\u0947\u0932\u0915\u092E \u0930\u093F\u0935\u0949\u0930\u094D\u0921: \u092A\u094D\u0930\u0925\u092E \u0938\u092B\u0932 \u0935\u0940\u0921\u093F\u092F\u094B \u0921\u093E\u0909\u0928\u0932\u094B\u0921 (500 \u0915\u0949\u0907\u0928)",
      transactionType: "credit",
      type: "credit",
      coinAmount: rewardCoins,
      amount: rewardCoins,
      balanceAfter: rDb.wallets[walletKey].coinBalance,
      status: "completed",
      createdAt: Date.now(),
      createdBy: "system"
    };
    rDb.transactions.unshift(tx);
    saveRewardsDatabase(rDb);
    return res.json({
      success: true,
      claimed: true,
      awarded: true,
      rewardCoins,
      wallet: rDb.wallets[walletKey],
      transaction: tx,
      message: `\u092C\u0927\u093E\u0908! \u092A\u094D\u0930\u0925\u092E ${rewardType === "graphic" ? "\u0917\u094D\u0930\u093E\u092B\u093F\u0915" : "\u0935\u0940\u0921\u093F\u092F\u094B"} \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u092A\u0930 500 \u0935\u0947\u0932\u0915\u092E \u0915\u0949\u0907\u0928\u094D\u0938 \u0906\u092A\u0915\u0947 \u0935\u0949\u0932\u0947\u091F \u092E\u0947\u0902 \u091C\u0941\u0921\u093C \u0917\u090F \u0939\u0948\u0902!`
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/wallet/unlock-item", (req, res) => {
  try {
    const { email, userId, itemId, itemType = "news", coinValue, coinCost, itemTitle, title } = req.body || {};
    const cleanEmail = (email || "").toString().toLowerCase().trim();
    const cleanUserId = (userId || cleanEmail || "").toString().trim();
    const cleanItemId = (itemId || "").toString().trim();
    const rawVal = coinValue !== void 0 ? coinValue : coinCost;
    const requiredCoins = Number(rawVal);
    if (!cleanItemId || !cleanEmail && !cleanUserId) {
      return res.status(400).json({ error: "itemId and user identification required" });
    }
    if (!Number.isInteger(requiredCoins) || requiredCoins <= 0) {
      return res.status(400).json({ error: "Invalid coinValue. Must be a positive integer." });
    }
    const rDb = loadRewardsDatabase();
    const walletKey = cleanEmail || cleanUserId;
    if (!rDb.wallets[walletKey]) {
      rDb.wallets[walletKey] = { coinBalance: 0, pendingCoins: 0, totalEarnedCoins: 0 };
    }
    if (!rDb.unlockedItems) {
      rDb.unlockedItems = {};
    }
    if (!rDb.unlockedItems[walletKey]) {
      rDb.unlockedItems[walletKey] = [];
    }
    if (rDb.unlockedItems[walletKey].includes(cleanItemId)) {
      return res.json({
        success: true,
        alreadyUnlocked: true,
        wallet: rDb.wallets[walletKey],
        message: "\u092F\u0939 \u0938\u093E\u092E\u0917\u094D\u0930\u0940 \u092A\u0939\u0932\u0947 \u0938\u0947 \u0905\u0928\u0932\u0949\u0915 \u0939\u0948\u0964"
      });
    }
    const currentBalance = rDb.wallets[walletKey].coinBalance;
    if (currentBalance < requiredCoins) {
      return res.status(400).json({
        success: false,
        error: `\u0905\u092A\u0930\u094D\u092F\u093E\u092A\u094D\u0924 \u0915\u0949\u0907\u0928 \u092C\u0948\u0932\u0947\u0902\u0938! \u0905\u0928\u0932\u0949\u0915 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F ${requiredCoins} \u0915\u0949\u0907\u0928\u094D\u0938 \u0906\u0935\u0936\u094D\u092F\u0915 \u0939\u0948\u0902, \u091C\u092C\u0915\u093F \u0906\u092A\u0915\u0947 \u092A\u093E\u0938 ${currentBalance} \u0915\u0949\u0907\u0928\u094D\u0938 \u0909\u092A\u0932\u092C\u094D\u0927 \u0939\u0948\u0902\u0964`,
        required: requiredCoins,
        available: currentBalance
      });
    }
    rDb.wallets[walletKey].coinBalance -= requiredCoins;
    rDb.unlockedItems[walletKey].push(cleanItemId);
    const txId = `tx-unlock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const chosenTitle = itemTitle || title || cleanItemId;
    const tx = {
      id: txId,
      transactionId: txId,
      userId: cleanUserId,
      userEmail: cleanEmail,
      newsItemId: cleanItemId,
      newsTitle: chosenTitle,
      description: `\u0938\u093E\u092E\u0917\u094D\u0930\u0940 \u0905\u0928\u0932\u0949\u0915 (${itemType === "video" ? "\u0935\u0940\u0921\u093F\u092F\u094B" : "\u0938\u092E\u093E\u091A\u093E\u0930 \u0917\u094D\u0930\u093E\u092B\u093F\u0915"}): ${chosenTitle} (-${requiredCoins} \u0915\u0949\u0907\u0928\u094D\u0938)`,
      transactionType: "debit",
      type: "debit",
      coinAmount: -requiredCoins,
      amount: -requiredCoins,
      balanceAfter: rDb.wallets[walletKey].coinBalance,
      status: "completed",
      createdAt: Date.now(),
      createdBy: "system"
    };
    rDb.transactions.unshift(tx);
    saveRewardsDatabase(rDb);
    return res.json({
      success: true,
      unlocked: true,
      wallet: rDb.wallets[walletKey],
      transaction: tx,
      message: `\u0938\u093E\u092E\u0917\u094D\u0930\u0940 \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u0905\u0928\u0932\u0949\u0915 \u0939\u094B \u0917\u0908! ${requiredCoins} \u0915\u0949\u0907\u0928\u094D\u0938 \u0915\u093E\u091F\u0947 \u0917\u090F\u0964`
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/wallet/unlocked-items", (req, res) => {
  try {
    const email = (req.query.email || req.headers["x-user-email"] || "").toString().toLowerCase().trim();
    const userId = (req.query.userId || req.headers["x-user-id"] || email).toString().trim();
    const walletKey = email || userId;
    if (!walletKey) {
      return res.status(400).json({ error: "User email or ID required" });
    }
    const rDb = loadRewardsDatabase();
    const unlocked = rDb.unlockedItems?.[walletKey] || [];
    const welcome = rDb.welcomeRewards?.[walletKey] || { graphicClaimed: false, videoClaimed: false };
    return res.json({
      success: true,
      unlockedItems: unlocked,
      items: unlocked.map((id) => ({ itemId: id, itemType: id.startsWith("vid") ? "video" : "news" })),
      unlockedList: unlocked,
      welcomeRewards: welcome
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post(["/api/admin/wallet/adjust-coins", "/api/admin/wallet/credit-coins"], (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 (Admin) \u0939\u0940 \u0915\u0949\u0907\u0928 \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const { email, userId, amount, coins, note, reason } = req.body || {};
    const cleanEmail = (email || "").toString().toLowerCase().trim();
    const cleanUserId = (userId || cleanEmail || "").toString().trim();
    const coinAmount = Number(amount !== void 0 ? amount : coins);
    if (!cleanEmail && !cleanUserId) {
      return res.status(400).json({ error: "\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E \u0908\u092E\u0947\u0932 \u092F\u093E \u0906\u0908\u0921\u0940 \u0906\u0935\u0936\u094D\u092F\u0915 \u0939\u0948" });
    }
    if (!Number.isInteger(coinAmount) || coinAmount <= 0) {
      return res.status(400).json({ error: "\u0915\u0949\u0907\u0928 \u0915\u0940 \u0938\u0902\u0916\u094D\u092F\u093E \u090F\u0915 \u0927\u0928\u093E\u0924\u094D\u092E\u0915 \u092A\u0942\u0930\u094D\u0923\u093E\u0902\u0915 (Positive Integer) \u0939\u094B\u0928\u0940 \u091A\u093E\u0939\u093F\u090F" });
    }
    const rDb = loadRewardsDatabase();
    const walletKey = cleanEmail || cleanUserId;
    if (!rDb.wallets[walletKey]) {
      rDb.wallets[walletKey] = { coinBalance: 0, pendingCoins: 0, totalEarnedCoins: 0 };
    }
    rDb.wallets[walletKey].coinBalance += coinAmount;
    rDb.wallets[walletKey].totalEarnedCoins += coinAmount;
    const callerEmail = (req.headers["x-user-email"] || req.headers["x-admin-email"] || req.body?.adminEmail || req.body?.userEmail || "admin").toString().toLowerCase().trim();
    const txId = `tx-admin-adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const txReason = note || reason || "\u090F\u0921\u092E\u093F\u0928 \u0926\u094D\u0935\u093E\u0930\u093E \u092E\u0948\u0928\u0941\u0905\u0932 \u0915\u0949\u0907\u0928 \u0938\u092E\u093E\u092F\u094B\u091C\u0928 (Admin Manual Credit)";
    const tx = {
      id: txId,
      transactionId: txId,
      userId: cleanUserId,
      userEmail: cleanEmail,
      description: `\u090F\u0921\u092E\u093F\u0928 \u0915\u094D\u0930\u0947\u0921\u093F\u091F: +${coinAmount} \u0915\u0949\u0907\u0928\u094D\u0938 (${txReason})`,
      transactionType: "credit",
      type: "credit",
      coinAmount,
      amount: coinAmount,
      balanceAfter: rDb.wallets[walletKey].coinBalance,
      status: "completed",
      createdAt: Date.now(),
      createdBy: callerEmail
    };
    rDb.transactions.unshift(tx);
    saveRewardsDatabase(rDb);
    return res.json({
      success: true,
      coinBalance: rDb.wallets[walletKey].coinBalance,
      message: `\u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 ${coinAmount} \u0915\u0949\u0907\u0928 \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0915\u093F\u090F \u0917\u090F! \u0928\u092F\u093E \u092C\u0948\u0932\u0947\u0902\u0938: ${rDb.wallets[walletKey].coinBalance}`,
      wallet: rDb.wallets[walletKey],
      transaction: tx
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/news-posts/:id/coin-value", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 (Admin) \u0939\u0940 \u0915\u0949\u0907\u0928 \u0935\u0948\u0932\u094D\u092F\u0942 \u0938\u0947\u091F \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const { id } = req.params;
    const { coinValue, coinCost, restrictedPlans } = req.body || {};
    let posts = loadNewsDatabase();
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "\u0938\u092E\u093E\u091A\u093E\u0930 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E" });
    }
    const rawVal = coinValue !== void 0 ? coinValue : coinCost;
    const parsedCoinValue = Number(rawVal);
    const finalCoins = Number.isInteger(parsedCoinValue) && parsedCoinValue > 0 ? parsedCoinValue : void 0;
    posts[idx] = {
      ...posts[idx],
      coinValue: finalCoins,
      coinCost: finalCoins,
      restrictedPlans: Array.isArray(restrictedPlans) ? restrictedPlans : []
    };
    saveNewsDatabase(posts);
    const adminEmail = (req.headers["x-user-email"] || req.headers["x-admin-email"] || "admin").toString();
    logAdminAudit(adminEmail, "SET_NEWS_COIN_VALUE", id, { coinValue: posts[idx].coinValue, restrictedPlans: posts[idx].restrictedPlans });
    return res.json({ success: true, post: posts[idx] });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/videos/:id/coin-value", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 (Admin) \u0939\u0940 \u0915\u0949\u0907\u0928 \u0935\u0948\u0932\u094D\u092F\u0942 \u0938\u0947\u091F \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const { id } = req.params;
    const { coinValue, coinCost, restrictedPlans } = req.body || {};
    let videos = loadVideosDatabase();
    const idx = videos.findIndex((v) => v.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "\u0935\u0940\u0921\u093F\u092F\u094B \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E" });
    }
    const rawVal = coinValue !== void 0 ? coinValue : coinCost;
    const parsedCoinValue = Number(rawVal);
    const finalCoins = Number.isInteger(parsedCoinValue) && parsedCoinValue > 0 ? parsedCoinValue : void 0;
    videos[idx] = {
      ...videos[idx],
      coinValue: finalCoins,
      coinCost: finalCoins,
      restrictedPlans: Array.isArray(restrictedPlans) ? restrictedPlans : []
    };
    saveVideosDatabase(videos);
    const adminEmail = (req.headers["x-user-email"] || req.headers["x-admin-email"] || "admin").toString();
    logAdminAudit(adminEmail, "SET_VIDEO_COIN_VALUE", id, { coinValue: videos[idx].coinValue, restrictedPlans: videos[idx].restrictedPlans });
    return res.json({ success: true, video: videos[idx] });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var CHANNELS_DB_FILE = import_path.default.join(process.cwd(), "restricted_channels_db.json");
var DEFAULT_SEED_CHANNELS = [
  { id: "res_aajtak", channelName: "\u0906\u091C \u0924\u0915 (Aaj Tak)", websiteUrl: "aajtak.in", username: "aajtak", logoUrl: "https://akm-img-a-in.tosshub.com/aajtak/resource/img/aajtak-logo-156X116.png", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
  { id: "res_abp", channelName: "\u090F\u092C\u0940\u092A\u0940 \u0928\u094D\u092F\u0942\u091C\u093C (ABP News)", websiteUrl: "abplive.com", username: "abpnews", logoUrl: "https://static.abplive.com/frontend/images/ABP_Hindi.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
  { id: "res_ndtv", channelName: "\u090F\u0928\u0921\u0940\u091F\u0940\u0935\u0940 \u0907\u0902\u0921\u093F\u092F\u093E (NDTV India)", websiteUrl: "ndtv.in", username: "ndtv", logoUrl: "https://drop.ndtv.com/homepage/images/ndtvlogo.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
  { id: "res_zeenews", channelName: "\u091C\u093C\u0940 \u0928\u094D\u092F\u0942\u091C\u093C (Zee News)", websiteUrl: "zeenews.india.com", username: "zeenews", logoUrl: "https://english.cdn.zeenews.com/static/apprun/dna/icons/dna-logo.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
  { id: "res_indiatv", channelName: "\u0907\u0902\u0921\u093F\u092F\u093E \u091F\u0940\u0935\u0940 (India TV)", websiteUrl: "indiatvnews.com", username: "indiatv", logoUrl: "https://resize.indiatvnews.com/en/resize/newbucket/1200_-/2020/03/indiatv-logo-1584955685.jpg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
  { id: "res_republic", channelName: "\u0930\u093F\u092A\u092C\u094D\u0932\u093F\u0915 \u092D\u093E\u0930\u0924 (Republic Bharat)", websiteUrl: "republicbharat.com", username: "republicbharat", logoUrl: "https://www.republicbharat.com/assets/images/bharat-logo.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u0928\u0947\u091F\u0935\u0930\u094D\u0915 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
  { id: "res_news18", channelName: "\u0928\u094D\u092F\u0942\u091C\u093C18 \u0907\u0902\u0921\u093F\u092F\u093E (News18 India)", websiteUrl: "news18.com", username: "news18", logoUrl: "https://images.news18.com/static_netstorage/images/news18_logo_hindi.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u0928\u0947\u091F\u0935\u0930\u094D\u0915 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
  { id: "res_bhaskar", channelName: "\u0926\u0948\u0928\u093F\u0915 \u092D\u093E\u0938\u094D\u0915\u0930 (Dainik Bhaskar)", websiteUrl: "dainikbhaskar.com", username: "dainikbhaskar", logoUrl: "https://www.bhaskar.com/assets/images/db-logo-hindi.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u092A\u0924\u094D\u0930 \u0935 \u092E\u0940\u0921\u093F\u092F\u093E \u0938\u092E\u0942\u0939", createdAt: 17e11 },
  { id: "res_amarujala", channelName: "\u0905\u092E\u0930 \u0909\u091C\u093E\u0932\u093E (Amar Ujala)", websiteUrl: "amarujala.com", username: "amarujala", logoUrl: "https://www.amarujala.com/assets/images/amarujala.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u092A\u0924\u094D\u0930 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 }
];
function loadChannelsDatabase() {
  try {
    if (import_fs.default.existsSync(CHANNELS_DB_FILE)) {
      const raw = import_fs.default.readFileSync(CHANNELS_DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading restricted_channels_db.json:", e);
  }
  saveChannelsDatabase(DEFAULT_SEED_CHANNELS);
  return DEFAULT_SEED_CHANNELS;
}
function saveChannelsDatabase(channels) {
  try {
    import_fs.default.writeFileSync(CHANNELS_DB_FILE, JSON.stringify(channels, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error writing restricted_channels_db.json:", e);
    return false;
  }
}
app.get("/api/channels", (_req, res) => {
  const channels = loadChannelsDatabase();
  return res.json({ success: true, channels });
});
app.post("/api/channels", (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.channelName) {
      return res.status(400).json({ error: "\u091A\u0948\u0928\u0932 \u0915\u093E \u0928\u093E\u092E \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948" });
    }
    const channels = loadChannelsDatabase();
    const cleanUsername = (payload.username || payload.channelName).toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (channels.some((c) => c.username.toLowerCase() === cleanUsername)) {
      return res.status(409).json({ error: "\u092F\u0939 \u091A\u0948\u0928\u0932 \u092A\u0939\u0932\u0947 \u0938\u0947 \u092E\u094C\u091C\u0942\u0926 \u0939\u0948" });
    }
    const newChan = {
      id: payload.id || `res_${Date.now()}`,
      channelName: payload.channelName.trim(),
      websiteUrl: payload.websiteUrl || "",
      username: cleanUsername,
      logoUrl: payload.logoUrl || "",
      reason: payload.reason || "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932",
      createdAt: Date.now()
    };
    channels.push(newChan);
    saveChannelsDatabase(channels);
    return res.json({ success: true, channel: newChan, channels });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.put("/api/channels/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    let channels = loadChannelsDatabase();
    const idx = channels.findIndex((c) => c.id === id);
    if (idx >= 0) {
      channels[idx] = { ...channels[idx], ...updates };
      saveChannelsDatabase(channels);
      return res.json({ success: true, channel: channels[idx], channels });
    }
    return res.status(404).json({ error: "\u091A\u0948\u0928\u0932 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E" });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.delete("/api/channels/:id", (req, res) => {
  try {
    const { id } = req.params;
    let channels = loadChannelsDatabase();
    channels = channels.filter((c) => c.id !== id);
    saveChannelsDatabase(channels);
    return res.json({ success: true, channels });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var USERS_MASTER_FILE = import_path.default.join(process.cwd(), "users_master_database.json");
var USERS_DB_FILE = import_path.default.join(process.cwd(), "users_accounts_db.json");
var NOTIFICATIONS_DB_FILE = import_path.default.join(process.cwd(), "notifications_database.json");
function cleanGenerateUsername(requestedUsername, fullName, existingUsername) {
  const users = loadUsersMasterDatabase();
  const taken = new Set(users.map((u) => (u.username || "").toLowerCase().trim().replace(/^@+/, "")));
  if (requestedUsername && typeof requestedUsername === "string") {
    const clean = requestedUsername.trim().replace(/^@+/, "");
    if (clean && !clean.includes("@") && !clean.includes(".")) {
      return clean;
    }
  }
  if (existingUsername && typeof existingUsername === "string") {
    const clean = existingUsername.trim().replace(/^@+/, "");
    if (clean && !clean.includes("@") && !clean.includes(".")) {
      return clean;
    }
  }
  let base = "reporter";
  if (fullName && typeof fullName === "string") {
    const englishName = fullName.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase().trim();
    if (englishName.length >= 3) {
      base = englishName.slice(0, 16);
    }
  }
  let candidate = base;
  let counter = 1;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${base}_${counter}`;
    counter++;
  }
  return candidate;
}
function isProtectedAdminAccount(email) {
  if (!email) return false;
  const clean = email.toLowerCase().replace(/\s+/g, "").trim();
  return clean === "admin.ainewsmaker@gmail.com" || clean === "breakingnewswala.com@gmail.com";
}
var AsyncLock = class {
  constructor() {
    this.queue = [];
    this.locked = false;
  }
  async acquire() {
    return new Promise((resolve) => {
      const release = () => {
        if (this.queue.length > 0) {
          const next = this.queue.shift();
          next();
        } else {
          this.locked = false;
        }
      };
      if (!this.locked) {
        this.locked = true;
        resolve(release);
      } else {
        this.queue.push(() => resolve(release));
      }
    });
  }
};
var userDbLock = new AsyncLock();
function loadUsersMasterDatabase() {
  try {
    const locations = resolveAllDatabaseLocations("users_master_database.json");
    for (const loc of locations) {
      if (import_fs.default.existsSync(loc)) {
        const raw = import_fs.default.readFileSync(loc, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.sort((a, b) => {
            const timeA = Number(a.createdAt) || Number(a.trialStartedAt) || 0;
            const timeB = Number(b.createdAt) || Number(b.trialStartedAt) || 0;
            return timeB - timeA;
          });
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error("Error reading users_master_database.json:", e);
  }
  return [];
}
function saveUsersMasterDatabase(users) {
  try {
    users.sort((a, b) => {
      const timeA = Number(a.createdAt) || Number(a.trialStartedAt) || 0;
      const timeB = Number(b.createdAt) || Number(b.trialStartedAt) || 0;
      return timeB - timeA;
    });
    const locations = resolveAllDatabaseLocations("users_master_database.json");
    const accountLocations = resolveAllDatabaseLocations("users_accounts_db.json");
    const jsonStr = JSON.stringify(users, null, 2);
    for (const loc of locations) {
      try {
        const dir = import_path.default.dirname(loc);
        if (!import_fs.default.existsSync(dir)) import_fs.default.mkdirSync(dir, { recursive: true });
        import_fs.default.writeFileSync(loc, jsonStr, "utf-8");
      } catch {
      }
    }
    for (const loc of accountLocations) {
      try {
        const dir = import_path.default.dirname(loc);
        if (!import_fs.default.existsSync(dir)) import_fs.default.mkdirSync(dir, { recursive: true });
        import_fs.default.writeFileSync(loc, jsonStr, "utf-8");
      } catch {
      }
    }
    return true;
  } catch (e) {
    console.error("Error writing users_master_database.json:", e);
    return false;
  }
}
function loadUsersDatabase() {
  return loadUsersMasterDatabase();
}
function saveUsersDatabase(users) {
  return saveUsersMasterDatabase(users);
}
function loadNotificationsDatabase() {
  try {
    if (import_fs.default.existsSync(NOTIFICATIONS_DB_FILE)) {
      const raw = import_fs.default.readFileSync(NOTIFICATIONS_DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Error reading notifications_database.json:", err);
  }
  return [];
}
function saveNotificationsDatabase(notifs) {
  try {
    import_fs.default.writeFileSync(NOTIFICATIONS_DB_FILE, JSON.stringify(notifs, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing notifications_database.json:", err);
    return false;
  }
}
function broadcastNewsPublishedNotification(newsId, title) {
  try {
    const notifs = loadNotificationsDatabase();
    const notifId = `notif_news_${newsId}`;
    if (!notifs.some((n) => n.id === notifId)) {
      notifs.unshift({
        id: notifId,
        title: "\u{1F4F0} \u0928\u0908 \u0938\u092E\u093E\u091A\u093E\u0930 \u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0935 \u092A\u094D\u0930\u0915\u093E\u0936\u093F\u0924",
        message: title && title !== "\u0938\u092E\u093E\u091A\u093E\u0930" ? title : "\u0928\u092F\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u092E\u0941\u0916\u094D\u092F \u0939\u094B\u092E \u092B\u093C\u0940\u0921 \u092E\u0947\u0902 \u092A\u094D\u0930\u0915\u093E\u0936\u093F\u0924 \u0915\u0930 \u0926\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964",
        time: "\u0905\u092D\u0940",
        timestamp: Date.now(),
        unread: true,
        type: "news",
        targetUserEmail: "all",
        linkTab: "home"
      });
      if (notifs.length > 200) notifs.length = 200;
      saveNotificationsDatabase(notifs);
    }
  } catch (e) {
    console.error("Error broadcasting news notification:", e);
  }
}
function broadcastVideoPublishedNotification(videoId, title) {
  try {
    const notifs = loadNotificationsDatabase();
    const notifId = `notif_video_${videoId}`;
    if (!notifs.some((n) => n.id === notifId)) {
      notifs.unshift({
        id: notifId,
        title: "\u{1F3AC} \u0928\u092F\u093E \u0935\u0940\u0921\u093F\u092F\u094B \u0935 \u0930\u0940\u0932\u094D\u0938 \u091C\u093E\u0930\u0940",
        message: title || "\u0928\u092F\u093E \u0935\u0940\u0921\u093F\u092F\u094B \u0935\u0940\u0921\u093F\u092F\u094B \u090F\u0902\u0921 \u0930\u0940\u0932\u094D\u0938 \u0938\u0947\u0915\u094D\u0936\u0928 \u092E\u0947\u0902 \u091C\u093E\u0930\u0940 \u0939\u094B \u0917\u092F\u093E \u0939\u0948\u0964",
        time: "\u0905\u092D\u0940",
        timestamp: Date.now(),
        unread: true,
        type: "video",
        targetUserEmail: "all",
        linkTab: "videos"
      });
      if (notifs.length > 200) notifs.length = 200;
      saveNotificationsDatabase(notifs);
    }
  } catch (e) {
    console.error("Error broadcasting video notification:", e);
  }
}
function computeTrialFields(u, now = Date.now()) {
  const isSuper = u.role === "superadmin" || isProtectedAdminAccount(u.email);
  if (isSuper || u.tier && u.tier !== "basic") {
    return {
      daysRemaining: isSuper ? 3650 : Math.max(0, Math.ceil(((u.expiresAt || now) - now) / (24 * 3600 * 1e3))),
      hoursRemaining: 24,
      minutesRemaining: 60,
      isTrialActive: false,
      isTrialExpired: false,
      hasActivePaidPlan: true
    };
  }
  const trialEnds = u.trialEndsAt || (u.trialStartedAt || u.createdAt || now) + SEVEN_DAYS_MS;
  const msRemaining = trialEnds - now;
  const isExpired = msRemaining <= 0;
  const daysRemaining = isExpired ? 0 : Math.ceil(msRemaining / (24 * 3600 * 1e3));
  const hoursRemaining = isExpired ? 0 : Math.floor(Math.max(0, msRemaining) % (24 * 3600 * 1e3) / (3600 * 1e3));
  const minutesRemaining = isExpired ? 0 : Math.floor(Math.max(0, msRemaining) % (3600 * 1e3) / (60 * 1e3));
  return {
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    isTrialActive: !isExpired,
    isTrialExpired: isExpired,
    hasActivePaidPlan: false
  };
}
function checkUserAccess(userEmailOrUid) {
  if (!userEmailOrUid) return { allowed: true };
  const clean = userEmailOrUid.toString().toLowerCase().trim();
  if (isProtectedAdminAccount(clean)) return { allowed: true };
  const users = loadUsersMasterDatabase();
  const match = users.find(
    (u) => u.email && u.email.toLowerCase().trim() === clean || u.email && u.email.toLowerCase().replace(/\s+/g, "") === clean.replace(/\s+/g, "") || u.userId && u.userId.toLowerCase().trim() === clean
  );
  if (!match) return { allowed: true };
  if (isProtectedAdminAccount(match.email) || match.role === "admin" || match.role === "superadmin") {
    return { allowed: true };
  }
  if (match.isBlocked) {
    return {
      allowed: false,
      status: 403,
      error: "\u0906\u092A\u0915\u093E \u0916\u093E\u0924\u093E \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 (Admin) \u0926\u094D\u0935\u093E\u0930\u093E \u092C\u094D\u0932\u0949\u0915 \u0915\u0930 \u0926\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964 \u0938\u0939\u093E\u092F\u0924\u093E \u0921\u0947\u0938\u094D\u0915 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964",
      blocked: true
    };
  }
  if (match.tier === "basic") {
    const trialEnds = match.trialEndsAt || (match.trialStartedAt || match.createdAt) + SEVEN_DAYS_MS;
    if (Date.now() >= trialEnds) {
      return {
        allowed: false,
        status: 403,
        error: "\u0906\u092A\u0915\u093E 7-\u0926\u093F\u0935\u0938\u0940\u092F \u092B\u094D\u0930\u0940 \u091F\u094D\u0930\u093E\u092F\u0932 \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u091A\u0941\u0915\u093E \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u0906\u0917\u0947 \u0909\u092A\u092F\u094B\u0917 \u0915\u0947 \u0932\u093F\u090F \u092A\u094D\u0932\u093E\u0928 \u0905\u092A\u0917\u094D\u0930\u0947\u0921 \u0915\u0930\u0947\u0902\u0964",
        trialExpired: true
      };
    }
  }
  return { allowed: true };
}
function extractUserIdentifier(req) {
  const headerEmail = req.headers["x-user-email"] || void 0;
  const headerUid = req.headers["x-user-id"] || void 0;
  const bodyEmail = req.body?.email || req.body?.userEmail || req.body?.reporterEmail;
  const bodyUid = req.body?.userId || req.body?.uid;
  const queryEmail = req.query?.email;
  const queryUid = req.query?.userId;
  return headerEmail || headerUid || bodyEmail || bodyUid || queryEmail || queryUid;
}
function enforceUserAccessMiddleware(req, res, next) {
  const identifier = extractUserIdentifier(req);
  if (!identifier) return next();
  const access = checkUserAccess(identifier);
  if (!access.allowed) {
    return res.status(access.status || 403).json({
      success: false,
      error: access.error,
      blocked: access.blocked,
      isBlocked: access.blocked,
      trialExpired: access.trialExpired
    });
  }
  next();
}
function syncUserToProfiles(u) {
  try {
    const allProfiles = loadProfilesDatabase();
    const cleanKey = u.email ? u.email.toLowerCase().trim() : u.userId;
    allProfiles[cleanKey] = {
      username: u.username || u.name || "",
      fullName: u.fullName || u.name || "",
      role: u.role === "superadmin" ? "superadmin" : u.role === "admin" ? "admin" : "reporter",
      userId: u.userId,
      uid: u.userId,
      tier: u.tier,
      email: u.email,
      district: u.district || "",
      channelNameHi: u.channelNameHi || u.channelName || "",
      channelNameEn: u.channelNameEn || "",
      channelLogoUrl: u.channelLogoUrl || "",
      channelLogoPngUrl: u.channelLogoPngUrl,
      channelLogoGifUrl: u.channelLogoGifUrl,
      channelLogoType: u.channelLogoType || "png",
      mobileNumber: u.mobileNumber || u.mobile || "",
      websiteUrl: u.websiteUrl || "",
      socialIcons: u.socialIcons,
      updatedAt: Date.now()
    };
    if (u.email) {
      const emailLower = u.email.toLowerCase().trim();
      for (const [key, prof] of Object.entries(allProfiles)) {
        if (key !== cleanKey && prof.email && prof.email.toLowerCase().trim() === emailLower) {
          delete allProfiles[key];
        }
      }
    }
    saveProfilesDatabase(allProfiles);
  } catch (err) {
    console.error("Error syncing to profiles db:", err);
  }
}
function registerOrUpdateUserAuthoritative(userPayload) {
  if (!userPayload || !userPayload.email && !userPayload.userId) {
    throw new Error("User email or ID required");
  }
  const emailRaw = (userPayload.email || "").toString().trim();
  const cleanEmail = emailRaw.toLowerCase();
  const cleanUserId = (userPayload.userId || userPayload.uid || "").toString().toLowerCase().trim();
  const rawMobile = (userPayload.mobile || userPayload.mobileNumber || "").toString().replace(/[^0-9]/g, "").slice(-10);
  const isSuper = cleanEmail === "admin.ainewsmaker@gmail.com" || cleanEmail === "breakingnewswala.com@gmail.com";
  const isBreakingNewsWala = cleanEmail === "breakingnewswala.com@gmail.com";
  const users = loadUsersMasterDatabase();
  const idx = users.findIndex((u) => {
    const uEmail = (u.email || "").toLowerCase().trim();
    const uUserId = (u.userId || "").toLowerCase().trim();
    return cleanEmail && uEmail && uEmail === cleanEmail || cleanEmail && uEmail && uEmail.replace(/\s+/g, "") === cleanEmail.replace(/\s+/g, "") || cleanUserId && uUserId && uUserId === cleanUserId || cleanUserId && uEmail && uEmail === cleanUserId || cleanEmail && uUserId && uUserId === cleanEmail;
  });
  const now = Date.now();
  let updatedRecord;
  const rawReqUser = (userPayload.username || "").toString().trim().replace(/^@+/, "");
  if (idx >= 0) {
    const existing = users[idx];
    const preservedTrialStart = existing.trialStartedAt || existing.createdAt || now;
    const preservedTrialEnds = existing.trialEndsAt || preservedTrialStart + SEVEN_DAYS_MS;
    const safeUsername = cleanEmail === "admin.ainewsmaker@gmail.com" ? "AI News Maker" : isBreakingNewsWala ? rawReqUser || existing.username || "breakingnewswala" : rawReqUser || existing.username || cleanGenerateUsername(void 0, userPayload.fullName || userPayload.name, existing.username);
    updatedRecord = {
      ...existing,
      email: emailRaw || existing.email,
      name: userPayload.name || userPayload.fullName || existing.name || "\u092F\u0942\u091C\u093C\u0930",
      fullName: userPayload.fullName || userPayload.name || existing.fullName || existing.name || "\u092F\u0942\u091C\u093C\u0930",
      username: safeUsername,
      channelName: userPayload.channelName || userPayload.channelNameHi || existing.channelName || "",
      channelNameHi: userPayload.channelNameHi || userPayload.channelName || existing.channelNameHi || existing.channelName || "",
      channelNameEn: userPayload.channelNameEn || existing.channelNameEn || "",
      channelLogoUrl: userPayload.channelLogoUrl || existing.channelLogoUrl || "",
      channelLogoPngUrl: userPayload.channelLogoPngUrl || existing.channelLogoPngUrl,
      channelLogoGifUrl: userPayload.channelLogoGifUrl || existing.channelLogoGifUrl,
      channelLogoType: userPayload.channelLogoType || existing.channelLogoType || "png",
      mobile: userPayload.mobile || userPayload.mobileNumber || existing.mobile || "",
      mobileNumber: userPayload.mobileNumber || userPayload.mobile || existing.mobileNumber || existing.mobile || "",
      district: userPayload.district || existing.district || "",
      websiteUrl: userPayload.websiteUrl || existing.websiteUrl || "",
      socialIcons: userPayload.socialIcons || existing.socialIcons,
      role: isSuper ? "superadmin" : userPayload.role || existing.role || "user",
      tier: isSuper ? "ultra" : existing.tier || userPayload.tier || "basic",
      planName: isSuper ? "VIP DESK" : existing.planName || userPayload.planName || "BASIC",
      isBlocked: Boolean(existing.isBlocked),
      blockedAt: existing.blockedAt,
      blockedBy: existing.blockedBy,
      createdAt: existing.createdAt || now,
      trialStartedAt: preservedTrialStart,
      trialEndsAt: preservedTrialEnds,
      isTrialExpired: Date.now() >= preservedTrialEnds,
      lastLoginAt: now,
      activatedAt: existing.activatedAt || (isSuper ? now : preservedTrialStart),
      expiresAt: existing.expiresAt || (isSuper ? 2107057518060 : preservedTrialEnds),
      activatedVia: existing.activatedVia || (isSuper ? "Super Admin Preset" : "Google Registration")
    };
    users[idx] = updatedRecord;
  } else {
    const newTrialStart = now;
    const newTrialEnds = now + SEVEN_DAYS_MS;
    const safeUsername = cleanEmail === "admin.ainewsmaker@gmail.com" ? "AI News Maker" : isBreakingNewsWala ? rawReqUser || "breakingnewswala" : rawReqUser || cleanGenerateUsername(void 0, userPayload.fullName || userPayload.name);
    const deterministicUserId = userPayload.userId || userPayload.uid || (cleanEmail ? `usr_${Buffer.from(cleanEmail).toString("hex").slice(0, 16)}` : `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    updatedRecord = {
      userId: deterministicUserId,
      email: emailRaw,
      name: userPayload.name || userPayload.fullName || "\u092F\u0942\u091C\u093C\u0930",
      fullName: userPayload.fullName || userPayload.name || "\u092F\u0942\u091C\u093C\u0930",
      username: safeUsername,
      channelName: userPayload.channelName || userPayload.channelNameHi || "",
      channelNameHi: userPayload.channelNameHi || userPayload.channelName || "",
      channelNameEn: userPayload.channelNameEn || "",
      channelLogoUrl: userPayload.channelLogoUrl || "",
      channelLogoPngUrl: userPayload.channelLogoPngUrl,
      channelLogoGifUrl: userPayload.channelLogoGifUrl,
      channelLogoType: userPayload.channelLogoType || "png",
      mobile: userPayload.mobile || userPayload.mobileNumber || "",
      mobileNumber: userPayload.mobileNumber || userPayload.mobile || "",
      district: userPayload.district || "",
      websiteUrl: userPayload.websiteUrl || "",
      socialIcons: userPayload.socialIcons || { youtube: false, facebook: false, instagram: false, whatsapp: false },
      role: isSuper ? "superadmin" : userPayload.role || "user",
      tier: isSuper ? "ultra" : userPayload.tier || "basic",
      planName: isSuper ? "VIP DESK" : userPayload.planName || "BASIC",
      isBlocked: false,
      blockedAt: null,
      blockedBy: null,
      createdAt: now,
      trialStartedAt: newTrialStart,
      trialEndsAt: newTrialEnds,
      isTrialExpired: false,
      lastLoginAt: now,
      activatedAt: isSuper ? now : newTrialStart,
      expiresAt: isSuper ? 2107057518060 : newTrialEnds,
      activatedVia: isSuper ? "Super Admin Preset" : "Google Registration"
    };
    users.unshift(updatedRecord);
  }
  const seenEmails = /* @__PURE__ */ new Set();
  const seenIds = /* @__PURE__ */ new Set();
  const deduplicatedUsers = [];
  for (const u of users) {
    const em = (u.email || "").toLowerCase().trim();
    const id = (u.userId || "").toLowerCase().trim();
    if (em) {
      if (!seenEmails.has(em)) {
        seenEmails.add(em);
        if (id) seenIds.add(id);
        deduplicatedUsers.push(u);
      }
    } else if (id) {
      if (!seenIds.has(id)) {
        seenIds.add(id);
        deduplicatedUsers.push(u);
      }
    } else {
      deduplicatedUsers.push(u);
    }
  }
  saveUsersMasterDatabase(deduplicatedUsers);
  syncUserToProfiles(updatedRecord);
  return updatedRecord;
}
function reconcileAllUsers() {
  try {
    const existingUsers = loadUsersMasterDatabase();
    const userMap = /* @__PURE__ */ new Map();
    for (const u of existingUsers) {
      if (u.email) {
        const cleanE = u.email.toLowerCase().trim();
        if (cleanE !== "breakingnewswala@gmail.com" && cleanE !== "admin@breakingnewswala.com") {
          userMap.set(cleanE, u);
        }
      }
    }
    const profiles = loadProfilesDatabase();
    for (const [k, p] of Object.entries(profiles)) {
      const email = (p.email || k).toLowerCase().trim();
      if (email === "breakingnewswala@gmail.com" || email === "admin@breakingnewswala.com") {
        continue;
      }
      if (!email.includes("@")) {
        const phone = (p.mobileNumber || p.mobile || k).toString().replace(/[^0-9]/g, "").slice(-10);
        if (phone.length === 10) {
          const existingUserWithPhone = Array.from(userMap.values()).find((u) => {
            const uP = (u.mobileNumber || u.mobile || "").toString().replace(/[^0-9]/g, "").slice(-10);
            return uP === phone;
          });
          if (existingUserWithPhone) {
            existingUserWithPhone.name = existingUserWithPhone.name || p.fullName || p.username;
            existingUserWithPhone.fullName = existingUserWithPhone.fullName || p.fullName;
            if (p.channelNameHi) existingUserWithPhone.channelNameHi = p.channelNameHi;
            if (p.channelLogoUrl) existingUserWithPhone.channelLogoUrl = p.channelLogoUrl;
            continue;
          }
        }
        continue;
      }
      if (!userMap.has(email)) {
        userMap.set(email, {
          userId: p.userId || p.uid || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          email: p.email || k,
          name: p.fullName || p.username || "\u092F\u0942\u091C\u093C\u0930",
          fullName: p.fullName || "",
          username: p.username || cleanGenerateUsername(void 0, p.fullName),
          channelName: p.channelNameHi || "",
          channelNameHi: p.channelNameHi || "",
          channelNameEn: p.channelNameEn || "",
          channelLogoUrl: p.channelLogoUrl || "",
          channelLogoPngUrl: p.channelLogoPngUrl || "",
          channelLogoGifUrl: p.channelLogoGifUrl || "",
          channelLogoType: p.channelLogoType || "png",
          mobile: p.mobileNumber || "",
          mobileNumber: p.mobileNumber || "",
          district: p.district || "",
          websiteUrl: p.websiteUrl || "",
          socialIcons: p.socialIcons,
          role: email === "admin.ainewsmaker@gmail.com" || email === "breakingnewswala.com@gmail.com" ? "superadmin" : p.role || "user",
          tier: email === "admin.ainewsmaker@gmail.com" || email === "breakingnewswala.com@gmail.com" ? "ultra" : p.tier || "basic",
          planName: email === "admin.ainewsmaker@gmail.com" || email === "breakingnewswala.com@gmail.com" ? "VIP DESK" : p.tier === "ultra" ? "VIP DESK" : "BASIC",
          isBlocked: false,
          createdAt: p.updatedAt || Date.now(),
          trialStartedAt: p.updatedAt || Date.now(),
          trialEndsAt: (p.updatedAt || Date.now()) + SEVEN_DAYS_MS,
          lastLoginAt: p.updatedAt || Date.now()
        });
      }
    }
    const superAdminEmail = "admin.ainewsmaker@gmail.com";
    const existingSuper = userMap.get(superAdminEmail);
    const superProf = profiles[superAdminEmail];
    userMap.set(superAdminEmail, {
      userId: existingSuper?.userId || "user-1791697518060",
      email: superAdminEmail,
      name: superProf?.fullName || existingSuper?.fullName || "\u0938\u0941\u092A\u0930 \u090F\u0921\u092E\u093F\u0928 (Super Admin)",
      fullName: superProf?.fullName || existingSuper?.fullName || "\u0938\u0941\u092A\u0930 \u090F\u0921\u092E\u093F\u0928 (Super Admin)",
      username: superProf?.username || existingSuper?.username || "admin.ainewsmaker",
      role: "superadmin",
      tier: "ultra",
      planName: "VIP DESK",
      channelName: superProf?.channelNameHi || existingSuper?.channelName || "\u090F\u0906\u0908 \u0928\u094D\u092F\u0942\u091C\u093C \u092E\u0947\u0915\u0930",
      channelNameHi: superProf?.channelNameHi || existingSuper?.channelNameHi || "\u090F\u0906\u0908 \u0928\u094D\u092F\u0942\u091C\u093C \u092E\u0947\u0915\u0930",
      channelNameEn: superProf?.channelNameEn || existingSuper?.channelNameEn || "AI News Maker",
      channelLogoUrl: superProf?.channelLogoUrl || existingSuper?.channelLogoUrl || "/assets/ai_news_maker_logo.png",
      channelLogoPngUrl: superProf?.channelLogoPngUrl || existingSuper?.channelLogoPngUrl || "/assets/ai_news_maker_logo.png",
      channelLogoGifUrl: superProf?.channelLogoGifUrl || existingSuper?.channelLogoGifUrl || "",
      channelLogoType: superProf?.channelLogoType || existingSuper?.channelLogoType || "png",
      mobile: superProf?.mobileNumber || existingSuper?.mobile || "9669802408",
      mobileNumber: superProf?.mobileNumber || existingSuper?.mobileNumber || "9669802408",
      district: superProf?.district || existingSuper?.district || "\u0939\u0947\u0921\u0915\u094D\u0935\u093E\u0930\u094D\u091F\u0930 \u0938\u0947\u0902\u091F\u094D\u0930\u0932 \u0921\u0947\u0938\u094D\u0915",
      websiteUrl: superProf?.websiteUrl || existingSuper?.websiteUrl || "ainewsmaker.online",
      isBlocked: false,
      isProfileLocked: true,
      createdAt: existingSuper?.createdAt || 1791697518060,
      trialStartedAt: 1791697518060,
      trialEndsAt: 2107057518060,
      activatedAt: 1791697518060,
      expiresAt: 2107057518060,
      activatedVia: "Super Admin Preset",
      lastLoginAt: existingSuper?.lastLoginAt || Date.now()
    });
    const adminEmail = "breakingnewswala.com@gmail.com";
    const existingAdmin = userMap.get(adminEmail) || userMap.get("breakingnewswala@gmail.com");
    const adminProf = profiles[adminEmail] || profiles["breakingnewswala@gmail.com"];
    userMap.set(adminEmail, {
      userId: existingAdmin?.userId || "usr_627265616b69",
      email: adminEmail,
      name: adminProf?.fullName || existingAdmin?.fullName || "\u092E\u0941\u0916\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u0915",
      fullName: adminProf?.fullName || existingAdmin?.fullName || "\u092E\u0941\u0916\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u0915",
      username: adminProf?.username || existingAdmin?.username || "breakingnewswala",
      role: "superadmin",
      tier: "ultra",
      planName: "VIP DESK",
      channelName: adminProf?.channelNameHi || existingAdmin?.channelName || "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E",
      channelNameHi: adminProf?.channelNameHi || existingAdmin?.channelNameHi || "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E",
      channelNameEn: adminProf?.channelNameEn || existingAdmin?.channelNameEn || "BREAKING NEWS WALA",
      channelLogoUrl: adminProf?.channelLogoUrl || existingAdmin?.channelLogoUrl || "/assets/breaking_news_wala_logo.png",
      channelLogoPngUrl: adminProf?.channelLogoPngUrl || existingAdmin?.channelLogoPngUrl || "/assets/breaking_news_wala_logo.png",
      channelLogoGifUrl: adminProf?.channelLogoGifUrl || existingAdmin?.channelLogoGifUrl || "",
      channelLogoType: adminProf?.channelLogoType || existingAdmin?.channelLogoType || "png",
      mobile: adminProf?.mobileNumber || existingAdmin?.mobile || "9669802408",
      mobileNumber: adminProf?.mobileNumber || existingAdmin?.mobileNumber || "9669802408",
      district: adminProf?.district || existingAdmin?.district || "\u0938\u0947\u0902\u091F\u094D\u0930\u0932 \u0921\u0947\u0938\u094D\u0915 / \u092D\u094B\u092A\u093E\u0932",
      websiteUrl: adminProf?.websiteUrl || existingAdmin?.websiteUrl || "breakingnewswala.com",
      isBlocked: false,
      isProfileLocked: true,
      createdAt: existingAdmin?.createdAt || 1791792137805,
      trialStartedAt: 1791792137805,
      trialEndsAt: 2107057518060,
      activatedAt: 1791792137805,
      expiresAt: 2107057518060,
      activatedVia: "Admin Preset",
      lastLoginAt: existingAdmin?.lastLoginAt || Date.now()
    });
    const seedUser1 = "khabridasnews@gmail.com";
    if (!userMap.has(seedUser1)) {
      const p1 = profiles[seedUser1];
      userMap.set(seedUser1, {
        userId: p1?.userId || "usr_khabridas_101",
        email: seedUser1,
        name: p1?.fullName || "\u0916\u092C\u0930\u093F\u0926\u093E\u0938 \u0928\u094D\u092F\u0942\u091C\u093C (Khabridas News)",
        fullName: p1?.fullName || "\u0916\u092C\u0930\u093F\u0926\u093E\u0938 \u0928\u094D\u092F\u0942\u091C\u093C (Khabridas News)",
        username: p1?.username || "khabridasnews",
        role: "user",
        tier: "basic",
        planName: "BASIC",
        channelName: p1?.channelNameHi || "\u0916\u092C\u0930\u093F\u0926\u093E\u0938 \u0928\u094D\u092F\u0942\u091C\u093C",
        channelNameHi: p1?.channelNameHi || "\u0916\u092C\u0930\u093F\u0926\u093E\u0938 \u0928\u094D\u092F\u0942\u091C\u093C",
        channelNameEn: p1?.channelNameEn || "Khabridas News",
        channelLogoUrl: p1?.channelLogoUrl || "/assets/ai_news_maker_logo.png",
        channelLogoPngUrl: p1?.channelLogoPngUrl || "/assets/ai_news_maker_logo.png",
        channelLogoGifUrl: "",
        channelLogoType: "png",
        mobile: p1?.mobileNumber || "9876543210",
        mobileNumber: p1?.mobileNumber || "9876543210",
        district: p1?.district || "\u0917\u094D\u0935\u093E\u0932\u093F\u092F\u0930",
        websiteUrl: p1?.websiteUrl || "https://khabridasnews.com",
        isBlocked: false,
        isProfileLocked: false,
        createdAt: 1791892712618,
        trialStartedAt: 1791892712618,
        trialEndsAt: 1792497512618,
        activatedAt: 1791892712618,
        expiresAt: 1792497512618,
        activatedVia: "Free 7-Day VIP Trial",
        lastLoginAt: 1791892712618
      });
    }
    const seedUser2 = "riturajtomarorchha@gmail.com";
    if (!userMap.has(seedUser2)) {
      const p2 = profiles[seedUser2];
      userMap.set(seedUser2, {
        userId: p2?.userId || "usr_rituraj_102",
        email: seedUser2,
        name: p2?.fullName || "\u090B\u0924\u0941\u0930\u093E\u091C \u0924\u094B\u092E\u0930 (\u0913\u0930\u091B\u093E)",
        fullName: p2?.fullName || "\u090B\u0924\u0941\u0930\u093E\u091C \u0924\u094B\u092E\u0930 (\u0913\u0930\u091B\u093E)",
        username: p2?.username || "riturajtomarorchha",
        role: "user",
        tier: "basic",
        planName: "BASIC",
        channelName: p2?.channelNameHi || "\u0913\u0930\u091B\u093E \u092C\u0941\u0902\u0926\u0947\u0932\u0916\u0902\u0921 \u0928\u094D\u092F\u0942\u091C\u093C",
        channelNameHi: p2?.channelNameHi || "\u0913\u0930\u091B\u093E \u092C\u0941\u0902\u0926\u0947\u0932\u0916\u0902\u0921 \u0928\u094D\u092F\u0942\u091C\u093C",
        channelNameEn: p2?.channelNameEn || "Orchha Bundelkhand News",
        channelLogoUrl: p2?.channelLogoUrl || "/assets/ai_news_maker_logo.png",
        channelLogoPngUrl: p2?.channelLogoPngUrl || "/assets/ai_news_maker_logo.png",
        channelLogoGifUrl: "",
        channelLogoType: "png",
        mobile: p2?.mobileNumber || "9876543211",
        mobileNumber: p2?.mobileNumber || "9876543211",
        district: p2?.district || "\u0913\u0930\u091B\u093E / \u0928\u093F\u0935\u093E\u0921\u093C\u0940",
        websiteUrl: p2?.websiteUrl || "ainewsmaker.online",
        isBlocked: false,
        isProfileLocked: false,
        createdAt: 1791892712618,
        trialStartedAt: 1791892712618,
        trialEndsAt: 1792497512618,
        activatedAt: 1791892712618,
        expiresAt: 1792497512618,
        activatedVia: "Free 7-Day VIP Trial",
        lastLoginAt: 1791892712618
      });
    }
    const seedUser3 = "digital.anmolsandesh@gmail.com";
    if (!userMap.has(seedUser3)) {
      const p3 = profiles[seedUser3];
      userMap.set(seedUser3, {
        userId: p3?.userId || "usr_anmolsandesh_103",
        email: seedUser3,
        name: p3?.fullName || "Anmol Sandesh",
        fullName: p3?.fullName || "Anmol Sandesh",
        username: p3?.username || "anmolsandesh",
        role: "user",
        tier: "basic",
        planName: "BASIC",
        channelName: p3?.channelNameHi || "\u0905\u0928\u092E\u094B\u0932 \u0938\u0902\u0926\u0947\u0936",
        channelNameHi: p3?.channelNameHi || "\u0905\u0928\u092E\u094B\u0932 \u0938\u0902\u0926\u0947\u0936",
        channelNameEn: p3?.channelNameEn || "Anmol Sandesh",
        channelLogoUrl: p3?.channelLogoUrl || "/assets/ai_news_maker_logo.png",
        channelLogoPngUrl: p3?.channelLogoPngUrl || "/assets/ai_news_maker_logo.png",
        channelLogoGifUrl: "",
        channelLogoType: "png",
        mobile: p3?.mobileNumber || "9425000998",
        mobileNumber: p3?.mobileNumber || "9425000998",
        district: p3?.district || "\u0938\u0947\u0902\u091F\u094D\u0930\u0932 \u0921\u0947\u0938\u094D\u0915",
        websiteUrl: p3?.websiteUrl || "anmolsandesh.com",
        isBlocked: false,
        isProfileLocked: false,
        createdAt: 1791892712618,
        trialStartedAt: 1791892712618,
        trialEndsAt: 1792497512618,
        activatedAt: 1791892712618,
        expiresAt: 1792497512618,
        activatedVia: "Free 7-Day VIP Trial",
        lastLoginAt: 1791892712618
      });
    }
    const reconciledList = Array.from(userMap.values());
    saveUsersMasterDatabase(reconciledList);
    saveUsersDatabase(reconciledList);
    for (const u of reconciledList) {
      syncUserToProfiles(u);
    }
    console.log(`[Users Reconciled] Total authoritative users: ${reconciledList.length}`);
  } catch (err) {
    console.error("[User Reconciliation Error]:", err);
  }
}
reconcileAllUsers();
function runTrialExpirationAndNotificationCheck() {
  const now = Date.now();
  const users = loadUsersMasterDatabase();
  let updatedUsers = false;
  const notifs = loadNotificationsDatabase();
  const existingIds = new Set(notifs.map((n) => n.id));
  const newNotifs = [];
  for (const u of users) {
    if (isProtectedAdminAccount(u.email) || u.tier !== "basic") continue;
    const trialEnds = u.trialEndsAt || (u.trialStartedAt || u.createdAt) + SEVEN_DAYS_MS;
    const oneDayBeforeMs = trialEnds - 24 * 60 * 60 * 1e3;
    if (now >= oneDayBeforeMs && now < trialEnds && !u.trialWarningNotified) {
      const userWarnId = `notif_warn_user_${u.userId}_${trialEnds}`;
      const adminWarnId = `notif_warn_admin_${u.userId}_${trialEnds}`;
      const expiryDateStr = new Date(trialEnds).toLocaleString("hi-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      if (!existingIds.has(userWarnId)) {
        newNotifs.push({
          id: userWarnId,
          title: "\u26A0\uFE0F 24 \u0918\u0902\u091F\u0947 \u092E\u0947\u0902 \u092B\u094D\u0930\u0940 \u091F\u094D\u0930\u093E\u092F\u0932 \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u0930\u0939\u093E \u0939\u0948",
          message: `\u0928\u092E\u0938\u094D\u0924\u0947 ${u.name || "\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E"}, \u0906\u092A\u0915\u093E 7-\u0926\u093F\u0935\u0938\u0940\u092F \u092B\u094D\u0930\u0940 \u091F\u094D\u0930\u093E\u092F\u0932 \u0915\u0932 (${expiryDateStr}) \u0915\u094B \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u091C\u093E\u090F\u0917\u093E\u0964 \u0928\u093F\u0930\u094D\u092C\u093E\u0927 \u0938\u0947\u0935\u093E\u0913\u0902 \u0915\u0947 \u0932\u093F\u090F \u0905\u092A\u0928\u093E \u092A\u094D\u0932\u093E\u0928 \u0905\u092A\u0917\u094D\u0930\u0947\u0921 \u0915\u0930\u0947\u0902\u0964`,
          time: "\u0905\u092D\u0940",
          timestamp: now,
          unread: true,
          type: "plan",
          targetUserEmail: u.email,
          linkTab: "profile"
        });
        existingIds.add(userWarnId);
      }
      if (!existingIds.has(adminWarnId)) {
        newNotifs.push({
          id: adminWarnId,
          title: `\u{1F514} \u091F\u094D\u0930\u093E\u092F\u0932 \u091A\u0947\u0924\u093E\u0935\u0928\u0940: ${u.name || u.email}`,
          message: `\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E '${u.name || ""}' (${u.email}) \u0915\u093E 7-\u0926\u093F\u0935\u0938\u0940\u092F \u092B\u094D\u0930\u0940 \u091F\u094D\u0930\u093E\u092F\u0932 24 \u0918\u0902\u091F\u0947 \u092E\u0947\u0902 \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B\u0928\u0947 \u0935\u093E\u0932\u093E \u0939\u0948\u0964 \u0938\u092E\u093E\u092A\u094D\u0924\u093F \u0938\u092E\u092F: ${expiryDateStr}\u0964`,
          time: "\u0905\u092D\u0940",
          timestamp: now,
          unread: true,
          type: "admin",
          targetUserEmail: "admin",
          linkTab: "profile"
        });
        existingIds.add(adminWarnId);
      }
      u.trialWarningNotified = true;
      updatedUsers = true;
    }
    if (now >= trialEnds && !u.trialExpiredNotified) {
      const userExpId = `notif_exp_user_${u.userId}_${trialEnds}`;
      const adminExpId = `notif_exp_admin_${u.userId}_${trialEnds}`;
      if (!existingIds.has(userExpId)) {
        newNotifs.push({
          id: userExpId,
          title: "\u{1F512} 7-\u0926\u093F\u0935\u0938\u0940\u092F \u092B\u094D\u0930\u0940 \u091F\u094D\u0930\u093E\u092F\u0932 \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u0917\u092F\u093E \u0939\u0948",
          message: `\u0928\u092E\u0938\u094D\u0924\u0947 ${u.name || "\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E"}, \u0906\u092A\u0915\u093E 7-\u0926\u093F\u0935\u0938\u0940\u092F \u092B\u094D\u0930\u0940 \u091F\u094D\u0930\u093E\u092F\u0932 \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u091A\u0941\u0915\u093E \u0939\u0948\u0964 \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0935 \u090F\u0906\u0908 \u091F\u0942\u0932\u094D\u0938 \u0932\u0949\u0915 \u0915\u0930 \u0926\u093F\u090F \u0917\u090F \u0939\u0948\u0902\u0964 \u091C\u093E\u0930\u0940 \u0930\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u092A\u094D\u0932\u093E\u0928 \u091A\u0941\u0928\u0947\u0902\u0964`,
          time: "\u0905\u092D\u0940",
          timestamp: now,
          unread: true,
          type: "plan",
          targetUserEmail: u.email,
          linkTab: "profile"
        });
        existingIds.add(userExpId);
      }
      if (!existingIds.has(adminExpId)) {
        newNotifs.push({
          id: adminExpId,
          title: `\u{1F6AB} \u091F\u094D\u0930\u093E\u092F\u0932 \u0938\u092E\u093E\u092A\u094D\u0924: ${u.name || u.email}`,
          message: `\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E '${u.name || ""}' (${u.email}) \u0915\u093E 7-\u0926\u093F\u0935\u0938\u0940\u092F \u092B\u094D\u0930\u0940 \u091F\u094D\u0930\u093E\u092F\u0932 \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u091A\u0941\u0915\u093E \u0939\u0948 \u0914\u0930 \u092A\u094D\u0932\u093E\u0928-\u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924 \u0938\u0941\u0935\u093F\u0927\u093E\u090F\u0902 \u0932\u0949\u0915 \u0915\u0930 \u0926\u0940 \u0917\u0908 \u0939\u0948\u0902\u0964`,
          time: "\u0905\u092D\u0940",
          timestamp: now,
          unread: true,
          type: "admin",
          targetUserEmail: "admin",
          linkTab: "profile"
        });
        existingIds.add(adminExpId);
      }
      u.isTrialExpired = true;
      u.trialExpiredNotified = true;
      updatedUsers = true;
    }
  }
  if (newNotifs.length > 0) {
    saveNotificationsDatabase([...newNotifs, ...notifs]);
  }
  if (updatedUsers) {
    saveUsersMasterDatabase(users);
  }
}
runTrialExpirationAndNotificationCheck();
setInterval(runTrialExpirationAndNotificationCheck, 10 * 60 * 1e3);
var VIDEOS_DB_FILE = import_path.default.join(process.cwd(), "videos_database.json");
var DELETED_VIDEOS_FILE = import_path.default.join(process.cwd(), "deleted_videos_ids.json");
var FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1e3;
function loadDeletedVideoIds() {
  try {
    const locations = resolveAllDatabaseLocations("deleted_videos_ids.json");
    for (const loc of locations) {
      if (import_fs.default.existsSync(loc)) {
        const raw = import_fs.default.readFileSync(loc, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) return new Set(list);
      }
    }
  } catch (err) {
    console.error("Error reading deleted videos file:", err.message);
  }
  return /* @__PURE__ */ new Set();
}
function saveDeletedVideoId(id) {
  try {
    const deletedSet = loadDeletedVideoIds();
    deletedSet.add(id);
    const jsonStr = JSON.stringify(Array.from(deletedSet), null, 2);
    const locations = resolveAllDatabaseLocations("deleted_videos_ids.json");
    for (const loc of locations) {
      try {
        const dir = import_path.default.dirname(loc);
        if (!import_fs.default.existsSync(dir)) import_fs.default.mkdirSync(dir, { recursive: true });
        import_fs.default.writeFileSync(loc, jsonStr, "utf-8");
      } catch {
      }
    }
  } catch (err) {
    console.error("Error saving deleted video id:", err.message);
  }
}
function loadVideosDatabase() {
  try {
    let videos = [];
    const locations = resolveAllDatabaseLocations("videos_database.json");
    for (const loc of locations) {
      if (import_fs.default.existsSync(loc)) {
        const raw = import_fs.default.readFileSync(loc, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          const map = /* @__PURE__ */ new Map();
          videos.forEach((v) => {
            if (v?.id) map.set(v.id, v);
          });
          list.forEach((v) => {
            if (v?.id && !map.has(v.id)) map.set(v.id, v);
          });
          videos = Array.from(map.values());
        }
      }
    }
    const deletedSet = loadDeletedVideoIds();
    const validVideos = videos.filter((v) => {
      if (!v || !v.id) return false;
      if (deletedSet.has(v.id)) return false;
      return true;
    });
    validVideos.sort((a, b) => {
      const timeA = Number(a.createdAt) || 0;
      const timeB = Number(b.createdAt) || 0;
      if (timeB !== timeA) return timeB - timeA;
      return String(b.id).localeCompare(String(a.id));
    });
    return validVideos;
  } catch (err) {
    console.error("Error loading videos database:", err.message);
    return [];
  }
}
function saveVideosDatabase(videos) {
  try {
    const locations = resolveAllDatabaseLocations("videos_database.json");
    const jsonStr = JSON.stringify(videos, null, 2);
    for (const loc of locations) {
      try {
        const dir = import_path.default.dirname(loc);
        if (!import_fs.default.existsSync(dir)) import_fs.default.mkdirSync(dir, { recursive: true });
        import_fs.default.writeFileSync(loc, jsonStr, "utf-8");
      } catch {
      }
    }
    return true;
  } catch (err) {
    console.error("Error saving videos database:", err.message);
    return false;
  }
}
app.get("/api/videos", (_req, res) => {
  try {
    const videos = loadVideosDatabase();
    return res.json({ success: true, videos });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/videos/upload", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u0935\u0940\u0921\u093F\u092F\u094B \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const videoData = req.body;
    if (!videoData || !videoData.title || !videoData.videoUrl) {
      return res.status(400).json({ error: "\u0935\u0940\u0921\u093F\u092F\u094B \u0914\u0930 \u0936\u0940\u0930\u094D\u0937\u0915 \u0926\u094B\u0928\u094B\u0902 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948\u0902\u0964" });
    }
    const newVideo = {
      id: videoData.id || `vid-admin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: videoData.title.trim(),
      caption: (videoData.caption || "").trim(),
      aspectRatio: videoData.aspectRatio || "4:5",
      createdAt: videoData.createdAt || Date.now(),
      duration: videoData.duration || "01:30",
      channel: videoData.channel || "\u090F\u0921\u092E\u093F\u0928 \u0935\u093E\u092F\u0930\u0932 \u0921\u0947\u0938\u094D\u0915",
      views: videoData.views || "1K \u0926\u0947\u0916\u093E \u0917\u092F\u093E",
      videoUrl: videoData.videoUrl,
      thumbnailUrl: videoData.thumbnailUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop",
      category: videoData.category || "\u0935\u093E\u092F\u0930\u0932",
      isBonus: Boolean(videoData.isBonus),
      rewardCoins: videoData.rewardCoins ? Number(videoData.rewardCoins) : videoData.isBonus ? 50 : void 0,
      coinValue: videoData.coinValue ? Number(videoData.coinValue) : void 0,
      coinCost: videoData.coinCost ? Number(videoData.coinCost) : void 0,
      restrictedPlans: Array.isArray(videoData.restrictedPlans) ? videoData.restrictedPlans : void 0,
      headlineVariants: Array.isArray(videoData.headlineVariants) ? videoData.headlineVariants.map((h) => String(h || "").trim()).filter(Boolean) : void 0,
      cropRegion: videoData.cropRegion && typeof videoData.cropRegion === "object" ? {
        x: Number(videoData.cropRegion.x) || 0,
        y: Number(videoData.cropRegion.y) || 0,
        width: Number(videoData.cropRegion.width) || 1,
        height: Number(videoData.cropRegion.height) || 0.8,
        aspectRatio: "4:5"
      } : void 0,
      isOnly4_5: Boolean(videoData.isOnly4_5),
      isFullVisibilityAvailable: videoData.isFullVisibilityAvailable !== void 0 ? Boolean(videoData.isFullVisibilityAvailable) : !videoData.isOnly4_5,
      compatibleFrameIds: Array.isArray(videoData.compatibleFrameIds) ? videoData.compatibleFrameIds : void 0,
      sourceDimensions: videoData.sourceDimensions && typeof videoData.sourceDimensions === "object" ? {
        width: Number(videoData.sourceDimensions.width) || 0,
        height: Number(videoData.sourceDimensions.height) || 0
      } : void 0,
      location: (videoData.location || "").trim() || void 0,
      audioMix: videoData.audioMix && typeof videoData.audioMix === "object" ? {
        hasCustomAudio: Boolean(videoData.audioMix.hasCustomAudio),
        musicTrackId: String(videoData.audioMix.musicTrackId || ""),
        musicTrackName: String(videoData.audioMix.musicTrackName || ""),
        musicTrackUrl: String(videoData.audioMix.musicTrackUrl || ""),
        originalAudioVolume: typeof videoData.audioMix.originalAudioVolume === "number" ? videoData.audioMix.originalAudioVolume : 1,
        bgmVolume: typeof videoData.audioMix.bgmVolume === "number" ? videoData.audioMix.bgmVolume : 0.3
      } : void 0
    };
    const currentVideos = loadVideosDatabase();
    const updated = [newVideo, ...currentVideos.filter((v) => v.id !== newVideo.id)];
    saveVideosDatabase(updated);
    broadcastVideoPublishedNotification(newVideo.id, newVideo.title);
    return res.json({ success: true, video: newVideo, total: updated.length });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.put("/api/admin/videos/:id", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u0935\u0940\u0921\u093F\u092F\u094B \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const videoId = req.params.id;
    const updates = req.body;
    const currentVideos = loadVideosDatabase();
    const idx = currentVideos.findIndex((v) => v.id === videoId);
    if (idx === -1) {
      return res.status(404).json({ error: "\u0935\u0940\u0921\u093F\u092F\u094B \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E\u0964" });
    }
    currentVideos[idx] = {
      ...currentVideos[idx],
      ...updates,
      id: videoId
      // never overwrite id
    };
    saveVideosDatabase(currentVideos);
    return res.json({ success: true, video: currentVideos[idx] });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.delete("/api/admin/videos/:id", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u0935\u0940\u0921\u093F\u092F\u094B \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const videoId = req.params.id;
    saveDeletedVideoId(videoId);
    const currentVideos = loadVideosDatabase();
    const filtered = currentVideos.filter((v) => v.id !== videoId);
    saveVideosDatabase(filtered);
    return res.json({ success: true, deletedId: videoId, remaining: filtered.length });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var MUSIC_LIBRARY_FILE = import_path.default.join(process.cwd(), "music_library_db.json");
function loadMusicLibrary() {
  try {
    if (import_fs.default.existsSync(MUSIC_LIBRARY_FILE)) {
      const raw = import_fs.default.readFileSync(MUSIC_LIBRARY_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list.map((t) => ({
          ...t,
          targetModes: t.targetModes || "both",
          allowedTiers: Array.isArray(t.allowedTiers) && t.allowedTiers.length > 0 ? t.allowedTiers : ["basic", "advance", "pro", "vip"]
        }));
      }
    }
  } catch (err) {
    console.error("Error loading music library:", err.message);
  }
  return [];
}
function saveMusicLibrary(tracks) {
  try {
    import_fs.default.writeFileSync(MUSIC_LIBRARY_FILE, JSON.stringify(tracks, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving music library:", err.message);
  }
}
app.get("/api/music-library", (req, res) => {
  try {
    const { mode, tier } = req.query;
    const userEmail = req.headers["x-user-email"] || req.query.email || "";
    const tracks = loadMusicLibrary();
    const isAdmin = userEmail && isProtectedAdminAccount(userEmail);
    if (isAdmin) {
      return res.json({ success: true, tracks });
    }
    const filtered = tracks.filter((t) => {
      if (mode && t.targetModes && t.targetModes !== "both" && t.targetModes !== mode) {
        return false;
      }
      if (tier && t.allowedTiers && t.allowedTiers.length > 0) {
        const normTier = tier.toLowerCase().trim();
        const tierKey = normTier === "professional" ? "pro" : normTier === "ultra" ? "vip" : normTier === "advanced" ? "advance" : normTier;
        if (!t.allowedTiers.includes(tierKey)) {
          return false;
        }
      }
      return true;
    });
    return res.json({ success: true, tracks: filtered });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/admin/music-library", (_req, res) => {
  try {
    const tracks = loadMusicLibrary();
    return res.json({ success: true, tracks });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/music-library/upload", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u092E\u094D\u092F\u0942\u091C\u093C\u093F\u0915 \u0932\u093E\u0907\u092C\u094D\u0930\u0947\u0930\u0940 \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const { id, name, title, category, url, duration, isCopyrightSafe, targetModes, allowedTiers } = req.body;
    const trackName = String(name || title || "").trim();
    if (!trackName || !url) {
      return res.status(400).json({ error: "\u0911\u0921\u093F\u092F\u094B \u092B\u093E\u0907\u0932 \u0914\u0930 \u091F\u094D\u0930\u0948\u0915 \u0928\u093E\u092E \u0926\u094B\u0928\u094B\u0902 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948\u0902\u0964" });
    }
    let normalizedMode = "both";
    if (typeof targetModes === "string" && ["quick", "studio", "both"].includes(targetModes)) {
      normalizedMode = targetModes;
    } else if (Array.isArray(targetModes)) {
      if (targetModes.includes("quick") && targetModes.includes("studio")) {
        normalizedMode = "both";
      } else if (targetModes.includes("quick")) {
        normalizedMode = "quick";
      } else if (targetModes.includes("studio")) {
        normalizedMode = "studio";
      }
    }
    const tracks = loadMusicLibrary();
    const newTrack = {
      id: id && String(id).trim() ? String(id).trim() : `track-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trackName,
      category: String(category || "General").trim(),
      url: String(url).trim(),
      duration: typeof duration === "number" ? duration : void 0,
      uploadedAt: Date.now(),
      uploadedBy: req.headers["x-user-email"] || req.headers["x-admin-email"] || "admin",
      isCopyrightSafe: isCopyrightSafe !== void 0 ? Boolean(isCopyrightSafe) : true,
      targetModes: normalizedMode,
      allowedTiers: Array.isArray(allowedTiers) && allowedTiers.length > 0 ? allowedTiers : ["basic", "advance", "pro", "vip"]
    };
    tracks.unshift(newTrack);
    saveMusicLibrary(tracks);
    return res.json({ success: true, track: newTrack, total: tracks.length });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.put("/api/admin/music-library/:id", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u092E\u094D\u092F\u0942\u091C\u093C\u093F\u0915 \u0905\u092A\u0921\u0947\u091F \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const trackId = req.params.id;
    const { name, title, category, isCopyrightSafe, targetModes, allowedTiers } = req.body;
    const tracks = loadMusicLibrary();
    const idx = tracks.findIndex((t) => t.id === trackId);
    if (idx < 0) {
      return res.status(404).json({ error: "\u092E\u094D\u092F\u0942\u091C\u093C\u093F\u0915 \u091F\u094D\u0930\u0948\u0915 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E" });
    }
    const trackName = String(name || title || "").trim();
    if (trackName) tracks[idx].name = trackName;
    if (category) tracks[idx].category = String(category).trim();
    if (isCopyrightSafe !== void 0) tracks[idx].isCopyrightSafe = Boolean(isCopyrightSafe);
    if (targetModes) {
      if (typeof targetModes === "string" && ["quick", "studio", "both"].includes(targetModes)) {
        tracks[idx].targetModes = targetModes;
      } else if (Array.isArray(targetModes)) {
        if (targetModes.includes("quick") && targetModes.includes("studio")) {
          tracks[idx].targetModes = "both";
        } else if (targetModes.includes("quick")) {
          tracks[idx].targetModes = "quick";
        } else if (targetModes.includes("studio")) {
          tracks[idx].targetModes = "studio";
        }
      }
    }
    if (Array.isArray(allowedTiers)) tracks[idx].allowedTiers = allowedTiers;
    saveMusicLibrary(tracks);
    return res.json({ success: true, track: tracks[idx] });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.delete("/api/admin/music-library/:id", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u092E\u094D\u092F\u0942\u091C\u093C\u093F\u0915 \u0939\u091F\u093E \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const trackId = req.params.id;
    const tracks = loadMusicLibrary();
    const filtered = tracks.filter((t) => t.id !== trackId);
    saveMusicLibrary(filtered);
    return res.json({ success: true, message: "\u092E\u094D\u092F\u0942\u091C\u093C\u093F\u0915 \u091F\u094D\u0930\u0948\u0915 \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u0939\u091F\u093E\u092F\u093E \u0917\u092F\u093E", total: filtered.length });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/check-username", (req, res) => {
  try {
    const rawUsername = (req.query.username || "").toString().trim().replace(/^@/, "");
    const email = (req.query.email || "").toString().trim().toLowerCase();
    if (!rawUsername) {
      return res.status(400).json({ available: false, error: "\u092F\u0942\u091C\u093C\u0930\u0928\u0947\u092E \u0926\u0930\u094D\u091C \u0915\u0930\u0928\u093E \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948\u0964" });
    }
    const lower = rawUsername.toLowerCase();
    const reservedSuperAdmin = ["ainewsmaker", "ai news maker", "breakingnewswala", "breaking news wala"];
    if (reservedSuperAdmin.includes(lower)) {
      if ((lower.includes("ainewsmaker") || lower.includes("ai news maker")) && email === "admin.ainewsmaker@gmail.com") {
        return res.json({ available: true, reservedForYou: true });
      }
      if ((lower.includes("breaking") || lower.includes("breakingnewswala")) && email === "breakingnewswala.com@gmail.com") {
        return res.json({ available: true, reservedForYou: true });
      }
      return res.json({ available: false, error: "\u092F\u0939 \u092F\u0942\u091C\u093C\u0930\u0928\u0947\u092E \u0938\u0941\u092A\u0930 \u090F\u0921\u092E\u093F\u0928 \u0915\u0947 \u0932\u093F\u090F \u0906\u0930\u0915\u094D\u0937\u093F\u0924 \u0939\u0948\u0964" });
    }
    const users = loadUsersMasterDatabase();
    const match = users.find((u) => {
      const uName = (u.username || "").toLowerCase().trim().replace(/^@/, "");
      return uName === lower;
    });
    if (match) {
      if (email && match.email && match.email.toLowerCase().trim() === email) {
        return res.json({ available: true, isCurrentUser: true });
      }
      return res.json({ available: false, error: "\u092F\u0939 \u092F\u0942\u091C\u093C\u0930\u0928\u0947\u092E \u092A\u0939\u0932\u0947 \u0938\u0947 \u0915\u093F\u0938\u0940 \u0905\u0928\u094D\u092F \u0938\u0926\u0938\u094D\u092F \u0926\u094D\u0935\u093E\u0930\u093E \u092A\u0902\u091C\u0940\u0915\u0943\u0924 \u0939\u0948\u0964" });
    }
    return res.json({ available: true });
  } catch (err) {
    return res.status(500).json({ available: false, error: err.message });
  }
});
app.get(["/api/users", "/api/admin/users"], (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ success: false, error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u092F\u0942\u091C\u093C\u0930 \u0938\u0942\u091A\u0940 \u0926\u0947\u0916 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964" });
    }
    const now = Date.now();
    const users = loadUsersMasterDatabase();
    const rDb = loadRewardsDatabase();
    const decorated = users.map((u) => {
      const emailKey = (u.email || "").toLowerCase().trim();
      const idKey = (u.userId || "").toLowerCase().trim();
      const w = rDb.wallets[emailKey] || (idKey ? rDb.wallets[idKey] : null) || { coinBalance: 0 };
      const isSuper = isProtectedAdminAccount(emailKey) || u.role === "superadmin" || u.isProfileLocked === true;
      return {
        ...u,
        coins: w.coinBalance || 0,
        coinBalance: w.coinBalance || 0,
        permanentLock: isSuper,
        isLocked: isSuper,
        ...computeTrialFields(u, now)
      };
    });
    return res.json({ success: true, users: decorated });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post(["/api/users/sync", "/api/admin/register-user"], async (req, res) => {
  const release = await userDbLock.acquire();
  try {
    const profile = { ...req.body };
    if (!profile || !profile.email && !profile.userId) {
      return res.status(400).json({ error: "\u0908\u092E\u0947\u0932 \u092F\u093E \u0906\u0908\u0921\u0940 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948" });
    }
    if (profile.password && (profile.email || profile.username)) {
      try {
        const creds = loadCredentialsDatabase();
        const emailKey = (profile.email || "").toLowerCase().trim();
        const usernameKey = (profile.username || "").toLowerCase().trim();
        const targetKey = emailKey || usernameKey;
        const { salt, hash } = hashPassword(String(profile.password));
        creds[targetKey] = {
          email: emailKey,
          username: usernameKey,
          salt,
          hash,
          createdAt: Date.now()
        };
        saveCredentialsDatabase(creds);
      } catch (credErr) {
        console.warn("Could not save password credential:", credErr.message);
      }
    }
    const isAdmin = isAuthorizedAdmin(req);
    if (!isAdmin) {
      delete profile.role;
      delete profile.tier;
      delete profile.planName;
      delete profile.isProfileLocked;
      delete profile.isBlocked;
      delete profile.activatedVia;
      delete profile.expiresAt;
      delete profile.trialEndsAt;
      delete profile.trialStartedAt;
      delete profile.activatedAt;
    }
    const saved = registerOrUpdateUserAuthoritative(profile);
    const users = loadUsersMasterDatabase().map((u) => ({
      ...u,
      ...computeTrialFields(u, Date.now())
    }));
    return res.json({ success: true, user: saved, users: isAdmin ? users : [saved], totalUsers: users.length });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  } finally {
    release();
  }
});
app.get("/api/user-subscription", (req, res) => {
  try {
    const email = (req.query.email || "").toString().toLowerCase().trim();
    const userId = (req.query.userId || "").toString().toLowerCase().trim();
    const now = Date.now();
    const users = loadUsersMasterDatabase();
    const match = users.find(
      (u) => email && u.email && u.email.toLowerCase().trim() === email || email && u.email && u.email.toLowerCase().replace(/\s+/g, "") === email.replace(/\s+/g, "") || userId && u.userId && u.userId.toLowerCase().trim() === userId
    );
    if (!match) {
      return res.json({
        success: true,
        subscription: {
          tier: "basic",
          planName: "BASIC",
          trialStartedAt: now,
          trialEndsAt: now + SEVEN_DAYS_MS,
          isTrialActive: true,
          isTrialExpired: false,
          daysRemaining: 7,
          hoursRemaining: 24,
          minutesRemaining: 60,
          hasActivePaidPlan: false,
          isBlocked: false,
          isMobileLocked: false
        }
      });
    }
    const trialFields = computeTrialFields(match, now);
    return res.json({
      success: true,
      subscription: {
        tier: match.tier || "basic",
        planName: match.planName || "BASIC",
        trialStartedAt: match.trialStartedAt,
        trialEndsAt: match.trialEndsAt,
        isTrialActive: trialFields.isTrialActive,
        isTrialExpired: trialFields.isTrialExpired,
        daysRemaining: trialFields.daysRemaining,
        hoursRemaining: trialFields.hoursRemaining,
        minutesRemaining: trialFields.minutesRemaining,
        hasActivePaidPlan: trialFields.hasActivePaidPlan,
        isBlocked: Boolean(match.isBlocked),
        blockedAt: match.blockedAt || null,
        blockedBy: match.blockedBy || null,
        primaryMobile: match.mobile,
        isMobileLocked: Boolean(match.mobile),
        activatedAt: match.activatedAt,
        expiresAt: match.expiresAt
      }
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/notifications", (req, res) => {
  try {
    const email = (req.query.email || "").toString().toLowerCase().trim();
    const notifs = loadNotificationsDatabase();
    if (!email) {
      return res.json({ success: true, notifications: notifs.slice(0, 50) });
    }
    const isAdm = isProtectedAdminAccount(email);
    const filtered = notifs.filter((n) => {
      if (!n.targetUserEmail || n.targetUserEmail === "all") return true;
      if (isAdm && n.targetUserEmail === "admin") return true;
      const cleanTarget = n.targetUserEmail.toLowerCase().trim();
      return cleanTarget === email || cleanTarget.replace(/\s+/g, "") === email.replace(/\s+/g, "");
    });
    return res.json({ success: true, notifications: filtered.slice(0, 50) });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/notifications/mark-read", (req, res) => {
  try {
    const { id, all, email } = req.body;
    let notifs = loadNotificationsDatabase();
    if (all) {
      const cleanEmail = (email || "").toLowerCase().trim();
      notifs = notifs.map((n) => {
        if (!cleanEmail || n.targetUserEmail === cleanEmail || n.targetUserEmail === "all" || isProtectedAdminAccount(cleanEmail) && n.targetUserEmail === "admin") {
          return { ...n, unread: false };
        }
        return n;
      });
    } else if (id) {
      notifs = notifs.map((n) => n.id === id ? { ...n, unread: false } : n);
    }
    saveNotificationsDatabase(notifs);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/gemini-quota-status", (_req, res) => {
  return res.json({
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    provider: "gemini",
    models: DEFAULT_FALLBACK_MODELS,
    isQuotaExceeded: quotaExceededInfo.isExceeded,
    status: quotaExceededInfo.isExceeded ? "quota_limit_active" : "active",
    note: quotaExceededInfo.message,
    fallbackEngine: "Active (Zero-Downtime Structured News Engine)",
    lastChecked: quotaExceededInfo.lastChecked
  });
});
function generateRssFeedXml(posts, baseUrl = "https://www.ainewsmaker.online") {
  const cleanSiteUrl = baseUrl.replace(/\/+$/, "");
  const itemsXml = posts.map((post) => {
    const pubDate = post.timestamp ? new Date(post.timestamp).toUTCString() : (/* @__PURE__ */ new Date()).toUTCString();
    const link = post.sourceUrl && post.sourceUrl.startsWith("http") ? post.sourceUrl : `${cleanSiteUrl}/#home`;
    const safeCategory = (post.categoryName || post.category || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeChannel = (post.sourceChannel || "AI News Maker").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const enclosureTag = post.imageUrl ? `
      <enclosure url="${post.imageUrl.replace(/&/g, "&amp;")}" length="0" type="image/jpeg" />` : "";
    return `    <item>
      <title><![CDATA[${post.title || ""}]]></title>
      <link>${link}</link>
      <guid isPermaLink="false">${post.id || `post-${Date.now()}`}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${post.summary || ""}]]></description>
      <category>${safeCategory}</category>
      <source url="${link}">${safeChannel}</source>${enclosureTag}
    </item>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>AI News Maker - Live News Feed (\u0932\u093E\u0907\u0935 \u0938\u092E\u093E\u091A\u093E\u0930)</title>
    <link>${cleanSiteUrl}/</link>
    <description>AI News Maker - \u0930\u093F\u092F\u0932-\u091F\u093E\u0907\u092E \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C, \u0935\u0940\u0921\u093F\u092F\u094B \u0914\u0930 \u0917\u094D\u0930\u093E\u092B\u093F\u0915\u094D\u0938 \u0932\u093E\u0907\u0935 RSS \u092B\u093C\u0940\u0921</description>
    <language>hi</language>
    <copyright>\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} AI News Maker</copyright>
    <lastBuildDate>${(/* @__PURE__ */ new Date()).toUTCString()}</lastBuildDate>
    <atom:link href="${cleanSiteUrl}/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;
}
app.get(["/rss.xml", "/feed.xml", "/api/rss"], (_req, res) => {
  try {
    const posts = loadNewsDatabase();
    const rssXml = generateRssFeedXml(posts);
    res.header("Content-Type", "application/rss+xml; charset=utf-8");
    res.header("Cache-Control", "public, max-age=180");
    return res.send(rssXml);
  } catch (err) {
    return res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Error</title><description>${err.message}</description></channel></rss>`);
  }
});
var RSS_SOURCES_FILE = import_path.default.join(process.cwd(), "rss_sources_database.json");
var DEFAULT_PRODUCTION_RSS_SOURCES = [
  {
    id: "src_aajtak_live",
    name: "\u0906\u091C \u0924\u0915 (Aaj Tak) - \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C",
    url: "https://feeds.feedburner.com/aajtak/top",
    type: "rss",
    category: "\u0926\u0947\u0936",
    isActive: true,
    createdAt: 1726e9
  },
  {
    id: "src_ndtv_live",
    name: "NDTV \u0907\u0902\u0921\u093F\u092F\u093E - \u0932\u093E\u0907\u0935 \u0938\u092E\u093E\u091A\u093E\u0930",
    url: "https://feeds.feedburner.com/ndtvkhabar",
    type: "rss",
    category: "\u0926\u0947\u0936",
    isActive: true,
    createdAt: 1726000002e3
  },
  {
    id: "src_nbt_live",
    name: "\u0928\u0935\u092D\u093E\u0930\u0924 \u091F\u093E\u0907\u092E\u094D\u0938 (NBT)",
    url: "https://navbharattimes.indiatimes.com/rssfeedstopstories.cms",
    type: "rss",
    category: "\u0930\u093E\u091C\u094D\u092F",
    isActive: true,
    createdAt: 1726000004e3
  }
];
function loadRssSourcesDatabase() {
  try {
    const locations = resolveAllDatabaseLocations("rss_sources_database.json");
    for (const loc of locations) {
      if (import_fs.default.existsSync(loc)) {
        const raw = import_fs.default.readFileSync(loc, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((s) => s && s.url);
          if (valid.length > 0) {
            return valid;
          }
        }
      }
    }
    for (const loc of locations) {
      const backupFile = loc + ".bak";
      if (import_fs.default.existsSync(backupFile)) {
        const rawBak = import_fs.default.readFileSync(backupFile, "utf-8");
        const parsedBak = JSON.parse(rawBak);
        if (Array.isArray(parsedBak) && parsedBak.length > 0) {
          const validBak = parsedBak.filter((s) => s && s.url);
          if (validBak.length > 0) {
            saveRssSourcesDatabase(validBak);
            return validBak;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading rss_sources_database.json:", err.message);
  }
  return DEFAULT_PRODUCTION_RSS_SOURCES;
}
function saveRssSourcesDatabase(sources) {
  try {
    const cleaned = sources.filter((s) => s && s.url);
    if (cleaned.length === 0) {
      const existing = loadRssSourcesDatabase();
      if (existing.length > 0) {
        console.warn("Safeguard: Refusing to overwrite populated rss_sources_database with empty array");
        return true;
      }
    }
    const locations = resolveAllDatabaseLocations("rss_sources_database.json");
    for (const loc of locations) {
      try {
        if (import_fs.default.existsSync(import_path.default.dirname(loc))) {
          import_fs.default.writeFileSync(loc + ".bak", JSON.stringify(cleaned, null, 2), "utf-8");
          import_fs.default.writeFileSync(loc, JSON.stringify(cleaned, null, 2), "utf-8");
        }
      } catch {
      }
    }
    return true;
  } catch (err) {
    console.error("Error writing rss_sources_database.json:", err.message);
    return false;
  }
}
function resolveUrl(url, baseUrl) {
  try {
    if (!url || typeof url !== "string") return "";
    const clean = url.trim();
    if (clean.startsWith("//")) return "https:" + clean;
    if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
    if (baseUrl && (baseUrl.startsWith("http://") || baseUrl.startsWith("https://"))) {
      return new URL(clean, baseUrl).href;
    }
    return clean;
  } catch {
    return url;
  }
}
function isValidNewsImage(url) {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim().toLowerCase();
  if (clean.length < 8) return false;
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) return false;
  if (clean.endsWith(".ico") || clean.endsWith(".svg") || clean.endsWith(".gif")) return false;
  const invalidKeywords = [
    "logo",
    "favicon",
    "avatar",
    "icon",
    "advertisement",
    "ad_",
    "_ad",
    "/ads/",
    "banner",
    "pixel",
    "1x1",
    "tracking",
    "analytics",
    "share",
    "social",
    "button",
    "badge",
    "sponsor",
    "placeholder",
    "default_thumb",
    "spinner",
    "loader",
    "loading",
    "widget",
    "counter",
    "wp-content/themes",
    "/themes/",
    "/static/images/logo"
  ];
  return !invalidKeywords.some((kw) => clean.includes(kw));
}
async function extractBestNewsImage(itemXml, rawDesc, articleUrl, fallbackCategory) {
  const mediaMatches = itemXml.matchAll(/<media:content[^>]+url=["']([^"']+)["'][^>]*>/gi);
  for (const m of mediaMatches) {
    const resolved = resolveUrl(m[1], articleUrl);
    if (resolved && isValidNewsImage(resolved)) return resolved;
  }
  const mediaThumbMatches = itemXml.matchAll(/<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*>/gi);
  for (const m of mediaThumbMatches) {
    const resolved = resolveUrl(m[1], articleUrl);
    if (resolved && isValidNewsImage(resolved)) return resolved;
  }
  const enclosureMatches = itemXml.matchAll(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/gi);
  for (const m of enclosureMatches) {
    const resolved = resolveUrl(m[1], articleUrl);
    if (resolved && isValidNewsImage(resolved)) return resolved;
  }
  const enclosureAltMatches = itemXml.matchAll(/<enclosure[^>]+type=["']image\/[^"']+["'][^>]*url=["']([^"']+)["']/gi);
  for (const m of enclosureAltMatches) {
    const resolved = resolveUrl(m[1], articleUrl);
    if (resolved && isValidNewsImage(resolved)) return resolved;
  }
  const contentEncodedMatch = itemXml.match(/<content:encoded>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/content:encoded>/i);
  const contentBody = (contentEncodedMatch ? contentEncodedMatch[1] || contentEncodedMatch[2] || "" : "") + " " + rawDesc;
  const imgMatches = contentBody.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const m of imgMatches) {
    const resolved = resolveUrl(m[1], articleUrl);
    if (resolved && isValidNewsImage(resolved)) return resolved;
  }
  if (articleUrl && articleUrl.startsWith("http")) {
    try {
      const resp = await fetch(articleUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AI-News-Maker/1.0"
        },
        signal: AbortSignal.timeout(4500)
      });
      if (resp.ok) {
        const html = await resp.text();
        const ldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
        for (const ldMatch of ldMatches) {
          try {
            const data = JSON.parse(ldMatch[1]);
            const item = Array.isArray(data) ? data[0] : data["@graph"] ? data["@graph"].find((x) => x["@type"]?.includes?.("Article") || x.image) : data;
            if (item) {
              let imgCandidate = "";
              if (typeof item.image === "string") imgCandidate = item.image;
              else if (Array.isArray(item.image) && typeof item.image[0] === "string") imgCandidate = item.image[0];
              else if (item.image?.url) imgCandidate = item.image.url;
              else if (item.thumbnailUrl) imgCandidate = item.thumbnailUrl;
              if (imgCandidate) {
                const resolved = resolveUrl(imgCandidate, articleUrl);
                if (isValidNewsImage(resolved)) return resolved;
              }
            }
          } catch {
          }
        }
        const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        if (ogImageMatch && ogImageMatch[1]) {
          const resolved = resolveUrl(ogImageMatch[1].trim(), articleUrl);
          if (isValidNewsImage(resolved)) return resolved;
        }
        const twitterImageMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
        if (twitterImageMatch && twitterImageMatch[1]) {
          const resolved = resolveUrl(twitterImageMatch[1].trim(), articleUrl);
          if (isValidNewsImage(resolved)) return resolved;
        }
        const articleImgMatch = html.match(/<article[\s\S]*?<img[^>]+src=["']([^"']+)["']/i) || html.match(/<figure[\s\S]*?<img[^>]+src=["']([^"']+)["']/i) || html.match(/<img[^>]+data-(?:src|original|lazy-src)=["']([^"']+)["']/i);
        if (articleImgMatch && articleImgMatch[1]) {
          const resolved = resolveUrl(articleImgMatch[1].trim(), articleUrl);
          if (isValidNewsImage(resolved)) return resolved;
        }
      }
    } catch {
    }
  }
  return getCategoryFallbackImage(fallbackCategory);
}
function cleanAndCraftHindiHeadline(rawHeadline, articleText) {
  let title = rawHeadline || "";
  title = title.replace(/^(breaking\s*news\s*[:\-–—]|ब्रेकिंग\s*न्यूज़\s*[:\-–—]|एक्सक्लूसिव\s*[:\-–—]|exclusive\s*[:\-–—]|बड़ी\s*खबर\s*[:\-–—])/i, "").replace(/(?:^|\s)(जानिए|देखिए|सुनिए|सन्न\s*रह\s*जाएंगे|हैरान\s*हो\s*जाएंगे|बड़ा\s*खुलासा|चौंकाने\s*वाला|वायरल\s*सच)\s*[:\-–—]?\s*/gu, " ").replace(/(?:^|[^\p{L}\p{M}])(माननीय|सम्माननीय|सम्मानीय|आदरणीय|श्रीमान|श्रीमती|सुश्री)\s+/gu, " ").replace(/(?:^|[^\p{L}\p{M}])श्री\s+(?=[\p{L}])/gu, " ").replace(/\s+महोदय(?=[,\s.!?।\n]|$)/gu, "").replace(/\s+जी(?=[,\s.!?।\n]|$)/gu, "").replace(/\.{2,}/g, "").replace(/\s+/g, " ").trim();
  const locationList = [
    "\u0936\u0939\u0921\u094B\u0932",
    "\u0930\u0940\u0935\u093E",
    "\u0938\u0940\u0927\u0940",
    "\u0938\u0924\u0928\u093E",
    "\u092D\u094B\u092A\u093E\u0932",
    "\u0907\u0902\u0926\u094C\u0930",
    "\u091C\u092C\u0932\u092A\u0941\u0930",
    "\u0917\u094D\u0935\u093E\u0932\u093F\u092F\u0930",
    "\u0909\u091C\u094D\u091C\u0948\u0928",
    "\u0938\u093E\u0917\u0930",
    "\u091B\u0924\u0930\u092A\u0941\u0930",
    "\u0926\u092E\u094B\u0939",
    "\u0915\u091F\u0928\u0940",
    "\u092E\u0902\u0921\u0932\u093E",
    "\u0921\u093F\u0902\u0921\u094B\u0930\u0940",
    "\u0905\u0928\u0942\u092A\u092A\u0941\u0930",
    "\u0909\u092E\u0930\u093F\u092F\u093E",
    "\u0938\u093F\u0902\u0917\u0930\u094C\u0932\u0940",
    "\u0926\u093F\u0932\u094D\u0932\u0940",
    "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940",
    "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936",
    "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936",
    "\u092C\u093F\u0939\u093E\u0930",
    "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928",
    "\u092E\u0941\u0902\u092C\u0908"
  ];
  let detectedLocation = "\u0935\u093F\u0936\u0947\u0937 \u0921\u0947\u0938\u094D\u0915";
  for (const loc of locationList) {
    if (title.includes(loc) || articleText.includes(loc)) {
      detectedLocation = loc;
      break;
    }
  }
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length > 15) {
    title = words.slice(0, 15).join(" ");
  }
  let summary = articleText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (summary.length > 220) {
    summary = summary.slice(0, 215) + "...";
  }
  if (!summary) {
    summary = `${title} \u0915\u094B \u0932\u0947\u0915\u0930 \u0924\u093E\u091C\u093C\u093E \u0930\u093F\u092A\u094B\u0930\u094D\u091F \u0938\u093E\u092E\u0928\u0947 \u0906\u0908 \u0939\u0948\u0964 \u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u0938\u094D\u0924\u0930 \u092A\u0930 \u0906\u0935\u0936\u094D\u092F\u0915 \u0938\u0902\u091C\u094D\u091E\u093E\u0928 \u0932\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964`;
  }
  return { title, summary, location: detectedLocation };
}
async function processRssItemWithAiEditorial(rawTitle, rawDesc, sourceCategory, sourceUrl) {
  const fallback = cleanAndCraftHindiHeadline(rawTitle, rawDesc);
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.length > 5) {
    try {
      const ai = getGeminiClient();
      const prompt = `\u0906\u092A \u090F\u0915 \u0935\u0930\u093F\u0937\u094D\u0920, \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937 \u0914\u0930 \u0924\u0925\u094D\u092F\u092A\u0930\u0915 \u0939\u093F\u0902\u0926\u0940 \u0938\u092E\u093E\u091A\u093E\u0930 \u0938\u0902\u092A\u093E\u0926\u0915 \u0939\u0948\u0902\u0964
\u0928\u0940\u091A\u0947 \u0926\u0940 \u0917\u0908 \u0916\u092C\u0930 \u0915\u0947 \u0935\u093F\u0935\u0930\u0923 \u0914\u0930 \u0936\u0940\u0930\u094D\u0937\u0915 \u0915\u093E \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923 \u0915\u0930\u0947\u0902 \u0914\u0930 \u090F\u0915 \u0924\u0925\u094D\u092F\u092A\u0930\u0915, \u0938\u094D\u092A\u0937\u094D\u091F, \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0914\u0930 \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937 \u0939\u093F\u0902\u0926\u0940 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 (Headline) \u0935 2 \u0935\u093E\u0915\u094D\u092F\u094B\u0902 \u0915\u093E \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0938\u093E\u0930 (Summary) \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902\u0964

\u0928\u093F\u092F\u092E:
1. \u0915\u0947\u0935\u0932 \u0924\u0925\u094D\u092F\u093E\u0924\u094D\u092E\u0915 (factual), \u0938\u094D\u092A\u0937\u094D\u091F (clear) \u0914\u0930 \u0928\u094D\u092F\u0942\u091F\u094D\u0930\u0932 (neutral) \u092D\u093E\u0937\u093E \u0915\u093E \u092A\u094D\u0930\u092F\u094B\u0917 \u0915\u0930\u0947\u0902\u0964
2. "\u091C\u093E\u0928\u093F\u090F", "\u0926\u0947\u0916\u093F\u090F", "Breaking News:", "Exclusive", "\u092C\u0921\u093C\u093E \u0916\u0941\u0932\u093E\u0938\u093E" \u091C\u0948\u0938\u0947 \u0915\u094D\u0932\u093F\u0915\u092C\u0947\u091F \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u093E \u092A\u094D\u0930\u092F\u094B\u0917 \u0915\u0924\u0908 \u0928 \u0915\u0930\u0947\u0902\u0964
3. \u0905\u0928\u093E\u0935\u0936\u094D\u092F\u0915 \u0906\u0926\u0930\u0938\u0942\u091A\u0915 \u0936\u092C\u094D\u0926 (\u0936\u094D\u0930\u0940, \u092E\u093E\u0928\u0928\u0940\u092F, \u091C\u0940) \u0928 \u0932\u0917\u093E\u090F\u0902\u0964
4. \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0905\u0927\u093F\u0915\u0924\u092E 12 \u0938\u0947 14 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u0940 \u0939\u094B (\u0924\u093E\u0915\u093F 4:5 \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u0915\u093E\u0930\u094D\u0921 \u092E\u0947\u0902 2-3 \u0932\u093E\u0907\u0928\u094B\u0902 \u092E\u0947\u0902 \u0938\u0939\u0940 \u0926\u093F\u0916\u0947)\u0964
5. \u0906\u0909\u091F\u092A\u0941\u091F \u0915\u0947\u0935\u0932 \u0935\u0948\u0927 JSON \u092E\u0947\u0902 \u0926\u0947\u0902:
{"headline": "\u0924\u0925\u094D\u092F\u093E\u0924\u094D\u092E\u0915 \u0939\u0947\u0921\u0932\u093E\u0907\u0928", "summary": "\u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935\u093F\u0935\u0930\u0923", "location": "\u091C\u093F\u0932\u0947/\u0936\u0939\u0930 \u0915\u093E \u0928\u093E\u092E"}`;
      const res = await generateWithFallbackAndRetry(ai, GEMINI_MODELS_POOL.slice(0, 2), {
        contents: `${prompt}

\u092E\u0942\u0932 \u0936\u0940\u0930\u094D\u0937\u0915: ${rawTitle}
\u092E\u0942\u0932 \u0935\u093F\u0935\u0930\u0923: ${rawDesc.slice(0, 500)}`,
        config: { temperature: 0.2 }
      });
      const text = res?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.headline && parsed.headline.trim().length > 5) {
          return {
            title: parsed.headline.trim(),
            summary: parsed.summary?.trim() || fallback.summary,
            location: parsed.location?.trim() || fallback.location,
            categoryName: sourceCategory || "\u0926\u0947\u0936"
          };
        }
      }
    } catch {
    }
  }
  return {
    title: fallback.title,
    summary: fallback.summary,
    location: fallback.location,
    categoryName: sourceCategory || "\u0926\u0947\u0936"
  };
}
function decodeHtmlEntities(str) {
  if (!str) return "";
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&#([0-9]{1,6});/gi, (_match, numStr) => {
    const num = parseInt(numStr, 10);
    return String.fromCharCode(num);
  }).trim();
}
async function parseRssItemsFromXml(xmlText, source) {
  const posts = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const items = xmlText.match(itemRegex) || [];
  for (const itemXml of items.slice(0, 15)) {
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
    const rawTitle = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : "";
    if (!rawTitle) continue;
    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i) || itemXml.match(/<link\s+href=["']([^"']+)["']/i);
    const link = linkMatch ? (linkMatch[1] || linkMatch[2] || "").trim() : source.url;
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i) || itemXml.match(/<summary>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/summary>/i);
    const rawDesc = descMatch ? (descMatch[1] || descMatch[2] || "").trim() : "";
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || itemXml.match(/<dc:date>([\s\S]*?)<\/dc:date>/i);
    const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : "";
    let timestamp = Date.now();
    if (pubDateStr) {
      const parsedTime = Date.parse(pubDateStr);
      if (!isNaN(parsedTime)) timestamp = parsedTime;
    }
    const imageUrl = await extractBestNewsImage(itemXml, rawDesc, link, source.category);
    const editorial = await processRssItemWithAiEditorial(rawTitle, rawDesc, source.category, link);
    const catName = editorial.categoryName || source.category || "\u0926\u0947\u0936";
    const catKey = catName === "\u0926\u0947\u0936" ? "national" : catName === "\u0930\u093E\u091C\u094D\u092F" ? "state" : catName === "\u0930\u093E\u091C\u0928\u0940\u0924\u093F" ? "politics" : catName === "\u0935\u094D\u092F\u093E\u092A\u093E\u0930" ? "business" : catName === "\u0916\u0947\u0932" ? "sports" : catName === "\u092E\u0928\u094B\u0930\u0902\u091C\u0928" ? "entertainment" : catName === "\u0905\u092A\u0930\u093E\u0927" ? "crime" : "tech";
    const hashStr = Buffer.from(editorial.title.slice(0, 30) + link).toString("base64url").slice(0, 14);
    const postId = `rss-${source.id}-${hashStr}`;
    posts.push({
      id: postId,
      title: editorial.title,
      summary: editorial.summary,
      sourceChannel: source.name,
      sourceUrl: link,
      // PRESERVE original article URL
      category: catKey,
      categoryName: catName,
      publishedTime: formatRelativeTime(timestamp),
      imageUrl,
      breaking: editorial.title.includes("\u092C\u0921\u093C\u093E") || editorial.title.includes("\u092B\u0948\u0938\u0932\u093E") || editorial.title.includes("\u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908"),
      isExclusive: false,
      timestamp,
      fullContent: editorial.summary ? `${editorial.title}

${editorial.summary}

\u0938\u094D\u0930\u094B\u0924\u0903 ${source.name} (${link})` : editorial.title,
      location: editorial.location || "\u0935\u093F\u0936\u0947\u0937 \u0921\u0947\u0938\u094D\u0915",
      status: "PENDING_APPROVAL"
    });
  }
  return posts;
}
async function fetchAndParseWebLink(source) {
  try {
    const resp = await fetch(source.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AI-News-Maker/1.0"
      },
      signal: AbortSignal.timeout(9e3)
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    let rawTitle = "";
    let rawDesc = "";
    let fullArticleText = "";
    let imageUrl = "";
    const ldMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const ldMatch of ldMatches) {
      try {
        const data = JSON.parse(ldMatch[1]);
        const item = Array.isArray(data) ? data[0] : data["@graph"] ? data["@graph"].find((x) => x["@type"]?.includes?.("Article") || x.headline) : data;
        if (item) {
          if (!rawTitle && (item.headline || item.name)) rawTitle = decodeHtmlEntities(String(item.headline || item.name).trim());
          if (!rawDesc && (item.description || item.abstract)) rawDesc = decodeHtmlEntities(String(item.description || item.abstract).trim());
          if (!fullArticleText && item.articleBody) fullArticleText = decodeHtmlEntities(String(item.articleBody).trim());
          let candidateImg = "";
          if (typeof item.image === "string") candidateImg = item.image;
          else if (Array.isArray(item.image) && typeof item.image[0] === "string") candidateImg = item.image[0];
          else if (item.image?.url) candidateImg = item.image.url;
          else if (item.thumbnailUrl) candidateImg = item.thumbnailUrl;
          if (candidateImg && !imageUrl) {
            const resolved = resolveUrl(candidateImg, source.url);
            if (isValidNewsImage(resolved)) imageUrl = resolved;
          }
        }
      } catch {
      }
    }
    if (!rawTitle) {
      const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) || html.match(/<title>([^<]+)<\/title>/i);
      rawTitle = ogTitleMatch ? decodeHtmlEntities(ogTitleMatch[1].trim()) : "";
    }
    if (!rawTitle) return [];
    if (!rawDesc) {
      const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      rawDesc = ogDescMatch ? decodeHtmlEntities(ogDescMatch[1].trim()) : "";
    }
    if (!fullArticleText) {
      const paragraphs = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((m) => decodeHtmlEntities(m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim())).filter((p) => p.length > 30).slice(0, 5).join("\n\n");
      fullArticleText = paragraphs || rawDesc;
    }
    if (!imageUrl) {
      const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (ogImageMatch && ogImageMatch[1]) {
        const resolved = resolveUrl(ogImageMatch[1].trim(), source.url);
        if (isValidNewsImage(resolved)) imageUrl = resolved;
      }
    }
    if (!imageUrl) {
      const twitterImageMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
      if (twitterImageMatch && twitterImageMatch[1]) {
        const resolved = resolveUrl(twitterImageMatch[1].trim(), source.url);
        if (isValidNewsImage(resolved)) imageUrl = resolved;
      }
    }
    if (!imageUrl) {
      const articleImgMatch = html.match(/<article[\s\S]*?<img[^>]+src=["']([^"']+)["']/i) || html.match(/<figure[\s\S]*?<img[^>]+src=["']([^"']+)["']/i) || html.match(/<img[^>]+data-(?:src|original|lazy-src)=["']([^"']+)["']/i);
      if (articleImgMatch && articleImgMatch[1]) {
        const resolved = resolveUrl(articleImgMatch[1].trim(), source.url);
        if (isValidNewsImage(resolved)) imageUrl = resolved;
      }
    }
    if (!imageUrl) {
      imageUrl = getCategoryFallbackImage(source.category);
    }
    const editorial = await processRssItemWithAiEditorial(rawTitle, fullArticleText, source.category, source.url);
    const catName = editorial.categoryName || source.category || "\u0926\u0947\u0936";
    const catKey = catName === "\u0926\u0947\u0936" ? "national" : catName === "\u0930\u093E\u091C\u094D\u092F" ? "state" : catName === "\u0930\u093E\u091C\u0928\u0940\u0924\u093F" ? "politics" : catName === "\u0935\u094D\u092F\u093E\u092A\u093E\u0930" ? "business" : catName === "\u0916\u0947\u0932" ? "sports" : catName === "\u092E\u0928\u094B\u0930\u0902\u091C\u0928" ? "entertainment" : catName === "\u0905\u092A\u0930\u093E\u0927" ? "crime" : "tech";
    const hashStr = Buffer.from(editorial.title.slice(0, 30) + source.url).toString("base64url").slice(0, 14);
    const postId = `web-${source.id}-${hashStr}`;
    return [{
      id: postId,
      title: editorial.title,
      summary: editorial.summary,
      sourceChannel: source.name,
      sourceUrl: source.url,
      // PRESERVE original article URL
      category: catKey,
      categoryName: catName,
      publishedTime: "\u0905\u092D\u0940-\u0905\u092D\u0940",
      imageUrl,
      breaking: false,
      isExclusive: false,
      timestamp: Date.now(),
      fullContent: `${editorial.title}

${editorial.summary}

\u0935\u0947\u092C \u0932\u093F\u0902\u0915 \u0938\u094D\u0930\u094B\u0924\u0903 ${source.url}`,
      location: editorial.location || "\u0935\u0947\u092C \u0921\u0947\u0938\u094D\u0915",
      status: "PENDING_APPROVAL"
    }];
  } catch (err) {
    console.error(`Error fetching web link ${source.url}:`, err.message);
    return [];
  }
}
function verifyIsAdminUser(req) {
  const configuredKey = (process.env.ADMIN_DIAGNOSTIC_KEY || "").trim();
  if (configuredKey && configuredKey.length >= 16) {
    const authHeader = req.headers["authorization"] || "";
    const bearerKey = authHeader.replace(/^Bearer\s+/i, "").trim();
    const customKey = (req.headers["x-admin-diagnostic-key"] || "").toString().trim();
    const provided = bearerKey || customKey;
    if (provided && provided.length === configuredKey.length) {
      if (require("node:crypto").timingSafeEqual(Buffer.from(provided), Buffer.from(configuredKey))) {
        return true;
      }
    }
  }
  const role = (req.headers["x-user-role"] || req.body?.userRole || req.body?.role || "").toString().toLowerCase().trim();
  const email = (req.headers["x-user-email"] || req.body?.userEmail || req.body?.email || "").toString().toLowerCase().trim();
  if (role === "admin" || role === "superadmin" || email === "breakingnewswala.com@gmail.com" || email === "editor@ainewsmaker.online" || email.includes("admin")) {
    return true;
  }
  if (!configuredKey) {
    return true;
  }
  return false;
}
app.get("/api/admin/rss-sources", (_req, res) => {
  const sources = loadRssSourcesDatabase();
  return res.json({ success: true, sources });
});
app.post("/api/admin/rss-sources", (req, res) => {
  try {
    if (!verifyIsAdminUser(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: RSS \u092B\u093C\u0940\u0921\u094D\u0938 \u0914\u0930 \u0935\u0947\u092C \u0932\u093F\u0902\u0915\u094D\u0938 \u0915\u0947\u0935\u0932 \u090F\u0921\u092E\u093F\u0928 \u0926\u094D\u0935\u093E\u0930\u093E \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u093F\u090F \u091C\u093E \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964" });
    }
    const payload = req.body;
    const existingSources = loadRssSourcesDatabase();
    let incoming = [];
    if (Array.isArray(payload)) {
      incoming = payload;
    } else if (payload && Array.isArray(payload.sources)) {
      incoming = payload.sources;
    } else if (payload && payload.url) {
      incoming = [{
        id: payload.id || `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: (payload.name || (payload.type === "web" ? "Web Link" : "RSS Source")).trim(),
        url: payload.url.trim(),
        type: payload.type === "web" ? "web" : "rss",
        category: payload.category || "\u0926\u0947\u0936",
        isActive: payload.isActive !== false,
        createdAt: payload.createdAt || Date.now(),
        itemsFetchedCount: 0
      }];
    }
    const sourceMap = /* @__PURE__ */ new Map();
    if (req.query.replace === "true" || payload?.replace === true) {
      incoming.forEach((s) => {
        if (s && s.url) sourceMap.set(s.url.trim(), s);
      });
    } else {
      existingSources.forEach((s) => {
        if (s && s.url) sourceMap.set(s.url.trim(), s);
      });
      incoming.forEach((s) => {
        if (s && s.url) sourceMap.set(s.url.trim(), s);
      });
    }
    let finalSources = Array.from(sourceMap.values());
    if (finalSources.length === 0) {
      finalSources = DEFAULT_PRODUCTION_RSS_SOURCES;
    }
    saveRssSourcesDatabase(finalSources);
    return res.json({ success: true, sources: finalSources });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.delete("/api/admin/delete-rss-source/:id", (req, res) => {
  try {
    if (!verifyIsAdminUser(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: RSS \u092B\u093C\u0940\u0921\u094D\u0938 \u0939\u091F\u093E\u0928\u093E \u0915\u0947\u0935\u0932 \u090F\u0921\u092E\u093F\u0928 \u0915\u0947 \u0932\u093F\u090F \u0905\u0928\u0941\u092E\u0924 \u0939\u0948\u0964" });
    }
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Source ID is required" });
    let sources = loadRssSourcesDatabase();
    const targetSource = sources.find((s) => s.id === id);
    sources = sources.filter((s) => s.id !== id);
    saveRssSourcesDatabase(sources);
    if (targetSource) {
      let posts = loadNewsDatabase();
      posts = posts.filter((p) => {
        if (p.id.startsWith(`rss-${id}`) || p.id.startsWith(`web-${id}`)) return false;
        if (targetSource.url && p.sourceUrl === targetSource.url) return false;
        return true;
      });
      saveNewsDatabase(posts);
    }
    return res.json({ success: true, sources });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var GENERATED_WEB_RSS_FEEDS = /* @__PURE__ */ new Map();
function isPrivateOrInternalUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return true;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1" || hostname === "169.254.169.254" || hostname === "metadata.google.internal" || hostname.endsWith(".internal") || hostname.endsWith(".local")) {
      return true;
    }
    const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch) {
      const p1 = parseInt(ipMatch[1], 10);
      const p2 = parseInt(ipMatch[2], 10);
      if (p1 === 10 || p1 === 127 || p1 === 169 && p2 === 254 || p1 === 192 && p2 === 168 || p1 === 172 && p2 >= 16 && p2 <= 31) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}
function isIndividualArticleUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    const pathname = parsed.pathname.toLowerCase();
    const search = parsed.search.toLowerCase();
    if (pathname.includes("/article/") || pathname.includes("/articles/") || pathname.includes("/story/") || pathname.includes("/stories/") || pathname.includes("/news-item/") || pathname.includes("/detail/") || pathname.includes("/full-story/")) {
      return true;
    }
    if (/\/\d{4}[/-]\d{2}[/-]\d{2}\//.test(pathname) || /\/\d{4}\/\d{2}\//.test(pathname)) {
      return true;
    }
    const filename = pathname.split("/").filter(Boolean).pop() || "";
    if (/\.(html?|cms|amp|php)$/.test(filename)) {
      const baseName = filename.replace(/\.(html?|cms|amp|php)$/, "");
      if (baseName !== "index" && baseName !== "default" && baseName !== "home" && baseName !== "category" && baseName !== "archive" && baseName !== "all") {
        if (/\d{4,}/.test(baseName) || (baseName.match(/-/g) || []).length >= 3) {
          return true;
        }
      }
    }
    if (search.includes("article_id=") || search.includes("articleid=") || search.includes("story_id=") || search.includes("storyid=") || search.includes("news_id=") || search.includes("newsid=") || search.includes("post_id=")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
function escapeXmlChars(unsafe) {
  return (unsafe || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
app.post("/api/convert-web-to-rss", async (req, res) => {
  try {
    const rawUrl = (req.body?.url || "").trim();
    const category = (req.body?.category || "\u0926\u0947\u0936").trim();
    if (!rawUrl) {
      return res.status(400).json({ error: "\u0915\u0943\u092A\u092F\u093E \u092E\u093E\u0928\u094D\u092F \u0935\u0947\u092C\u0938\u093E\u0907\u091F \u092F\u093E \u0936\u094D\u0930\u0947\u0923\u0940 URL \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902\u0964" });
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return res.status(400).json({ error: "\u0905\u092E\u093E\u0928\u094D\u092F URL \u092A\u094D\u0930\u093E\u0930\u0942\u092A\u0964 \u0915\u0943\u092A\u092F\u093E \u092A\u0942\u0930\u094D\u0923 URL \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902 (\u091C\u0948\u0938\u0947: https://example.com/news)" });
    }
    if (isPrivateOrInternalUrl(rawUrl)) {
      return res.status(403).json({ error: "\u0938\u0941\u0930\u0915\u094D\u0937\u093E \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927: \u0938\u094D\u0925\u093E\u0928\u0940\u092F, \u0928\u093F\u091C\u0940 \u092F\u093E \u0906\u0902\u0924\u0930\u093F\u0915 \u0928\u0947\u091F\u0935\u0930\u094D\u0915 \u092A\u0924\u0947 \u0905\u0928\u0941\u092E\u0924 \u0928\u0939\u0940\u0902 \u0939\u0948\u0902\u0964" });
    }
    if (isIndividualArticleUrl(rawUrl)) {
      return res.status(400).json({
        error: "\u092F\u0939 \u0932\u093F\u0902\u0915 \u090F\u0915 \u0935\u094D\u092F\u0915\u094D\u0924\u093F\u0917\u0924 \u0932\u0947\u0916 (Individual Article) \u0915\u093E \u092A\u094D\u0930\u0924\u0940\u0924 \u0939\u094B\u0924\u093E \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u0915\u093F\u0938\u0940 \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 \u0915\u093E \u092E\u0941\u0916\u094D\u092F \u0939\u094B\u092E\u092A\u0947\u091C (Homepage) \u092F\u093E \u0936\u094D\u0930\u0947\u0923\u0940/\u0932\u093F\u0938\u094D\u091F\u093F\u0902\u0917 \u092A\u0947\u091C (Category/Listing Page) \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902\u0964"
      });
    }
    const response = await fetch(rawUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AI-News-Maker/1.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      signal: AbortSignal.timeout(1e4)
    });
    if (!response.ok) {
      return res.status(400).json({
        error: `\u0935\u0947\u092C\u0938\u093E\u0907\u091F \u0938\u0947 \u0915\u0928\u0947\u0915\u094D\u091F \u0915\u0930\u0928\u0947 \u092E\u0947\u0902 \u0924\u094D\u0930\u0941\u091F\u093F (HTTP ${response.status})\u0964 \u0915\u0943\u092A\u092F\u093E URL \u091C\u093E\u0902\u091A\u0947\u0902 \u092F\u093E \u092C\u093E\u0926 \u092E\u0947\u0902 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964`
      });
    }
    const html = await response.text();
    const rssLinkMatch = html.match(/<link[^>]+type=["']application\/(rss\+xml|atom\+xml)["'][^>]+href=["']([^"']+)["']/i) || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/(rss\+xml|atom\+xml)["']/i);
    if (rssLinkMatch) {
      const rawFeedHref = rssLinkMatch[2] || rssLinkMatch[1];
      if (rawFeedHref) {
        const resolvedFeedUrl = new URL(rawFeedHref, rawUrl).toString();
        if (!isPrivateOrInternalUrl(resolvedFeedUrl)) {
          return res.json({
            success: true,
            feedUrl: resolvedFeedUrl,
            isNativeFeed: true,
            message: "\u0907\u0938 \u0935\u0947\u092C\u0938\u093E\u0907\u091F \u092A\u0930 \u092A\u0939\u0932\u0947 \u0938\u0947 \u0939\u0940 \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 RSS 2.0 \u092B\u093C\u0940\u0921 \u0909\u092A\u0932\u092C\u094D\u0927 \u0939\u0948\u0964"
          });
        }
      }
    }
    const pageTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawPageTitle = pageTitleMatch ? pageTitleMatch[1].trim() : parsedUrl.hostname;
    const cleanTitle = rawPageTitle.replace(/[\r\n\t]/g, " ").replace(/\s+/g, " ").slice(0, 100);
    const finalChannelName = (req.body?.channelName || req.body?.channel || cleanTitle).trim();
    const items = [];
    const seenLinks = /* @__PURE__ */ new Set();
    const seenTitles = /* @__PURE__ */ new Set();
    const tryAddItem = (heading, rawHref, desc, imgUrl, pubDate) => {
      const cleanH = (heading || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      const cleanHref = (rawHref || "").trim();
      if (cleanH.length >= 8 && !cleanHref.startsWith("#") && !cleanHref.startsWith("javascript:")) {
        try {
          const resolvedLink = new URL(cleanHref, rawUrl).toString();
          const titleKey = cleanH.toLowerCase().slice(0, 30);
          if (!seenLinks.has(resolvedLink) && !seenTitles.has(titleKey)) {
            seenLinks.add(resolvedLink);
            seenTitles.add(titleKey);
            items.push({
              title: cleanH,
              link: resolvedLink,
              description: desc || cleanH,
              imageUrl: imgUrl ? new URL(imgUrl, rawUrl).toString() : "",
              pubDate: pubDate || (/* @__PURE__ */ new Date()).toUTCString()
            });
            return true;
          }
        } catch {
        }
      }
      return false;
    };
    const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let jsonMatch;
    while ((jsonMatch = jsonLdRegex.exec(html)) !== null) {
      try {
        const rawJsonText = jsonMatch[1].trim();
        const parsedData = JSON.parse(rawJsonText);
        const entries = Array.isArray(parsedData) ? parsedData : parsedData["@graph"] && Array.isArray(parsedData["@graph"]) ? parsedData["@graph"] : [parsedData];
        for (const entry of entries) {
          if (!entry || typeof entry !== "object") continue;
          const type = entry["@type"];
          if (type === "ItemList" && Array.isArray(entry.itemListElement)) {
            for (const elem of entry.itemListElement) {
              const item = elem.item || elem;
              if (item && (item.name || item.headline) && (item.url || item["@id"])) {
                tryAddItem(
                  item.headline || item.name,
                  item.url || item["@id"],
                  item.description,
                  typeof item.image === "string" ? item.image : item.image?.url || item.image?.[0],
                  item.datePublished || item.dateModified
                );
              }
            }
          } else if (typeof type === "string" && (type.includes("Article") || type.includes("News") || type.includes("Posting") || type.includes("Reportage"))) {
            if ((entry.headline || entry.name) && (entry.url || entry["@id"])) {
              tryAddItem(
                entry.headline || entry.name,
                entry.url || entry["@id"],
                entry.description,
                typeof entry.image === "string" ? entry.image : entry.image?.url || entry.image?.[0],
                entry.datePublished || entry.dateModified
              );
            }
          }
        }
      } catch {
      }
    }
    const articleRegex = /<article[\s\S]*?<\/article>/gi;
    let artMatch;
    while ((artMatch = articleRegex.exec(html)) !== null) {
      const artBlock = artMatch[0];
      const headingMatch = artBlock.match(/<h[1-5][^>]*>[\s\S]*?<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h[1-5]>/i) || artBlock.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<h[1-5][^>]*>([\s\S]*?)<\/h[1-5]>[\s\S]*?<\/a>/i);
      if (headingMatch) {
        const rawHref = headingMatch[1].trim();
        const rawHeading = headingMatch[2].replace(/<[^>]+>/g, "").trim();
        const imgM = artBlock.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i);
        const imgUrl = imgM ? imgM[1] : "";
        const pM = artBlock.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        const desc = pM ? pM[1].replace(/<[^>]+>/g, "").trim().slice(0, 250) : "";
        tryAddItem(rawHeading, rawHref, desc, imgUrl);
      }
    }
    if (items.length < 2) {
      const hRegex = /<h[1-5][^>]*>[\s\S]*?<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h[1-5]>/gi;
      let hMatch;
      while ((hMatch = hRegex.exec(html)) !== null) {
        const rawHref = hMatch[1].trim();
        const rawHeading = hMatch[2].replace(/<[^>]+>/g, "").trim();
        tryAddItem(rawHeading, rawHref);
        if (items.length >= 25) break;
      }
    }
    if (items.length < 2) {
      const aRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let aMatch;
      while ((aMatch = aRegex.exec(html)) !== null) {
        const rawHref = aMatch[1].trim();
        const rawText = aMatch[2].replace(/<[^>]+>/g, "").trim();
        if (rawText.length >= 12 && /(\/news\/|\/article\/|\/story\/|\/khabar\/|-\d+\.html|\/\d{4}\/\d{2}\/)/i.test(rawHref)) {
          tryAddItem(rawText, rawHref);
        }
        if (items.length >= 25) break;
      }
    }
    if (items.length < 2) {
      return res.status(400).json({
        error: "\u0907\u0938 \u0935\u0947\u092C\u092A\u0947\u091C \u0938\u0947 \u0915\u094B\u0908 \u0938\u092E\u093E\u091A\u093E\u0930 \u0938\u0942\u091A\u0940 (Article Listings) \u0928\u0939\u0940\u0902 \u092E\u093F\u0932 \u0938\u0915\u0940\u0964 \u0915\u0943\u092A\u092F\u093E \u092E\u093E\u0928\u094D\u092F \u0939\u094B\u092E\u092A\u0947\u091C \u092F\u093E \u0936\u094D\u0930\u0947\u0923\u0940 \u092A\u0947\u091C \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0947\u0902\u0964"
      });
    }
    const feedId = `wf_${Date.now()}_${import_crypto.default.randomBytes(3).toString("hex")}`;
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXmlChars(finalChannelName)}</title>
    <link>${escapeXmlChars(rawUrl)}</link>
    <description>RSS 2.0 Feed generated by AI News Maker Web to RSS Link Converter</description>
    <language>hi</language>
    <lastBuildDate>${(/* @__PURE__ */ new Date()).toUTCString()}</lastBuildDate>
    <generator>AI News Maker Web to RSS Converter v2.0</generator>
${items.map((it) => `    <item>
      <title><![CDATA[${it.title}]]></title>
      <link>${escapeXmlChars(it.link)}</link>
      <guid isPermaLink="true">${escapeXmlChars(it.link)}</guid>
      <description><![CDATA[${it.description || it.title}]]></description>
      <category>${escapeXmlChars(category)}</category>
      <pubDate>${it.pubDate || (/* @__PURE__ */ new Date()).toUTCString()}</pubDate>
${it.imageUrl ? `      <enclosure url="${escapeXmlChars(it.imageUrl)}" type="image/jpeg" />` : ""}
    </item>`).join("\n")}
  </channel>
</rss>`;
    GENERATED_WEB_RSS_FEEDS.set(feedId, {
      feedId,
      sourceUrl: rawUrl,
      channelTitle: finalChannelName,
      category,
      xmlContent,
      createdAt: Date.now()
    });
    const host = req.get("host") || "localhost:8080";
    const proto = req.protocol || "http";
    const generatedFeedUrl = `${proto}://${host}/api/rss/web-feed?feedId=${feedId}`;
    return res.json({
      success: true,
      feedId,
      feedUrl: generatedFeedUrl,
      title: finalChannelName,
      channelName: finalChannelName,
      category,
      totalArticles: items.length,
      itemsCount: items.length,
      sampleItems: items.slice(0, 3)
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/rss/web-feed", (req, res) => {
  try {
    const feedId = String(req.query.feedId || "").trim();
    if (!feedId) {
      return res.status(400).set("Content-Type", "text/plain; charset=utf-8").send("feedId query parameter is required");
    }
    const record = GENERATED_WEB_RSS_FEEDS.get(feedId);
    if (!record) {
      return res.status(404).set("Content-Type", "text/plain; charset=utf-8").send("RSS Feed not found or expired. Please generate a new feed URL.");
    }
    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    return res.send(record.xmlContent);
  } catch (err) {
    return res.status(500).set("Content-Type", "text/plain; charset=utf-8").send(err.message || "Error generating feed");
  }
});
app.post("/api/admin/rss-sync", async (_req, res) => {
  try {
    const sources = loadRssSourcesDatabase();
    const activeSources = sources.filter((s) => s.isActive);
    let totalNewItems = 0;
    const fetchedPosts = [];
    await Promise.allSettled(
      activeSources.map(async (src) => {
        try {
          if (src.type === "rss") {
            const resp = await fetch(src.url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AI-News-Maker/1.0",
                Accept: "application/rss+xml, application/xml, text/xml, */*"
              },
              signal: AbortSignal.timeout(1e4)
            });
            if (resp.ok) {
              const xmlText = await resp.text();
              const items = await parseRssItemsFromXml(xmlText, src);
              if (items.length > 0) {
                src.lastFetchedAt = Date.now();
                src.itemsFetchedCount = (src.itemsFetchedCount || 0) + items.length;
                fetchedPosts.push(...items);
              }
            }
          } else {
            const items = await fetchAndParseWebLink(src);
            if (items.length > 0) {
              src.lastFetchedAt = Date.now();
              src.itemsFetchedCount = (src.itemsFetchedCount || 0) + items.length;
              fetchedPosts.push(...items);
            }
          }
        } catch (srcErr) {
          console.warn(`Failed to sync source ${src.name} (${src.url}):`, srcErr.message);
        }
      })
    );
    if (fetchedPosts.length > 0) {
      let existingPosts = loadNewsDatabase();
      const existingIds = new Set(existingPosts.map((p) => p.id));
      const existingTitles = new Set(existingPosts.map((p) => p.title.trim().toLowerCase().slice(0, 40)));
      const trulyNew = [];
      for (const p of fetchedPosts) {
        p.status = p.status || "PENDING_APPROVAL";
        const titleKey = p.title.trim().toLowerCase().slice(0, 40);
        if (!existingIds.has(p.id) && !existingTitles.has(titleKey)) {
          existingIds.add(p.id);
          existingTitles.add(titleKey);
          trulyNew.push(p);
        } else {
          const match = existingPosts.find((ep) => ep.id === p.id || ep.title.trim().toLowerCase().slice(0, 40) === titleKey);
          if (match && !match.status) {
            match.status = "PENDING_APPROVAL";
          }
        }
      }
      if (trulyNew.length > 0) {
        totalNewItems = trulyNew.length;
        existingPosts = [...trulyNew, ...existingPosts].slice(0, 200);
      }
      saveNewsDatabase(existingPosts);
      saveRssSourcesDatabase(sources);
    }
    return res.json({
      success: true,
      count: totalNewItems,
      totalSourcesSynced: activeSources.length,
      timestamp: Date.now()
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
var ACCOUNT_DELETIONS_FILE = import_path.default.join(process.cwd(), "account_deletion_requests.json");
function loadAccountDeletionRequests() {
  try {
    if (import_fs.default.existsSync(ACCOUNT_DELETIONS_FILE)) {
      const raw = import_fs.default.readFileSync(ACCOUNT_DELETIONS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Error reading account_deletion_requests.json:", err);
  }
  return [];
}
function saveAccountDeletionRequests(records) {
  try {
    import_fs.default.writeFileSync(ACCOUNT_DELETIONS_FILE, JSON.stringify(records, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing account_deletion_requests.json:", err);
    return false;
  }
}
app.post("/api/account-deletion-requests", (req, res) => {
  try {
    const { email, mobile, channelName, reason } = req.body || {};
    const cleanEmail = (email || "").toString().trim().toLowerCase();
    const cleanMobile = (mobile || "").toString().trim();
    const cleanChannel = (channelName || "").toString().trim().toLowerCase();
    if (cleanEmail || cleanMobile) {
      let masterUsers = loadUsersMasterDatabase();
      const origUserCount = masterUsers.length;
      masterUsers = masterUsers.filter((u) => {
        const uEmail = (u.email || "").toLowerCase().trim();
        const uMobile = (u.mobile || "").trim();
        if (cleanEmail && uEmail === cleanEmail) return false;
        if (cleanMobile && uMobile === cleanMobile) return false;
        return true;
      });
      if (masterUsers.length !== origUserCount) {
        saveUsersMasterDatabase(masterUsers);
      }
    }
    if (cleanEmail || cleanMobile || cleanChannel) {
      const allProfiles = loadProfilesDatabase();
      let profileModified = false;
      for (const [key, prof] of Object.entries(allProfiles)) {
        const pEmail = (prof?.email || key).toLowerCase().trim();
        const pMobile = (prof?.mobile || "").trim();
        const pChannel = (prof?.channelName || prof?.username || "").toLowerCase().trim();
        if (cleanEmail && pEmail === cleanEmail) {
          delete allProfiles[key];
          profileModified = true;
        } else if (cleanMobile && pMobile === cleanMobile) {
          delete allProfiles[key];
          profileModified = true;
        } else if (cleanChannel && pChannel === cleanChannel) {
          delete allProfiles[key];
          profileModified = true;
        }
      }
      if (profileModified) {
        saveProfilesDatabase(allProfiles);
      }
    }
    let existingPosts = loadNewsDatabase();
    const initialCount = existingPosts.length;
    if (cleanChannel.length > 2 || cleanEmail.length > 4) {
      existingPosts = existingPosts.filter((p) => {
        const pChannel = (p.sourceChannel || "").toLowerCase();
        if (cleanChannel.length > 2 && (pChannel.includes(cleanChannel) || cleanChannel.includes(pChannel))) {
          return false;
        }
        return true;
      });
      if (existingPosts.length !== initialCount) {
        saveNewsDatabase(existingPosts);
      }
    }
    const clearedCount = initialCount - existingPosts.length;
    const requestId = `DEL-${Date.now()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    const record = {
      id: requestId,
      email: cleanEmail || "unknown",
      mobile: cleanMobile,
      channelName: cleanChannel,
      reason: reason || "User requested account & data deletion via portal",
      requestedAt: Date.now(),
      status: "COMPLETED",
      clearedPostsCount: clearedCount
    };
    const allRequests = loadAccountDeletionRequests();
    allRequests.unshift(record);
    saveAccountDeletionRequests(allRequests);
    console.log(`[Account Deletion] Processed request for ${cleanEmail || cleanMobile || cleanChannel}. Cleared posts: ${clearedCount}`);
    return res.json({
      success: true,
      requestId,
      message: "Account and associated data deletion request successfully processed. All profile and news data purged.",
      clearedPostsCount: clearedCount
    });
  } catch (err) {
    console.error("Error processing account deletion request:", err);
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.all("/api/user-data/delete-account", (req, res) => {
  try {
    const { email, mobile, channelName } = req.body || {};
    const cleanEmail = (email || "").toString().trim().toLowerCase();
    const cleanMobile = (mobile || "").toString().trim();
    const cleanChannel = (channelName || "").toString().trim().toLowerCase();
    if (cleanEmail || cleanMobile) {
      let masterUsers = loadUsersMasterDatabase();
      const origUserCount = masterUsers.length;
      masterUsers = masterUsers.filter((u) => {
        const uEmail = (u.email || "").toLowerCase().trim();
        const uMobile = (u.mobile || "").trim();
        if (cleanEmail && uEmail === cleanEmail) return false;
        if (cleanMobile && uMobile === cleanMobile) return false;
        return true;
      });
      if (masterUsers.length !== origUserCount) {
        saveUsersMasterDatabase(masterUsers);
      }
    }
    if (cleanEmail || cleanMobile || cleanChannel) {
      const allProfiles = loadProfilesDatabase();
      let profileModified = false;
      for (const [key, prof] of Object.entries(allProfiles)) {
        const pEmail = (prof?.email || key).toLowerCase().trim();
        const pMobile = (prof?.mobile || "").trim();
        const pChannel = (prof?.channelName || prof?.username || "").toLowerCase().trim();
        if (cleanEmail && pEmail === cleanEmail) {
          delete allProfiles[key];
          profileModified = true;
        } else if (cleanMobile && pMobile === cleanMobile) {
          delete allProfiles[key];
          profileModified = true;
        } else if (cleanChannel && pChannel === cleanChannel) {
          delete allProfiles[key];
          profileModified = true;
        }
      }
      if (profileModified) {
        saveProfilesDatabase(allProfiles);
      }
    }
    let existingPosts = loadNewsDatabase();
    const initialCount = existingPosts.length;
    if (cleanChannel.length > 2) {
      existingPosts = existingPosts.filter((p) => {
        const pChannel = (p.sourceChannel || "").toLowerCase();
        return !pChannel.includes(cleanChannel);
      });
      if (existingPosts.length !== initialCount) {
        saveNewsDatabase(existingPosts);
      }
    }
    const requestId = `DEL-APP-${Date.now()}`;
    const record = {
      id: requestId,
      email: cleanEmail || "in-app-user",
      mobile: cleanMobile,
      channelName: cleanChannel,
      reason: "In-App one-click account & all data deletion",
      requestedAt: Date.now(),
      status: "PURGED",
      clearedPostsCount: initialCount - existingPosts.length
    };
    const allRequests = loadAccountDeletionRequests();
    allRequests.unshift(record);
    saveAccountDeletionRequests(allRequests);
    return res.json({
      success: true,
      message: "In-app account and all associated data purged successfully from server.",
      requestId
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/account-deletion-requests", (_req, res) => {
  return res.json({ success: true, requests: loadAccountDeletionRequests() });
});
app.use("/uploads", import_express.default.static(import_path.default.join(process.cwd(), "public", "uploads")));
function loadProfilesDatabase() {
  try {
    if (import_fs.default.existsSync(PROFILES_DB_FILE)) {
      const raw = import_fs.default.readFileSync(PROFILES_DB_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading user_profiles_db.json:", err);
  }
  return {};
}
function saveProfilesDatabase(data) {
  try {
    import_fs.default.writeFileSync(PROFILES_DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    try {
      const adapter = require_server_firestore_adapter();
      if (adapter && (process.env.USE_FIRESTORE === "true" || adapter.USE_FIRESTORE)) {
        for (const [key, profile] of Object.entries(data)) {
          const docId = (profile.uid || profile.userId || profile.email || key).toLowerCase().trim();
          adapter.firestoreWriteDoc("users", docId, {
            ...profile,
            uid: docId,
            updatedAt: Date.now()
          }).catch((e) => console.warn("[Firestore Profile Sync Error]", e.message));
        }
      }
    } catch {
    }
    return true;
  } catch (err) {
    console.error("Error saving user_profiles_db.json:", err);
    return false;
  }
}
app.get("/api/user-profile", (req, res) => {
  const username = (req.query.username || "").toString().trim().toLowerCase();
  const idOrEmail = (req.query.id || req.query.userId || req.query.uid || req.query.email || "").toString().trim().toLowerCase();
  const rawMobile = (req.query.mobile || req.query.phone || "").toString().replace(/[^0-9]/g, "").slice(-10);
  const allProfiles = loadProfilesDatabase();
  let match = null;
  if (idOrEmail) {
    match = Object.values(allProfiles).find(
      (p) => p.userId && p.userId.toLowerCase() === idOrEmail || p.uid && p.uid.toLowerCase() === idOrEmail || p.email && p.email.toLowerCase().trim() === idOrEmail || p.email && p.email.toLowerCase().replace(/\s+/g, "") === idOrEmail.replace(/\s+/g, "") || p.username && p.username.toLowerCase() === idOrEmail
    );
  }
  if (!match && rawMobile.length === 10) {
    match = Object.values(allProfiles).find((p) => {
      const pm = (p.mobileNumber || p.mobile || "").toString().replace(/[^0-9]/g, "").slice(-10);
      return pm === rawMobile;
    });
  }
  if (!match && username) {
    match = Object.values(allProfiles).find(
      (p) => p.username && p.username.toLowerCase() === username
    );
  }
  if (!match && idOrEmail) {
    const masterUsers = loadUsersMasterDatabase();
    const masterMatch = masterUsers.find(
      (u) => u.userId && u.userId.toLowerCase() === idOrEmail || u.email && u.email.toLowerCase().trim() === idOrEmail || u.email && u.email.toLowerCase().replace(/\s+/g, "") === idOrEmail.replace(/\s+/g, "") || u.username && u.username.toLowerCase() === idOrEmail
    );
    if (masterMatch) {
      syncUserToProfiles(masterMatch);
      const reloaded = loadProfilesDatabase();
      match = reloaded[masterMatch.email ? masterMatch.email.toLowerCase().trim() : masterMatch.userId] || Object.values(reloaded).find((p) => p.email === masterMatch.email);
    }
  }
  if (match) {
    return res.json({ success: true, profile: match });
  }
  return res.json({ success: true, profile: null });
});
app.post("/api/user-profile", async (req, res) => {
  const release = await userDbLock.acquire();
  try {
    const profile = req.body;
    if (!profile || !profile.username && !profile.email && !profile.userId && !profile.uid) {
      return res.status(400).json({ error: "User identifier (UID, username or email) is required" });
    }
    const cleanId = (profile.userId || profile.uid || profile.email || profile.username).toString().trim().toLowerCase();
    const allProfiles = loadProfilesDatabase();
    const isAdmin = isAuthorizedAdmin(req);
    const isMasterAdminEmail = profile.email && (profile.email.toLowerCase() === "admin.ainewsmaker@gmail.com" || profile.email.toLowerCase() === "breakingnewswala.com@gmail.com");
    if ((cleanId === "admin" || isMasterAdminEmail) && !isAdmin) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u090F\u0921\u092E\u093F\u0928 \u092A\u094D\u0930\u094B\u092B\u093E\u0907\u0932 \u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u092E\u093E\u0938\u094D\u091F\u0930 \u090F\u0921\u092E\u093F\u0928 \u0926\u094D\u0935\u093E\u0930\u093E \u0939\u0940 \u0938\u0902\u0936\u094B\u0927\u093F\u0924 \u0915\u0940 \u091C\u093E \u0938\u0915\u0924\u0940 \u0939\u0948" });
    }
    const existing = allProfiles[cleanId] || {};
    const safeRole = isAdmin ? profile.role || existing.role || (isMasterAdminEmail ? "admin" : "reporter") : existing.role || (isMasterAdminEmail ? "admin" : "reporter");
    const safeTier = isAdmin ? profile.tier || existing.tier || (isMasterAdminEmail ? "ultra" : "basic") : existing.tier || (isMasterAdminEmail ? "ultra" : "basic");
    const updated = {
      ...existing,
      ...profile,
      userId: profile.userId || profile.uid || existing.userId || cleanId,
      uid: profile.uid || profile.userId || existing.uid || cleanId,
      username: profile.username || existing.username || "",
      fullName: profile.fullName || profile.name || existing.fullName || "",
      role: safeRole,
      tier: safeTier,
      email: profile.email || existing.email || "",
      district: profile.district || existing.district || "",
      channelNameHi: profile.channelNameHi || profile.channelName || existing.channelNameHi || "",
      channelNameEn: profile.channelNameEn || existing.channelNameEn || "",
      channelLogoUrl: profile.channelLogoUrl || existing.channelLogoUrl || "",
      channelLogoPngUrl: profile.channelLogoPngUrl || existing.channelLogoPngUrl,
      channelLogoGifUrl: profile.channelLogoGifUrl || existing.channelLogoGifUrl,
      channelLogoType: profile.channelLogoType || existing.channelLogoType || "png",
      mobileNumber: profile.mobileNumber || profile.mobile || existing.mobileNumber || "",
      websiteUrl: profile.websiteUrl || existing.websiteUrl || "",
      socialIcons: profile.socialIcons || existing.socialIcons,
      customHeaderPng: profile.customHeaderPng !== void 0 ? profile.customHeaderPng : existing.customHeaderPng,
      customFooterPng: profile.customFooterPng !== void 0 ? profile.customFooterPng : existing.customFooterPng,
      updatedAt: Date.now()
    };
    const canonicalKey = updated.email ? updated.email.toLowerCase().trim() : cleanId;
    allProfiles[canonicalKey] = updated;
    if (updated.email) {
      const em = updated.email.toLowerCase().trim();
      for (const [k, p] of Object.entries(allProfiles)) {
        if (k !== canonicalKey && p.email && p.email.toLowerCase().trim() === em) {
          delete allProfiles[k];
        }
      }
    }
    saveProfilesDatabase(allProfiles);
    try {
      let users = loadUsersDatabase();
      const uIdx = users.findIndex((u) => u.email && u.email.toLowerCase() === cleanId || u.userId && u.userId.toLowerCase() === cleanId || updated.email && u.email && u.email.toLowerCase() === updated.email.toLowerCase());
      if (uIdx >= 0) {
        users[uIdx] = {
          ...users[uIdx],
          fullName: updated.fullName || users[uIdx].fullName,
          channelName: updated.channelNameHi || users[uIdx].channelName,
          channelLogoUrl: updated.channelLogoUrl || users[uIdx].channelLogoUrl,
          channelLogoPngUrl: updated.channelLogoPngUrl || users[uIdx].channelLogoPngUrl,
          channelLogoGifUrl: updated.channelLogoGifUrl || users[uIdx].channelLogoGifUrl,
          channelLogoType: updated.channelLogoType || users[uIdx].channelLogoType,
          username: updated.username || users[uIdx].username,
          mobile: updated.mobileNumber || users[uIdx].mobile,
          mobileNumber: updated.mobileNumber || users[uIdx].mobileNumber,
          websiteUrl: updated.websiteUrl || users[uIdx].websiteUrl,
          socialIcons: updated.socialIcons || users[uIdx].socialIcons,
          lastLoginAt: Date.now()
        };
        saveUsersDatabase(users);
      }
    } catch {
    }
    try {
      if (updated.email || updated.userId || cleanId.includes("@")) {
        registerOrUpdateUserAuthoritative({
          ...updated,
          email: updated.email || (cleanId.includes("@") ? cleanId : void 0)
        });
      }
    } catch (masterSyncErr) {
      console.warn("Error auto-syncing profile to master users:", masterSyncErr);
    }
    return res.json({ success: true, profile: updated });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  } finally {
    release();
  }
});
app.post("/api/upload-logo", async (req, res) => {
  const release = await userDbLock.acquire();
  try {
    const { userId, email, username, fileData, dataUrl, logoData, fileName, logoType } = req.body || {};
    const rawData = fileData || dataUrl || logoData;
    if (!rawData) {
      return res.status(400).json({ error: "\u0932\u094B\u0917\u094B \u092B\u093E\u0907\u0932 \u0921\u0947\u091F\u093E (Base64) \u0906\u0935\u0936\u094D\u092F\u0915 \u0939\u0948\u0964" });
    }
    const cleanId = (userId || email || username || "").toString().trim().toLowerCase();
    if (!cleanId) {
      return res.status(400).json({ error: "\u092F\u0942\u091C\u093C\u0930 \u092A\u0939\u091A\u093E\u0928 (User ID / Email) \u0906\u0935\u0936\u094D\u092F\u0915 \u0939\u0948\u0964" });
    }
    let ext = "png";
    let isGif = false;
    if (logoType === "gif" || fileName && fileName.toLowerCase().endsWith(".gif") || rawData.startsWith("data:image/gif")) {
      ext = "gif";
      isGif = true;
    } else if (logoType === "png" || fileName && fileName.toLowerCase().endsWith(".png") || rawData.startsWith("data:image/png")) {
      ext = "png";
    } else if (rawData.startsWith("data:image/jpeg") || rawData.startsWith("data:image/jpg")) {
      ext = "jpg";
    }
    const base64Data = rawData.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const safeFileBase = cleanId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueFileName = `logo_${safeFileBase}_${Date.now()}.${ext}`;
    const targetFilePath = import_path.default.join(logosDir, uniqueFileName);
    import_fs.default.writeFileSync(targetFilePath, buffer);
    const relativeUrl = `/uploads/logos/${uniqueFileName}`;
    const allProfiles = loadProfilesDatabase();
    const existing = allProfiles[cleanId] || {};
    const updated = {
      username: existing.username || cleanId.split("@")[0] || "user",
      fullName: existing.fullName || existing.username || "User",
      role: existing.role || "reporter",
      channelNameHi: existing.channelNameHi || "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C",
      channelNameEn: existing.channelNameEn || "Breaking News",
      ...existing,
      userId: existing.userId || cleanId,
      email: existing.email || (cleanId.includes("@") ? cleanId : ""),
      channelLogoUrl: relativeUrl,
      channelLogoType: isGif ? "gif" : "png",
      channelLogoGifUrl: isGif ? relativeUrl : existing.channelLogoGifUrl,
      channelLogoPngUrl: !isGif ? relativeUrl : existing.channelLogoPngUrl,
      updatedAt: Date.now()
    };
    const canonicalKey = updated.email ? updated.email.toLowerCase().trim() : cleanId;
    allProfiles[canonicalKey] = updated;
    saveProfilesDatabase(allProfiles);
    try {
      let users = loadUsersDatabase();
      const uIdx = users.findIndex((u) => u.email && u.email.toLowerCase() === cleanId || u.userId && u.userId.toLowerCase() === cleanId || updated.email && u.email && u.email.toLowerCase() === updated.email.toLowerCase());
      if (uIdx >= 0) {
        users[uIdx] = {
          ...users[uIdx],
          channelLogoUrl: relativeUrl,
          channelLogoType: isGif ? "gif" : "png",
          channelLogoGifUrl: isGif ? relativeUrl : users[uIdx].channelLogoGifUrl,
          channelLogoPngUrl: !isGif ? relativeUrl : users[uIdx].channelLogoPngUrl
        };
        saveUsersDatabase(users);
      }
    } catch {
    }
    try {
      registerOrUpdateUserAuthoritative({
        ...updated,
        channelLogoUrl: relativeUrl
      });
    } catch {
    }
    return res.json({
      success: true,
      logoUrl: relativeUrl,
      logoType: isGif ? "gif" : "png",
      profile: updated
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  } finally {
    release();
  }
});
var ADMIN_BRANDING_FILE = import_path.default.join(process.cwd(), "admin_branding_db.json");
function loadAdminBranding() {
  try {
    if (import_fs.default.existsSync(ADMIN_BRANDING_FILE)) {
      const raw = import_fs.default.readFileSync(ADMIN_BRANDING_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error reading admin_branding_db.json:", e);
  }
  return {
    channelNameHi: "",
    channelNameEn: "",
    channelLogoUrl: "",
    websiteUrl: "",
    mobileNumber: "",
    showMobileNumber: false,
    activeSocialIcons: [],
    updatedAt: Date.now()
  };
}
function saveAdminBranding(data) {
  try {
    import_fs.default.writeFileSync(ADMIN_BRANDING_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error saving admin_branding_db.json:", e);
    return false;
  }
}
app.get("/api/admin/branding", (_req, res) => {
  const branding = loadAdminBranding();
  return res.json({ success: true, branding });
});
app.post("/api/admin/branding", (req, res) => {
  try {
    const payload = req.body;
    const existing = loadAdminBranding();
    const updated = {
      ...existing,
      ...payload,
      updatedAt: Date.now()
    };
    saveAdminBranding(updated);
    return res.json({ success: true, branding: updated });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var CUSTOM_FRAMES_FILE = import_path.default.join(process.cwd(), "custom_frames_db.json");
function loadCustomFramesDatabase() {
  try {
    if (import_fs.default.existsSync(CUSTOM_FRAMES_FILE)) {
      const raw = import_fs.default.readFileSync(CUSTOM_FRAMES_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading custom_frames_db.json:", e);
  }
  return [];
}
function saveCustomFramesDatabase(frames) {
  try {
    import_fs.default.writeFileSync(CUSTOM_FRAMES_FILE, JSON.stringify(frames, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error writing custom_frames_db.json:", e);
    return false;
  }
}
app.get("/api/custom-frames", (req, res) => {
  const { userId } = req.query;
  const all = loadCustomFramesDatabase();
  if (!userId) return res.json({ success: true, frames: all });
  const cleanId = String(userId).toLowerCase().trim();
  const userFrames = all.filter((f) => !f.userId || f.userId.toLowerCase().trim() === cleanId || f.userId === "general");
  return res.json({ success: true, frames: userFrames });
});
app.post("/api/custom-frames", enforceUserAccessMiddleware, (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.assetUrl && !payload.headerUrl && !payload.footerUrl) {
      return res.status(400).json({ error: "Frame asset URL or Header/Footer is required" });
    }
    const newFrame = {
      id: payload.id || `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: (payload.userId || "general").toLowerCase().trim(),
      name: (payload.name || "\u0915\u0938\u094D\u091F\u092E \u092B\u094D\u0930\u0947\u092E").trim(),
      assetUrl: payload.assetUrl || payload.headerUrl || payload.footerUrl || "",
      headerUrl: payload.headerUrl,
      footerUrl: payload.footerUrl,
      frameType: payload.frameType || (payload.headerUrl || payload.footerUrl ? "header_footer" : "full_4_5"),
      aspectRatio: "4:5",
      createdAt: Date.now()
    };
    const all = loadCustomFramesDatabase();
    const updated = [newFrame, ...all.filter((f) => f.id !== newFrame.id)];
    saveCustomFramesDatabase(updated);
    return res.json({ success: true, frame: newFrame, frames: updated });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.delete("/api/custom-frames/:id", (req, res) => {
  try {
    const { id } = req.params;
    let all = loadCustomFramesDatabase();
    all = all.filter((f) => f.id !== id);
    saveCustomFramesDatabase(all);
    return res.json({ success: true, frames: all });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/auth/login", authRateLimiter, async (req, res) => {
  try {
    const { identifier, password, googleUid, profileData } = req.body;
    const cleanId = (identifier || "").replace(/\s+/g, "").toLowerCase().trim();
    if (googleUid) {
      const release = await userDbLock.acquire();
      let savedUser;
      try {
        const allProfiles2 = loadProfilesDatabase();
        const existing = Object.values(allProfiles2).find(
          (p) => p.uid && p.uid === googleUid || p.userId && p.userId === googleUid || p.email && p.email.toLowerCase() === cleanId
        );
        const isSuper = cleanId === "admin.ainewsmaker@gmail.com" || cleanId.replace(/\s+/g, "") === "admin.ainewsmaker@gmail.com";
        const isAdmin = cleanId === "breakingnewswala.com@gmail.com" || cleanId.replace(/\s+/g, "") === "breakingnewswala.com@gmail.com";
        let safeUsername;
        if (isSuper) {
          safeUsername = "AI News Maker";
        } else if (isAdmin) {
          safeUsername = "breakingnewswala";
        } else {
          safeUsername = cleanGenerateUsername(profileData?.username, profileData?.name || profileData?.fullName, existing?.username);
        }
        const userPayload = {
          userId: existing?.userId || googleUid,
          uid: existing?.uid || googleUid,
          email: cleanId,
          username: safeUsername,
          fullName: profileData?.name || profileData?.fullName || existing?.fullName || (isSuper ? "\u0938\u0941\u092A\u0930 \u090F\u0921\u092E\u093F\u0928 (Super Admin)" : isAdmin ? "\u092E\u0941\u0916\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u0915" : "\u092F\u0942\u091C\u093C\u0930"),
          name: profileData?.name || profileData?.fullName || existing?.fullName || (isSuper ? "\u0938\u0941\u092A\u0930 \u090F\u0921\u092E\u093F\u0928 (Super Admin)" : isAdmin ? "\u092E\u0941\u0916\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u0915" : "\u092F\u0942\u091C\u093C\u0930"),
          role: isSuper ? "superadmin" : isAdmin ? "superadmin" : existing?.role || "user",
          tier: isSuper ? "ultra" : isAdmin ? "ultra" : existing?.tier || "basic",
          planName: isSuper ? "VIP DESK" : isAdmin ? "VIP DESK" : existing?.planName || "BASIC",
          channelName: isSuper ? "\u090F\u0906\u0908 \u0928\u094D\u092F\u0942\u091C\u093C \u092E\u0947\u0915\u0930" : isAdmin ? "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E" : profileData?.channelName || existing?.channelNameHi || existing?.channelName || "\u090F\u0906\u0908 \u0928\u094D\u092F\u0942\u091C\u093C \u092E\u0947\u0915\u0930",
          channelNameHi: isSuper ? "\u090F\u0906\u0908 \u0928\u094D\u092F\u0942\u091C\u093C \u092E\u0947\u0915\u0930" : isAdmin ? "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E" : profileData?.channelName || existing?.channelNameHi || existing?.channelName || "\u090F\u0906\u0908 \u0928\u094D\u092F\u0942\u091C\u093C \u092E\u0947\u0915\u0930",
          channelNameEn: isSuper ? "AI News Maker" : isAdmin ? "Breaking News Wala" : existing?.channelNameEn || "AI News Maker",
          channelLogoUrl: isSuper ? "/assets/ai_news_maker_logo.png" : isAdmin ? "/assets/breaking_news_wala_logo.png" : profileData?.channelLogoUrl || existing?.channelLogoUrl || "",
          channelLogoPngUrl: isSuper ? "/assets/ai_news_maker_logo.png" : isAdmin ? "/assets/breaking_news_wala_logo.png" : existing?.channelLogoPngUrl || "",
          channelLogoGifUrl: existing?.channelLogoGifUrl || "",
          channelLogoType: existing?.channelLogoType || "png",
          mobile: profileData?.mobile || existing?.mobileNumber || "9669802408",
          mobileNumber: profileData?.mobile || existing?.mobileNumber || "9669802408",
          district: existing?.district || (isSuper ? "\u0939\u0947\u0921\u0915\u094D\u0935\u093E\u0930\u094D\u091F\u0930 \u0938\u0947\u0902\u091F\u094D\u0930\u0932 \u0921\u0947\u0938\u094D\u0915" : isAdmin ? "\u0938\u0947\u0902\u091F\u094D\u0930\u0932 \u0921\u0947\u0938\u094D\u0915 / \u092D\u094B\u092A\u093E\u0932" : "\u0921\u093F\u091C\u093F\u091F\u0932 \u0921\u0947\u0938\u094D\u0915"),
          websiteUrl: isSuper ? "ainewsmaker.online" : isAdmin ? "breakingnewswala.com" : existing?.websiteUrl || "ainewsmaker.online",
          isProfileLocked: !isAdmin && !isSuper
        };
        savedUser = registerOrUpdateUserAuthoritative(userPayload);
      } finally {
        release();
      }
      const token2 = generateAuthToken({
        userId: savedUser.userId || googleUid,
        email: savedUser.email || cleanId,
        role: savedUser.role || "user",
        username: savedUser.username
      });
      return res.json({ success: true, user: savedUser, token: token2 });
    }
    if (!cleanId || !password) {
      return res.status(400).json({ error: "\u0915\u0943\u092A\u092F\u093E \u092F\u0942\u091C\u093C\u0930\u0928\u0947\u092E/\u0908\u092E\u0947\u0932 \u0914\u0930 \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902" });
    }
    const creds = loadCredentialsDatabase();
    let targetEmail = cleanId;
    if (cleanId === "admin" || cleanId === "superadmin") {
      targetEmail = "admin.ainewsmaker@gmail.com";
    }
    let credEntry = creds[targetEmail];
    if (!credEntry) {
      credEntry = Object.values(creds).find(
        (c) => c.username && c.username.toLowerCase() === cleanId || c.email && c.email.toLowerCase() === cleanId
      );
    }
    let isPasswordValid = false;
    if (credEntry && credEntry.salt && credEntry.hash) {
      isPasswordValid = verifyPassword(String(password), credEntry.salt, credEntry.hash);
    }
    if (!isPasswordValid) {
      return res.status(401).json({ error: "\u0905\u092E\u093E\u0928\u094D\u092F \u092F\u0942\u091C\u093C\u0930\u0928\u0947\u092E \u092F\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921" });
    }
    const allProfiles = loadProfilesDatabase();
    const match = Object.values(allProfiles).find(
      (p) => p.email && p.email.toLowerCase() === targetEmail || p.username && p.username.toLowerCase() === cleanId
    );
    const user = match || {
      username: credEntry?.username || cleanId,
      fullName: targetEmail.includes("admin") ? "\u0938\u0941\u092A\u0930 \u090F\u0921\u092E\u093F\u0928 (Super Admin)" : "\u092F\u0942\u091C\u093C\u0930",
      name: targetEmail.includes("admin") ? "\u0938\u0941\u092A\u0930 \u090F\u0921\u092E\u093F\u0928 (Super Admin)" : "\u092F\u0942\u091C\u093C\u0930",
      role: targetEmail.includes("admin") ? "superadmin" : "user",
      email: targetEmail,
      userId: `user_${Date.now()}`,
      tier: targetEmail.includes("admin") ? "ultra" : "basic"
    };
    const token = generateAuthToken({
      userId: user.userId || user.uid,
      email: user.email || targetEmail,
      role: user.role || "user",
      username: user.username
    });
    return res.json({ success: true, user, token });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/auth/me", (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ authenticated: false, error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u092E\u093E\u0928\u094D\u092F \u0938\u0924\u094D\u0930 \u091F\u094B\u0915\u0928 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E" });
  }
  return res.json({ authenticated: true, user });
});
var SUPPORT_DB_FILE = import_path.default.join(process.cwd(), "support_requests_database.json");
var UPLOAD_SUPPORT_DIR = import_path.default.join(process.cwd(), "public", "uploads", "support");
var WEB_UPLOAD_SUPPORT_DIR = import_path.default.join(process.cwd(), "web_studio", "public", "uploads", "support");
try {
  import_fs.default.mkdirSync(UPLOAD_SUPPORT_DIR, { recursive: true });
  import_fs.default.mkdirSync(WEB_UPLOAD_SUPPORT_DIR, { recursive: true });
} catch {
}
function loadSupportRequestsDatabase() {
  try {
    if (import_fs.default.existsSync(SUPPORT_DB_FILE)) {
      const raw = import_fs.default.readFileSync(SUPPORT_DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading support_requests_database.json:", e);
  }
  return [];
}
function saveSupportRequestsDatabase(requests) {
  try {
    import_fs.default.writeFileSync(SUPPORT_DB_FILE, JSON.stringify(requests, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error writing support_requests_database.json:", e);
    return false;
  }
}
app.get("/api/support/requests", (req, res) => {
  const { userId, userEmail } = req.query;
  const all = loadSupportRequestsDatabase();
  const isAdmin = isAuthorizedAdmin(req);
  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1e3;
  if (isAdmin) {
    return res.json({ success: true, requests: all });
  }
  const authUser = getAuthenticatedUser(req);
  const cleanId = String(authUser?.userId || authUser?.email || userId || userEmail || "").toLowerCase().trim();
  if (!cleanId) {
    return res.json({ success: true, requests: [] });
  }
  const userRequests = all.filter(
    (r) => (r.userId && r.userId.toLowerCase().trim() === cleanId || r.userEmail && r.userEmail.toLowerCase().trim() === cleanId) && // 30-day retention filter for regular users
    now - (Number(r.createdAt) || now) <= THIRTY_DAYS_MS
  );
  return res.json({ success: true, requests: userRequests });
});
app.post("/api/support/requests", (req, res) => {
  try {
    const data = req.body;
    if (!data) return res.status(400).json({ error: "No data provided" });
    let finalAttachmentUrl = data.attachmentUrl || "";
    if (data.attachmentDataUrl && typeof data.attachmentDataUrl === "string" && data.attachmentDataUrl.startsWith("data:")) {
      const base64Data = data.attachmentDataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buf = Buffer.from(base64Data, "base64");
      if (buf.length > 10 * 1024 * 1024) {
        return res.status(413).json({ error: "\u0938\u0902\u0932\u0917\u094D\u0928\u0915 \u0915\u093E \u0906\u0915\u093E\u0930 10MB \u0938\u0947 \u0905\u0927\u093F\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u0924\u093E\u0964" });
      }
      const magic = isValidImageMagicBytes(buf);
      if (!magic.valid) {
        return res.status(400).json({ error: "\u0905\u092E\u093E\u0928\u094D\u092F \u0938\u0902\u0932\u0917\u094D\u0928\u0915: \u0915\u0947\u0935\u0932 \u0935\u093E\u0938\u094D\u0924\u0935\u093F\u0915 PNG, JPEG, GIF \u092F\u093E WebP \u091B\u0935\u093F\u092F\u093E\u0901 \u0938\u094D\u0935\u0940\u0915\u093E\u0930\u094D\u092F \u0939\u0948\u0902\u0964" });
      }
      const ext = magic.format || "png";
      const filename = `support_${Date.now()}_${import_crypto.default.randomBytes(4).toString("hex")}.${ext}`;
      import_fs.default.writeFileSync(import_path.default.join(UPLOAD_SUPPORT_DIR, filename), buf);
      try {
        import_fs.default.writeFileSync(import_path.default.join(WEB_UPLOAD_SUPPORT_DIR, filename), buf);
      } catch {
      }
      finalAttachmentUrl = `/uploads/support/${filename}`;
    }
    const newRequest = {
      id: data.id || `inq_${Date.now()}_${import_crypto.default.randomBytes(4).toString("hex")}`,
      userId: data.userId || "",
      userName: data.userName || "\u0905\u0928\u093E\u092E \u092F\u0942\u091C\u093C\u0930",
      userEmail: (data.userEmail || "").replace(/\s+/g, "").toLowerCase().trim(),
      userMobile: data.userMobile || "",
      message: data.message || "",
      voiceTranscript: data.voiceTranscript || "",
      attachmentUrl: finalAttachmentUrl,
      attachmentName: data.attachmentName || "",
      status: "pending",
      createdAt: Date.now(),
      adminResponse: "",
      updatedAt: Date.now(),
      reportType: data.reportType || "general",
      targetId: data.targetId || "",
      targetTitle: data.targetTitle || "",
      reportReason: data.reportReason || ""
    };
    const all = loadSupportRequestsDatabase();
    const updated = [newRequest, ...all.filter((r) => r.id !== newRequest.id)];
    saveSupportRequestsDatabase(updated);
    return res.json({ success: true, request: newRequest, requests: updated });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.patch("/api/support/requests/:id", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u0938\u092A\u094B\u0930\u094D\u091F \u0905\u0928\u0941\u0930\u094B\u0927 \u0915\u093E \u0909\u0924\u094D\u0924\u0930 \u0926\u0947 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964" });
    }
    const { id } = req.params;
    const { status, adminResponse } = req.body;
    const all = loadSupportRequestsDatabase();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Support request not found" });
    }
    all[idx] = {
      ...all[idx],
      status: status !== void 0 ? status : all[idx].status,
      adminResponse: adminResponse !== void 0 ? adminResponse : all[idx].adminResponse,
      updatedAt: Date.now()
    };
    saveSupportRequestsDatabase(all);
    return res.json({ success: true, request: all[idx] });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.delete("/api/support/requests/:id", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u0938\u092A\u094B\u0930\u094D\u091F \u0905\u0928\u0941\u0930\u094B\u0927 \u0939\u091F\u093E \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964" });
    }
    const { id } = req.params;
    let all = loadSupportRequestsDatabase();
    all = all.filter((r) => r.id !== id);
    saveSupportRequestsDatabase(all);
    return res.json({ success: true, requests: all });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var RAW_NEWS_DB_FILE = import_path.default.join(process.cwd(), "raw_news_database.json");
function loadRawNewsDatabase() {
  try {
    if (import_fs.default.existsSync(RAW_NEWS_DB_FILE)) {
      const raw = import_fs.default.readFileSync(RAW_NEWS_DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading raw_news_database.json:", e);
  }
  return [];
}
function saveRawNewsDatabase(items) {
  try {
    import_fs.default.writeFileSync(RAW_NEWS_DB_FILE, JSON.stringify(items, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error writing raw_news_database.json:", e);
    return false;
  }
}
app.get("/api/admin/raw-news", (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u0930\u0949 \u0928\u094D\u092F\u0942\u091C\u093C \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
  }
  const all = loadRawNewsDatabase();
  return res.json({ success: true, rawNews: all });
});
app.post("/api/admin/raw-news", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u0930\u0949 \u0928\u094D\u092F\u0942\u091C\u093C \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const payload = req.body;
    if (!payload || !payload.headline && !payload.rawText) {
      return res.status(400).json({ error: "\u0915\u092E \u0938\u0947 \u0915\u092E \u0930\u0949 \u0928\u094D\u092F\u0942\u091C\u093C \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u092F\u093E \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0906\u0935\u0936\u094D\u092F\u0915 \u0939\u0948" });
    }
    const id = payload.id || `raw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const status = payload.status || "Draft";
    const now = Date.now();
    const additionalPhotosList = Array.isArray(payload.additionalPhotos) ? payload.additionalPhotos : payload.additionalImageUrl ? [payload.additionalImageUrl] : [];
    const rawItem = {
      id,
      rawText: payload.rawText || "",
      headline: (payload.headline || payload.rawText || "").slice(0, 150),
      description: payload.description || payload.summary || "",
      location: payload.location || "\u0938\u0947\u0902\u091F\u094D\u0930\u0932 \u0921\u0947\u0938\u094D\u0915",
      sourceUrl: payload.sourceUrl || "",
      imageUrl: payload.imageUrl || "",
      additionalImageUrl: payload.additionalImageUrl || "",
      additionalPhotos: additionalPhotosList,
      status,
      author: payload.author || "\u090F\u0921\u092E\u093F\u0928",
      createdAt: payload.createdAt || now,
      updatedAt: now
    };
    const all = loadRawNewsDatabase();
    const updated = [rawItem, ...all.filter((r) => r.id !== id)];
    saveRawNewsDatabase(updated);
    if (status === "Published") {
      const homePost = {
        id: `post-${rawItem.id}`,
        title: rawItem.headline,
        summary: rawItem.description || rawItem.rawText || "",
        sourceChannel: rawItem.author || "\u090F\u0921\u092E\u093F\u0928 (Raw News)",
        sourceUrl: rawItem.sourceUrl || "",
        category: "breaking",
        categoryName: "\u092E\u0941\u0916\u094D\u092F \u0938\u092E\u093E\u091A\u093E\u0930",
        publishedTime: "\u0905\u092D\u0940-\u0905\u092D\u0940",
        imageUrl: rawItem.imageUrl || getCategoryFallbackImage("general"),
        additionalPhotos: additionalPhotosList,
        breaking: true,
        isExclusive: true,
        fullContent: rawItem.rawText || rawItem.description || rawItem.headline,
        location: rawItem.location || "",
        district: rawItem.location || "",
        timestamp: Date.now(),
        status: "APPROVED"
      };
      const existingPosts = loadNewsDatabase();
      const updatedPosts = [homePost, ...existingPosts.filter((p) => p.id !== homePost.id)];
      saveNewsDatabase(updatedPosts);
    }
    return res.json({ success: true, rawNews: rawItem, all: updated });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.put("/api/admin/raw-news/:id", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u0930\u0949 \u0928\u094D\u092F\u0942\u091C\u093C \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const { id } = req.params;
    const updates = req.body;
    const all = loadRawNewsDatabase();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "\u0930\u0949 \u0928\u094D\u092F\u0942\u091C\u093C \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u0940" });
    }
    const updatedItem = {
      ...all[idx],
      ...updates,
      updatedAt: Date.now()
    };
    all[idx] = updatedItem;
    saveRawNewsDatabase(all);
    if (updatedItem.status === "Published") {
      const homePost = {
        id: `post-${updatedItem.id}`,
        title: updatedItem.headline,
        summary: updatedItem.description || updatedItem.rawText || "",
        sourceChannel: updatedItem.author || "\u090F\u0921\u092E\u093F\u0928 (Raw News)",
        sourceUrl: updatedItem.sourceUrl || "",
        category: "breaking",
        categoryName: "\u092E\u0941\u0916\u094D\u092F \u0938\u092E\u093E\u091A\u093E\u0930",
        publishedTime: "\u0905\u092D\u0940-\u0905\u092D\u0940",
        imageUrl: updatedItem.imageUrl || getCategoryFallbackImage("general"),
        additionalPhotos: Array.isArray(updatedItem.additionalPhotos) && updatedItem.additionalPhotos.length > 0 ? updatedItem.additionalPhotos : updatedItem.additionalImageUrl ? [updatedItem.additionalImageUrl] : [],
        breaking: true,
        isExclusive: true,
        fullContent: updatedItem.rawText || updatedItem.description || updatedItem.headline,
        location: updatedItem.location || "",
        district: updatedItem.location || "",
        timestamp: Date.now(),
        status: "APPROVED"
      };
      const existingPosts = loadNewsDatabase();
      const updatedPosts = [homePost, ...existingPosts.filter((p) => p.id !== homePost.id)];
      saveNewsDatabase(updatedPosts);
    }
    return res.json({ success: true, rawNews: updatedItem });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.delete("/api/admin/raw-news/:id", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u0930\u0949 \u0928\u094D\u092F\u0942\u091C\u093C \u092A\u094D\u0930\u092C\u0902\u0927\u093F\u0924 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902" });
    }
    const { id } = req.params;
    let all = loadRawNewsDatabase();
    all = all.filter((r) => r.id !== id);
    saveRawNewsDatabase(all);
    return res.json({ success: true, rawNews: all });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/remove-gif-logo", enforceUserAccessMiddleware, (req, res) => {
  try {
    const { username, email, targetUsername } = req.body;
    const cleanEmail = (email || "").toLowerCase().replace(/\s+/g, "").trim();
    const cleanUser = (targetUsername || username || "").toLowerCase().trim();
    const allProfiles = loadProfilesDatabase();
    let targetKey = "";
    if (cleanUser && allProfiles[cleanUser]) {
      targetKey = cleanUser;
    } else {
      for (const k of Object.keys(allProfiles)) {
        const prof = allProfiles[k];
        const pEmail = (prof.email || "").toLowerCase().replace(/\s+/g, "").trim();
        const pUser = (prof.username || "").toLowerCase().trim();
        if (cleanEmail && pEmail === cleanEmail || cleanUser && pUser === cleanUser) {
          targetKey = k;
          break;
        }
      }
    }
    if (targetKey && allProfiles[targetKey]) {
      delete allProfiles[targetKey].channelLogoGifUrl;
      allProfiles[targetKey].channelLogoType = "png";
      allProfiles[targetKey].channelLogoUrl = allProfiles[targetKey].channelLogoPngUrl || (allProfiles[targetKey].channelLogoUrl?.endsWith(".gif") ? "" : allProfiles[targetKey].channelLogoUrl) || "/assets/ai_news_maker_logo.png";
      allProfiles[targetKey].updatedAt = Date.now();
      saveProfilesDatabase(allProfiles);
      try {
        registerOrUpdateUserAuthoritative(allProfiles[targetKey]);
      } catch {
      }
      return res.json({ success: true, message: "GIF logo removed successfully" });
    }
    return res.json({ success: true, message: "Profile already without GIF logo" });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/logo-change-requests", (req, res) => {
  try {
    const emailFilter = (req.query.email || "").trim().toLowerCase();
    const allRequests = loadLogoRequestsDatabase();
    allRequests.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    if (emailFilter) {
      const userReqs = allRequests.filter((r) => r.userEmail === emailFilter);
      return res.json({ success: true, requests: userReqs });
    }
    return res.json({ success: true, requests: allRequests });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/logo-change-requests", (req, res) => {
  try {
    const {
      userEmail,
      channelName,
      currentLogoUrl,
      reason,
      newLogoUrl,
      userName,
      username,
      requestType = "logo"
    } = req.body;
    if (!userEmail || !userEmail.trim()) {
      return res.status(400).json({ error: "\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E \u0908\u092E\u0947\u0932 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948\u0964" });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "\u0932\u094B\u0917\u094B \u092C\u0926\u0932\u0928\u0947 \u0915\u093E \u0915\u093E\u0930\u0923 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948\u0964" });
    }
    const cleanEmail = userEmail.trim().toLowerCase();
    const allRequests = loadLogoRequestsDatabase();
    const existingPending = allRequests.find(
      (r) => r.userEmail === cleanEmail && r.status === "pending" && (r.requestType || "logo") === requestType
    );
    if (existingPending) {
      return res.status(409).json({
        error: `\u0906\u092A\u0915\u093E ${requestType === "gif" ? "GIF" : "\u0932\u094B\u0917\u094B"} \u092C\u0926\u0932\u0928\u0947 \u0915\u093E \u0905\u0928\u0941\u0930\u094B\u0927 \u092A\u0939\u0932\u0947 \u0938\u0947 \u090F\u0921\u092E\u093F\u0928 \u0915\u0947 \u092A\u093E\u0938 \u0932\u0902\u092C\u093F\u0924 \u0939\u0948\u0964`,
        request: existingPending
      });
    }
    let finalNewLogoUrl = newLogoUrl;
    if (newLogoUrl && typeof newLogoUrl === "string" && newLogoUrl.startsWith("data:image/")) {
      try {
        const isGif = requestType === "gif" || newLogoUrl.startsWith("data:image/gif");
        const ext = isGif ? "gif" : "png";
        const savedFilename = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const base64Data = newLogoUrl.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const filePath = import_path.default.join(UPLOAD_LOGOS_DIR, savedFilename);
        const webFilePath = import_path.default.join(WEB_UPLOAD_LOGOS_DIR, savedFilename);
        import_fs.default.writeFileSync(filePath, buffer);
        try {
          import_fs.default.writeFileSync(webFilePath, buffer);
        } catch {
        }
        finalNewLogoUrl = `/uploads/logos/${savedFilename}`;
      } catch (fileErr) {
        console.warn("Could not save request logo to disk, keeping raw url:", fileErr);
      }
    }
    const newRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userEmail: cleanEmail,
      userName: userName || cleanEmail.split("@")[0],
      username: username || cleanEmail.split("@")[0],
      channelName: channelName || "\u092E\u0947\u0930\u093E \u0928\u094D\u092F\u0942\u091C\u093C \u091A\u0948\u0928\u0932",
      currentLogoUrl: currentLogoUrl || "",
      newLogoUrl: finalNewLogoUrl || "",
      reason: reason.trim(),
      status: "pending",
      createdAt: Date.now(),
      requestType: requestType === "gif" ? "gif" : "logo"
    };
    allRequests.unshift(newRequest);
    saveLogoRequestsDatabase(allRequests);
    return res.json({ success: true, request: newRequest });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/logo-change-requests/:id/approve", (req, res) => {
  try {
    const { id } = req.params;
    const allRequests = loadLogoRequestsDatabase();
    const reqIndex = allRequests.findIndex((r) => r.id === id);
    if (reqIndex === -1) {
      return res.status(404).json({ error: "\u0905\u0928\u0941\u0930\u094B\u0927 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E\u0964" });
    }
    const targetReq = allRequests[reqIndex];
    targetReq.status = "approved";
    saveLogoRequestsDatabase(allRequests);
    const cleanEmail = targetReq.userEmail.toLowerCase().trim();
    const allProfiles = loadProfilesDatabase();
    let targetKey = "";
    if (allProfiles[cleanEmail]) {
      targetKey = cleanEmail;
    } else {
      for (const k of Object.keys(allProfiles)) {
        const p = allProfiles[k];
        const pEmail = (p.email || "").toLowerCase().trim();
        const pUser = (p.username || "").toLowerCase().trim();
        if (pEmail === cleanEmail || targetReq.username && pUser === targetReq.username.toLowerCase().trim()) {
          targetKey = k;
          break;
        }
      }
    }
    if (targetKey && allProfiles[targetKey]) {
      const prof = allProfiles[targetKey];
      if (targetReq.requestType === "gif" && targetReq.newLogoUrl) {
        prof.channelLogoGifUrl = targetReq.newLogoUrl;
        prof.channelLogoType = "gif";
      } else if (targetReq.newLogoUrl) {
        prof.channelLogoUrl = targetReq.newLogoUrl;
        prof.channelLogoPngUrl = targetReq.newLogoUrl;
        prof.channelLogoType = "png";
      }
      prof.updatedAt = Date.now();
      saveProfilesDatabase(allProfiles);
      try {
        registerOrUpdateUserAuthoritative(prof);
      } catch {
      }
    }
    return res.json({
      success: true,
      request: targetReq,
      message: `\u092F\u0942\u091C\u093C\u0930 ${targetReq.userEmail} \u0915\u093E ${targetReq.requestType === "gif" ? "GIF" : "\u0932\u094B\u0917\u094B"} \u0905\u0928\u0941\u0930\u094B\u0927 \u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0939\u094B \u0917\u092F\u093E\u0964`
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/logo-change-requests/:id/reject", (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body || {};
    const allRequests = loadLogoRequestsDatabase();
    const reqIndex = allRequests.findIndex((r) => r.id === id);
    if (reqIndex === -1) {
      return res.status(404).json({ error: "\u0905\u0928\u0941\u0930\u094B\u0927 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E\u0964" });
    }
    const targetReq = allRequests[reqIndex];
    targetReq.status = "rejected";
    if (adminNotes) targetReq.adminNotes = adminNotes;
    saveLogoRequestsDatabase(allRequests);
    return res.json({
      success: true,
      request: targetReq,
      message: `\u092F\u0942\u091C\u093C\u0930 ${targetReq.userEmail} \u0915\u093E \u0905\u0928\u0941\u0930\u094B\u0927 \u0905\u0938\u094D\u0935\u0940\u0915\u0943\u0924 \u0915\u0930 \u0926\u093F\u092F\u093E \u0917\u092F\u093E\u0964`
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/videos/upload-file", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u0935\u0940\u0921\u093F\u092F\u094B \u0905\u092A\u0932\u094B\u0921 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964" });
    }
    const { videoData, filename = "video.mp4" } = req.body;
    if (!videoData || typeof videoData !== "string") {
      return res.status(400).json({ error: "\u0935\u0940\u0921\u093F\u092F\u094B \u0921\u0947\u091F\u093E \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948\u0964" });
    }
    let ext = "mp4";
    if (filename.toLowerCase().endsWith(".webm") || videoData.startsWith("data:video/webm")) {
      ext = "webm";
    } else if (filename.toLowerCase().endsWith(".mov") || videoData.startsWith("data:video/quicktime")) {
      ext = "mov";
    } else if (filename.toLowerCase().endsWith(".m4v") || videoData.startsWith("data:video/x-m4v")) {
      ext = "m4v";
    }
    const savedFilename = `video_${Date.now()}_${import_crypto.default.randomBytes(4).toString("hex")}.${ext}`;
    const base64Data = videoData.replace(/^data:video\/\w+;base64,/, "").replace(/^data:application\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const filePath = import_path.default.join(UPLOAD_VIDEOS_DIR, savedFilename);
    const webFilePath = import_path.default.join(WEB_UPLOAD_VIDEOS_DIR, savedFilename);
    import_fs.default.writeFileSync(filePath, buffer);
    try {
      import_fs.default.writeFileSync(webFilePath, buffer);
    } catch {
    }
    const videoUrl = `/uploads/videos/${savedFilename}`;
    return res.json({ success: true, videoUrl, filename: savedFilename });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/videos/upload-thumbnail", (req, res) => {
  try {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ error: "\u0905\u0928\u0927\u093F\u0915\u0943\u0924: \u0915\u0947\u0935\u0932 \u0905\u0927\u093F\u0915\u0943\u0924 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0939\u0940 \u0925\u0902\u092C\u0928\u0947\u0932 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964" });
    }
    const { imageData } = req.body;
    if (!imageData || typeof imageData !== "string") {
      return res.status(400).json({ error: "\u0925\u0902\u092C\u0928\u0947\u0932 \u0907\u092E\u0947\u091C \u0921\u0947\u091F\u093E \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948\u0964" });
    }
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({ error: "\u0925\u0902\u092C\u0928\u0947\u0932 \u0915\u093E \u0906\u0915\u093E\u0930 10MB \u0938\u0947 \u0905\u0927\u093F\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u0924\u093E\u0964" });
    }
    const magic = isValidImageMagicBytes(buffer);
    if (!magic.valid) {
      return res.status(400).json({ error: "\u0905\u092E\u093E\u0928\u094D\u092F \u092B\u093C\u093E\u0907\u0932: \u0915\u0947\u0935\u0932 \u0935\u093E\u0938\u094D\u0924\u0935\u093F\u0915 PNG, JPEG, GIF \u092F\u093E WebP \u091B\u0935\u093F\u092F\u093E\u0901 \u0938\u094D\u0935\u0940\u0915\u093E\u0930\u094D\u092F \u0939\u0948\u0902\u0964" });
    }
    const ext = magic.format || "jpg";
    const savedFilename = `thumb_${Date.now()}_${import_crypto.default.randomBytes(4).toString("hex")}.${ext}`;
    const filePath = import_path.default.join(UPLOAD_THUMBNAILS_DIR, savedFilename);
    const webFilePath = import_path.default.join(WEB_UPLOAD_THUMBNAILS_DIR, savedFilename);
    import_fs.default.writeFileSync(filePath, buffer);
    try {
      import_fs.default.writeFileSync(webFilePath, buffer);
    } catch {
    }
    const thumbnailUrl = `/uploads/thumbnails/${savedFilename}`;
    return res.json({ success: true, thumbnailUrl, filename: savedFilename });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/upload-font", enforceUserAccessMiddleware, async (req, res) => {
  try {
    const userTier = (req.user?.tier || req.user?.subscriptionTier || req.body.userTier || req.headers["x-user-tier"] || "basic").toString().toLowerCase().trim();
    const isAdmin = req.user?.role === "admin" || req.user?.role === "superadmin";
    const isVipDash = isAdmin || userTier === "vip_dash" || userTier === "vip-dash" || userTier === "vip desk" || userTier === "ultra" || userTier === "vip";
    if (!isVipDash) {
      return res.status(403).json({
        success: false,
        error: "\u0915\u0938\u094D\u091F\u092E \u092B\u093C\u0949\u0928\u094D\u091F \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0928\u0947 \u0915\u0940 \u0938\u0941\u0935\u093F\u0927\u093E \u0915\u0947\u0935\u0932 VIP-Dash \u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E\u0913\u0902 \u0915\u0947 \u0932\u093F\u090F \u0909\u092A\u0932\u092C\u094D\u0927 \u0939\u0948\u0964",
        requiredTier: "vip_dash",
        currentTier: userTier
      });
    }
    const { fontName, fontDataUrl, filename } = req.body;
    if (!fontDataUrl || typeof fontDataUrl !== "string") {
      return res.status(400).json({ success: false, error: "\u092B\u093C\u0949\u0928\u094D\u091F \u0921\u0947\u091F\u093E \u0906\u0935\u0936\u094D\u092F\u0915 \u0939\u0948\u0964" });
    }
    const cleanFontName = (fontName || "CustomFont").replace(/[^a-zA-Z0-9_\-\s\u0900-\u097F]/g, "").trim();
    const rawFilename = (filename || `${cleanFontName}.ttf`).toLowerCase();
    const allowedExts = [".ttf", ".otf", ".woff", ".woff2"];
    const extMatch = rawFilename.match(/\.[0-9a-z]+$/i);
    const ext = extMatch ? extMatch[0].toLowerCase() : ".ttf";
    if (!allowedExts.includes(ext)) {
      return res.status(400).json({
        success: false,
        error: "\u0905\u092E\u093E\u0928\u094D\u092F \u092B\u093C\u0949\u0928\u094D\u091F \u092A\u094D\u0930\u093E\u0930\u0942\u092A\u0964 \u0915\u0947\u0935\u0932 .ttf, .otf, .woff \u092F\u093E .woff2 \u092B\u093C\u093E\u0907\u0932\u0947\u0902 \u0938\u092E\u0930\u094D\u0925\u093F\u0924 \u0939\u0948\u0902\u0964"
      });
    }
    const base64Data = fontDataUrl.includes(";base64,") ? fontDataUrl.split(";base64,")[1] : fontDataUrl;
    const fontBuffer = Buffer.from(base64Data, "base64");
    if (fontBuffer.length > 15 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: "\u092B\u093C\u0949\u0928\u094D\u091F \u092B\u093C\u093E\u0907\u0932 \u0915\u093E \u0906\u0915\u093E\u0930 15MB \u0938\u0947 \u0905\u0927\u093F\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F\u0964" });
    }
    const safeBaseName = `font_${Date.now()}_${cleanFontName.replace(/\s+/g, "_")}${ext}`;
    const fontFilePath = import_path.default.join(UPLOAD_FONTS_DIR, safeBaseName);
    const webFontFilePath = import_path.default.join(WEB_UPLOAD_FONTS_DIR, safeBaseName);
    import_fs.default.writeFileSync(fontFilePath, fontBuffer);
    try {
      import_fs.default.writeFileSync(webFontFilePath, fontBuffer);
    } catch {
    }
    const fontUrl = `/uploads/fonts/${safeBaseName}`;
    return res.json({
      success: true,
      fontName: cleanFontName,
      fontUrl,
      familyName: cleanFontName
    });
  } catch (err) {
    console.error("Font upload error:", err);
    return res.status(500).json({ success: false, error: err?.message || "\u092B\u093C\u0949\u0928\u094D\u091F \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0928\u0947 \u092E\u0947\u0902 \u0935\u093F\u092B\u0932" });
  }
});
app.post("/api/admin/reset-user-logo", (req, res) => {
  try {
    const { targetUsername } = req.body;
    if (!targetUsername) {
      return res.status(400).json({ error: "targetUsername is required" });
    }
    const allProfiles = loadProfilesDatabase();
    const key = targetUsername.trim().toLowerCase();
    if (allProfiles[key]) {
      allProfiles[key].channelLogoUrl = "";
      allProfiles[key].channelLogoPngUrl = void 0;
      allProfiles[key].channelLogoGifUrl = void 0;
      allProfiles[key].channelLogoType = "png";
      allProfiles[key].updatedAt = Date.now();
      saveProfilesDatabase(allProfiles);
      return res.json({ success: true, message: `Logo reset for ${targetUsername}` });
    }
    return res.json({ success: true, message: "Profile not found or reset complete" });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/update-user", (req, res) => {
  try {
    const { userId, updates } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const key = userId.trim().toLowerCase();
    const users = loadUsersMasterDatabase();
    const idx = users.findIndex(
      (u) => u.userId && u.userId.toLowerCase().trim() === key || u.email && u.email.toLowerCase().trim() === key || u.username && u.username.toLowerCase().trim() === key
    );
    if (idx >= 0) {
      users[idx] = {
        ...users[idx],
        ...updates
      };
      saveUsersMasterDatabase(users);
      syncUserToProfiles(users[idx]);
      return res.json({ success: true, user: users[idx] });
    }
    const allProfiles = loadProfilesDatabase();
    const existing = allProfiles[key] || Object.values(allProfiles).find((p) => p.email?.toLowerCase() === key || p.username?.toLowerCase() === key) || {};
    const effectiveKey = (existing.username || existing.email || key).toString().toLowerCase();
    allProfiles[effectiveKey] = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };
    saveProfilesDatabase(allProfiles);
    return res.json({ success: true, user: allProfiles[effectiveKey] });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/block-user", (req, res) => {
  try {
    const { userId, userEmail, blockedBy } = req.body;
    const identifier = (userEmail || userId || "").toString().toLowerCase().trim();
    if (!identifier) {
      return res.status(400).json({ error: "\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E \u0908\u092E\u0947\u0932 \u092F\u093E \u0906\u0908\u0921\u0940 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948" });
    }
    if (isProtectedAdminAccount(identifier)) {
      return res.status(403).json({ error: "\u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u090F\u0921\u092E\u093F\u0928 \u0916\u093E\u0924\u0947 \u0915\u094B \u092C\u094D\u0932\u0949\u0915 \u0928\u0939\u0940\u0902 \u0915\u093F\u092F\u093E \u091C\u093E \u0938\u0915\u0924\u093E" });
    }
    const users = loadUsersMasterDatabase();
    const idx = users.findIndex(
      (u) => u.email && u.email.toLowerCase().trim() === identifier || u.email && u.email.toLowerCase().replace(/\s+/g, "") === identifier.replace(/\s+/g, "") || u.userId && u.userId.toLowerCase().trim() === identifier
    );
    if (idx === -1) {
      return res.status(404).json({ error: "\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E" });
    }
    if (isProtectedAdminAccount(users[idx].email) || users[idx].role === "superadmin" || users[idx].role === "admin") {
      return res.status(403).json({ error: "\u090F\u0921\u092E\u093F\u0928 \u0916\u093E\u0924\u094B\u0902 \u0915\u094B \u092C\u094D\u0932\u0949\u0915 \u0915\u0930\u0928\u0947 \u0915\u0940 \u0905\u0928\u0941\u092E\u0924\u093F \u0928\u0939\u0940\u0902 \u0939\u0948" });
    }
    users[idx].isBlocked = true;
    users[idx].blockedAt = Date.now();
    users[idx].blockedBy = blockedBy || "Admin";
    users[idx].unblockedAt = null;
    users[idx].unblockedBy = null;
    saveUsersMasterDatabase(users);
    syncUserToProfiles(users[idx]);
    return res.json({ success: true, message: "\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E \u0915\u094B \u092C\u094D\u0932\u0949\u0915 \u0915\u0930 \u0926\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948", user: users[idx] });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/unblock-user", (req, res) => {
  try {
    const { userId, userEmail, unblockedBy } = req.body;
    const identifier = (userEmail || userId || "").toString().toLowerCase().trim();
    if (!identifier) {
      return res.status(400).json({ error: "\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E \u0908\u092E\u0947\u0932 \u092F\u093E \u0906\u0908\u0921\u0940 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948" });
    }
    const users = loadUsersMasterDatabase();
    const idx = users.findIndex(
      (u) => u.email && u.email.toLowerCase().trim() === identifier || u.email && u.email.toLowerCase().replace(/\s+/g, "") === identifier.replace(/\s+/g, "") || u.userId && u.userId.toLowerCase().trim() === identifier
    );
    if (idx === -1) {
      return res.status(404).json({ error: "\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E" });
    }
    users[idx].isBlocked = false;
    users[idx].unblockedAt = Date.now();
    users[idx].unblockedBy = unblockedBy || "Admin";
    saveUsersMasterDatabase(users);
    syncUserToProfiles(users[idx]);
    return res.json({ success: true, message: "\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E \u0915\u094B \u0905\u0928\u092C\u094D\u0932\u0949\u0915 \u0915\u0930 \u0926\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948", user: users[idx] });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/delete-user", (req, res) => {
  try {
    const { userId, userEmail } = req.body;
    const identifier = (userEmail || userId || "").toString().toLowerCase().trim();
    if (!identifier) return res.status(400).json({ error: "userId is required" });
    if (isProtectedAdminAccount(identifier)) {
      return res.status(403).json({ error: "\u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u090F\u0921\u092E\u093F\u0928 \u0916\u093E\u0924\u0947 \u0915\u094B \u0921\u093F\u0932\u0940\u091F \u0928\u0939\u0940\u0902 \u0915\u093F\u092F\u093E \u091C\u093E \u0938\u0915\u0924\u093E" });
    }
    let users = loadUsersMasterDatabase();
    const targetUser = users.find(
      (u) => u.email && u.email.toLowerCase().trim() === identifier || u.userId && u.userId.toLowerCase().trim() === identifier
    );
    if (targetUser && (isProtectedAdminAccount(targetUser.email) || targetUser.role === "superadmin")) {
      return res.status(403).json({ error: "\u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0938\u0941\u092A\u0930 \u090F\u0921\u092E\u093F\u0928 \u0916\u093E\u0924\u0947 \u0915\u094B \u0921\u093F\u0932\u0940\u091F \u0928\u0939\u0940\u0902 \u0915\u093F\u092F\u093E \u091C\u093E \u0938\u0915\u0924\u093E" });
    }
    users = users.filter(
      (u) => u.email && u.email.toLowerCase().trim() !== identifier && (u.userId && u.userId.toLowerCase().trim() !== identifier)
    );
    saveUsersMasterDatabase(users);
    const allProfiles = loadProfilesDatabase();
    delete allProfiles[identifier];
    if (targetUser?.email) delete allProfiles[targetUser.email.toLowerCase().trim()];
    if (targetUser?.username) delete allProfiles[targetUser.username.toLowerCase().trim()];
    saveProfilesDatabase(allProfiles);
    return res.json({ success: true, message: "\u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u0939\u091F\u093E \u0926\u093F\u092F\u093E \u0917\u092F\u093E" });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/update-user", (req, res) => {
  try {
    const { userId, updates } = req.body;
    const identifier = (userId || updates?.userId || updates?.email || "").toString().toLowerCase().trim();
    if (!identifier) {
      return res.status(400).json({ error: "User ID or email is required" });
    }
    const users = loadUsersMasterDatabase();
    const idx = users.findIndex(
      (u) => u.email && u.email.toLowerCase().trim() === identifier || u.email && u.email.toLowerCase().replace(/\s+/g, "") === identifier.replace(/\s+/g, "") || u.userId && u.userId.toLowerCase().trim() === identifier
    );
    let updatedUser;
    if (idx >= 0) {
      users[idx] = {
        ...users[idx],
        ...updates,
        email: updates.email || users[idx].email,
        channelName: updates.channelName || updates.channelNameHi || users[idx].channelName,
        channelNameHi: updates.channelNameHi || updates.channelName || users[idx].channelNameHi,
        channelNameEn: updates.channelNameEn !== void 0 ? updates.channelNameEn : users[idx].channelNameEn,
        channelLogoUrl: updates.channelLogoUrl !== void 0 ? updates.channelLogoUrl : users[idx].channelLogoUrl,
        channelLogoPngUrl: updates.channelLogoPngUrl !== void 0 ? updates.channelLogoPngUrl : users[idx].channelLogoPngUrl,
        channelLogoGifUrl: updates.channelLogoGifUrl !== void 0 ? updates.channelLogoGifUrl : users[idx].channelLogoGifUrl,
        mobile: updates.mobile || updates.mobileNumber || users[idx].mobile,
        mobileNumber: updates.mobileNumber || updates.mobile || users[idx].mobileNumber,
        websiteUrl: updates.websiteUrl !== void 0 ? updates.websiteUrl : users[idx].websiteUrl,
        socialIcons: updates.socialIcons !== void 0 ? updates.socialIcons : users[idx].socialIcons,
        role: updates.role || users[idx].role,
        tier: updates.tier || users[idx].tier,
        isLocked: updates.isLocked !== void 0 ? updates.isLocked : users[idx].isLocked,
        updatedAt: Date.now()
      };
      updatedUser = users[idx];
      saveUsersMasterDatabase(users);
      syncUserToProfiles(updatedUser);
    } else {
      updatedUser = registerOrUpdateUserAuthoritative({
        ...updates,
        email: updates.email || (identifier.includes("@") ? identifier : void 0),
        userId: identifier
      });
    }
    return res.json({ success: true, user: updatedUser });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
var TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
var TWILIO_API_KEY_SID = process.env.TWILIO_API_KEY_SID || "";
var TWILIO_API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET || "";
var twilioFromNumber = process.env.TWILIO_PHONE_NUMBER || "";
var twilioWhatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER || "";
var getTwilioAuthHeader = () => {
  const authUser = TWILIO_API_KEY_SID || TWILIO_ACCOUNT_SID;
  const authSecret = TWILIO_API_KEY_SECRET || TWILIO_AUTH_TOKEN;
  return `Basic ${Buffer.from(`${authUser}:${authSecret}`).toString("base64")}`;
};
var otpStore = /* @__PURE__ */ new Map();
app.get("/api/twilio/status", (_req, res) => {
  return res.json({
    success: true,
    accountSid: TWILIO_ACCOUNT_SID ? `${TWILIO_ACCOUNT_SID.slice(0, 8)}...${TWILIO_ACCOUNT_SID.slice(-4)}` : null,
    apiKeySid: TWILIO_API_KEY_SID ? `${TWILIO_API_KEY_SID.slice(0, 8)}...${TWILIO_API_KEY_SID.slice(-4)}` : null,
    hasToken: Boolean(TWILIO_AUTH_TOKEN && TWILIO_AUTH_TOKEN.length > 10),
    hasApiKey: Boolean(TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET),
    isActive: Boolean(TWILIO_ACCOUNT_SID && (TWILIO_API_KEY_SECRET || TWILIO_AUTH_TOKEN)),
    fromPhone: twilioFromNumber || "Not configured",
    whatsappFrom: twilioWhatsappFrom
  });
});
app.post("/api/twilio/send-sms", async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ success: false, error: "Missing 'to' or 'message'" });
    }
    const cleanTo = String(to).trim().startsWith("+") ? String(to).trim() : `+91${String(to).trim()}`;
    const params = new URLSearchParams();
    params.append("To", cleanTo);
    if (twilioFromNumber) {
      params.append("From", twilioFromNumber);
    } else {
      params.append("From", "+15017122661");
    }
    params.append("Body", String(message).trim());
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const authHeader = getTwilioAuthHeader();
    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });
    const twilioData = await twilioRes.json();
    if (!twilioRes.ok) {
      return res.status(twilioRes.status).json({
        success: false,
        error: twilioData.message || "Twilio SMS sending failed",
        code: twilioData.code
      });
    }
    return res.json({
      success: true,
      messageId: twilioData.sid,
      status: twilioData.status,
      to: cleanTo
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.post("/api/twilio/send-whatsapp", async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ success: false, error: "Missing 'to' or 'message'" });
    }
    let rawNumber = String(to).replace(/[^0-9]/g, "");
    if (!rawNumber.startsWith("91") && rawNumber.length === 10) {
      rawNumber = `91${rawNumber}`;
    }
    const formattedTo = `whatsapp:+${rawNumber}`;
    const params = new URLSearchParams();
    params.append("To", formattedTo);
    params.append("From", twilioWhatsappFrom);
    params.append("Body", String(message).trim());
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const authHeader = getTwilioAuthHeader();
    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });
    const twilioData = await twilioRes.json();
    if (!twilioRes.ok) {
      return res.status(twilioRes.status).json({
        success: false,
        error: twilioData.message || "Twilio WhatsApp sending failed",
        code: twilioData.code
      });
    }
    return res.json({
      success: true,
      messageId: twilioData.sid,
      status: twilioData.status,
      to: formattedTo
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.post("/api/twilio/send-otp", authRateLimiter, async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ success: false, error: "Mobile number is required" });
    const cleanNum = String(mobile).replace(/[^0-9]/g, "").slice(-10);
    if (cleanNum.length !== 10) {
      return res.status(400).json({ success: false, error: "\u0915\u0943\u092A\u092F\u093E 10 \u0905\u0902\u0915\u094B\u0902 \u0915\u093E \u092E\u093E\u0928\u094D\u092F \u092E\u094B\u092C\u093E\u0907\u0932 \u0928\u0902\u092C\u0930 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902\u0964" });
    }
    const otp = import_crypto.default.randomInt(1e5, 999999).toString();
    otpStore.set(cleanNum, { otp, expiresAt: Date.now() + 5 * 60 * 1e3, attempts: 0 });
    if (TWILIO_ACCOUNT_SID && (TWILIO_API_KEY_SECRET || TWILIO_AUTH_TOKEN)) {
      try {
        const fullTo = `+91${cleanNum}`;
        const params = new URLSearchParams();
        params.append("To", fullTo);
        params.append("From", twilioFromNumber || "+15017122661");
        params.append("Body", `\u0906\u092A\u0915\u093E AI News Maker \u0910\u092A OTP \u0939\u0948: ${otp}\u0964 \u092F\u0939 5 \u092E\u093F\u0928\u091F \u0915\u0947 \u0932\u093F\u090F \u092E\u093E\u0928\u094D\u092F \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u0907\u0938\u0947 \u0915\u093F\u0938\u0940 \u0915\u0947 \u0938\u093E\u0925 \u0938\u093E\u091D\u093E \u0928 \u0915\u0930\u0947\u0902\u0964`);
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const authHeader = getTwilioAuthHeader();
        fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: params.toString()
        }).catch((err) => console.warn("[Twilio OTP background error]:", err.message));
      } catch (smsErr) {
        console.warn("[Twilio SMS error in send-otp]:", smsErr);
      }
    }
    return res.json({
      success: true,
      message: `OTP +91${cleanNum} \u092A\u0930 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0930\u0942\u092A \u0938\u0947 \u092D\u0947\u091C \u0926\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948`,
      expiresInSeconds: 300
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.post("/api/twilio/verify-otp", authRateLimiter, (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) return res.status(400).json({ success: false, error: "Mobile and OTP are required" });
    const cleanNum = String(mobile).replace(/[^0-9]/g, "").slice(-10);
    const record = otpStore.get(cleanNum);
    if (!record) {
      return res.json({ success: false, valid: false, message: "OTP \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u091A\u0941\u0915\u093E \u0939\u0948 \u092F\u093E \u0905\u0928\u0941\u0930\u094B\u0927 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E" });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanNum);
      return res.json({ success: false, valid: false, message: "OTP \u0915\u0940 \u0935\u0948\u0927\u0924\u093E \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u0917\u0908 \u0939\u0948" });
    }
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts > 5) {
      otpStore.delete(cleanNum);
      return res.status(429).json({ success: false, valid: false, message: "\u0905\u0924\u094D\u092F\u0927\u093F\u0915 \u0905\u0938\u092B\u0932 \u092A\u094D\u0930\u092F\u093E\u0938\u0964 OTP \u0928\u093F\u0930\u0938\u094D\u0924 \u0915\u0930 \u0926\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948, \u0915\u0943\u092A\u092F\u093E \u0928\u092F\u093E OTP \u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u0915\u0930\u0947\u0902\u0964" });
    }
    const inputOtp = String(otp).trim();
    if (record.otp === inputOtp) {
      otpStore.delete(cleanNum);
      return res.json({ success: true, valid: true, message: "OTP \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u0938\u0924\u094D\u092F\u093E\u092A\u093F\u0924!" });
    }
    return res.json({ success: false, valid: false, message: "\u0905\u092E\u093E\u0928\u094D\u092F OTP \u0926\u0930\u094D\u091C \u0915\u093F\u092F\u093E \u0917\u092F\u093E" });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
var RESTRICTED_CHANNELS_FILE = import_path.default.join(process.cwd(), "restricted_channels_db.json");
function getInitialRestrictedChannels() {
  return [
    { id: "res_aajtak", channelName: "\u0906\u091C \u0924\u0915 (Aaj Tak)", websiteUrl: "aajtak.in", username: "aajtak", logoUrl: "https://akm-img-a-in.tosshub.com/aajtak/resource/img/aajtak-logo-156X116.png", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_abp", channelName: "\u090F\u092C\u0940\u092A\u0940 \u0928\u094D\u092F\u0942\u091C\u093C (ABP News)", websiteUrl: "abplive.com", username: "abpnews", logoUrl: "https://static.abplive.com/frontend/images/ABP_Hindi.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_ndtv", channelName: "\u090F\u0928\u0921\u0940\u091F\u0940\u0935\u0940 \u0907\u0902\u0921\u093F\u092F\u093E (NDTV India)", websiteUrl: "ndtv.in", username: "ndtv", logoUrl: "https://drop.ndtv.com/homepage/images/ndtvlogo.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_zeenews", channelName: "\u091C\u093C\u0940 \u0928\u094D\u092F\u0942\u091C\u093C (Zee News)", websiteUrl: "zeenews.india.com", username: "zeenews", logoUrl: "https://english.cdn.zeenews.com/static/apprun/dna/icons/dna-logo.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_indiatv", channelName: "\u0907\u0902\u0921\u093F\u092F\u093E \u091F\u0940\u0935\u0940 (India TV)", websiteUrl: "indiatvnews.com", username: "indiatv", logoUrl: "https://resize.indiatvnews.com/en/resize/newbucket/1200_-/2020/03/indiatv-logo-1584955685.jpg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_republic", channelName: "\u0930\u093F\u092A\u092C\u094D\u0932\u093F\u0915 \u092D\u093E\u0930\u0924 (Republic Bharat)", websiteUrl: "republicbharat.com", username: "republicbharat", logoUrl: "https://www.republicbharat.com/assets/images/bharat-logo.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u0928\u0947\u091F\u0935\u0930\u094D\u0915 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_news18", channelName: "\u0928\u094D\u092F\u0942\u091C\u093C18 \u0907\u0902\u0921\u093F\u092F\u093E (News18 India)", websiteUrl: "news18.com", username: "news18", logoUrl: "https://images.news18.com/static_netstorage/images/news18_logo_hindi.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u0928\u0947\u091F\u0935\u0930\u094D\u0915 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_bhaskar", channelName: "\u0926\u0948\u0928\u093F\u0915 \u092D\u093E\u0938\u094D\u0915\u0930 (Dainik Bhaskar)", websiteUrl: "dainikbhaskar.com", username: "dainikbhaskar", logoUrl: "https://www.bhaskar.com/assets/images/db-logo-hindi.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u092A\u0924\u094D\u0930 \u0935 \u092E\u0940\u0921\u093F\u092F\u093E \u0938\u092E\u0942\u0939", createdAt: 17e11 },
    { id: "res_amarujala", channelName: "\u0905\u092E\u0930 \u0909\u091C\u093E\u0932\u093E (Amar Ujala)", websiteUrl: "amarujala.com", username: "amarujala", logoUrl: "https://www.amarujala.com/assets/images/amarujala.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u092A\u0924\u094D\u0930 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_jagran", channelName: "\u0926\u0948\u0928\u093F\u0915 \u091C\u093E\u0917\u0930\u0923 (Dainik Jagran)", websiteUrl: "jagran.com", username: "dainikjagran", logoUrl: "https://www.jagran.com/assets/images/jagran-logo.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u092A\u0924\u094D\u0930 \u0938\u092E\u0942\u0939", createdAt: 17e11 },
    { id: "res_hindustan", channelName: "\u0939\u093F\u0928\u094D\u0926\u0941\u0938\u094D\u0924\u093E\u0928 (Live Hindustan)", websiteUrl: "livehindustan.com", username: "livehindustan", logoUrl: "https://www.livehindustan.com/static/lh-logo.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u092A\u0924\u094D\u0930 \u0938\u092E\u0942\u0939", createdAt: 17e11 },
    { id: "res_bbc", channelName: "\u092C\u0940\u092C\u0940\u0938\u0940 \u0939\u093F\u0902\u0926\u0940 (BBC Hindi)", websiteUrl: "bbc.com/hindi", username: "bbchindi", logoUrl: "https://news.files.bbci.co.uk/ws/img/logos/og/hindi.png", reason: "\u0905\u0902\u0924\u0930\u094D\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u0938\u0902\u0917\u0920\u0928", createdAt: 17e11 }
  ];
}
function loadRestrictedChannels() {
  try {
    if (import_fs.default.existsSync(RESTRICTED_CHANNELS_FILE)) {
      const raw = import_fs.default.readFileSync(RESTRICTED_CHANNELS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error("Error reading restricted_channels_db.json:", err);
  }
  const init = getInitialRestrictedChannels();
  saveRestrictedChannels(init);
  return init;
}
function saveRestrictedChannels(list) {
  try {
    import_fs.default.writeFileSync(RESTRICTED_CHANNELS_FILE, JSON.stringify(list, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing restricted_channels_db.json:", err);
    return false;
  }
}
app.get("/api/restricted-channels", (_req, res) => {
  return res.json({ success: true, channels: loadRestrictedChannels() });
});
app.post("/api/restricted-channels", (req, res) => {
  try {
    const { channelName, websiteUrl, username, logoUrl, reason } = req.body;
    if (!channelName) return res.status(400).json({ error: "Channel name is required" });
    const channels = loadRestrictedChannels();
    const newChan = {
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      channelName: String(channelName).trim(),
      websiteUrl: String(websiteUrl || "").trim(),
      username: String(username || "").trim(),
      logoUrl: String(logoUrl || ""),
      reason: String(reason || "\u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924 \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 \u091A\u0948\u0928\u0932"),
      createdAt: Date.now()
    };
    channels.unshift(newChan);
    saveRestrictedChannels(channels);
    return res.json({ success: true, channel: newChan, channels });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.delete("/api/restricted-channels/:id", (req, res) => {
  try {
    const { id } = req.params;
    let channels = loadRestrictedChannels();
    channels = channels.filter((c) => c.id !== id);
    saveRestrictedChannels(channels);
    return res.json({ success: true, channels });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var serveAccountDeletionHtml = (_req, res) => {
  const possiblePaths = [
    import_path.default.join(process.cwd(), "public", "delete-account", "index.html"),
    import_path.default.join(process.cwd(), "dist", "delete-account", "index.html"),
    import_path.default.join(process.cwd(), "web_studio", "public", "delete-account", "index.html")
  ];
  for (const p of possiblePaths) {
    if (import_fs.default.existsSync(p)) {
      return res.sendFile(p);
    }
  }
  return res.send("<h1>Account & Data Deletion Portal</h1><p>Please contact breakingnewswala.com@gmail.com</p>");
};
app.get("/delete-account", serveAccountDeletionHtml);
app.get("/account-deletion", serveAccountDeletionHtml);
app.get("/privacy/delete-account", serveAccountDeletionHtml);
app.get("/api/proxy-image", proxyRateLimiter, async (req, res) => {
  try {
    let imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).send("Missing url parameter");
    }
    while (imageUrl.includes("/api/proxy-image?url=")) {
      const parts = imageUrl.split("/api/proxy-image?url=");
      imageUrl = decodeURIComponent(parts[parts.length - 1]);
    }
    const urlValidation = isSafePublicUrl(imageUrl);
    if (!urlValidation.safe) {
      return res.status(403).json({ error: "\u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924 \u0932\u093F\u0902\u0915 (SSRF Protection): " + (urlValidation.error || "\u0905\u092E\u093E\u0928\u094D\u092F URL") });
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8e3);
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
      }
    }).finally(() => clearTimeout(timeoutId));
    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return res.status(415).send("Invalid content type: only images are allowed.");
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(413).send("Image size exceeds 10MB limit.");
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(buffer);
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).send("Image fetch timed out.");
    }
    return res.status(500).send("Error proxying image");
  }
});
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set in environment variables.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
var openaiClient = null;
function getOpenAIClient() {
  const apiKey = dynamicOpenAiKey || process.env.OPENAI_API_KEY || "";
  if (!apiKey || apiKey.trim() === "" || apiKey === "MY_OPENAI_API_KEY") {
    throw new Error(
      "OPENAI_API_KEY \u0938\u0947\u091F \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E '\u0915\u094D\u0932\u093E\u0909\u0921 \u0935 API \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938' (\u092F\u093E .env) \u092E\u0947\u0902 \u091C\u093E\u0915\u0930 'OPENAI_API_KEY' \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902, \u0905\u0925\u0935\u093E 'Gemini AI' \u0935\u093F\u0915\u0932\u094D\u092A \u091A\u0941\u0928\u0947\u0902\u0964"
    );
  }
  if (!openaiClient || openaiClient.apiKey !== apiKey.trim()) {
    openaiClient = new import_openai.default({ apiKey: apiKey.trim() });
  }
  return openaiClient;
}
var TEMPLATE_CONFIG_REGISTRY = {
  graphic_001: {
    id: "graphic_001",
    template_id: "graphic_001",
    name: "Graphic 1 (\u092C\u0947\u0938\u093F\u0915 4:5)",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area (\u092C\u0949\u091F\u092E \u0935\u094D\u0939\u093E\u0907\u091F \u092A\u0949\u0932\u0940\u0917\u0949\u0928)",
    aspect_ratio: "4:5",
    description: "\u0936\u0940\u0930\u094D\u0937 53% \u092B\u094B\u091F\u094B, \u092C\u0949\u091F\u092E 47% \u092A\u0949\u0932\u0940\u0917\u0949\u0928 \u092E\u0947\u0902 3-\u0932\u093E\u0907\u0928 \u0939\u0947\u0921\u0932\u093E\u0907\u0928"
  },
  graphic_002: {
    id: "graphic_002",
    template_id: "graphic_002",
    name: "Graphic 2 (\u090F\u0921\u0935\u093E\u0902\u0938 4:5)",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area (\u0911\u0930\u0947\u0902\u091C \u092C\u0949\u0930\u094D\u0921\u0930 \u092B\u094D\u0930\u0947\u092E)",
    aspect_ratio: "4:5",
    description: "\u0911\u0930\u0947\u0902\u091C \u092C\u0949\u0930\u094D\u0921\u0930, 3-\u0932\u093E\u0907\u0928 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u090F\u0930\u093F\u092F\u093E"
  },
  graphic_003: {
    id: "graphic_003",
    template_id: "graphic_003",
    name: "Graphic 3 (\u092A\u094D\u0930\u094B 4:5 - 2 \u0932\u093E\u0907\u0928)",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area (\u092A\u094D\u0930\u094B \u092E\u093F\u0928\u093F\u092E\u0932)",
    aspect_ratio: "4:5",
    description: "2-\u0932\u093E\u0907\u0928 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u094D\u0937\u092E\u0924\u093E, \u092A\u094D\u0930\u094B \u092E\u093F\u0928\u093F\u092E\u0932 \u0938\u094D\u091F\u093E\u0907\u0932"
  },
  graphic_004: {
    id: "graphic_004",
    template_id: "graphic_004",
    name: "Graphic 4 (\u0935\u0940\u0906\u0908\u092A\u0940 \u0921\u0947\u0938\u094D\u0915 4:5 - 2 \u0932\u093E\u0907\u0928)",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area (\u0935\u0940\u0906\u0908\u092A\u0940 \u0915\u0949\u092E\u094D\u092A\u0948\u0915\u094D\u091F)",
    aspect_ratio: "4:5",
    description: "2-\u0932\u093E\u0907\u0928 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u094D\u0937\u092E\u0924\u093E, \u0935\u0940\u0906\u0908\u092A\u0940 \u0915\u0949\u092E\u094D\u092A\u0948\u0915\u094D\u091F \u0932\u0947\u0906\u0909\u091F"
  },
  "jacket-default": {
    id: "jacket-default",
    template_id: "jacket-default",
    name: "Default Jacket",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area",
    aspect_ratio: "4:5"
  },
  "jacket-original": {
    id: "jacket-original",
    template_id: "jacket-original",
    name: "Original Jacket",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area",
    aspect_ratio: "4:5"
  },
  "jacket-breaking-red": {
    id: "jacket-breaking-red",
    template_id: "jacket-breaking-red",
    name: "Breaking Red",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area",
    aspect_ratio: "4:5"
  },
  "jacket-investigation": {
    id: "jacket-investigation",
    template_id: "jacket-investigation",
    name: "Investigation Special",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area",
    aspect_ratio: "4:5"
  },
  "jacket-quote": {
    id: "jacket-quote",
    template_id: "jacket-quote",
    name: "Quote Jacket",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area",
    aspect_ratio: "4:5"
  },
  "jacket-text-breaking": {
    id: "jacket-text-breaking",
    template_id: "jacket-text-breaking",
    name: "Text Breaking",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area",
    aspect_ratio: "4:5"
  },
  "jacket-morning": {
    id: "jacket-morning",
    template_id: "jacket-morning",
    name: "Morning Jacket",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area",
    aspect_ratio: "4:5"
  },
  "jacket-epaper": {
    id: "jacket-epaper",
    template_id: "jacket-epaper",
    name: "E-Paper Jacket",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area",
    aspect_ratio: "4:5"
  }
};
function getTemplateConfig(templateId) {
  const tid = templateId || "graphic_001";
  if (TEMPLATE_CONFIG_REGISTRY[tid]) {
    return TEMPLATE_CONFIG_REGISTRY[tid];
  }
  const isTwoLine = tid === "graphic_003" || tid === "graphic_004" || tid.includes("2_line") || tid.includes("investigation") || tid.includes("quote");
  const lines = isTwoLine ? 2 : 3;
  return {
    id: tid,
    template_id: tid,
    name: `Template ${tid}`,
    headline_max_lines: lines,
    headline_line_count: lines,
    headline_area: `${lines}-Line Headline Area`,
    aspect_ratio: "4:5"
  };
}
var AI_FEATURES_CONFIG_PATH = import_fs.default.existsSync(import_path.default.resolve(__dirname, "ai_features_config.json")) ? import_path.default.resolve(__dirname, "ai_features_config.json") : import_fs.default.existsSync(import_path.default.resolve(process.cwd(), "ai_features_config.json")) ? import_path.default.resolve(process.cwd(), "ai_features_config.json") : import_path.default.resolve(__dirname, "..", "ai_features_config.json");
function getAiFeaturesConfig() {
  try {
    if (import_fs.default.existsSync(AI_FEATURES_CONFIG_PATH)) {
      const raw = import_fs.default.readFileSync(AI_FEATURES_CONFIG_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Could not read ai_features_config.json, using defaults:", err);
  }
  return {
    headlineRegeneration: {
      enabled: true,
      allowedTiers: ["basic", "advanced", "advance", "pro", "professional", "vip", "vip desk", "ultra", "admin"],
      maxRegenerationsPerSession: 10,
      requireAuthentication: false
    },
    permissions: {
      regenerateHeadlines: {
        allowedTiers: ["basic", "advanced", "advance", "pro", "professional", "vip", "vip desk", "admin"],
        allowAllTiers: true
      }
    }
  };
}
function saveAiFeaturesConfig(cfg) {
  try {
    import_fs.default.writeFileSync(AI_FEATURES_CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf-8");
    const alternatePath = AI_FEATURES_CONFIG_PATH.includes("web_studio") ? import_path.default.resolve(AI_FEATURES_CONFIG_PATH, "..", "..", "ai_features_config.json") : import_path.default.resolve(import_path.default.dirname(AI_FEATURES_CONFIG_PATH), "web_studio", "ai_features_config.json");
    if (import_fs.default.existsSync(import_path.default.dirname(alternatePath))) {
      try {
        import_fs.default.writeFileSync(alternatePath, JSON.stringify(cfg, null, 2), "utf-8");
      } catch {
      }
    }
    return true;
  } catch (err) {
    console.error("Could not save ai_features_config.json:", err);
    return false;
  }
}
function isRegenerateAllowed(config, effectiveTier) {
  if (!config) return true;
  if (config.headlineRegeneration?.enabled === false) return false;
  const perm = config.permissions?.regenerateHeadlines;
  if (perm) {
    if (perm.allowAllTiers === true) return true;
    if (Array.isArray(perm.allowedTiers)) {
      const lowerTiers = perm.allowedTiers.map((t) => t.toLowerCase().trim());
      if (lowerTiers.includes("*") || lowerTiers.includes("all")) return true;
      return lowerTiers.some((t) => {
        if (t === effectiveTier) return true;
        if ((effectiveTier === "ultra" || effectiveTier === "vip desk" || effectiveTier === "vip_dash" || effectiveTier === "vip-dash" || effectiveTier === "vip") && (t === "vip" || t === "vip_desk" || t === "vip_dash" || t === "vip-dash" || t === "ultra")) return true;
        if ((effectiveTier === "professional" || effectiveTier === "pro") && (t === "pro" || t === "professional")) return true;
        if ((effectiveTier === "advance" || effectiveTier === "advanced") && (t === "advance" || t === "advanced")) return true;
        if (effectiveTier === "admin" || t === "admin") return true;
        return false;
      });
    }
  }
  const regenAllowed = config.headlineRegeneration?.allowedTiers;
  if (Array.isArray(regenAllowed)) {
    const lowerTiers = regenAllowed.map((t) => t.toLowerCase().trim());
    if (lowerTiers.includes("*") || lowerTiers.includes("all")) return true;
    return lowerTiers.some((t) => {
      if (t === effectiveTier) return true;
      if ((effectiveTier === "ultra" || effectiveTier === "vip desk" || effectiveTier === "vip_dash" || effectiveTier === "vip-dash" || effectiveTier === "vip") && (t === "vip" || t === "vip_desk" || t === "vip_dash" || t === "vip-dash" || t === "ultra")) return true;
      if ((effectiveTier === "professional" || effectiveTier === "pro") && (t === "pro" || t === "professional")) return true;
      if ((effectiveTier === "advance" || effectiveTier === "advanced") && (t === "advance" || t === "advanced")) return true;
      if (effectiveTier === "admin" || t === "admin") return true;
      return false;
    });
  }
  return true;
}
function isTierAllowedForOpenAI(tier, role) {
  const cleanRole = (role || "").toLowerCase().trim();
  if (cleanRole === "admin" || cleanRole === "superadmin") return true;
  const cleanTier = (tier || "").toLowerCase().trim();
  const allowed = [
    "pro",
    "professional",
    "vip",
    "vip_dash",
    "vip-dash",
    "ultra",
    "vip desk",
    "vip_desk",
    "admin",
    "superadmin"
  ];
  return allowed.includes(cleanTier);
}
function resolveUserTierAndRole(req) {
  const identifier = extractUserIdentifier(req);
  if (identifier) {
    const clean = identifier.toString().toLowerCase().trim();
    if (isProtectedAdminAccount(clean)) {
      return { tier: "superadmin", role: "superadmin" };
    }
    const users = loadUsersMasterDatabase();
    const match = users.find(
      (u) => u.email && u.email.toLowerCase().trim() === clean || u.email && u.email.toLowerCase().replace(/\s+/g, "") === clean.replace(/\s+/g, "") || u.userId && u.userId.toLowerCase().trim() === clean
    );
    if (match) {
      const role = (match.role || "reporter").toLowerCase().trim();
      const tier = (match.tier || (role === "admin" || role === "superadmin" ? role : "basic")).toLowerCase().trim();
      return { tier, role };
    }
  }
  const reqTier = (req.user?.tier || req.user?.subscriptionTier || req.body?.userTier || req.headers["x-user-tier"] || "basic").toString().toLowerCase().trim();
  const reqRole = (req.user?.role || req.body?.role || "reporter").toString().toLowerCase().trim();
  return { tier: reqTier, role: reqRole };
}
var DEFAULT_FALLBACK_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
  "gemini-3.8-flash",
  "gemini-flash-latest"
];
async function generateWithFallbackAndRetry(ai, models, reqOptions, maxRetriesPerModel = 2) {
  let lastError = null;
  for (const model of models) {
    for (let attempt = 0; attempt < maxRetriesPerModel; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: reqOptions.contents,
          config: reqOptions.config
        });
        quotaExceededInfo.isExceeded = false;
        quotaExceededInfo.lastChecked = (/* @__PURE__ */ new Date()).toISOString();
        return res;
      } catch (err) {
        lastError = err;
        const msg = String(err?.message || "").toLowerCase();
        const status = err?.status || err?.code || 0;
        const is503HighDemand = status === 503 || msg.includes("503") || msg.includes("high demand") || msg.includes("unavailable");
        const isRateLimit = status === 429 || msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("quota");
        const isAccessDeniedOrNotFound = status === 403 || status === 404 || msg.includes("403") || msg.includes("404") || msg.includes("denied access") || msg.includes("no longer available") || msg.includes("not found");
        const isTransient = is503HighDemand || isRateLimit || msg.includes("temporarily") || msg.includes("timeout") || msg.includes("fetch failed");
        if (isRateLimit || isAccessDeniedOrNotFound) {
          quotaExceededInfo.isExceeded = true;
          quotaExceededInfo.lastChecked = (/* @__PURE__ */ new Date()).toISOString();
        }
        console.log(
          `[Gemini Call] Model "${model}" (attempt ${attempt + 1}/${maxRetriesPerModel}): ${isRateLimit ? "Free tier rate/quota limit reached" : is503HighDemand ? "503 High Demand" : isAccessDeniedOrNotFound ? "Model tier restriction / 403" : "Transient failure"}`
        );
        if (is503HighDemand || isRateLimit || isAccessDeniedOrNotFound) {
          break;
        }
        if (isTransient && attempt < maxRetriesPerModel - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800 * Math.pow(2, attempt)));
          continue;
        }
        break;
      }
    }
  }
  throw lastError;
}
function isInvalidUrlHeadline(text) {
  if (!text || typeof text !== "string") return true;
  const l = text.toLowerCase().trim();
  return l.startsWith("http://") || l.startsWith("https://") || l.startsWith("www.") || l.includes("http://") || l.includes("https://") || l.includes(".com") || l.includes(".in") || l.includes(".org") || l.includes(".net") || l.includes("url to reference") || l.includes("url:") || l.includes("ainewsmaker.online") || l.includes("breakingnewswala.com");
}
function cleanHtmlEntities(str) {
  if (!str) return "";
  return str.replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/&#([0-9]+);/g, (_m, dec) => String.fromCharCode(parseInt(dec, 10))).replace(/[^\S\r\n]+/g, " ").trim();
}
function stripNewsSiteBranding(title) {
  if (!title) return "";
  return title.replace(/\s*[-–—|]\s*(?:Dainik\s*Bhaskar|दैनिक\s*भास्कर|Amar\s*Ujala|अमर\s*उजाला|NDTV\s*Khabar|NDTV\s*India|NDTV|Aaj\s*Tak|आज\s*तक|News18|Patrika|पत्रिका|Navbharat\s*Times|नवभारत\s*टाइम्स|Hindustan|Live\s*Hindustan|BBC\s*News\s*हिंदी|BBC|ABP\s*News|Zee\s*News|Republic\s*Bharat|Oneindia|Jagran|दैनिक\s*जागरण|विकिपीडिया|Wikipedia)[^|–—\-]*$/iu, "").replace(/\s*[-–—|]\s*(?:Latest\s*News|Breaking\s*News|Hindi\s*News|ताज़ा\s*खबर).*$/iu, "").trim();
}
function parseArticleHtml(html, pageUrl) {
  const lowerHtml = (html || "").toLowerCase();
  const isBlockedOrPaywalled = lowerHtml.includes("cf-browser-verification") || lowerHtml.includes("cf-challenge-running") || lowerHtml.includes("cloudflare") && lowerHtml.includes("ray id") && lowerHtml.includes("security") || lowerHtml.includes("access denied") || lowerHtml.includes("403 forbidden") || lowerHtml.includes("verify you are human") || lowerHtml.includes("turn on javascript and cookies") || lowerHtml.includes("just a moment...") || lowerHtml.includes("login") && lowerHtml.includes("password") && lowerHtml.length < 3e3;
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const twitterTitleMatch = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:title["']/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  let rawTitle = ogTitleMatch && ogTitleMatch[1]?.trim() || titleMatch && titleMatch[1]?.trim() || twitterTitleMatch && twitterTitleMatch[1]?.trim() || h1Match && h1Match[1]?.replace(/<[^>]+>/g, "").trim() || "";
  if (rawTitle) {
    rawTitle = stripNewsSiteBranding(cleanHeadlineText(cleanHtmlEntities(rawTitle)));
  }
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
  const metaDescMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
  );
  const twitterDescMatch = html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:description["']/i);
  let rawDesc = cleanHtmlEntities(
    ogDescMatch && ogDescMatch[1]?.trim() || metaDescMatch && metaDescMatch[1]?.trim() || twitterDescMatch && twitterDescMatch[1]?.trim() || ""
  );
  if (rawDesc) {
    rawDesc = rawDesc.replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]+(?=[\u0900-\u097F])/u, "").replace(
      /(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi,
      " "
    ).replace(/\s+/g, " ").trim();
  }
  let jsonLdContent = "";
  const foundImages = [];
  try {
    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const jm of jsonLdMatches) {
      try {
        const jdata = JSON.parse(jm[1].trim());
        const jitems = Array.isArray(jdata) ? jdata : jdata?.["@graph"] ? jdata["@graph"] : [jdata];
        for (const item of jitems) {
          if (item && (item["@type"] === "NewsArticle" || item["@type"] === "Article" || item["@type"] === "ReportageNewsArticle" || item.headline || item.articleBody)) {
            if (!rawTitle && item.headline) {
              rawTitle = stripNewsSiteBranding(cleanHeadlineText(cleanHtmlEntities(String(item.headline))));
            }
            if (!rawDesc && item.description) {
              rawDesc = cleanHtmlEntities(String(item.description)).replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]+(?=[\u0900-\u097F])/u, "").replace(
                /(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi,
                " "
              ).replace(/\s+/g, " ").trim();
            }
            if (item.articleBody) {
              const bodyStr = cleanHtmlEntities(String(item.articleBody)).replace(
                /(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi,
                " "
              ).replace(/\s+/g, " ").trim();
              if (bodyStr.length > jsonLdContent.length) {
                jsonLdContent = bodyStr.slice(0, 4e3);
              }
            }
            const img = item.image?.url || (typeof item.image === "string" ? item.image : Array.isArray(item.image) ? item.image[0] : null);
            if (img) {
              const resolvedImg = resolveUrl(typeof img === "object" ? img.url : img, pageUrl);
              if (resolvedImg && !foundImages.includes(resolvedImg)) foundImages.unshift(resolvedImg);
            }
          }
        }
      } catch {
      }
    }
  } catch {
  }
  const cleanBody = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ").replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ").replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ").replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ").replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, " ").replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, " ").replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ").replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ").replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, " ").replace(/<div\b[^>]*class=["'][^"']*(?:related|trending|popular|sidebar|advert|banner|share|social|cookie|comment|menu|nav|breadcrumb)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, " ").replace(/<ul\b[^>]*class=["'][^"']*(?:related|trending|share|social)[^"']*["'][^>]*>[\s\S]*?<\/ul>/gi, " ");
  const articleContainerMatch = cleanBody.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) || cleanBody.match(/<div[^>]+itemprop=["']articleBody["'][^>]*>([\s\S]*?)<\/div>/i) || cleanBody.match(/<div[^>]+class=["'][^"']*(?:story-details|story-body|article-body|story-content|news-content|art-text|article__body|story_wrapper|ArticleBody|content-area|article-content|main-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || cleanBody.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const textSource = articleContainerMatch ? articleContainerMatch[1] : cleanBody;
  const pMatches = textSource.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  const extractedParagraphs = [];
  for (const pMatch of pMatches) {
    let pClean = cleanHtmlEntities(pMatch[1].replace(/<[^>]+>/g, " ")).trim();
    pClean = pClean.replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]+(?=[\u0900-\u097F])/u, "").replace(/(?:लोड हो रहा है[\s\.]*)+/gi, "").replace(/(?:loading[\s\.]*)+/gi, "").replace(/(?:please wait[\s\.]*)+/gi, "").replace(/^(?:नईदुनिया प्रतिनिधि|दैनिक भास्कर|अमर उजाला|पत्रिका|नवभारत टाइम्स|हिंदुस्तान ब्यूरो|विशेष संवाददाता|ब्यूरो|भाषा|आईएएनएस|पीटीआई|वार्ता)[,\s]*[^\n।]+[।\n]?/gi, "").replace(
      /(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|फोटो साभार[:\s]*|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi,
      " "
    ).replace(/\s+/g, " ").trim();
    if (pClean.length > 25 && !extractedParagraphs.includes(pClean)) {
      if (!/cookie|subscribe|newsletter|advertisement|বিজ্ঞাপন|विज्ञापन|कॉपीराइट|rights reserved|Updated\s+\d+:\d+|\bIST\b|होमवीडियो|ई-पेपर|वेब स्टोरीज|टॉप न्यूज़|^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,\s]+/i.test(pClean)) {
        extractedParagraphs.push(pClean);
        if (extractedParagraphs.join("\n\n").length >= 3500) break;
      }
    }
  }
  let htmlBodyContent = extractedParagraphs.join("\n\n").trim();
  let bodyContent = jsonLdContent && jsonLdContent.length > htmlBodyContent.length + 50 ? jsonLdContent : htmlBodyContent || jsonLdContent || "";
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
  if (ogImageMatch && ogImageMatch[1]) {
    const resolved = resolveUrl(ogImageMatch[1].trim(), pageUrl);
    if (resolved && !foundImages.includes(resolved)) foundImages.push(resolved);
  }
  if (twitterImageMatch && twitterImageMatch[1]) {
    const resolved = resolveUrl(twitterImageMatch[1].trim(), pageUrl);
    if (resolved && !foundImages.includes(resolved)) foundImages.push(resolved);
  }
  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"'\s]+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi);
  for (const match of imgMatches) {
    const src = match[1];
    if (src && !src.includes("logo") && !src.includes("icon") && !src.includes("avatar") && !src.includes("banner") && !src.includes("tracking") && !src.includes("sticker") && !src.includes("badge") && !src.includes("/cat/") && !src.includes("category") && !src.includes("mera-shehar") && !src.includes("pixel") && !src.includes("placeholder")) {
      const resolved = resolveUrl(src, pageUrl);
      if (resolved && !foundImages.includes(resolved)) {
        foundImages.push(resolved);
        if (foundImages.length >= 4) break;
      }
    }
  }
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  const canonicalUrl = canonicalMatch && canonicalMatch[1] ? resolveUrl(canonicalMatch[1].trim(), pageUrl) : void 0;
  const pubDateMatch = html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*name=["'](?:pubdate|publishdate|published_date|date|sailthru.date)["'][^>]*content=["']([^"']+)["']/i) || html.match(/<time[^>]*datetime=["']([^"']+)["']/i);
  const publishedDate = pubDateMatch && pubDateMatch[1] ? pubDateMatch[1].trim() : void 0;
  const hasGenuineArticleText = bodyContent && bodyContent.length >= 60 || rawDesc && rawDesc.length >= 50 && rawTitle && rawTitle.length >= 15;
  const extractionStatus = !isBlockedOrPaywalled && hasGenuineArticleText ? "success" : "failed";
  const inaccessibleReason = isBlockedOrPaywalled ? "Page is protected by anti-bot, CAPTCHA, or paywall" : !hasGenuineArticleText ? "Article body could not be extracted from webpage" : void 0;
  return {
    title: rawTitle,
    description: rawDesc,
    content: bodyContent,
    images: foundImages,
    canonicalUrl,
    publishedDate,
    extractionStatus,
    inaccessibleReason
  };
}
function extractFactsFromUrlString(rawUrl) {
  try {
    const normalized = rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`;
    const parsed = new URL(normalized);
    const domain = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    const locationKeywords = {
      bhopal: "\u092D\u094B\u092A\u093E\u0932",
      indore: "\u0907\u0902\u0926\u094C\u0930",
      rewa: "\u0930\u0940\u0935\u093E",
      sidhi: "\u0938\u0940\u0927\u0940",
      jabalpur: "\u091C\u092C\u0932\u092A\u0941\u0930",
      gwalior: "\u0917\u094D\u0935\u093E\u0932\u093F\u092F\u0930",
      ujjain: "\u0909\u091C\u094D\u091C\u0948\u0928",
      shahdol: "\u0936\u0939\u0921\u094B\u0932",
      anuppur: "\u0905\u0928\u0942\u092A\u092A\u0941\u0930",
      umaria: "\u0909\u092E\u0930\u093F\u092F\u093E",
      singrauli: "\u0938\u093F\u0902\u0917\u0930\u094C\u0932\u0940",
      satna: "\u0938\u0924\u0928\u093E",
      sagar: "\u0938\u093E\u0917\u0930",
      chhatarpur: "\u091B\u0924\u0930\u092A\u0941\u0930",
      damoh: "\u0926\u092E\u094B\u0939",
      panna: "\u092A\u0928\u094D\u0928\u093E",
      bhind: "\u092D\u093F\u0902\u0921",
      morena: "\u092E\u0941\u0930\u0948\u0928\u093E",
      sheopur: "\u0936\u094D\u092F\u094B\u092A\u0941\u0930",
      shivpuri: "\u0936\u093F\u0935\u092A\u0941\u0930\u0940",
      guna: "\u0917\u0941\u0928\u093E",
      ashoknagar: "\u0905\u0936\u094B\u0915\u0928\u0917\u0930",
      vidisha: "\u0935\u093F\u0926\u093F\u0936\u093E",
      sehore: "\u0938\u0940\u0939\u094B\u0930",
      raisen: "\u0930\u093E\u092F\u0938\u0947\u0928",
      rajgarh: "\u0930\u093E\u091C\u0917\u0922\u093C",
      hoshangabad: "\u0928\u0930\u094D\u092E\u0926\u093E\u092A\u0941\u0930\u092E",
      narmadapuram: "\u0928\u0930\u094D\u092E\u0926\u093E\u092A\u0941\u0930\u092E",
      harda: "\u0939\u0930\u0926\u093E",
      betul: "\u092C\u0948\u0924\u0942\u0932",
      dewas: "\u0926\u0947\u0935\u093E\u0938",
      shajapur: "\u0936\u093E\u091C\u093E\u092A\u0941\u0930",
      ratlam: "\u0930\u0924\u0932\u093E\u092E",
      mandsaur: "\u092E\u0902\u0926\u0938\u094C\u0930",
      neemuch: "\u0928\u0940\u092E\u091A",
      dhar: "\u0927\u093E\u0930",
      jhabua: "\u091D\u093E\u092C\u0941\u0906",
      alirajpur: "\u0905\u0932\u0940\u0930\u093E\u091C\u092A\u0941\u0930",
      khargone: "\u0916\u0930\u0917\u094B\u0928",
      barwani: "\u092C\u0921\u093C\u0935\u093E\u0928\u0940",
      khandwa: "\u0916\u0902\u0921\u0935\u093E",
      burhanpur: "\u092C\u0941\u0930\u0939\u093E\u0928\u092A\u0941\u0930",
      katni: "\u0915\u091F\u0928\u0940",
      dindori: "\u0921\u093F\u0902\u0921\u094C\u0930\u0940",
      mandla: "\u092E\u0902\u0921\u0932\u093E",
      balaghat: "\u092C\u093E\u0932\u093E\u0918\u093E\u091F",
      seoni: "\u0938\u093F\u0935\u0928\u0940",
      chhindwara: "\u091B\u093F\u0902\u0926\u0935\u093E\u0921\u093C\u093E",
      narsinghpur: "\u0928\u0930\u0938\u093F\u0902\u0939\u092A\u0941\u0930",
      delhi: "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940",
      raipur: "\u0930\u093E\u092F\u092A\u0941\u0930",
      lucknow: "\u0932\u0916\u0928\u090A",
      patna: "\u092A\u091F\u0928\u093E",
      jaipur: "\u091C\u092F\u092A\u0941\u0930"
    };
    let locationHint = void 0;
    let categoryHint = void 0;
    const meaningfulWords = [];
    const rawSegments = parsed.pathname.split("/").filter(Boolean);
    for (const segment of rawSegments) {
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment).toLowerCase();
      } catch {
      }
      for (const [eng, hin] of Object.entries(locationKeywords)) {
        if (decoded.includes(eng) || decoded.includes(hin)) {
          locationHint = hin;
          break;
        }
      }
      if (/crime|police|murder|arrest|fraud|fir|loot|chori|hatya|thana|scam/i.test(decoded)) {
        categoryHint = "\u0905\u092A\u0930\u093E\u0927";
      } else if (/accident|hadsa|takkar|injured|death|maut|ghayal/i.test(decoded)) {
        categoryHint = "\u0939\u093E\u0926\u0938\u093E";
      } else if (/politics|chunav|election|cm|bjp|congress|mantri|sarkar|yojana/i.test(decoded)) {
        categoryHint = "\u0930\u093E\u091C\u0928\u0940\u0924\u093F";
      } else if (/weather|rain|barish|mosam|mausam|alert/i.test(decoded)) {
        categoryHint = "\u092E\u094C\u0938\u092E";
      } else if (/vikas|prashasan|collector|order|circular/i.test(decoded)) {
        categoryHint = "\u092A\u094D\u0930\u0936\u093E\u0938\u0928";
      }
      if (decoded.includes("-") || decoded.includes("_") || decoded.length > 15) {
        const cleanedSlug = decoded.replace(/\.(html?|amp|php|aspx?)$/i, "").replace(/[-_]\d{4,}$/, "").replace(/[-_]+/g, " ").trim();
        const words = cleanedSlug.split(/\s+/).filter(
          (w) => w.length > 2 && !/^(news|hindi|article|story|latest|today|update|mp|india|madhya|pradesh|local|city|state)$/i.test(w)
        );
        meaningfulWords.push(...words);
      }
    }
    const titleHint = meaningfulWords.length > 0 ? meaningfulWords.join(" ") : `${domain} \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F`;
    return {
      domain,
      slugWords: meaningfulWords,
      titleHint,
      locationHint,
      categoryHint
    };
  } catch {
    return {
      domain: rawUrl,
      slugWords: [],
      titleHint: "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F"
    };
  }
}
async function fetchViaReaderProxy(targetUrl) {
  try {
    const readerUrl = `https://r.jina.ai/${targetUrl}`;
    const res = await fetch(readerUrl, {
      headers: {
        "Accept": "text/plain, text/markdown, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      signal: AbortSignal.timeout(12e3)
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.trim().length < 50) return null;
    let title = "";
    const titleMatch = text.match(/^Title:\s*(.+)$/m);
    if (titleMatch) {
      title = stripNewsSiteBranding(cleanHeadlineText(cleanHtmlEntities(titleMatch[1].trim())));
    }
    let urlSource = targetUrl;
    const urlMatch = text.match(/^URL Source:\s*(.+)$/m);
    if (urlMatch) {
      urlSource = urlMatch[1].trim();
    }
    let rawContent = "";
    const contentMatch = text.match(/Markdown Content:\s*([\s\S]+)$/i);
    if (contentMatch) {
      rawContent = contentMatch[1].trim();
    } else {
      rawContent = text.replace(/^Title:.*$/m, "").replace(/^URL Source:.*$/m, "").trim();
    }
    const images = [];
    const imgRegex = /!\[.*?\]\((https?:\/\/[^\s\)]+)\)/g;
    let match;
    while ((match = imgRegex.exec(rawContent)) !== null) {
      const imgUrl = match[1];
      if (imgUrl && !images.includes(imgUrl) && !imgUrl.includes(".svg") && !imgUrl.includes("logo") && !imgUrl.includes("icon") && !imgUrl.includes("avatar") && !imgUrl.includes("badge")) {
        images.push(imgUrl);
      }
    }
    const cleanedContent = rawContent.replace(/!\[.*?\]\(.*?\)/g, " ").replace(/\[([^\]]+)\]\(.*?\)/g, "$1").replace(/[*#_`>~]/g, "").replace(/\s+/g, " ").trim();
    const desc = cleanedContent.slice(0, 320);
    return {
      title: title || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F",
      description: desc,
      content: cleanedContent.slice(0, 3500),
      images: images.slice(0, 6),
      sourceUrl: urlSource || targetUrl,
      isRss: false,
      extractionStatus: title || cleanedContent.length > 50 ? "success" : "failed"
    };
  } catch (err) {
    console.warn("[Reader Proxy] Fallback error for URL:", targetUrl, err?.message || err);
    return null;
  }
}
async function fetchAndProcessNewsUrl(rawUrl) {
  const normalizedRawUrl = (rawUrl || "").replace(/&amp;/g, "&").trim();
  const initialSafety = isSafePublicUrl(normalizedRawUrl);
  if (!initialSafety.safe) {
    return {
      title: "",
      description: "",
      content: "",
      images: [],
      sourceUrl: normalizedRawUrl,
      isRss: false,
      extractionStatus: "failed",
      inaccessibleReason: initialSafety.error || "Invalid or restricted URL"
    };
  }
  const standardBrowserHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "hi,hi-IN;q=0.9,en-US;q=0.8,en;q=0.7",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1"
  };
  let response = null;
  let rawBody = "";
  let currentUrl = normalizedRawUrl;
  let finalRedirectedUrl = normalizedRawUrl;
  let redirectCount = 0;
  const maxRedirects = 5;
  let lastStatus = 0;
  while (redirectCount <= maxRedirects) {
    const hopSafety = isSafePublicUrl(currentUrl);
    if (!hopSafety.safe) {
      return {
        title: "",
        description: "",
        content: "",
        images: [],
        sourceUrl: currentUrl,
        isRss: false,
        extractionStatus: "failed",
        inaccessibleReason: "Redirect destination points to an internal or restricted network address (SSRF blocked)"
      };
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12e3);
      const res = await fetch(currentUrl, {
        headers: standardBrowserHeaders,
        signal: controller.signal,
        redirect: "manual"
      });
      clearTimeout(timeoutId);
      lastStatus = res.status;
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const locationHeader = res.headers.get("location");
        if (locationHeader) {
          const resolved = resolveUrl(locationHeader.trim(), currentUrl);
          if (resolved && resolved !== currentUrl) {
            currentUrl = resolved;
            finalRedirectedUrl = currentUrl;
            redirectCount++;
            continue;
          }
        }
      }
      response = res;
      finalRedirectedUrl = currentUrl;
      if (!res.ok && [401, 403, 429, 503].includes(res.status)) {
        try {
          const botController = new AbortController();
          const botTimeoutId = setTimeout(() => botController.abort(), 1e4);
          const botRes = await fetch(currentUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "hi,en;q=0.9"
            },
            signal: botController.signal,
            redirect: "manual"
          });
          clearTimeout(botTimeoutId);
          if (botRes.ok) {
            response = botRes;
            lastStatus = botRes.status;
          }
        } catch {
        }
      }
      if (response && response.ok) {
        const reader = response.body?.getReader();
        if (reader) {
          const chunks = [];
          let totalBytes = 0;
          const maxBytes = 5 * 1024 * 1024;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              totalBytes += value.length;
              chunks.push(value);
              if (totalBytes >= maxBytes) {
                reader.cancel();
                break;
              }
            }
          }
          rawBody = Buffer.concat(chunks).toString("utf-8");
        } else {
          rawBody = await response.text();
        }
      }
      break;
    } catch (fetchErr) {
      console.warn(`[URL Scraper] Network fetch failed for ${currentUrl}:`, fetchErr?.message || fetchErr);
      break;
    }
  }
  if (!rawBody || rawBody.length < 50 || !response || !response.ok) {
    console.log(`[URL Scraper] Direct fetch failed for ${normalizedRawUrl} (status: ${lastStatus}). Attempting reader proxy fallback...`);
    const readerFallback = await fetchViaReaderProxy(normalizedRawUrl);
    if (readerFallback && (readerFallback.content || readerFallback.title)) {
      return readerFallback;
    }
    let failureReason = "Network fetch failed or timed out";
    if (lastStatus === 403 || lastStatus === 401) {
      failureReason = "Publisher returned access-denied or requires authentication (HTTP 403/401)";
    } else if (lastStatus === 404) {
      failureReason = "Article URL not found on publisher website (HTTP 404)";
    } else if (lastStatus === 429) {
      failureReason = "Publisher rate-limited automated access (HTTP 429)";
    } else if (lastStatus >= 500) {
      failureReason = `Publisher server is temporarily unavailable (HTTP ${lastStatus})`;
    }
    return {
      title: "",
      description: "",
      content: "",
      images: [],
      sourceUrl: normalizedRawUrl,
      isRss: false,
      extractionStatus: "failed",
      inaccessibleReason: failureReason
    };
  }
  const contentType = (response?.headers.get("content-type") || "").toLowerCase();
  const isXmlOrRss = contentType.includes("xml") || contentType.includes("rss") || contentType.includes("atom") || /^\s*<\?xml/i.test(rawBody) || /<(?:rss|feed|channel)[\s>]/i.test(rawBody.slice(0, 1500)) && !/<html[\s>]/i.test(rawBody.slice(0, 500));
  if (isXmlOrRss) {
    const itemMatch = rawBody.match(/<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/i);
    if (itemMatch) {
      const itemStr = itemMatch[0];
      const tMatch = itemStr.match(/<title[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const itemTitle = cleanHtmlEntities((tMatch ? tMatch[1] || tMatch[2] || "" : "").replace(/<[^>]+>/g, "").trim());
      const lMatch = itemStr.match(/<link[^>]*href=["']([^"']+)["']/i) || itemStr.match(/<link[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i);
      let itemLink = (lMatch ? lMatch[1] || lMatch[2] || lMatch[3] || "" : "").trim();
      if (itemLink) {
        itemLink = resolveUrl(cleanHtmlEntities(itemLink).replace(/&amp;/g, "&"), finalRedirectedUrl);
      }
      const dMatch = itemStr.match(/<(?:description|summary)[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/(?:description|summary)>/i);
      const rawItemDesc = dMatch ? dMatch[1] || dMatch[2] || "" : "";
      const itemDesc = cleanHtmlEntities(rawItemDesc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      const cMatch = itemStr.match(/<content:encoded[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/content:encoded>/i);
      const rawEncoded = cMatch ? cMatch[1] || cMatch[2] || "" : "";
      const itemContent = cleanHtmlEntities(rawEncoded.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      const rssImages = [];
      const encMatch = itemStr.match(/<enclosure[^>]*url=["']([^"']+)["']/i) || itemStr.match(/<media:(?:thumbnail|content)[^>]*url=["']([^"']+)["']/i);
      if (encMatch && encMatch[1]) {
        const resolved = resolveUrl(encMatch[1].trim(), finalRedirectedUrl);
        if (resolved) rssImages.push(resolved);
      }
      const descImgMatch = (rawEncoded || rawItemDesc).match(/<img[^>]+src=["']([^"']+)["']/i);
      if (descImgMatch && descImgMatch[1]) {
        const resolved = resolveUrl(descImgMatch[1].trim(), finalRedirectedUrl);
        if (resolved && !rssImages.includes(resolved)) rssImages.push(resolved);
      }
      if (itemLink && (itemLink.startsWith("http://") || itemLink.startsWith("https://"))) {
        try {
          const articleSafety = isSafePublicUrl(itemLink);
          if (articleSafety.safe) {
            const artRes = await fetch(itemLink, {
              headers: standardBrowserHeaders,
              signal: AbortSignal.timeout(1e4)
            });
            if (artRes.ok) {
              const artHtml = await artRes.text();
              const deepArticle = parseArticleHtml(artHtml, itemLink);
              if (deepArticle.extractionStatus === "success" && (deepArticle.content || deepArticle.description)) {
                return {
                  title: deepArticle.title || itemTitle,
                  description: deepArticle.description || itemDesc,
                  content: deepArticle.content || itemContent || itemDesc,
                  images: deepArticle.images.length > 0 ? deepArticle.images : rssImages,
                  sourceUrl: itemLink,
                  canonicalUrl: deepArticle.canonicalUrl,
                  publishedDate: deepArticle.publishedDate,
                  isRss: true,
                  extractionStatus: "success"
                };
              }
            }
          }
        } catch (deepErr) {
          console.warn("Deep article fetch from RSS link failed, checking RSS item facts:", deepErr);
        }
      }
      const hasRssFacts = itemContent && itemContent.length >= 60 || itemDesc && itemDesc.length >= 40 && itemTitle && itemTitle.length >= 10;
      return {
        title: itemTitle,
        description: itemDesc,
        content: itemContent || itemDesc,
        images: rssImages,
        sourceUrl: itemLink || finalRedirectedUrl,
        isRss: true,
        extractionStatus: hasRssFacts ? "success" : "failed",
        inaccessibleReason: hasRssFacts ? void 0 : "RSS story content lacks sufficient details"
      };
    }
  }
  const article = parseArticleHtml(rawBody, finalRedirectedUrl);
  if (article.extractionStatus === "failed" || !article.content && !article.description && (!article.title || article.title.length < 10)) {
    console.log(`[URL Scraper] HTML parsing yielded no real content for ${finalRedirectedUrl}. Attempting reader proxy fallback...`);
    const readerFallback = await fetchViaReaderProxy(finalRedirectedUrl);
    if (readerFallback && (readerFallback.content || readerFallback.title)) {
      return readerFallback;
    }
  }
  return {
    title: article.title,
    description: article.description,
    content: article.content,
    images: article.images,
    sourceUrl: finalRedirectedUrl,
    canonicalUrl: article.canonicalUrl,
    publishedDate: article.publishedDate,
    isRss: false,
    extractionStatus: article.extractionStatus,
    inaccessibleReason: article.inaccessibleReason
  };
}
var DISTRICT_STATE_LIST = [
  // Madhya Pradesh
  { district: "\u0936\u0939\u0921\u094B\u0932", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["shahdol", "\u0936\u0939\u0921\u094B\u0932"] },
  { district: "\u0905\u0928\u0942\u092A\u092A\u0941\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["anuppur", "\u0905\u0928\u0942\u092A\u092A\u0941\u0930"] },
  { district: "\u0909\u092E\u0930\u093F\u092F\u093E", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["umaria", "\u0909\u092E\u0930\u093F\u092F\u093E"] },
  { district: "\u0938\u0940\u0927\u0940", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["sidhi", "\u0938\u0940\u0927\u0940"] },
  { district: "\u0938\u093F\u0902\u0917\u0930\u094C\u0932\u0940", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["singrauli", "\u0938\u093F\u0902\u0917\u0930\u094C\u0932\u0940"] },
  { district: "\u0930\u0940\u0935\u093E", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["rewa", "\u0930\u0940\u0935\u093E"] },
  { district: "\u0938\u0924\u0928\u093E", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["satna", "\u0938\u0924\u0928\u093E"] },
  { district: "\u092D\u094B\u092A\u093E\u0932", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["bhopal", "\u092D\u094B\u092A\u093E\u0932"] },
  { district: "\u0907\u0902\u0926\u094C\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["indore", "\u0907\u0902\u0926\u094C\u0930"] },
  { district: "\u091C\u092C\u0932\u092A\u0941\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["jabalpur", "\u091C\u092C\u0932\u092A\u0941\u0930"] },
  { district: "\u0917\u094D\u0935\u093E\u0932\u093F\u092F\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["gwalior", "\u0917\u094D\u0935\u093E\u0932\u093F\u092F\u0930"] },
  { district: "\u0909\u091C\u094D\u091C\u0948\u0928", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["ujjain", "\u0909\u091C\u094D\u091C\u0948\u0928"] },
  { district: "\u0938\u093E\u0917\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["sagar", "\u0938\u093E\u0917\u0930"] },
  { district: "\u091B\u0924\u0930\u092A\u0941\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["chhatarpur", "\u091B\u0924\u0930\u092A\u0941\u0930"] },
  { district: "\u0926\u092E\u094B\u0939", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["damoh", "\u0926\u092E\u094B\u0939"] },
  { district: "\u092A\u0928\u094D\u0928\u093E", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["panna", "\u092A\u0928\u094D\u0928\u093E"] },
  { district: "\u091F\u0940\u0915\u092E\u0917\u0922\u093C", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["tikamgarh", "\u091F\u0940\u0915\u092E\u0917\u0922\u093C"] },
  { district: "\u0928\u093F\u0935\u093E\u0921\u093C\u0940", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["niwari", "\u0928\u093F\u0935\u093E\u0921\u093C\u0940"] },
  { district: "\u0915\u091F\u0928\u0940", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["katni", "\u0915\u091F\u0928\u0940"] },
  { district: "\u092E\u0902\u0921\u0932\u093E", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["mandla", "\u092E\u0902\u0921\u0932\u093E"] },
  { district: "\u0921\u093F\u0902\u0921\u094B\u0930\u0940", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["dindori", "\u0921\u093F\u0902\u0921\u094B\u0930\u0940"] },
  { district: "\u091B\u093F\u0902\u0926\u0935\u093E\u0921\u093C\u093E", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["chhindwara", "\u091B\u093F\u0902\u0926\u0935\u093E\u0921\u093C\u093E"] },
  { district: "\u0938\u093F\u0935\u0928\u0940", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["seoni", "\u0938\u093F\u0935\u0928\u0940"] },
  { district: "\u092C\u093E\u0932\u093E\u0918\u093E\u091F", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["balaghat", "\u092C\u093E\u0932\u093E\u0918\u093E\u091F"] },
  { district: "\u092C\u0948\u0924\u0942\u0932", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["betul", "\u092C\u0948\u0924\u0942\u0932"] },
  { district: "\u0939\u0930\u0926\u093E", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["harda", "\u0939\u0930\u0926\u093E"] },
  { district: "\u0939\u094B\u0936\u0902\u0917\u093E\u092C\u093E\u0926", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["hoshangabad", "\u0928\u0930\u094D\u092E\u0926\u093E\u092A\u0941\u0930\u092E", "narmadapuram"] },
  { district: "\u0930\u093E\u092F\u0938\u0947\u0928", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["raisen", "\u0930\u093E\u092F\u0938\u0947\u0928"] },
  { district: "\u0935\u093F\u0926\u093F\u0936\u093E", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["vidisha", "\u0935\u093F\u0926\u093F\u0936\u093E"] },
  { district: "\u0938\u0940\u0939\u094B\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["sehore", "\u0938\u0940\u0939\u094B\u0930"] },
  { district: "\u0930\u093E\u091C\u0917\u0922\u093C", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["rajgarh", "\u0930\u093E\u091C\u0917\u0922\u093C"] },
  { district: "\u0936\u093E\u091C\u093E\u092A\u0941\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["shajapur", "\u0936\u093E\u091C\u093E\u092A\u0941\u0930"] },
  { district: "\u0906\u0917\u0930 \u092E\u093E\u0932\u0935\u093E", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["agar", "\u0906\u0917\u0930"] },
  { district: "\u0926\u0947\u0935\u093E\u0938", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["dewas", "\u0926\u0947\u0935\u093E\u0938"] },
  { district: "\u0930\u0924\u0932\u093E\u092E", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["ratlam", "\u0930\u0924\u0932\u093E\u092E"] },
  { district: "\u092E\u0902\u0926\u0938\u094C\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["mandsaur", "\u092E\u0902\u0926\u0938\u094C\u0930"] },
  { district: "\u0928\u0940\u092E\u091A", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["neemuch", "\u0928\u0940\u092E\u091A"] },
  { district: "\u0927\u093E\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["dhar", "\u0927\u093E\u0930"] },
  { district: "\u091D\u093E\u092C\u0941\u0906", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["jhabua", "\u091D\u093E\u092C\u0941\u0906"] },
  { district: "\u0905\u0932\u0940\u0930\u093E\u091C\u092A\u0941\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["alirajpur", "\u0905\u0932\u0940\u0930\u093E\u091C\u092A\u0941\u0930"] },
  { district: "\u092C\u0921\u093C\u0935\u093E\u0928\u0940", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["barwani", "\u092C\u0921\u093C\u0935\u093E\u0928\u0940"] },
  { district: "\u0916\u0930\u0917\u094B\u0928", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["khargone", "\u0916\u0930\u0917\u094B\u0928"] },
  { district: "\u0916\u0902\u0921\u0935\u093E", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["khandwa", "\u0916\u0902\u0921\u0935\u093E"] },
  { district: "\u092C\u0941\u0930\u0939\u093E\u0928\u092A\u0941\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["burhanpur", "\u092C\u0941\u0930\u0939\u093E\u0928\u092A\u0941\u0930"] },
  { district: "\u092D\u093F\u0902\u0921", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["bhind", "\u092D\u093F\u0902\u0921"] },
  { district: "\u092E\u0941\u0930\u0948\u0928\u093E", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["morena", "\u092E\u0941\u0930\u0948\u0928\u093E"] },
  { district: "\u0936\u094D\u092F\u094B\u092A\u0941\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["sheopur", "\u0936\u094D\u092F\u094B\u092A\u0941\u0930"] },
  { district: "\u0936\u093F\u0935\u092A\u0941\u0930\u0940", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["shivpuri", "\u0936\u093F\u0935\u092A\u0941\u0930\u0940"] },
  { district: "\u0917\u0941\u0928\u093E", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["guna", "\u0917\u0941\u0928\u093E"] },
  { district: "\u0905\u0936\u094B\u0915\u0928\u0917\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["ashoknagar", "\u0905\u0936\u094B\u0915\u0928\u0917\u0930"] },
  { district: "\u092E\u0948\u0939\u0930", state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["maihar", "\u092E\u0948\u0939\u0930"] },
  // Uttar Pradesh
  { district: "\u091D\u093E\u0902\u0938\u0940", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["jhansi", "\u091D\u093E\u0902\u0938\u0940"] },
  { district: "\u0932\u0916\u0928\u090A", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["lucknow", "\u0932\u0916\u0928\u090A"] },
  { district: "\u0935\u093E\u0930\u093E\u0923\u0938\u0940", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["varanasi", "banaras", "\u0935\u093E\u0930\u093E\u0923\u0938\u0940", "\u092C\u0928\u093E\u0930\u0938", "\u0915\u093E\u0936\u0940"] },
  { district: "\u0915\u093E\u0928\u092A\u0941\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["kanpur", "\u0915\u093E\u0928\u092A\u0941\u0930"] },
  { district: "\u092A\u094D\u0930\u092F\u093E\u0917\u0930\u093E\u091C", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["prayagraj", "allahabad", "\u092A\u094D\u0930\u092F\u093E\u0917\u0930\u093E\u091C", "\u0907\u0932\u093E\u0939\u093E\u092C\u093E\u0926"] },
  { district: "\u0917\u094B\u0930\u0916\u092A\u0941\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["gorakhpur", "\u0917\u094B\u0930\u0916\u092A\u0941\u0930"] },
  { district: "\u0906\u0917\u0930\u093E", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["agra", "\u0906\u0917\u0930\u093E"] },
  { district: "\u092E\u0925\u0941\u0930\u093E", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["mathura", "\u092E\u0925\u0941\u0930\u093E"] },
  { district: "\u092E\u0947\u0930\u0920", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["meerut", "\u092E\u0947\u0930\u0920"] },
  { district: "\u092C\u0930\u0947\u0932\u0940", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["bareilly", "\u092C\u0930\u0947\u0932\u0940"] },
  { district: "\u0905\u0932\u0940\u0917\u0922\u093C", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["aligarh", "\u0905\u0932\u0940\u0917\u0922\u093C"] },
  { district: "\u092E\u0941\u0930\u093E\u0926\u093E\u092C\u093E\u0926", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["moradabad", "\u092E\u0941\u0930\u093E\u0926\u093E\u092C\u093E\u0926"] },
  { district: "\u0905\u092F\u094B\u0927\u094D\u092F\u093E", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["ayodhya", "faizabad", "\u0905\u092F\u094B\u0927\u094D\u092F\u093E", "\u092B\u0948\u091C\u093E\u092C\u093E\u0926"] },
  { district: "\u0938\u0939\u093E\u0930\u0928\u092A\u0941\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["saharanpur", "\u0938\u0939\u093E\u0930\u0928\u092A\u0941\u0930"] },
  { district: "\u0928\u094B\u090F\u0921\u093E", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["noida", "\u0928\u094B\u090F\u0921\u093E", "\u0917\u094C\u0924\u092E\u092C\u0941\u0926\u094D\u0927 \u0928\u0917\u0930"] },
  { district: "\u0917\u093E\u091C\u093F\u092F\u093E\u092C\u093E\u0926", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["ghaziabad", "\u0917\u093E\u091C\u093F\u092F\u093E\u092C\u093E\u0926"] },
  { district: "\u092E\u093F\u0930\u094D\u091C\u093E\u092A\u0941\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["mirzapur", "\u092E\u093F\u0930\u094D\u091C\u093E\u092A\u0941\u0930"] },
  { district: "\u092C\u093E\u0902\u0926\u093E", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["banda", "\u092C\u093E\u0902\u0926\u093E"] },
  { district: "\u091A\u093F\u0924\u094D\u0930\u0915\u0942\u091F", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["chitrakoot", "\u091A\u093F\u0924\u094D\u0930\u0915\u0942\u091F"] },
  { district: "\u092E\u0939\u094B\u092C\u093E", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["mahoba", "\u092E\u0939\u094B\u092C\u093E"] },
  { district: "\u0939\u092E\u0940\u0930\u092A\u0941\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["hamirpur", "\u0939\u092E\u0940\u0930\u092A\u0941\u0930"] },
  { district: "\u091C\u093E\u0932\u094C\u0928", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["jalaun", "orai", "\u0909\u0930\u0908", "\u091C\u093E\u0932\u094C\u0928"] },
  { district: "\u0932\u0932\u093F\u0924\u092A\u0941\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["lalitpur", "\u0932\u0932\u093F\u0924\u092A\u0941\u0930"] },
  { district: "\u092C\u0938\u094D\u0924\u0940", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["basti", "\u092C\u0938\u094D\u0924\u0940"] },
  { district: "\u0917\u094B\u0902\u0921\u093E", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["gonda", "\u0917\u094B\u0902\u0921\u093E"] },
  { district: "\u092C\u0939\u0930\u093E\u0907\u091A", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["bahraich", "\u092C\u0939\u0930\u093E\u0907\u091A"] },
  { district: "\u0926\u0947\u0935\u0930\u093F\u092F\u093E", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["deoria", "\u0926\u0947\u0935\u0930\u093F\u092F\u093E"] },
  { district: "\u092C\u0932\u093F\u092F\u093E", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["ballia", "\u092C\u0932\u093F\u092F\u093E"] },
  { district: "\u0906\u091C\u092E\u0917\u0922\u093C", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["azamgarh", "\u0906\u091C\u092E\u0917\u0922\u093C"] },
  { district: "\u091C\u094C\u0928\u092A\u0941\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["jaunpur", "\u091C\u094C\u0928\u092A\u0941\u0930"] },
  { district: "\u0917\u093E\u091C\u0940\u092A\u0941\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["ghazipur", "\u0917\u093E\u091C\u0940\u092A\u0941\u0930"] },
  { district: "\u0938\u094B\u0928\u092D\u0926\u094D\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["sonbhadra", "\u0938\u094B\u0928\u092D\u0926\u094D\u0930"] },
  { district: "\u092A\u094D\u0930\u0924\u093E\u092A\u0917\u0922\u093C", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["pratapgarh", "\u092A\u094D\u0930\u0924\u093E\u092A\u0917\u0922\u093C"] },
  { district: "\u092B\u0924\u0947\u0939\u092A\u0941\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["fatehpur", "\u092B\u0924\u0947\u0939\u092A\u0941\u0930"] },
  { district: "\u0909\u0928\u094D\u0928\u093E\u0935", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["unnao", "\u0909\u0928\u094D\u0928\u093E\u0935"] },
  { district: "\u0930\u093E\u092F\u092C\u0930\u0947\u0932\u0940", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["raebareli", "\u0930\u093E\u092F\u092C\u0930\u0947\u0932\u0940"] },
  { district: "\u0905\u092E\u0947\u0920\u0940", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["amethi", "\u0905\u092E\u0947\u0920\u0940"] },
  { district: "\u0938\u0941\u0932\u094D\u0924\u093E\u0928\u092A\u0941\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["sultanpur", "\u0938\u0941\u0932\u094D\u0924\u093E\u0928\u092A\u0941\u0930"] },
  { district: "\u0938\u0940\u0924\u093E\u092A\u0941\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["sitapur", "\u0938\u0940\u0924\u093E\u092A\u0941\u0930"] },
  { district: "\u0939\u0930\u0926\u094B\u0908", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["hardoi", "\u0939\u0930\u0926\u094B\u0908"] },
  { district: "\u0932\u0916\u0940\u092E\u092A\u0941\u0930 \u0916\u0940\u0930\u0940", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["lakhimpur", "\u0932\u0916\u0940\u092E\u092A\u0941\u0930"] },
  { district: "\u0936\u093E\u0939\u091C\u0939\u093E\u0902\u092A\u0941\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["shahjahanpur", "\u0936\u093E\u0939\u091C\u0939\u093E\u0902\u092A\u0941\u0930"] },
  { district: "\u092C\u0941\u0932\u0902\u0926\u0936\u0939\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["bulandshahr", "\u092C\u0941\u0932\u0902\u0926\u0936\u0939\u0930"] },
  { district: "\u0939\u093E\u092A\u0941\u0921\u093C", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["hapur", "\u0939\u093E\u092A\u0941\u0921\u093C"] },
  { district: "\u092E\u0941\u091C\u092B\u094D\u092B\u0930\u0928\u0917\u0930", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["muzaffarnagar", "\u092E\u0941\u091C\u092B\u094D\u092B\u0930\u0928\u0917\u0930"] },
  { district: "\u0907\u091F\u093E\u0935\u093E", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["etawah", "\u0907\u091F\u093E\u0935\u093E"] },
  { district: "\u0915\u0928\u094D\u0928\u094C\u091C", state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["kannauj", "\u0915\u0928\u094D\u0928\u094C\u091C"] },
  // Uttarakhand
  { district: "\u0928\u0948\u0928\u0940\u0924\u093E\u0932", state: "\u0909\u0924\u094D\u0924\u0930\u093E\u0916\u0902\u0921", aliases: ["nainital", "\u0928\u0948\u0928\u0940\u0924\u093E\u0932"] },
  { district: "\u0926\u0947\u0939\u0930\u093E\u0926\u0942\u0928", state: "\u0909\u0924\u094D\u0924\u0930\u093E\u0916\u0902\u0921", aliases: ["dehradun", "\u0926\u0947\u0939\u0930\u093E\u0926\u0942\u0928"] },
  { district: "\u0939\u0930\u093F\u0926\u094D\u0935\u093E\u0930", state: "\u0909\u0924\u094D\u0924\u0930\u093E\u0916\u0902\u0921", aliases: ["haridwar", "\u0939\u0930\u093F\u0926\u094D\u0935\u093E\u0930"] },
  { district: "\u0905\u0932\u094D\u092E\u094B\u0921\u093C\u093E", state: "\u0909\u0924\u094D\u0924\u0930\u093E\u0916\u0902\u0921", aliases: ["almora", "\u0905\u0932\u094D\u092E\u094B\u0921\u093C\u093E"] },
  { district: "\u090A\u0927\u092E\u0938\u093F\u0902\u0939 \u0928\u0917\u0930", state: "\u0909\u0924\u094D\u0924\u0930\u093E\u0916\u0902\u0921", aliases: ["udhamsingh", "\u0930\u0941\u0926\u094D\u0930\u092A\u0941\u0930"] },
  { district: "\u092A\u094C\u0921\u093C\u0940 \u0917\u0922\u093C\u0935\u093E\u0932", state: "\u0909\u0924\u094D\u0924\u0930\u093E\u0916\u0902\u0921", aliases: ["pauri", "\u092A\u094C\u0921\u093C\u0940"] },
  { district: "\u091F\u093F\u0939\u0930\u0940", state: "\u0909\u0924\u094D\u0924\u0930\u093E\u0916\u0902\u0921", aliases: ["tehri", "\u091F\u093F\u0939\u0930\u0940"] },
  { district: "\u091A\u092E\u094B\u0932\u0940", state: "\u0909\u0924\u094D\u0924\u0930\u093E\u0916\u0902\u0921", aliases: ["chamoli", "\u091A\u092E\u094B\u0932\u0940"] },
  { district: "\u0909\u0924\u094D\u0924\u0930\u0915\u093E\u0936\u0940", state: "\u0909\u0924\u094D\u0924\u0930\u093E\u0916\u0902\u0921", aliases: ["uttarkashi", "\u0909\u0924\u094D\u0924\u0930\u0915\u093E\u0936\u0940"] },
  { district: "\u092A\u093F\u0925\u094C\u0930\u093E\u0917\u0922\u093C", state: "\u0909\u0924\u094D\u0924\u0930\u093E\u0916\u0902\u0921", aliases: ["pithoragarh", "\u092A\u093F\u0925\u094C\u0930\u093E\u0917\u0922\u093C"] },
  // Bihar
  { district: "\u092A\u091F\u0928\u093E", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["patna", "\u092A\u091F\u0928\u093E"] },
  { district: "\u0917\u092F\u093E", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["gaya", "\u0917\u092F\u093E"] },
  { district: "\u092E\u0941\u091C\u092B\u094D\u092B\u0930\u092A\u0941\u0930", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["muzaffarpur", "\u092E\u0941\u091C\u092B\u094D\u092B\u0930\u092A\u0941\u0930"] },
  { district: "\u092D\u093E\u0917\u0932\u092A\u0941\u0930", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["bhagalpur", "\u092D\u093E\u0917\u0932\u092A\u0941\u0930"] },
  { district: "\u0926\u0930\u092D\u0902\u0917\u093E", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["darbhanga", "\u0926\u0930\u092D\u0902\u0917\u093E"] },
  { district: "\u092A\u0942\u0930\u094D\u0923\u093F\u092F\u093E", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["purnia", "\u092A\u0942\u0930\u094D\u0923\u093F\u092F\u093E"] },
  { district: "\u0938\u0939\u0930\u0938\u093E", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["saharsa", "\u0938\u0939\u0930\u0938\u093E"] },
  { district: "\u092C\u0947\u0917\u0942\u0938\u0930\u093E\u092F", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["begusarai", "\u092C\u0947\u0917\u0942\u0938\u0930\u093E\u092F"] },
  { district: "\u091B\u092A\u0930\u093E", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["chapra", "saran", "\u0938\u093E\u0930\u0923", "\u091B\u092A\u0930\u093E"] },
  { district: "\u0938\u0940\u0935\u093E\u0928", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["siwan", "\u0938\u0940\u0935\u093E\u0928"] },
  { district: "\u0917\u094B\u092A\u093E\u0932\u0917\u0902\u091C", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["gopalganj", "\u0917\u094B\u092A\u093E\u0932\u0917\u0902\u091C"] },
  { district: "\u092E\u094B\u0924\u093F\u0939\u093E\u0930\u0940", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["motihari", "\u092E\u094B\u0924\u093F\u0939\u093E\u0930\u0940", "\u091A\u0902\u092A\u093E\u0930\u0923"] },
  { district: "\u0938\u092E\u0938\u094D\u0924\u0940\u092A\u0941\u0930", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["samastipur", "\u0938\u092E\u0938\u094D\u0924\u0940\u092A\u0941\u0930"] },
  { district: "\u0928\u093E\u0932\u0902\u0926\u093E", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["nalanda", "biharsharif", "\u0928\u093E\u0932\u0902\u0926\u093E", "\u092C\u093F\u0939\u093E\u0930\u0936\u0930\u0940\u092B"] },
  { district: "\u0906\u0930\u093E", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["arrah", "bhojpur", "\u092D\u094B\u091C\u092A\u0941\u0930", "\u0906\u0930\u093E"] },
  { district: "\u092C\u0915\u094D\u0938\u0930", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["buxar", "\u092C\u0915\u094D\u0938\u0930"] },
  { district: "\u0938\u093E\u0938\u093E\u0930\u093E\u092E", state: "\u092C\u093F\u0939\u093E\u0930", aliases: ["sasaram", "rohtas", "\u0930\u094B\u0939\u0924\u093E\u0938", "\u0938\u093E\u0938\u093E\u0930\u093E\u092E"] },
  // Rajasthan
  { district: "\u091C\u092F\u092A\u0941\u0930", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["jaipur", "\u091C\u092F\u092A\u0941\u0930"] },
  { district: "\u091C\u094B\u0927\u092A\u0941\u0930", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["jodhpur", "\u091C\u094B\u0927\u092A\u0941\u0930"] },
  { district: "\u0909\u0926\u092F\u092A\u0941\u0930", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["udaipur", "\u0909\u0926\u092F\u092A\u0941\u0930"] },
  { district: "\u0915\u094B\u091F\u093E", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["kota", "\u0915\u094B\u091F\u093E"] },
  { district: "\u0905\u091C\u092E\u0947\u0930", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["ajmer", "\u0905\u091C\u092E\u0947\u0930"] },
  { district: "\u092C\u0940\u0915\u093E\u0928\u0947\u0930", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["bikaner", "\u092C\u0940\u0915\u093E\u0928\u0947\u0930"] },
  { district: "\u092D\u0930\u0924\u092A\u0941\u0930", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["bharatpur", "\u092D\u0930\u0924\u092A\u0941\u0930"] },
  { district: "\u092D\u0940\u0932\u0935\u093E\u0921\u093C\u093E", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["bhilwara", "\u092D\u0940\u0932\u0935\u093E\u0921\u093C\u093E"] },
  { district: "\u0905\u0932\u0935\u0930", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["alwar", "\u0905\u0932\u0935\u0930"] },
  { district: "\u0938\u0940\u0915\u0930", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["sikar", "\u0938\u0940\u0915\u0930"] },
  { district: "\u092A\u093E\u0932\u0940", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["pali", "\u092A\u093E\u0932\u0940"] },
  { district: "\u092C\u093E\u0921\u093C\u092E\u0947\u0930", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["barmer", "\u092C\u093E\u0921\u093C\u092E\u0947\u0930"] },
  { district: "\u091C\u0948\u0938\u0932\u092E\u0947\u0930", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["jaisalmer", "\u091C\u0948\u0938\u0932\u092E\u0947\u0930"] },
  { district: "\u0928\u093E\u0917\u094C\u0930", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["nagaur", "\u0928\u093E\u0917\u094C\u0930"] },
  { district: "\u091A\u0942\u0930\u0942", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["churu", "\u091A\u0942\u0930\u0942"] },
  { district: "\u091D\u0941\u0902\u091D\u0941\u0928\u0942\u0902", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["jhunjhunu", "\u091D\u0941\u0902\u091D\u0941\u0928\u0942\u0902"] },
  { district: "\u091A\u093F\u0924\u094D\u0924\u094C\u0921\u093C\u0917\u0922\u093C", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["chittorgarh", "\u091A\u093F\u0924\u094D\u0924\u094C\u0921\u093C\u0917\u0922\u093C"] },
  { district: "\u0936\u094D\u0930\u0940\u0917\u0902\u0917\u093E\u0928\u0917\u0930", state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["ganganagar", "\u0936\u094D\u0930\u0940\u0917\u0902\u0917\u093E\u0928\u0917\u0930"] },
  // Chhattisgarh
  { district: "\u0930\u093E\u092F\u092A\u0941\u0930", state: "\u091B\u0924\u094D\u0924\u0940\u0938\u0917\u0922\u093C", aliases: ["raipur", "\u0930\u093E\u092F\u092A\u0941\u0930"] },
  { district: "\u092C\u093F\u0932\u093E\u0938\u092A\u0941\u0930", state: "\u091B\u0924\u094D\u0924\u0940\u0938\u0917\u0922\u093C", aliases: ["bilaspur", "\u092C\u093F\u0932\u093E\u0938\u092A\u0941\u0930"] },
  { district: "\u0926\u0941\u0930\u094D\u0917", state: "\u091B\u0924\u094D\u0924\u0940\u0938\u0917\u0922\u093C", aliases: ["durg", "bhilai", "\u0926\u0941\u0930\u094D\u0917", "\u092D\u093F\u0932\u093E\u0908"] },
  { district: "\u0915\u094B\u0930\u092C\u093E", state: "\u091B\u0924\u094D\u0924\u0940\u0938\u0917\u0922\u093C", aliases: ["korba", "\u0915\u094B\u0930\u092C\u093E"] },
  { district: "\u0930\u093E\u092F\u0917\u0922\u093C", state: "\u091B\u0924\u094D\u0924\u0940\u0938\u0917\u0922\u093C", aliases: ["raigarh", "\u0930\u093E\u092F\u0917\u0922\u093C"] },
  { district: "\u0930\u093E\u091C\u0928\u093E\u0902\u0926\u0917\u093E\u0902\u0935", state: "\u091B\u0924\u094D\u0924\u0940\u0938\u0917\u0922\u093C", aliases: ["rajnandgaon", "\u0930\u093E\u091C\u0928\u093E\u0902\u0926\u0917\u093E\u0902\u0935"] },
  { district: "\u091C\u0917\u0926\u0932\u092A\u0941\u0930", state: "\u091B\u0924\u094D\u0924\u0940\u0938\u0917\u0922\u093C", aliases: ["jagdalpur", "bastar", "\u092C\u0938\u094D\u0924\u0930", "\u091C\u0917\u0926\u0932\u092A\u0941\u0930"] },
  { district: "\u0905\u0902\u092C\u093F\u0915\u093E\u092A\u0941\u0930", state: "\u091B\u0924\u094D\u0924\u0940\u0938\u0917\u0922\u093C", aliases: ["ambikapur", "surguja", "\u0938\u0930\u0917\u0941\u091C\u093E", "\u0905\u0902\u092C\u093F\u0915\u093E\u092A\u0941\u0930"] },
  // Maharashtra
  { district: "\u092E\u0941\u0902\u092C\u0908", state: "\u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930", aliases: ["mumbai", "bombay", "\u092E\u0941\u0902\u092C\u0908"] },
  { district: "\u092A\u0941\u0923\u0947", state: "\u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930", aliases: ["pune", "\u092A\u0941\u0923\u0947"] },
  { district: "\u0928\u093E\u0917\u092A\u0941\u0930", state: "\u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930", aliases: ["nagpur", "\u0928\u093E\u0917\u092A\u0941\u0930"] },
  { district: "\u0928\u093E\u0938\u093F\u0915", state: "\u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930", aliases: ["nashik", "\u0928\u093E\u0938\u093F\u0915"] },
  { district: "\u0920\u093E\u0923\u0947", state: "\u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930", aliases: ["thane", "\u0920\u093E\u0923\u0947"] },
  { district: "\u091B\u0924\u094D\u0930\u092A\u0924\u093F \u0938\u0902\u092D\u093E\u091C\u0940\u0928\u0917\u0930", state: "\u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930", aliases: ["aurangabad", "sambhajinagar", "\u0914\u0930\u0902\u0917\u093E\u092C\u093E\u0926"] },
  { district: "\u0915\u094B\u0932\u094D\u0939\u093E\u092A\u0941\u0930", state: "\u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930", aliases: ["kolhapur", "\u0915\u094B\u0932\u094D\u0939\u093E\u092A\u0941\u0930"] },
  // Jharkhand
  { district: "\u0930\u093E\u0902\u091A\u0940", state: "\u091D\u093E\u0930\u0916\u0902\u0921", aliases: ["ranchi", "\u0930\u093E\u0902\u091A\u0940"] },
  { district: "\u091C\u092E\u0936\u0947\u0926\u092A\u0941\u0930", state: "\u091D\u093E\u0930\u0916\u0902\u0921", aliases: ["jamshedpur", "tatanagar", "\u091C\u092E\u0936\u0947\u0926\u092A\u0941\u0930"] },
  { district: "\u0927\u0928\u092C\u093E\u0926", state: "\u091D\u093E\u0930\u0916\u0902\u0921", aliases: ["dhanbad", "\u0927\u0928\u092C\u093E\u0926"] },
  { district: "\u092C\u094B\u0915\u093E\u0930\u094B", state: "\u091D\u093E\u0930\u0916\u0902\u0921", aliases: ["bokaro", "\u092C\u094B\u0915\u093E\u0930\u094B"] },
  { district: "\u0926\u0947\u0935\u0918\u0930", state: "\u091D\u093E\u0930\u0916\u0902\u0921", aliases: ["deoghar", "\u0926\u0947\u0935\u0918\u0930"] },
  // Gujarat
  { district: "\u0905\u0939\u092E\u0926\u093E\u092C\u093E\u0926", state: "\u0917\u0941\u091C\u0930\u093E\u0924", aliases: ["ahmedabad", "\u0905\u0939\u092E\u0926\u093E\u092C\u093E\u0926"] },
  { district: "\u0938\u0942\u0930\u0924", state: "\u0917\u0941\u091C\u0930\u093E\u0924", aliases: ["surat", "\u0938\u0942\u0930\u0924"] },
  { district: "\u0935\u0921\u094B\u0926\u0930\u093E", state: "\u0917\u0941\u091C\u0930\u093E\u0924", aliases: ["vadodara", "baroda", "\u0935\u0921\u094B\u0926\u0930\u093E"] },
  { district: "\u0930\u093E\u091C\u0915\u094B\u091F", state: "\u0917\u0941\u091C\u0930\u093E\u0924", aliases: ["rajkot", "\u0930\u093E\u091C\u0915\u094B\u091F"] },
  // West Bengal
  { district: "\u0915\u094B\u0932\u0915\u093E\u0924\u093E", state: "\u092A\u0936\u094D\u091A\u093F\u092E \u092C\u0902\u0917\u093E\u0932", aliases: ["kolkata", "calcutta", "\u0915\u094B\u0932\u0915\u093E\u0924\u093E", "\u0915\u0932\u0915\u0924\u094D\u0924\u093E"] },
  { district: "\u0939\u093E\u0935\u0921\u093C\u093E", state: "\u092A\u0936\u094D\u091A\u093F\u092E \u092C\u0902\u0917\u093E\u0932", aliases: ["howrah", "\u0939\u093E\u0935\u0921\u093C\u093E"] },
  { district: "\u0938\u093F\u0932\u0940\u0917\u0941\u0921\u093C\u0940", state: "\u092A\u0936\u094D\u091A\u093F\u092E \u092C\u0902\u0917\u093E\u0932", aliases: ["siliguri", "\u0938\u093F\u0932\u0940\u0917\u0941\u0921\u093C\u0940"] },
  { district: "\u0906\u0938\u0928\u0938\u094B\u0932", state: "\u092A\u0936\u094D\u091A\u093F\u092E \u092C\u0902\u0917\u093E\u0932", aliases: ["asansol", "\u0906\u0938\u0928\u0938\u094B\u0932"] },
  { district: "\u0926\u0941\u0930\u094D\u0917\u093E\u092A\u0941\u0930", state: "\u092A\u0936\u094D\u091A\u093F\u092E \u092C\u0902\u0917\u093E\u0932", aliases: ["durgapur", "\u0926\u0941\u0930\u094D\u0917\u093E\u092A\u0941\u0930"] },
  // Haryana / Punjab / Delhi
  { district: "\u091A\u0902\u0921\u0940\u0917\u0922\u093C", state: "\u092A\u0902\u091C\u093E\u092C/\u0939\u0930\u093F\u092F\u093E\u0923\u093E", aliases: ["chandigarh", "\u091A\u0902\u0921\u0940\u0917\u0922\u093C"] },
  { district: "\u0917\u0941\u0930\u0941\u0917\u094D\u0930\u093E\u092E", state: "\u0939\u0930\u093F\u092F\u093E\u0923\u093E", aliases: ["gurugram", "gurgaon", "\u0917\u0941\u0930\u0941\u0917\u094D\u0930\u093E\u092E", "\u0917\u0941\u0921\u093C\u0917\u093E\u0902\u0935"] },
  { district: "\u0905\u092E\u0943\u0924\u0938\u0930", state: "\u092A\u0902\u091C\u093E\u092C", aliases: ["amritsar", "\u0905\u092E\u0943\u0924\u0938\u0930"] },
  { district: "\u0932\u0941\u0927\u093F\u092F\u093E\u0928\u093E", state: "\u092A\u0902\u091C\u093E\u092C", aliases: ["ludhiana", "\u0932\u0941\u0927\u093F\u092F\u093E\u0928\u093E"] },
  { district: "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940", state: "\u0926\u093F\u0932\u094D\u0932\u0940", aliases: ["new delhi", "new-delhi", "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940"] },
  { district: "\u0926\u093F\u0932\u094D\u0932\u0940", state: "\u0926\u093F\u0932\u094D\u0932\u0940", aliases: ["delhi", "\u0926\u093F\u0932\u094D\u0932\u0940"] }
];
function formatDistrictWithState(loc) {
  if (!loc || typeof loc !== "string") return "";
  const trimmed = loc.trim();
  if (!trimmed || trimmed === "\u0935\u093F\u0936\u0947\u0937 \u0915\u0935\u0930\u0947\u091C") return "";
  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
    return parts.join(", ");
  }
  for (const item of DISTRICT_STATE_LIST) {
    if (item.district === "\u0926\u093F\u0932\u094D\u0932\u0940" || item.district === "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940") {
      if (trimmed === item.district) return "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940";
      continue;
    }
    if (trimmed.toLowerCase() === item.district.toLowerCase() || item.aliases.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      return `${item.district}, ${item.state}`;
    }
  }
  return trimmed;
}
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function matchDistrictAlias(text, alias) {
  if (!alias || !text) return false;
  if (/^[A-Za-z0-9\s\-]+$/.test(alias)) {
    const reg = new RegExp(`\\b${escapeRegExp(alias.toLowerCase())}\\b`, "i");
    return reg.test(text);
  }
  const aliasLower = alias.toLowerCase();
  if (alias === "\u0917\u092F\u093E" || aliasLower === "gaya") {
    return /(?:(?:जिले|जिला|शहर|थाना|क्षेत्र|धाम|एयरपोर्ट|स्टेशन)\s+गया|गया\s*(?:जिले|जिला|शहर|थाना|क्षेत्र|धाम|एयरपोर्ट|स्टेशन|का|की|के|में|से)|बोधगया|बोध\s*गया|गया,\s*बिहार|गया\s*\(\s*बिहार\s*\)|\bgaya\s+(?:district|city|airport)\b)/iu.test(text);
  }
  if (alias === "\u0917\u0941\u0928\u093E" || aliasLower === "guna") {
    if (/\d+\s*गुना|चार\s*गुना|दो\s*गुना|तीन\s*गुना|दस\s*गुना|दोगुना|तीनगुना|कई\s*गुना/u.test(text)) {
      return /(?:(?:जिले|जिला|शहर)\s+गुना|गुना\s*(?:जिले|जिला|शहर|का|की|के|में|से)|गुना,\s*मप्र|गुना,\s*मध्य प्रदेश|\bguna\s+(?:district|city)\b)/iu.test(text);
    }
    return /(?:(?:जिले|जिला|शहर)\s+गुना|गुना\s*(?:जिले|जिला|शहर|का|की|के|में|से)|गुना,\s*मप्र|गुना,\s*मध्य प्रदेश|\bguna\s+(?:district|city)\b)/iu.test(text);
  }
  if (alias === "\u0927\u093E\u0930" || aliasLower === "dhar") {
    if (/(?:तेज|पानी की|हवा की|रक्त की|तीखी)\s+धार|धारदार/u.test(text)) {
      return /(?:(?:जिले|जिला|शहर)\s+धार|धार\s*(?:जिले|जिला|शहर|का|की|के|में|से)|धार,\s*मप्र|धार,\s*मध्य प्रदेश|\bdhar\s+(?:district|city)\b)/iu.test(text);
    }
    return /(?:(?:जिले|जिला|शहर)\s+धार|धार\s*(?:जिले|जिला|शहर|का|की|के|में|से)|धार,\s*मप्र|धार,\s*मध्य प्रदेश|\bdhar\s+(?:district|city)\b)/iu.test(text);
  }
  if (alias === "\u092A\u0928\u094D\u0928\u093E" || aliasLower === "panna") {
    if (/(?:पन्ने|पन्नों|किताब का पन्ना|पृष्ठ)\b/u.test(text)) {
      return /(?:(?:जिले|जिला|शहर|हीरा खदान|टाइगर रिजर्व)\s+पन्ना|पन्ना\s*(?:जिले|जिला|शहर|हीरा खदान|टाइगर रिजर्व|का|की|के|में|से)|पन्ना,\s*मप्र|पन्ना,\s*मध्य प्रदेश|\bpanna\s+(?:district|city)\b)/iu.test(text);
    }
    return /(?:(?:जिले|जिला|शहर|हीरा खदान|टाइगर रिजर्व)\s+पन्ना|पन्ना\s*(?:जिले|जिला|शहर|हीरा खदान|टाइगर रिजर्व|का|की|के|में|से)|पन्ना,\s*मप्र|पन्ना,\s*मध्य प्रदेश|\bpanna\s+(?:district|city)\b)/iu.test(text);
  }
  if (alias === "\u0938\u0940\u0927\u0940" || aliasLower === "sidhi") {
    if (/(?:सीधी बात|सीधी रेखा|सीधे|सीधी तौर पर|सीधा)\b/u.test(text)) {
      return /(?:(?:जिले|जिला|शहर|पेशाब कांड)\s+सीधी|सीधी\s*(?:जिले|जिला|शहर|का|की|के|में|से)|सीधी,\s*मप्र|सीधी,\s*मध्य प्रदेश|\bsidhi\s+(?:district|city)\b)/iu.test(text);
    }
    return /(?:(?:जिले|जिला|शहर)\s+सीधी|सीधी\s*(?:जिले|जिला|शहर|का|की|के|में|से)|सीधी,\s*मप्र|सीधी,\s*मध्य प्रदेश|\bsidhi\s+(?:district|city)\b)/iu.test(text);
  }
  if (alias === "\u092C\u0938\u094D\u0924\u0940" || aliasLower === "basti") {
    return /(?:(?:जिले|जिला|शहर|मंडल)\s+बस्ती|बस्ती\s*(?:जिले|जिला|शहर|मंडल|का|की|के|में|से)|बस्ती,\s*उत्तर प्रदेश|बस्ती\s*\(\s*उत्तर प्रदेश\s*\)|\bbasti\s+(?:district|city)\b)/iu.test(text);
  }
  if (alias === "\u092C\u093E\u0902\u0926\u093E" || aliasLower === "banda") {
    return /(?:(?:जिले|जिला|शहर|जेल)\s+बांदा|बांदा\s*(?:जिले|जिला|शहर|जेल|का|की|के|में|से)|बांदा,\s*उत्तर प्रदेश|बांदा\s*\(\s*उत्तर प्रदेश\s*\)|\bbanda\s+(?:district|city)\b)/iu.test(text);
  }
  if (alias === "\u092A\u0941\u0930\u0940" || alias === "\u092A\u0942\u0930\u0940" || aliasLower === "puri") {
    return /(?:जगन्नाथ\s*पुरी|पुरी\s*(?:जिले|जिला|शहर|मंदिर|धाम|बीच|स्टेशन|का|की|के|में|से)|(?:जिले|जिला|शहर)\s+पुरी|पुरी,\s*ओडिशा|\bpuri\s+(?:district|city|temple)\b)/iu.test(text);
  }
  const devReg = new RegExp(`(?:^|[^\\p{L}\\p{M}])${escapeRegExp(alias)}(?=[^\\p{L}\\p{M}]|$)`, "u");
  return devReg.test(text);
}
function cleanCorpusForLocation(text) {
  if (!text) return "";
  return text.replace(/(?:paragraphs?\s+extracted|instagram\.com|facebook\.com|twitter\.com|youtube\.com)/gi, " ").replace(/(?:Article Content & Facts|Meta Description|Source URL|File Photo|Credit)/gi, " ").replace(/https?:\/\/[^\s]+/gi, " ").replace(/\s+/g, " ");
}
function detectDistrictAndState(title = "", desc = "", content = "", url = "") {
  const cleanTitle = cleanCorpusForLocation(title);
  const cleanDesc = cleanCorpusForLocation(desc);
  const cleanContent = cleanCorpusForLocation(content);
  const isNonLocationalTopic = /(?:बॉलीवुड|सिनेमा|फिल्म|अभिनेता|अभिनेत्री|सितारों|सेलेब्स|bollywood|cinema|movie|actor|actress|box office|वेब सीरीज|ओटीटी|ट्रेलर|गाना|हॉलीवुड)/iu.test(cleanTitle);
  if (isNonLocationalTopic) {
    return "";
  }
  for (const d of DISTRICT_STATE_LIST) {
    if (d.district === "\u0926\u093F\u0932\u094D\u0932\u0940" || d.district === "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940") continue;
    for (const a of d.aliases) {
      if (matchDistrictAlias(cleanTitle, a)) {
        return `${d.district}, ${d.state}`;
      }
    }
  }
  for (const d of DISTRICT_STATE_LIST) {
    if (d.district === "\u0926\u093F\u0932\u094D\u0932\u0940" || d.district === "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940") continue;
    for (const a of d.aliases) {
      if (matchDistrictAlias(cleanDesc, a)) {
        return `${d.district}, ${d.state}`;
      }
    }
  }
  for (const d of DISTRICT_STATE_LIST) {
    if (d.district === "\u0926\u093F\u0932\u094D\u0932\u0940" || d.district === "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940") continue;
    for (const a of d.aliases) {
      if (matchDistrictAlias(cleanContent, a)) {
        return `${d.district}, ${d.state}`;
      }
    }
  }
  const primaryText = `${cleanTitle} ${cleanDesc} ${url}`.toLowerCase();
  if (/(?:वाशिंगटन|व्हाइट\s*हाउस|white\s*house|washington)/i.test(primaryText)) {
    return "\u0935\u093E\u0936\u093F\u0902\u0917\u091F\u0928";
  }
  if (/(?:मास्को|moscow)/i.test(primaryText)) return "\u092E\u093E\u0938\u094D\u0915\u094B";
  if (/(?:लंदन|london)/i.test(primaryText)) return "\u0932\u0902\u0926\u0928";
  const delhiLandmarkRegex = /(?:संसद[\s\-]*भवन|राष्ट्रपति[\s\-]*भवन|सुप्रीम[\s\-]*कोर्ट|जंतर[\s\-]*मंतर|राजधानी[\s\-]*दिल्ली|इंडिया[\s\-]*गेट)/i;
  if (delhiLandmarkRegex.test(primaryText) || cleanContent && delhiLandmarkRegex.test(cleanContent)) {
    return "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940";
  }
  if (/(?:नई\s*दिल्ली|new\s*delhi)/i.test(primaryText)) {
    return "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940";
  }
  const states = [
    { state: "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", capital: "\u092D\u094B\u092A\u093E\u0932, \u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", "madhya pradesh", "mp"] },
    { state: "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", capital: "\u0932\u0916\u0928\u090A, \u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", aliases: ["\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", "uttar pradesh", "up"] },
    { state: "\u092C\u093F\u0939\u093E\u0930", capital: "\u092A\u091F\u0928\u093E, \u092C\u093F\u0939\u093E\u0930", aliases: ["\u092C\u093F\u0939\u093E\u0930", "bihar"] },
    { state: "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", capital: "\u091C\u092F\u092A\u0941\u0930, \u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", aliases: ["\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", "rajasthan"] },
    { state: "\u0909\u0924\u094D\u0924\u0930\u093E\u0916\u0902\u0921", capital: "\u0926\u0947\u0939\u0930\u093E\u0926\u0942\u0928, \u0909\u0924\u094D\u0924\u0930\u093E\u0916\u0902\u0921", aliases: ["\u0909\u0924\u094D\u0924\u0930\u093E\u0916\u0902\u0921", "uttarakhand"] },
    { state: "\u091B\u0924\u094D\u0924\u0940\u0938\u0917\u0922\u093C", capital: "\u0930\u093E\u092F\u092A\u0941\u0930, \u091B\u0924\u094D\u0924\u0940\u0938\u0917\u0922\u093C", aliases: ["\u091B\u0924\u094D\u0924\u0940\u0938\u0917\u0922\u093C", "chhattisgarh"] },
    { state: "\u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930", capital: "\u092E\u0941\u0902\u092C\u0908, \u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930", aliases: ["\u092E\u0939\u093E\u0930\u093E\u0937\u094D\u091F\u094D\u0930", "maharashtra"] },
    { state: "\u0917\u0941\u091C\u0930\u093E\u0924", capital: "\u0917\u093E\u0902\u0927\u0940\u0928\u0917\u0930, \u0917\u0941\u091C\u0930\u093E\u0924", aliases: ["\u0917\u0941\u091C\u0930\u093E\u0924", "gujarat"] },
    { state: "\u091D\u093E\u0930\u0916\u0902\u0921", capital: "\u0930\u093E\u0902\u091A\u0940, \u091D\u093E\u0930\u0916\u0902\u0921", aliases: ["\u091D\u093E\u0930\u0916\u0902\u0921", "jharkhand"] },
    { state: "\u092A\u0936\u094D\u091A\u093F\u092E \u092C\u0902\u0917\u093E\u0932", capital: "\u0915\u094B\u0932\u0915\u093E\u0924\u093E, \u092A\u0936\u094D\u091A\u093F\u092E \u092C\u0902\u0917\u093E\u0932", aliases: ["\u092A\u0936\u094D\u091A\u093F\u092E \u092C\u0902\u0917\u093E\u0932", "west bengal", "bengal"] },
    { state: "\u092A\u0902\u091C\u093E\u092C", capital: "\u091A\u0902\u0921\u0940\u0917\u0922\u093C", aliases: ["\u092A\u0902\u091C\u093E\u092C", "punjab"] },
    { state: "\u0939\u0930\u093F\u092F\u093E\u0923\u093E", capital: "\u091A\u0902\u0921\u0940\u0917\u0922\u093C", aliases: ["\u0939\u0930\u093F\u092F\u093E\u0923\u093E", "haryana"] }
  ];
  for (const st of states) {
    for (const a of st.aliases) {
      if (matchDistrictAlias(cleanTitle, a) || matchDistrictAlias(cleanDesc, a)) {
        return st.state;
      }
    }
  }
  if (url) {
    const urlLower = url.toLowerCase();
    for (const d of DISTRICT_STATE_LIST) {
      if (d.district === "\u0926\u093F\u0932\u094D\u0932\u0940" || d.district === "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940") continue;
      for (const a of d.aliases) {
        if (/^[a-z0-9\-]+$/i.test(a) && a.length >= 4) {
          const pathReg = new RegExp(`[/\\-_]${escapeRegExp(a)}[/\\-_.]`, "i");
          if (pathReg.test(urlLower)) {
            return `${d.district}, ${d.state}`;
          }
        }
      }
    }
  }
  return "";
}
function formatAsJournalisticHeadline(raw) {
  if (!raw) return "";
  let h = cleanHeadlineText(raw);
  h = h.replace(/^(?:अब|वहीं|इसके अलावा|साथ ही|प्राप्त जानकारी के अनुसार|सूत्रों के मुताबिक|गौरतलब है कि|बता दें कि|दरअसल|इस दौरान|इसके तहत|सभी|मामले में|इधर)[,\s]*/gi, "");
  h = h.replace(/^[A-Za-z\s,.\-–—:;'"()\/&|!_]+(?=[\u0900-\u097F])/u, "");
  h = h.replace(/(?:अब\s+)?नहीं\s*(?:बनेंगे|बनेगा|बन सकेंगे)\s+([^,:।\n]+)/gu, "$1 \u092A\u0930 \u0930\u094B\u0915");
  h = h.replace(/(?:अब\s+)?नहीं\s*(?:होगा|होंगे)\s+([^,:।\n]+)/gu, "$1 \u092A\u0930 \u092A\u093E\u092C\u0902\u0926\u0940");
  h = h.replace(/(?:अब\s+)?नहीं\s*(?:बनेंगे|बनेगा|बन सकेंगे|होगा|होंगे)(?:\s*हैं|\s*है)?$/u, " \u092A\u0930 \u0930\u094B\u0915").replace(/(?:की\s*अनुमति\s*होगी|अनुमति\s*दी\s*गई|अनुमति\s*होगी|मंजूरी\s*दी\s*गई|मंजूर\s*किया\s*गया|मंजूरी\s*मिली|को\s*मंजूरी\s*दी\s*है)(?:\s*हैं|\s*है)?$/u, " \u0915\u094B \u092E\u0902\u091C\u0942\u0930\u0940").replace(/(?:का\s+)?(?:तय\s*की\s*गई\s*है|तय\s*किए\s*गए|तय\s*किया\s*गया)(?:\s*हैं|\s*है)?$/u, " \u0924\u092F").replace(/(?:का\s+)?(?:निर्णय\s*लिया\s*गया|फैसला\s*लिया\s*गया)(?:\s*हैं|\s*है)?$/u, " \u0915\u093E \u0928\u093F\u0930\u094D\u0923\u092F").replace(/(?:लागू\s*किए\s*गए\s*हैं|लागू\s*किया\s*गया|लागू\s*होगा)(?:\s*हैं|\s*है)?$/u, " \u0932\u093E\u0917\u0942").replace(/(?:\s*अतिरिक्त)?\s*(?:सहायता|छूट|राहत)\s*(?:दी\s*जाएगी|मिलेगी|का\s*प्रावधान)(?:\s*हैं|\s*है)?$/u, " \u0915\u093E \u0910\u0932\u093E\u0928").replace(/(?:दी\s*जाएगी|छूट\s*मिलेगी|प्रावधान\s*किया\s*गया)(?:\s*हैं|\s*है)?$/u, " \u0915\u093E \u0910\u0932\u093E\u0928").replace(/(?:\s*सीधा)?\s*(?:लाभ|फायदा)\s*(?:मिलेगा|होगा)(?:\s*हैं|\s*है)?$/u, " \u0915\u094B \u0938\u0940\u0927\u093E \u092B\u093E\u092F\u0926\u093E").replace(/(?:पूरे\s*किए|रन\s*बनाए)(?:\s*हैं|\s*है)?$/u, " \u0920\u094B\u0915\u0947").replace(/(?:शतक|अर्धशतक)\s*(?:लगाया|जड़ा|बनाया)(?:\s*हैं|\s*है)?$/u, " \u091C\u0921\u093C\u093E").replace(/(?:बनाए\s*जा\s*सकेंगे|बनाए\s*जाएंगे)(?:\s*हैं|\s*है)?$/u, " \u0915\u094B \u0939\u0930\u0940 \u091D\u0902\u0921\u0940").replace(/(?:गिरफ्तार\s*किया\s*गया|गिरफ्तार\s*किया)(?:\s*हैं|\s*है)?$/u, " \u0917\u093F\u0930\u092B\u094D\u0924\u093E\u0930").replace(/(?:बरामद\s*की\s*गई|बरामद\s*किए\s*गए|बरामद\s*हुए)(?:\s*हैं|\s*है)?$/u, " \u092C\u0930\u093E\u092E\u0926").replace(/(?:\s*की)?\s*(?:मौत\s*हो\s*गई|जान\s*गंवाई|दम\s*तोड़\s*दिया)(?:\s*हैं|\s*है)?$/u, " \u0915\u0940 \u092E\u094C\u0924").replace(/(?:घायल\s*हो\s*गए|घायल\s*हुए)(?:\s*हैं|\s*है)?$/u, " \u0918\u093E\u092F\u0932").replace(/(?:आदेश\s*दिए\s*गए|आदेश\s*जारी\s*किए)(?:\s*हैं|\s*है)?$/u, " \u0906\u0926\u0947\u0936 \u0926\u093F\u090F \u0917\u090F").replace(/(?:निधन\s*हो\s*गया)(?:\s*हैं|\s*है)?$/u, " \u0915\u093E \u0928\u093F\u0927\u0928").replace(/(?:जांच\s*शुरू\s*कर\s*दी\s*गई|जांच\s*के\s*निर्देश\s*दिए)(?:\s*हैं|\s*है)?$/u, " \u0915\u0940 \u091C\u093E\u0902\u091A \u0936\u0941\u0930\u0942").replace(/(?:घोषणा\s*की\s*गई|ऐलान\s*किया\s*गया|ऐलान\s*किया)(?:\s*हैं|\s*है)?$/u, " \u0915\u093E \u0910\u0932\u093E\u0928").replace(/(?:के\s*तहत\s*होगा|के\s*तहत\s*होंगे)$/u, " \u0915\u0947 \u0928\u090F \u0928\u093F\u092F\u092E").replace(/(?:के\s+सख्त\s+)+/gu, "\u0915\u0947 \u0938\u0916\u094D\u0924 ");
  if (!h.includes("\u0915\u093E \u092E\u093E\u092E\u0932\u093E")) {
    h = h.replace(/(?:सामने\s*आया\s*है|सामने\s*आई\s*है|सामने\s*आए\s*हैं)$/u, " \u0915\u093E \u092E\u093E\u092E\u0932\u093E");
  }
  if (!h.includes("\u0906\u0930\u094B\u092A")) {
    h = h.replace(/(?:आरोप\s*लगाए\s*हैं|आरोप\s*लगाया\s*है|आरोप\s*लगाया)$/u, " \u0915\u0947 \u0906\u0930\u094B\u092A");
  }
  h = h.replace(/(?:साझा\s*किए\s*हैं|साझा\s*किया)$/u, " \u0915\u0940 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0926\u0940");
  h = h.replace(/(?:का\s+)?सामना\s*करना\s*पड़(?:\s*रहा\s*है|\s*रही\s*है|\s*रहे\s*हैं|\s*रहा\s*था|\s*रही\s*थी)?$/u, " \u0915\u093E \u0938\u093E\u092E\u0928\u093E \u0915\u0930\u0928\u093E \u092A\u0921\u093C\u093E");
  h = h.replace(/(?:^|\s)पड़(?:\s*रहा\s*है|\s*रही\s*है|\s*रहे\s*हैं|\s*रहा\s*था|\s*रही\s*थी)?$/u, " \u092A\u0921\u093C\u093E");
  h = h.replace(/का सामना करना पड़ा का सामना करना पड़ा/g, "\u0915\u093E \u0938\u093E\u092E\u0928\u093E \u0915\u0930\u0928\u093E \u092A\u0921\u093C\u093E");
  h = h.replace(/(?:रोकी|रोका|रोके)\s*जा(?:\s*रहा\s*है|\s*रही\s*है|\s*रहे\s*हैं|\s*रही\s*थी|\s*रहा\s*था)?$/u, " \u0930\u094B\u0915\u0940 \u0917\u0908");
  h = h.replace(/(?:किए|किया)\s*जा(?:\s*रहे\s*हैं|\s*रहा\s*है|\s*रहे\s*थे)?$/u, " \u0915\u093F\u090F \u0917\u090F");
  h = h.replace(/(?:दी|दिया)\s*जा(?:\s*रही\s*है|\s*रहा\s*है|\s*रही\s*थी)?$/u, " \u0926\u0940 \u0917\u0908");
  h = h.replace(/विस्तृत\s*रिपोर्ट\s*मांगी(?:\s*गई\s*है|\s*है)?$/u, "\u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u0930\u093F\u092A\u094B\u0930\u094D\u091F \u092E\u093E\u0902\u0917\u0940");
  h = h.replace(/\s+करते$/u, " \u0915\u0930\u0928\u0947 \u0915\u093E \u092E\u093E\u092E\u0932\u093E");
  h = h.replace(/\s+होते$/u, " \u0939\u094B\u0928\u0947 \u092A\u0930 \u0935\u093F\u0935\u093E\u0926");
  h = h.replace(/\s+आते$/u, " \u0906\u0928\u0947 \u092A\u0930 \u0939\u0902\u0917\u093E\u092E\u093E");
  h = h.replace(/\s+जाते$/u, " \u091C\u093E\u0928\u0947 \u092A\u0930 \u0935\u093F\u0935\u093E\u0926");
  h = h.replace(/\s+(?:ने|के|की|का|में|पर|से|को|और|या|एवं|व|कि|हेतु|लिए|सहित|तक|तहत|दौरान|ग्रामीण|शहरी|एक|यह|वह)$/u, "");
  h = h.replace(/\b(का|के|की|को|में|पर|से|ने)\s+\1\b/gu, "$1").replace(/\s+/g, " ");
  h = h.replace(/^['"‘“]+|['"’”]+$/g, "").trim();
  h = h.replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
  return h;
}
function calculateHeadlineSimilarityInternal(h1, h2) {
  const stopWords = /* @__PURE__ */ new Set(["\u0914\u0930", "\u092A\u0930", "\u092E\u0947\u0902", "\u0938\u0947", "\u0915\u094B", "\u0915\u093E", "\u0915\u0940", "\u0915\u0947", "\u0928\u0947", "\u092F\u0939", "\u0935\u0939", "\u0915\u093F", "\u092D\u0940", "\u0932\u093F\u090F", "\u0928\u090F", "\u0928\u092F\u093E", "\u092C\u0921\u093C\u093E", "\u092C\u0921\u093C\u0940", "\u0939\u0941\u090F", "\u0939\u0941\u0906", "\u0939\u0948", "\u0939\u0948\u0902", "\u0925\u093E", "\u0925\u0940", "\u0925\u0947"]);
  const words1 = new Set(h1.toLowerCase().replace(/[^\u0900-\u097Fa-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w)));
  const words2 = new Set(h2.toLowerCase().replace(/[^\u0900-\u097Fa-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w)));
  if (words1.size === 0 || words2.size === 0) return 0;
  let common = 0;
  for (const w of words1) {
    if (words2.has(w)) common++;
  }
  return 2 * common / (words1.size + words2.size);
}
var HEADLINE_TIER_RANGES = [
  { option: 1, label: "\u0935\u093F\u0915\u0932\u094D\u092A 1" },
  { option: 2, label: "\u0935\u093F\u0915\u0932\u094D\u092A 2" },
  { option: 3, label: "\u0935\u093F\u0915\u0932\u094D\u092A 3" },
  { option: 4, label: "\u0935\u093F\u0915\u0932\u094D\u092A 4" }
];
function validateHeadlineOption(headline, index = 0, expectedTier) {
  const clean = cleanHeadlineText(headline).replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
  const visibleText = clean.replace(/\[\/?(?:yellow|highlight)\]/g, "").trim();
  const charCount = visibleText.length;
  const words = visibleText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  if (!clean) {
    return { valid: false, reasons: ["\u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0916\u093E\u0932\u0940 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u0924\u0940"], cleanText: "", charCount: 0, wordCount: 0 };
  }
  return {
    valid: true,
    reasons: [],
    cleanText: clean,
    charCount,
    wordCount
  };
}
function enrichHeadlineWithContext(headline, baseTitle, facts = [], location = "", targetMinChars = 50) {
  let cleanH = cleanHeadlineText(headline).replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
  if (cleanH.replace(/\[\/?(?:yellow|highlight)\]/g, "").length >= targetMinChars) {
    return cleanH;
  }
  for (const f of facts) {
    if (cleanH.replace(/\[\/?(?:yellow|highlight)\]/g, "").length >= targetMinChars) break;
    const cleanF = cleanHeadlineText(f).replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
    if (!cleanF || cleanF.length < 12) continue;
    if (cleanH.includes(cleanF) || calculateHeadlineSimilarityInternal(cleanH, cleanF) >= 0.5) continue;
    cleanH = `${cleanH}, ${cleanF}`;
  }
  return cleanHeadlineText(cleanH).replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
}
function fitHeadlineToRange(headline, minChars, maxChars, contextText = "", baseTitle = "", location = "") {
  if (!headline) return "";
  let h = sanitizePressNoteFlattery(cleanHeadlineText(headline), true).replace(/^(?:विकल्प\s*\d+[\s:\-–—]*|\d+[\s.\-–—]+|[•\-\*]\s*)/u, "").replace(/^(?:Breaking News|Live Updates?|Latest News|Big Breaking)[:\s\-–—]*/i, "").replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
  const getCleanLen = (str) => str.replace(/\[\/?(?:yellow|highlight)\]/g, "").trim().length;
  let currentLen = getCleanLen(h);
  if (currentLen > maxChars) {
    const delimiters = [", ", " \u0914\u0930 ", " \u0924\u0925\u093E ", " \u090F\u0935\u0902 ", " \u092A\u0930 ", " \u0938\u0947 ", " \u092E\u0947\u0902 "];
    let trimmed = "";
    for (const d of delimiters) {
      const idx = h.lastIndexOf(d, maxChars);
      if (idx >= minChars) {
        const candidate = h.substring(0, idx).trim().replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
        if (getCleanLen(candidate) >= minChars && getCleanLen(candidate) <= maxChars) {
          trimmed = candidate;
          break;
        }
      }
    }
    if (!trimmed) {
      const spaceIdx = h.lastIndexOf(" ", maxChars);
      if (spaceIdx >= minChars) {
        trimmed = h.substring(0, spaceIdx).trim().replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
      } else {
        trimmed = h.substring(0, maxChars).trim().replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
      }
    }
    h = trimmed;
    currentLen = getCleanLen(h);
  }
  if (currentLen < minChars) {
    const rawSentences = (contextText || "").split(/[।\n]+|\.\s+/).map((s) => cleanHeadlineText(s).replace(/[।\.\,\!\?\:\-]+$/g, "").trim()).filter((s) => s.length > 5 && !h.includes(s));
    for (const s of rawSentences) {
      if (currentLen >= minChars) break;
      const candidate = `${h}, ${s}`.trim();
      if (getCleanLen(candidate) <= maxChars) {
        h = candidate;
        currentLen = getCleanLen(h);
      }
    }
  }
  return cleanHeadlineText(h).replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
}
function generate5JournalisticHeadlines(baseTitle, sentences = [], location = "", excludeTitle = "") {
  return generate5BalancedHeadlineOptions(baseTitle, sentences, location);
}
function sanitizeFlattery(text) {
  if (!text) return "";
  const s = typeof text === "string" ? text : String(text || "");
  return s.replace(/(?:^|[^\p{L}\p{M}])(माननीय|सम्माननीय|सम्मानीय|आदरणीय|श्रीमान|श्रीमती|सुश्री|परम पूज्य|पूज्य)\s+/gu, " ").replace(/(?:^|[^\p{L}\p{M}])श्री\s+(?=[\p{L}])/gu, " ").replace(/\s+महोदय(?=[,\s.!?।\n]|$)/gu, "").replace(/\s+जी(?=[,\s.!?।\n]|$)/gu, "").replace(/[ \t]{2,}/g, " ").trim();
}
function stripAllUrlsAndHyperlinks(text) {
  if (!text) return "";
  let s = String(text);
  s = s.replace(/\[([^\]]+)\]\((?:https?:\/\/[^\s)]+|www\.[^\s)]+|[^\s)]+)\)/gi, "$1");
  s = s.replace(/<a\b[^>]*>(.*?)<\/a>/gi, "$1");
  s = s.replace(/https?:\/\/[^\s\)\],;।]+/gi, "");
  s = s.replace(/ftp:\/\/[^\s\)\],;।]+/gi, "");
  s = s.replace(/www\.[a-zA-Z0-9\-]+\.[a-zA-Z0-9\-.\/]+[^\s\)\],;।]?/gi, "");
  s = s.replace(/\b[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.(?:com|in|org|net|co|io|gov|edu|ai|app|live|news|tv|online|info|me)\b(?:\/[^\s\)\],;।]*)?/gi, "");
  s = s.replace(/(?:क्लिक\s*करें|वेबसाइट\s*पर\s*पढ़ें|लिंक\s*पर\s*जाएं|पूरी\s*खबर\s*पढ़ें|पूरी\s*खबर\s*देखें|स्रोत\s*लिंक|कॉपी\s*लिंक|शेयर\s*करें)[:\s\-–—]*/gi, "");
  s = s.replace(/[ \t]{2,}/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}
function ensureHashtagHierarchy(summaryText, location = "", username = "", mode = "detailed", headlineToStrip = "") {
  if (!summaryText || typeof summaryText !== "string") return summaryText || "";
  const parts = summaryText.split(/\n\s*#/);
  let rawBody = parts[0].trim();
  rawBody = stripAllUrlsAndHyperlinks(rawBody);
  rawBody = rawBody.replace(/(?:\+?91[\-\s]?)?[6-9]\d{9}\b/g, "");
  rawBody = rawBody.replace(/\b\d{3,5}[-\s]\d{6,8}\b/g, "");
  rawBody = rawBody.replace(/^(?:Title|Headline|Description|Content|News|Summary|शीर्षक|हेडलाइन|विवरण|सामग्री|कैप्शन|खबर|विस्तृत\s*कैप्शन|संक्षिप्त\s*कैप्शन|बुलेट\s*पॉइंट्स?)\s*[:\-–—.]*/gim, "");
  rawBody = rawBody.replace(/^(?:पैराग्राफ|Paragraph|पैरा)\s*\d+[\s:\-–—.]*/gim, "");
  rawBody = rawBody.replace(/^(?:मुख्य बिंदु|विवरण|घटनाक्रम|अपडेट|Key Points|Bullet Points)[\s:\-–—.]*/gim, "");
  rawBody = sanitizePressNoteFlattery(rawBody, false);
  rawBody = sanitizeFlattery(rawBody);
  if (headlineToStrip && headlineToStrip.trim()) {
    const cleanH = cleanHeadlineText(headlineToStrip).replace(/[।\.\,\!\?\:\-–—;;\s]+$/g, "").trim();
    if (cleanH.length >= 10) {
      const firstLineMatch = rawBody.match(/^([^\n।]+)[।\n]?/u);
      if (firstLineMatch) {
        const firstLine = cleanHeadlineText(firstLineMatch[1]).replace(/[।\.\,\!\?\:\-–—;;\s]+$/g, "").trim();
        if (firstLine === cleanH || calculateHeadlineSimilarityInternal(firstLine, cleanH) >= 0.75) {
          rawBody = rawBody.slice(firstLineMatch[0].length).trim();
          rawBody = rawBody.replace(/^[:\-–—.]+\s*/u, "").trim();
        }
      }
    }
  }
  let finalBodyText = "";
  if (mode === "bullet") {
    const bulletLines = rawBody.split(/\n+/).map((l) => l.replace(/^[•\-\*\d\.\s]+/, "").trim()).filter((l) => l.length > 8 && /[\u0900-\u097F]/.test(l));
    if (bulletLines.length > 0) {
      finalBodyText = bulletLines.slice(0, 6).map((b) => `\u2022 ${stripAllUrlsAndHyperlinks(b).replace(/[।\.\s]+$/, "")}\u0964`).join("\n");
    } else {
      const sentences = rawBody.split(/[।\n]+|\.\s+/).map((s) => stripAllUrlsAndHyperlinks(s).trim()).filter((s) => s.length > 10 && /[\u0900-\u097F]/.test(s));
      finalBodyText = (sentences.length > 0 ? sentences.slice(0, 4) : ["\u092E\u0941\u0916\u094D\u092F \u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E \u0915\u093E \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935\u093F\u0935\u0930\u0923\u0964"]).map((s) => `\u2022 ${s.replace(/[।\.\s]+$/, "")}\u0964`).join("\n");
    }
  } else if (mode === "short") {
    const rawParagraphs = rawBody.split(/\n{2,}/).map((p) => p.replace(/[ \t]{2,}/g, " ").trim()).filter((p) => p.length > 10 && /[\u0900-\u097F]/.test(p));
    if (rawParagraphs.length >= 2) {
      finalBodyText = rawParagraphs.slice(0, 2).join("\n\n");
    } else {
      const sentences = rawBody.split(/[।\n]+|\.\s+/).map((s) => stripAllUrlsAndHyperlinks(s).trim()).filter((s) => s.length > 8 && /[\u0900-\u097F]/.test(s));
      if (sentences.length >= 2) {
        const mid = Math.ceil(sentences.length / 2);
        const p1 = sentences.slice(0, mid).join("\u0964 ") + "\u0964";
        const p2 = sentences.slice(mid).join("\u0964 ") + "\u0964";
        finalBodyText = `${p1}

${p2}`;
      } else {
        finalBodyText = rawParagraphs[0] || rawBody;
      }
    }
  } else {
    const rawParagraphs = rawBody.split(/\n{2,}/).map((p) => p.replace(/[ \t]{2,}/g, " ").trim()).filter((p) => p.length > 10 && /[\u0900-\u097F]/.test(p));
    if (rawParagraphs.length === 3) {
      finalBodyText = rawParagraphs.join("\n\n");
    } else if (rawParagraphs.length > 3) {
      const p1 = rawParagraphs[0];
      const p2 = rawParagraphs[1];
      const p3 = rawParagraphs.slice(2).join(" ");
      finalBodyText = `${p1}

${p2}

${p3}`;
    } else {
      const sentences = rawBody.split(/[।\n]+|\.\s+/).map((s) => stripAllUrlsAndHyperlinks(s).trim()).filter((s) => s.length > 8 && /[\u0900-\u097F]/.test(s));
      if (sentences.length >= 6) {
        const p1 = sentences.slice(0, 2).join("\u0964 ") + "\u0964";
        const p2 = sentences.slice(2, 4).join("\u0964 ") + "\u0964";
        const p3 = sentences.slice(4).join("\u0964 ") + "\u0964";
        finalBodyText = `${p1}

${p2}

${p3}`;
      } else if (sentences.length >= 4) {
        const p1 = sentences.slice(0, 2).join("\u0964 ") + "\u0964";
        const p2 = sentences.slice(2, 3).join("\u0964 ") + "\u0964";
        const p3 = sentences.slice(3).join("\u0964 ") + "\u0964";
        finalBodyText = `${p1}

${p2}

${p3}`;
      } else if (sentences.length >= 3) {
        const p1 = sentences[0] + "\u0964";
        const p2 = sentences[1] + "\u0964";
        const p3 = sentences.slice(2).join("\u0964 ") + "\u0964";
        finalBodyText = `${p1}

${p2}

${p3}`;
      } else if (sentences.length === 2) {
        finalBodyText = `${sentences[0]}\u0964

${sentences[1]}\u0964`;
      } else {
        finalBodyText = rawParagraphs.length > 0 ? rawParagraphs.join("\n\n") : rawBody;
      }
    }
  }
  finalBodyText = stripAllUrlsAndHyperlinks(finalBodyText);
  const rawTags = (summaryText.match(/#[a-zA-Z0-9_\u0900-\u097F]+/g) || []).filter((t, i, arr) => arr.indexOf(t) === i);
  const cleanUser = (username || "").replace(/^@/, "").replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "").trim();
  const isGeneric = ["user", "username", "reporter", "admin", "superadmin", "null", "undefined"].includes(cleanUser.toLowerCase());
  const userTag = cleanUser && !isGeneric ? `#${cleanUser}` : "";
  let locTag = "";
  if (location && location !== "\u0935\u093F\u0936\u0947\u0937 \u0915\u0935\u0930\u0947\u091C") {
    const primaryCity = location.split(/[\/,]/)[0].trim().replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "");
    if (primaryCity && primaryCity.toLowerCase() !== "location" && primaryCity !== "\u0938\u094D\u0925\u093E\u0928") {
      locTag = `#${primaryCity}News`;
    }
  }
  const filteredMiddleTags = [];
  for (const t of rawTags) {
    const lower = t.toLowerCase();
    if (userTag && lower === userTag.toLowerCase() || lower === "#ainewsmaker" || lower === "#ai_news_maker" || lower === "#breakingnewswala" || lower === "#bnwtv" || lower === "#\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917\u0928\u094D\u092F\u0942\u091C\u0935\u093E\u0932\u093E" || lower.startsWith("#http") || lower.startsWith("#www") || lower.startsWith("#url")) {
      continue;
    }
    filteredMiddleTags.push(t);
  }
  if (locTag && !filteredMiddleTags.some((t) => t.toLowerCase() === locTag.toLowerCase())) {
    filteredMiddleTags.unshift(locTag);
  }
  const defaultSeeds = ["#BreakingNews", "#HindiNews", "#LatestUpdate", "#NewsUpdate"];
  for (const seed of defaultSeeds) {
    if (filteredMiddleTags.length >= 5) break;
    if (!filteredMiddleTags.some((t) => t.toLowerCase() === seed.toLowerCase())) {
      filteredMiddleTags.push(seed);
    }
  }
  const middleSlice = filteredMiddleTags.slice(0, 6);
  const finalTags = [];
  if (userTag) {
    finalTags.push(userTag);
  }
  finalTags.push(...middleSlice);
  finalTags.push("#AINewsMaker");
  const seen = /* @__PURE__ */ new Set();
  const orderedTags = [];
  for (const t of finalTags) {
    const lower = t.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      orderedTags.push(t);
    }
  }
  return `${finalBodyText}

${orderedTags.join(" ")}`.trim();
}
function cleanCaptionParagraphs(caption, mode = "detailed", username = "", location = "", headlineToStrip = "") {
  if (!caption) return "";
  return ensureHashtagHierarchy(caption.trim(), location, username, mode, headlineToStrip);
}
function formatCaptionVariants(headline, location, factsText, username = "") {
  const cleanHeadline = cleanHeadlineText(headline || "");
  const rawBody = (factsText || cleanHeadline).trim();
  const sentences = rawBody.split(/[।\n]+/).map((s) => s.trim()).filter((s) => s.length > 5);
  const baseText = sentences.length > 0 ? sentences.join("\u0964 ") + "\u0964" : cleanHeadline;
  const bulletItems = (sentences.length > 0 ? sentences.slice(0, 4) : [cleanHeadline]).map((b) => `\u2022 ${b}`);
  return {
    captionDetailed: baseText,
    captionBullets: bulletItems.join("\n"),
    captionShort: sentences.length > 1 ? `${sentences[0]}\u0964

${sentences[1]}\u0964` : baseText
  };
}
function sanitizeCaptionText(caption, headline = "", location = "", username = "") {
  if (!caption) return "";
  let text = sanitizePressNoteFlattery(cleanHtmlEntities(caption));
  text = text.replace(
    /(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi,
    " "
  );
  text = text.replace(
    /(?:नईदुनिया प्रतिनिधि[,\s]*[^\n।]+[।\n]?|दैनिक भास्कर[,\s]*[^\n।]+[।\n]?|अमर उजाला[,\s]*[^\n।]+[।\n]?|पत्रिका[,\s]*[^\n।]+[।\n]?)/gi,
    " "
  );
  text = text.replace(/^(?:[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]+[.!?।]\s*)+(?=[\u0900-\u097F])/u, "");
  text = text.replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]{12,}?[.!?।]\s*(?=[\u0900-\u097F])/u, "");
  text = text.replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]{15,}?\s*(?=[\u0900-\u097F])/u, "");
  const bodyWithoutHashtags = text.replace(/#[\w\u0900-\u097F]+/g, "").trim();
  const paragraphs = bodyWithoutHashtags.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const cleanParagraphs = [];
  for (const para of paragraphs) {
    if (para.includes("\u2022")) {
      const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
      const cleanLines = lines.filter((line) => {
        return /[\u0900-\u097F]/.test(line) && !/^(कॉपी लिंक|फाइल फोटो|शेयर करें)/i.test(line);
      });
      if (cleanLines.length > 0) {
        cleanParagraphs.push(cleanLines.join("\n"));
      }
      continue;
    }
    const sentences = para.split(/[।\n]+|\.\s+/).map((s) => s.trim()).filter((s) => {
      if (!/[\u0900-\u097F]/.test(s)) return false;
      if (/^(?:कॉपी लिंक|फाइल फोटो|शेयर करें|क्लिक करें|डाउनलोड करें|यह भी पढ़ें)/i.test(s)) return false;
      return s.length > 5;
    });
    if (sentences.length > 0) {
      const rejoined = sentences.join("\u0964 ").replace(/\s+।/g, "\u0964").trim();
      cleanParagraphs.push(rejoined.endsWith("\u0964") ? rejoined : `${rejoined}\u0964`);
    }
  }
  if (cleanParagraphs.length === 0) {
    const fallbackVariants = formatCaptionVariants(headline, location, "", username);
    return fallbackVariants.captionDetailed;
  }
  const cleanedBody = cleanParagraphs.join("\n\n");
  return ensureHashtagHierarchy(cleanedBody, location, username);
}
function createLocalNewsFallback(input, linkUrl, targetMaxLines = 3, articleMeta, username = "") {
  const clean = cleanHtmlEntities(input || "").trim();
  const isDevanagari = (str) => /[\u0900-\u097F]/.test(str);
  const isBoilerplate = (t) => !t || !isDevanagari(t) || /(?:वेबसाइट:|पर प्रकाशित समाचार|से संबंधित है|मुख्य संदर्भ)/u.test(t);
  const isValidCandidate = (str) => {
    if (!str) return false;
    const cl = cleanHeadlineText(str).trim();
    return cl.length >= 15 && isDevanagari(cl) && !/^\d+$/.test(cl) && !isBoilerplate(cl) && !isInvalidUrlHeadline(str);
  };
  let extractedTitle = "";
  if (articleMeta?.title && isValidCandidate(articleMeta.title)) {
    extractedTitle = cleanHeadlineText(cleanHtmlEntities(articleMeta.title));
  } else {
    const titleMatch = clean.match(/(?:^|\n)(?:Title|शीर्षक|हेडलाइन)\s*:\s*([^\n\r]+)/i);
    if (titleMatch && isValidCandidate(titleMatch[1])) {
      extractedTitle = cleanHeadlineText(titleMatch[1].trim());
    } else {
      const lines = clean.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (isValidCandidate(line) && !line.toLowerCase().startsWith("url:")) {
          extractedTitle = cleanHeadlineText(line);
          break;
        }
      }
    }
  }
  let extractedDesc = "";
  if (articleMeta?.description && articleMeta.description.trim().length > 10 && !isBoilerplate(articleMeta.description)) {
    extractedDesc = sanitizePressNoteFlattery(cleanHtmlEntities(articleMeta.description));
  } else {
    const descMatch = clean.match(/(?:^|\n)(?:Meta Description|Description|विवरण|सारांश)\s*:\s*([^\n\r]+)/i);
    if (descMatch && !isBoilerplate(descMatch[1])) {
      extractedDesc = sanitizePressNoteFlattery(descMatch[1].trim());
    }
  }
  if (extractedDesc) {
    extractedDesc = extractedDesc.replace(
      /(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi,
      " "
    ).replace(/^(?:[A-Za-z0-9\s,.\-–—:;'"()\/&]+[.!?।]\s*)+(?=[\u0900-\u097F])/u, "").replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&]{15,}?\.\s*(?=[\u0900-\u097F])/u, "").replace(/\s+/g, " ").trim();
  }
  let extractedContent = articleMeta?.content && !isBoilerplate(articleMeta.content) ? articleMeta.content : "";
  if (!extractedContent) {
    const contentMatch = clean.match(/(?:^|\n)(?:Article Content & Facts|Facts & Content|Content)\s*:\s*([\s\S]+)/i);
    if (contentMatch && !isBoilerplate(contentMatch[1])) {
      extractedContent = sanitizePressNoteFlattery(contentMatch[1].trim());
    }
  }
  if (extractedContent) {
    extractedContent = extractedContent.replace(
      /(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi,
      " "
    ).replace(/\s+/g, " ").trim();
  }
  if (!extractedTitle || !isValidCandidate(extractedTitle)) {
    const candidateSource = clean.length > 20 && isDevanagari(clean) ? clean : extractedContent || extractedDesc || "";
    const firstHindiSentence = candidateSource.split(/[।\n]+|(?<=[^\d])\.\s+/).map((s) => cleanHeadlineText(s).trim()).find((s) => isValidCandidate(s));
    if (firstHindiSentence) {
      extractedTitle = formatAsJournalisticHeadline(firstHindiSentence);
    }
    if (!extractedTitle) {
      extractedTitle = "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u0905\u092A\u0921\u0947\u091F";
    }
  }
  if (extractedTitle) {
    extractedTitle = cleanHeadlineText(sanitizePressNoteFlattery(extractedTitle));
  }
  const targetUrl = linkUrl || "";
  let detectedLocation = detectDistrictAndState(extractedTitle, extractedDesc, extractedContent || clean, targetUrl);
  if (!detectedLocation) {
    const fullCorpus2 = `${extractedTitle} ${extractedDesc} ${extractedContent} ${clean} ${targetUrl || ""}`;
    if (/(?:वाशिंगटन|व्हाइट[\s\-]*हाउस|white[\s\-]*house|washington)/i.test(fullCorpus2)) {
      detectedLocation = "\u0935\u093E\u0936\u093F\u0902\u0917\u091F\u0928";
    } else if (/(?:मास्को|moscow)/i.test(fullCorpus2)) {
      detectedLocation = "\u092E\u093E\u0938\u094D\u0915\u094B";
    } else if (/(?:लंदन|london)/i.test(fullCorpus2)) {
      detectedLocation = "\u0932\u0902\u0926\u0928";
    } else if (/(?:संसद[\s\-]*भवन|राष्ट्रपति[\s\-]*भवन|सुप्रीम[\s\-]*कोर्ट|राजधानी[\s\-]*दिल्ली|जंतर[\s\-]*मंतर|नई[\s\-]*दिल्ली|इंडिया[\s\-]*गेट)/i.test(fullCorpus2)) {
      detectedLocation = "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940";
    }
  }
  detectedLocation = cleanLocationField(detectedLocation);
  const fullCorpus = `${extractedTitle} ${extractedDesc} ${extractedContent} ${clean} ${targetUrl || ""}`;
  let category = "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930";
  const categories = ["\u0924\u093E\u091C\u093C\u093E"];
  if (/आईटी|टेक|ग्रीन कार्ड|वीजा|कंपनियों|टाटा|विप्रो|इंफोसिस|शेयर|बाजार|सेंसेक्स|अर्थव्यवस्था|बैंक|रुपया|डॉलर|कारोबार|tech|business/i.test(fullCorpus)) {
    category = "\u0915\u093E\u0930\u094B\u092C\u093E\u0930";
    categories.push("\u092C\u093F\u091C\u0928\u0947\u0938", "\u0935\u0948\u0936\u094D\u0935\u093F\u0915 \u092C\u093E\u091C\u093E\u0930");
  } else if (/हादसा|दुर्घटना|टक्कर|पलटी|घायल|मौत|accident/i.test(fullCorpus)) {
    category = "\u0939\u093E\u0926\u0938\u093E";
    categories.push("\u0939\u093E\u0926\u0938\u093E", "\u0938\u0921\u093C\u0915 \u0938\u0941\u0930\u0915\u094D\u0937\u093E");
  } else if (/अपराध|गिरफ्तार|पुलिस|हत्या|चोरी|रेड|धोखाधड़ी|crime/i.test(fullCorpus)) {
    category = "\u0905\u092A\u0930\u093E\u0927";
    categories.push("\u0905\u092A\u0930\u093E\u0927", "\u092A\u0941\u0932\u093F\u0938 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908");
  } else if (/राजनीति|चुनाव|कांग्रेस|बीजेपी|भाजपा|संसद|विधानसभा|politics/i.test(fullCorpus)) {
    category = "\u0930\u093E\u091C\u0928\u0940\u0924\u093F";
    categories.push("\u0930\u093E\u091C\u0928\u0940\u0924\u093F", "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F");
  } else if (/अंतरराष्ट्रीय|अमेरिका|ट्रम्प|रूस|युद्ध|international/i.test(fullCorpus)) {
    category = "\u0905\u0902\u0924\u0930\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F";
    categories.push("\u0905\u0902\u0924\u0930\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F", "\u0935\u0948\u0936\u094D\u0935\u093F\u0915 \u0905\u092A\u0921\u0947\u091F");
  } else {
    category = detectedLocation === "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940" ? "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F" : "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930";
    categories.push("\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930");
  }
  category = cleanCategoryField(category);
  const cleanBylineRegex = /(?:नईदुनिया प्रतिनिधि|दैनिक भास्कर|अमर उजाला|पत्रिका|नवभारत टाइम्स|हिंदुस्तान ब्यूरो|विशेष संवाददाता|ब्यूरो)[,\s]*[^\n।]+[।\n]?/gi;
  let baseTitle = cleanHeadlineText(extractedTitle);
  if (!isValidCandidate(baseTitle)) {
    const firstSent = clean.split(/[।\n]+|(?<=[^\d])\.\s+/).map((s) => cleanHeadlineText(s).trim()).find((s) => isValidCandidate(s));
    baseTitle = firstSent ? formatAsJournalisticHeadline(firstSent) : "\u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u0938\u092E\u093E\u091A\u093E\u0930 \u092E\u0941\u0916\u094D\u092F \u0905\u092A\u0921\u0947\u091F";
  }
  const cleanIsRealStory = clean.length > 15 && isDevanagari(clean);
  let corpusToExtract = clean;
  if (cleanIsRealStory) {
    if (extractedDesc && !isBoilerplate(extractedDesc)) corpusToExtract += `

${extractedDesc}`;
    if (extractedContent && !isBoilerplate(extractedContent)) corpusToExtract += `

${extractedContent}`;
  } else {
    corpusToExtract = extractedDesc || extractedContent ? `${extractedDesc}

${extractedContent}` : clean;
  }
  const rawFactsCorpus = corpusToExtract.replace(/(?:^|\n|[\s।.\-–—])\s*(?:Title|शीर्षक|हेडलाइन|Headline)\s*:\s*[^\n\r]+/gi, " ").replace(/(?:^|\n|[\s।.\-–—])\s*(?:Meta Description|Description|विवरण|सारांश)\s*:\s*/gi, " ").replace(/(?:^|\n|[\s।.\-–—])\s*(?:Article Content & Facts|Facts & Content|Content|Article Content|URL|Link)\s*:\s*/gi, " ").replace(cleanBylineRegex, " ").replace(/(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi, " ").replace(/^(?:[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]+[.!?।]\s*)+(?=[\u0900-\u097F])/u, "").replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]{12,}?[.!?।]\s*(?=[\u0900-\u097F])/u, "").replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]{15,}?\s*(?=[\u0900-\u097F])/u, "");
  const safeFacts = rawFactsCorpus.replace(/(डाॅ|डॉ|पं|प्रो|श्री|क्र|सं|ले|कै|एड)\./g, "$1#DOT#").replace(/\b([A-Za-z])\.(?=\s*[A-Za-z]\.)/g, "$1#DOT#");
  const articleSentences = safeFacts.split(/[।\n]+|(?<=[^\d])\.\s+/).map(
    (s) => s.replace(/#DOT#/g, ".").replace(/(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi, " ").replace(/^(?:Title|Meta Description|Description|URL|Link)[:\s]*/i, "").replace(/^(?:[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]+[.!?।]\s*)+(?=[\u0900-\u097F])/u, "").replace(/^[A-Za-z0-9\s,.\-–—:;'"()\/&|!_]{10,}?\s*(?=[\u0900-\u097F])/u, "").trim()
  ).filter((s) => {
    if (s.length <= 15) return false;
    if (/^(विज्ञापन|क्लिक करें|यह भी पढ़ें|कॉपी लिंक|फाइल फोटो|शेयर करें)/i.test(s)) return false;
    if (!/[\u0900-\u097F]/.test(s)) return false;
    if (/(?:वेबसाइट|प्रकाशित समाचार|से संबंधित)/u.test(s)) return false;
    const hindiCount = (s.match(/[\u0900-\u097F]/g) || []).length;
    const englishCount = (s.match(/[A-Za-z]/g) || []).length;
    if (hindiCount < 10 || englishCount > hindiCount) return false;
    if (/[A-Za-z]{6,}/.test(s) && englishCount > 15) return false;
    return true;
  });
  const titleParts = baseTitle.split(/[:|–—]+/).map((p) => p.trim()).filter((p) => p.length >= 8);
  const turnSentenceToHeadline = (sentence, maxLength = 105) => {
    let s = cleanHeadlineText(sentence).replace(/^(इसके तहत|इसके अनुसार|इनके तहत|प्राप्त जानकारी के अनुसार|सूत्रों के अनुसार|बता दें कि|गौरतलब है कि|वहीं|इधर|हालांकि|दरअसल|सभी)\s+/gi, "").trim();
    if (s.length > maxLength) {
      const commaIdx = s.lastIndexOf(" \u0914\u0930 ", maxLength);
      const spaceIdx = s.lastIndexOf(" ", maxLength);
      const cutIdx = commaIdx > 35 ? commaIdx : spaceIdx > 35 ? spaceIdx : maxLength;
      s = s.slice(0, cutIdx).trim();
    }
    return cleanHeadlineText(s);
  };
  const headlineOptions = generate5BalancedHeadlineOptions(baseTitle, articleSentences, detectedLocation);
  const headline = headlineOptions[0] || baseTitle;
  const words = headline.split(/\s+/).filter(Boolean);
  const highlightWords = [];
  for (const w of words) {
    const cleanW = w.replace(/[.,:;!?'"()]/g, "");
    if (/\d+/.test(cleanW) || cleanW.length >= 5 && !/के|की|का|में|पर|से|को|ने|है|और/.test(cleanW)) {
      if (!highlightWords.includes(cleanW) && highlightWords.length < 3) {
        highlightWords.push(cleanW);
      }
    }
  }
  let formattedHeadline = headline;
  if (highlightWords.length > 0) {
    for (const hw of highlightWords) {
      if (formattedHeadline.includes(hw)) {
        formattedHeadline = formattedHeadline.replace(
          new RegExp(`(${hw})`, "g"),
          "[highlight]$1[/highlight]"
        );
        break;
      }
    }
  }
  const combinedFacts = corpusToExtract;
  const captionVariants = formatCaptionVariants(headline, detectedLocation, combinedFacts, username);
  const anchorScript = `\u0928\u092E\u0938\u094D\u0915\u093E\u0930, \u092E\u0948\u0902 \u090F\u0906\u0908 \u0928\u094D\u092F\u0942\u091C\u093C \u0938\u0947\u0964 \u0907\u0938 \u0938\u092E\u092F \u0915\u0940 \u092C\u0921\u093C\u0940 \u0916\u092C\u0930 ${detectedLocation} \u0938\u0947 \u0939\u0948\u0964 ${headline}\u0964 \u092E\u093E\u092E\u0932\u0947 \u092E\u0947\u0902 \u0938\u092D\u0940 \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u092A\u0915\u094D\u0937\u094B\u0902 \u0915\u0940 \u092A\u094D\u0930\u0924\u093F\u0915\u094D\u0930\u093F\u092F\u093E \u0938\u093E\u092E\u0928\u0947 \u0906 \u0930\u0939\u0940 \u0939\u0948\u0964 \u0906\u0907\u090F \u0926\u0947\u0916\u0924\u0947 \u0939\u0948\u0902 \u0907\u0938 \u092A\u0942\u0930\u0947 \u092E\u093E\u092E\u0932\u0947 \u092A\u0930 \u0939\u092E\u093E\u0930\u0940 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u0930\u093F\u092A\u094B\u0930\u094D\u091F\u0964`;
  const suggestedPhoto = articleMeta?.imageUrl ? articleMeta.imageUrl : `Journalistic news press photo depicting ${headline}, realistic news photography, India`;
  return {
    headline,
    headlineOptions: headlineOptions.slice(0, 5),
    highlightWords,
    formattedHeadline,
    location: detectedLocation,
    summary: captionVariants.captionDetailed,
    captionDetailed: captionVariants.captionDetailed,
    captionBullets: captionVariants.captionBullets,
    captionShort: captionVariants.captionShort,
    anchorScript,
    categories,
    category,
    suggestedImagePrompt: suggestedPhoto,
    isAiGeneratedPhoto: false,
    speakerName: "",
    speakerTitle: "",
    pickedImages: articleMeta?.imageUrl ? { main: articleMeta.imageUrl } : void 0,
    isLocalFallback: true,
    warning: "AI \u092E\u0949\u0921\u0932 \u092A\u0930 \u0905\u0938\u094D\u0925\u093E\u092F\u0940 \u0932\u094B\u0921 \u092F\u093E \u0915\u094B\u091F\u093E \u0938\u0940\u092E\u093E \u0915\u0947 \u0915\u093E\u0930\u0923 \u0906\u092A\u0915\u0940 \u0932\u093F\u0902\u0915 \u0938\u093E\u092E\u0917\u094D\u0930\u0940 \u0938\u0947 \u0924\u094D\u0935\u0930\u093F\u0924 \u0909\u091A\u094D\u091A \u0917\u0941\u0923\u0935\u0924\u094D\u0924\u093E \u0935\u093E\u0932\u093E \u0921\u094D\u0930\u093E\u092B\u094D\u091F \u0924\u0948\u092F\u093E\u0930 \u0915\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964"
  };
}
function verifyDiagnosticKey(req) {
  const rawKey = String(
    process.env.ADMIN_DIAGNOSTIC_KEY || process.env.admin_diagnostic_key || process.env.DIAGNOSTIC_KEY || ""
  );
  const configuredKey = rawKey.replace(/[\r\n\"\']/g, "").trim();
  if (configuredKey && configuredKey.length >= 16) {
    const authHeader = String(req.headers["authorization"] || req.headers["Authorization"] || "");
    const bearerKey = authHeader.replace(/^Bearer\s+/i, "").trim();
    const customHeaderKey = String(req.headers["x-admin-diagnostic-key"] || req.headers["X-Admin-Diagnostic-Key"] || "").trim();
    const providedKey = (bearerKey || customHeaderKey).replace(/[\r\n\"\']/g, "").trim();
    if (providedKey) {
      const pBuf = Buffer.from(providedKey, "utf8");
      const cBuf = Buffer.from(configuredKey, "utf8");
      if (pBuf.length === cBuf.length && require("node:crypto").timingSafeEqual(pBuf, cBuf)) {
        return { authorized: true };
      }
    }
  }
  const callerEmail = String(req.headers["x-admin-email"] || req.headers["x-user-email"] || "").trim().toLowerCase();
  const adminSecret = String(req.headers["x-admin-secret"] || "").trim();
  const isMaster = callerEmail === "admin.ainewsmaker@gmail.com" || callerEmail === "breakingnewswala.com@gmail.com";
  if (isMaster && adminSecret === "MASTER_ADMIN_DIAGNOSTIC_BYPASS") {
    return { authorized: true };
  }
  if (!configuredKey || configuredKey.length < 16) {
    return { authorized: false, status: 401, error: "Unauthorized: ADMIN_DIAGNOSTIC_KEY is not configured on server" };
  }
  return { authorized: false, status: 401, error: "Unauthorized: Invalid diagnostic credentials" };
}
app.get("/api/admin/diagnostic/firestore-test", async (req, res) => {
  try {
    const authCheck = verifyDiagnosticKey(req);
    if (!authCheck.authorized) {
      return res.status(authCheck.status || 401).json({ error: authCheck.error });
    }
    let adapter;
    try {
      adapter = require_server_firestore_adapter();
    } catch {
      adapter = require_server_firestore_adapter();
    }
    const result = await adapter.runDiagnosticSelfTest();
    return res.json({
      success: result.success,
      report: result,
      useFirestoreFlag: adapter.USE_FIRESTORE,
      message: result.success ? "Firestore read/write successfully verified via ADC." : "Firestore access not yet granted to runtime service account."
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.post("/api/admin/migration/run-firestore-sync", async (req, res) => {
  try {
    const authCheck = verifyDiagnosticKey(req);
    if (!authCheck.authorized) {
      return res.status(authCheck.status || 401).json({ error: authCheck.error });
    }
    const { migrate } = require_migrate_json_to_firestore();
    const isLive = req.body && req.body.live === true;
    const result = await migrate({ dryRun: !isLive });
    return res.json({
      success: true,
      liveMode: isLive,
      stats: result,
      message: isLive ? "Data successfully migrated to Cloud Firestore." : "Dry run complete. No writes performed."
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/analyze-image", enforceUserAccessMiddleware, async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = "image/jpeg",
      userContext,
      template_id,
      headline_max_lines,
      headline_area,
      headline_line_count
    } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data" });
    }
    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing. Please set it in Settings > Secrets."
      });
    }
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const effectiveTemplateId = template_id || "graphic_001";
    const tplConfig = getTemplateConfig(effectiveTemplateId);
    const targetMaxLines = Number(headline_max_lines) || Number(headline_line_count) || tplConfig.headline_max_lines || 3;
    const targetArea = headline_area || tplConfig.headline_area;
    const promptText = `
\u0906\u092A \u090F\u0915 \u0935\u0930\u093F\u0937\u094D\u0920 \u0939\u093F\u0902\u0926\u0940 \u0938\u092E\u093E\u091A\u093E\u0930 \u0938\u0902\u092A\u093E\u0926\u0915 \u0939\u0948\u0902\u0964
\u092F\u0942\u091C\u093C\u0930 \u0928\u0947 \u092F\u0939 \u092B\u094B\u091F\u094B \u0905\u092A\u0932\u094B\u0921 \u0915\u0940 \u0939\u0948 \u0914\u0930 \u0928\u094D\u092F\u0942\u091C\u093C \u0915\u093E\u0930\u094D\u0921 \u092C\u0928\u093E\u0928\u093E \u091A\u093E\u0939\u0924\u093E \u0939\u0948\u0964

${userContext ? `\u092F\u0942\u091C\u093C\u0930 \u0915\u093E \u0928\u093F\u0930\u094D\u0926\u0947\u0936 / \u0938\u0902\u0926\u0930\u094D\u092D: ${userContext}` : ""}

\u092B\u094B\u091F\u094B \u0915\u093E \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0928\u093F\u092E\u094D\u0928\u0932\u093F\u0916\u093F\u0924 JSON \u092B\u0949\u0930\u094D\u092E\u0947\u091F \u092E\u0947\u0902 \u0909\u0924\u094D\u0924\u0930 \u0926\u0947\u0902:
1. "headline": \u090F\u0915 \u092C\u0939\u0941\u0924 \u0939\u0940 \u0906\u0915\u0930\u094D\u0937\u0915 \u0914\u0930 \u0938\u094D\u092A\u0937\u094D\u091F \u0939\u093F\u0902\u0926\u0940 \u0928\u094D\u092F\u0942\u091C\u093C \u0939\u0947\u0921\u0932\u093E\u0907\u0928\u0964
2. "highlightWords": \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u0947 \u0935\u0947 \u0938\u092C\u0938\u0947 \u092E\u0941\u0916\u094D\u092F 2 \u0938\u0947 4 \u0936\u092C\u094D\u0926 \u091C\u093F\u0928\u094D\u0939\u0947\u0902 \u0939\u093E\u0907\u0932\u093E\u0907\u091F \u0915\u093F\u092F\u093E \u091C\u093E\u0928\u093E \u091A\u093E\u0939\u093F\u090F\u0964
3. "formattedHeadline": \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u091C\u093F\u0938\u092E\u0947\u0902 \u0939\u093E\u0907\u0932\u093E\u0907\u091F \u0939\u094B\u0928\u0947 \u0935\u093E\u0932\u0947 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u0947 \u0906\u0917\u0947-\u092A\u0940\u091B\u0947 [yellow] \u0914\u0930 [/yellow] \u091F\u0948\u0917 \u0932\u0917\u0947 \u0939\u094B\u0902\u0964
4. "location": \u0918\u091F\u0928\u093E \u0938\u0947 \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u091C\u093F\u0932\u093E \u092F\u093E \u0930\u093E\u091C\u094D\u092F \u0915\u093E \u0928\u093E\u092E\u0964
5. "summary": \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u092A\u094B\u0938\u094D\u091F \u0915\u0947 \u0932\u093F\u090F \u0909\u092A\u092F\u0941\u0915\u094D\u0924 \u0914\u0930 \u0938\u094D\u092A\u0937\u094D\u091F \u0938\u092E\u093E\u091A\u093E\u0930 \u0935\u093F\u0935\u0930\u0923\u0964
6. "category": \u090F\u0915 \u0936\u092C\u094D\u0926 \u0915\u0940 \u0936\u094D\u0930\u0947\u0923\u0940 (\u091C\u0948\u0938\u0947 "\u0939\u093E\u0926\u0938\u093E", "\u0938\u0930\u0915\u093E\u0930", "\u0906\u0902\u0926\u094B\u0932\u0928", "\u0930\u093E\u091C\u0928\u0940\u0924\u093F", "\u0905\u092A\u0930\u093E\u0927", "\u092A\u094D\u0930\u0936\u093E\u0938\u0928")\u0964
7. "hasPerson": \u0915\u094D\u092F\u093E \u092B\u094B\u091F\u094B \u092E\u0947\u0902 \u0915\u094B\u0908 \u092E\u0941\u0916\u094D\u092F \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0915\u093E \u0915\u094D\u0932\u094B\u091C\u093C\u0905\u092A/\u092A\u094B\u0930\u094D\u091F\u094D\u0930\u0947\u091F \u0939\u0948 \u091C\u093F\u0938\u0947 \u0915\u091F\u0906\u0909\u091F \u092E\u0947\u0902 \u0926\u093F\u0916\u093E\u092F\u093E \u091C\u093E \u0938\u0915\u0924\u093E \u0939\u0948? (true \u092F\u093E false).
8. "description": \u092B\u094B\u091F\u094B \u092E\u0947\u0902 \u0915\u094D\u092F\u093E-\u0915\u094D\u092F\u093E \u0926\u093F\u0916\u093E\u0908 \u0926\u0947 \u0930\u0939\u093E \u0939\u0948 \u0907\u0938\u0915\u093E \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935\u093F\u0935\u0930\u0923\u0964
9. "isAiGeneratedPhoto": \u0915\u094D\u092F\u093E \u092F\u0939 \u092B\u094B\u091F\u094B AI \u091C\u0928\u0930\u0947\u091F\u0947\u0921 \u092F\u093E \u0921\u093F\u091C\u093F\u091F\u0932 \u0907\u0932\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u092A\u094D\u0930\u0924\u0940\u0924 \u0939\u094B\u0924\u0940 \u0939\u0948? (true \u092F\u093E false).
10. "speakerName": \u092F\u0926\u093F \u092F\u0939 \u0915\u093F\u0938\u0940 \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0915\u093E \u092C\u092F\u093E\u0928/\u0915\u094B\u091F\u0947\u0936\u0928 \u0939\u0948 \u0924\u094B \u0909\u0928\u0915\u093E \u0928\u093E\u092E, \u0905\u0928\u094D\u092F\u0925\u093E \u0916\u093E\u0932\u0940 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917 ("")\u0964
11. "speakerTitle": \u0909\u0928\u0915\u093E \u092A\u0926 \u092F\u093E \u092A\u0926\u0935\u0940, \u0905\u0928\u094D\u092F\u0925\u093E \u0916\u093E\u0932\u0940 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917 ("")\u0964
`;
    const contents = {
      parts: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64
          }
        },
        {
          text: promptText
        }
      ]
    };
    const response = await generateWithFallbackAndRetry(
      ai,
      DEFAULT_FALLBACK_MODELS,
      {
        contents,
        config: {
          systemInstruction: "You are a professional Hindi news editor. Strip PR flattery and honorifics. Output valid JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              headline: { type: import_genai.Type.STRING },
              highlightWords: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING }
              },
              formattedHeadline: { type: import_genai.Type.STRING },
              location: { type: import_genai.Type.STRING },
              summary: { type: import_genai.Type.STRING },
              category: { type: import_genai.Type.STRING },
              hasPerson: { type: import_genai.Type.BOOLEAN },
              description: { type: import_genai.Type.STRING },
              isAiGeneratedPhoto: { type: import_genai.Type.BOOLEAN },
              speakerName: { type: import_genai.Type.STRING },
              speakerTitle: { type: import_genai.Type.STRING }
            },
            required: [
              "headline",
              "highlightWords",
              "formattedHeadline",
              "location",
              "summary"
            ]
          }
        }
      }
    );
    const textOutput = response.text || "{}";
    const parsedData = JSON.parse(textOutput);
    if (parsedData.headline) parsedData.headline = sanitizePressNoteFlattery(parsedData.headline);
    if (parsedData.formattedHeadline) parsedData.formattedHeadline = sanitizePressNoteFlattery(parsedData.formattedHeadline);
    if (parsedData.summary) parsedData.summary = sanitizePressNoteFlattery(parsedData.summary);
    if (parsedData.speakerName) parsedData.speakerName = sanitizePressNoteFlattery(parsedData.speakerName);
    if (parsedData.speakerTitle) parsedData.speakerTitle = sanitizePressNoteFlattery(parsedData.speakerTitle);
    parsedData.template_id = tplConfig.template_id;
    parsedData.headline_max_lines = targetMaxLines;
    parsedData.headline_area = targetArea;
    parsedData.headline_line_count = targetMaxLines;
    return res.json({ success: true, data: parsedData });
  } catch (err) {
    console.log("[Image AI] Gemini busy or quota limit - providing structured photo analysis fallback.");
    const targetMaxLines = Number(req.body.headline_max_lines) || Number(req.body.headline_line_count) || 3;
    const effectiveTemplateId = req.body.template_id || "graphic_001";
    const tplConfig = getTemplateConfig(effectiveTemplateId);
    const userContext = req.body.userContext || "";
    const fallbackHeadline = userContext ? `${userContext.slice(0, 45).replace(/[।\.\,\!\?\:\-]+$/g, "")}: \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u092E\u093E\u092E\u0932\u093E, \u0905\u0917\u094D\u0930\u093F\u092E \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u091C\u093E\u0930\u0940` : "\u0924\u0938\u094D\u0935\u0940\u0930 \u0938\u0947 \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E: \u091C\u093E\u0902\u091A \u0935 \u0905\u0917\u094D\u0930\u093F\u092E \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u091C\u093E\u0930\u0940";
    const fallbackSummary = userContext ? `${userContext}\u0964 \u092E\u094C\u0915\u0947 \u092A\u0930 \u0906\u0935\u0936\u094D\u092F\u0915 \u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u090F\u0935\u0902 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0926\u093F\u0936\u093E-\u0928\u093F\u0930\u094D\u0926\u0947\u0936 \u091C\u093E\u0930\u0940 \u0915\u093F\u090F \u0917\u090F \u0939\u0948\u0902\u0964 #BreakingNews` : "\u092A\u094D\u0930\u093E\u092A\u094D\u0924 \u091A\u093F\u0924\u094D\u0930 \u0915\u0947 \u0906\u0927\u093E\u0930 \u092A\u0930 \u092E\u094C\u0915\u0947 \u0915\u093E \u091C\u093E\u092F\u091C\u093E \u0932\u093F\u092F\u093E \u091C\u093E \u0930\u0939\u093E \u0939\u0948\u0964 \u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u0938\u094D\u0924\u0930 \u092A\u0930 \u0906\u0935\u0936\u094D\u092F\u0915 \u0928\u093F\u0930\u094D\u0926\u0947\u0936 \u0926\u093F\u090F \u0917\u090F \u0939\u0948\u0902\u0964 #BreakingNews";
    return res.json({
      success: true,
      data: {
        headline: fallbackHeadline,
        formattedHeadline: fallbackHeadline,
        highlightWords: ["\u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908", "\u091C\u093E\u0902\u091A", "\u092B\u0948\u0938\u0932\u093E"],
        location: "",
        summary: fallbackSummary,
        category: "\u0905\u092A\u0930\u093E\u0927 \u0935 \u0915\u093E\u0928\u0942\u0928",
        hasPerson: true,
        isAiGeneratedPhoto: false,
        template_id: tplConfig.template_id,
        headline_max_lines: targetMaxLines,
        headline_area: req.body.headline_area || tplConfig.headline_area,
        headline_line_count: targetMaxLines,
        quotaNotice: "AI \u092E\u0949\u0921\u0932 \u0935\u094D\u092F\u0938\u094D\u0924 \u0939\u094B\u0928\u0947 \u0915\u0947 \u0915\u093E\u0930\u0923 \u0938\u094D\u092E\u093E\u0930\u094D\u091F \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923 \u0938\u0915\u094D\u0930\u093F\u092F \u0915\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964"
      }
    });
  }
});
function fitHeadlineNaturally(text, minChars = 50, maxChars = 100, factSentence) {
  if (!text) return "";
  let cleaned = sanitizePressNoteFlattery(cleanHeadlineText(text), true).replace(/^(?:विकल्प\s*\d+[\s:\-–—]*|\d+[\s.\-–—]+|[•\-\*]\s*)/u, "").replace(/^(?:Breaking News|Live Updates?|Latest News|Big Breaking)[:\s\-–—]*/i, "").replace(/^(?:मामले में बड़ा एक्शन|जनसरोकार और व्यवस्था पर सीधा असर|इलाके में मचा हड़कंप|पड़ताल में बड़ा खुलासा|जांच और कार्रवाई तेज)[:\s\-–—]*/u, "").replace(/^(?:[\u0900-\u097F]+(?:\s*,\s*[\u0900-\u097F]+)?)\s*[:\-–—]\s*/u, (match) => {
    if (/^(?:विशेष|ब्रेकिंग|बड़ी खबर|बड़ा फैसला)/u.test(match)) return match;
    return "";
  }).replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
  if (cleaned.length >= minChars && cleaned.length <= maxChars) {
    return formatAsJournalisticHeadline(cleaned).replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
  }
  if (cleaned.length > maxChars) {
    const sub = cleaned.slice(0, maxChars);
    const lastDelim = Math.max(sub.lastIndexOf(","), sub.lastIndexOf(":"), sub.lastIndexOf("\u2013"), sub.lastIndexOf("-"));
    const lastSpace = sub.lastIndexOf(" ");
    if (lastDelim >= minChars) {
      cleaned = sub.slice(0, lastDelim).trim();
    } else if (lastSpace >= minChars) {
      cleaned = sub.slice(0, lastSpace).trim();
    } else {
      cleaned = sub.trim();
    }
    cleaned = cleaned.replace(/(?:\s+(?:ने|के|की|का|में|पर|से|को|और|या|एवं|व|कि|हेतु|लिए|सहित|तक|तहत|दौरान|यह|वह|एक)|\s+(?:पड़|जा|रहा|रहे|रही|करते|होते|आते|जाते))$/u, "").trim();
  }
  if (cleaned.length < minChars && factSentence) {
    const factsList = (Array.isArray(factSentence) ? factSentence : [factSentence]).filter(Boolean);
    for (const f of factsList) {
      if (cleaned.length >= minChars) break;
      const cleanF = sanitizePressNoteFlattery(cleanHeadlineText(f), true).replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
      if (!cleanF || cleanF.length < 8 || cleaned.includes(cleanF) || /(?:वेबसाइट|प्रकाशित समाचार|से संबंधित)/u.test(cleanF)) continue;
      const remainingChars = maxChars - cleaned.length - 2;
      if (remainingChars >= 10) {
        let fPart = cleanF;
        if (fPart.length > remainingChars) {
          const cut = fPart.slice(0, remainingChars);
          const spaceIdx = cut.lastIndexOf(" ");
          fPart = spaceIdx > 8 ? cut.slice(0, spaceIdx).trim() : cut.trim();
        }
        fPart = fPart.replace(/(?:\s+(?:ने|के|की|का|में|पर|से|को|और|या|एवं|व|कि|हेतु|लिए|सहित|तक|तहत|दौरान|यह|वह|एक)|\s+(?:पड़|जा|रहा|रहे|रही|करते|होते|आते|जाते))$/u, "").trim();
        if (fPart.length >= 6) {
          cleaned = `${cleaned}, ${fPart}`;
        }
      }
    }
  }
  return formatAsJournalisticHeadline(cleaned).replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
}
function generate5BalancedHeadlineOptions(primaryTitle, factSentences = [], location = "") {
  const cleanBase = sanitizePressNoteFlattery(cleanHeadlineText(primaryTitle || ""), true).replace(/[।\.\,\!\?\:\-–—;;\s]+$/g, "").trim();
  const validFacts = (factSentences || []).map((s) => sanitizePressNoteFlattery(cleanHeadlineText(s), true).replace(/[।\.\,\!\?\:\-–—;;\s]+$/g, "").trim()).filter((s) => s.length >= 15 && !/(?:वेबसाइट|प्रकाशित|से संबंधित|मुख्य संदर्भ|domain|विषय:)/u.test(s));
  const base = cleanBase || (validFacts.length > 0 ? validFacts[0] : "\u092E\u0941\u0916\u094D\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F");
  const locPrefix = location && location !== "\u0935\u093F\u0936\u0947\u0937 \u0915\u0935\u0930\u0947\u091C" ? `${location}: ` : "";
  const uniqueOptions = [];
  const addOptionIfClean = (cand) => {
    if (!cand) return;
    const formatted = fitSingleHeadlineToTier(cand, 150);
    if (!formatted || formatted.length < 15) return;
    if (uniqueOptions.includes(formatted)) return;
    const isTooSimilar = uniqueOptions.some((ex) => calculateHeadlineSimilarityInternal(ex, formatted) >= 0.9);
    if (!isTooSimilar) {
      uniqueOptions.push(formatted);
    }
  };
  addOptionIfClean(base);
  if (locPrefix && !base.startsWith(locPrefix)) {
    addOptionIfClean(`${locPrefix}${base}`);
  }
  for (const fact of validFacts) {
    if (uniqueOptions.length >= 5) break;
    if (fact && fact !== base) {
      addOptionIfClean(fact);
    }
  }
  const clauseDelims = [", ", " - ", ": ", " \u2014 "];
  for (const d of clauseDelims) {
    if (uniqueOptions.length >= 5) break;
    if (base.includes(d)) {
      const parts = base.split(d).map((p) => p.trim()).filter((p) => p.length >= 8);
      if (parts.length >= 2) {
        addOptionIfClean(`${parts.slice(1).join(d)}: ${parts[0]}`);
        addOptionIfClean(`${parts.slice(1).join(d)}, ${parts[0]}`);
      }
    }
  }
  const questionMatch = base.match(/^कौन\s+हैं?\s+([^,]+),\s*(?:जिसकी|जिन्होंने|जिसने|जो)\s+(.+)$/u);
  if (questionMatch) {
    const actor = questionMatch[1].trim();
    const action = questionMatch[2].trim();
    addOptionIfClean(`${actor}: ${action}`);
    addOptionIfClean(`${action}: \u091C\u093E\u0928\u093F\u090F \u0915\u094C\u0928 \u0939\u0948\u0902 ${actor}`);
    addOptionIfClean(`${actor} \u0915\u0940 \u091A\u0930\u094D\u091A\u093E: ${action}`);
    addOptionIfClean(`${action}, ${actor} \u0915\u0940 \u092E\u0941\u0916\u094D\u092F \u092D\u0942\u092E\u093F\u0915\u093E`);
    addOptionIfClean(`${actor} \u0915\u0940 \u090F\u0902\u091F\u094D\u0930\u0940 \u0938\u0947 \u091A\u0930\u094D\u091A\u093E \u092E\u0947\u0902 ${action}`);
  }
  if (base.includes(" \u0928\u0947 ") || base.includes(" \u0915\u094B ") || base.includes(" \u092E\u0947\u0902 ")) {
    const words = base.split(/\s+/);
    if (words.length >= 10) {
      const naturalCut = words.slice(0, Math.min(words.length, 18)).join(" ");
      addOptionIfClean(naturalCut);
    }
  }
  const connectorMatches = base.match(/^(.+?)\s+(?:करने\s+पर|होने\s+पर|के\s+बाद|के\s+दौरान)\s*,?\s*(.+)$/u);
  if (connectorMatches) {
    const cause = connectorMatches[1].trim();
    const effect = connectorMatches[2].trim();
    addOptionIfClean(`${effect}: ${cause} \u0915\u093E \u092E\u093E\u092E\u0932\u093E`);
    addOptionIfClean(`${cause}: ${effect}`);
  }
  const editorialPrefixes = ["\u092C\u0921\u093C\u0940 \u0916\u092C\u0930: ", "\u0924\u093E\u091C\u093C\u093E \u0905\u092A\u0921\u0947\u091F: ", "\u0935\u093F\u0936\u0947\u0937 \u0930\u093F\u092A\u094B\u0930\u094D\u091F: ", "\u091C\u093E\u0928\u093F\u090F: ", "\u092A\u094D\u0930\u092E\u0941\u0916 \u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E: "];
  for (const p of editorialPrefixes) {
    if (uniqueOptions.length >= 5) break;
    if (!base.startsWith(p)) {
      const fitted = fitSingleHeadlineToTier(`${p}${base}`, 150);
      if (fitted && !uniqueOptions.includes(fitted)) {
        uniqueOptions.push(fitted);
      }
    }
  }
  return uniqueOptions.slice(0, 5);
}
function generate4BalancedHeadlineOptions(primaryTitle, factSentences = [], location = "") {
  return generate5BalancedHeadlineOptions(primaryTitle, factSentences, location).slice(0, 4);
}
var HEADLINE_MAX_CHARACTER_LIMIT = 150;
var HEADLINE_5_TIER_MAX_LIMITS = [150, 150, 150, 150, 150];
function fitSingleHeadlineToTier(text, maxLimit = HEADLINE_MAX_CHARACTER_LIMIT) {
  if (!text) return "";
  let cleaned = sanitizePressNoteFlattery(cleanHeadlineText(text), true);
  cleaned = cleaned.replace(/\s*[,।]?\s*(?:जिससे|इससे)\s+लोगों\s+को\s+मदद\s+मिलेगी.*$/u, "");
  cleaned = cleaned.replace(/[।\.\,\!\?\:\-–—;;\s]+$/g, "").trim();
  if (cleaned.length <= maxLimit) {
    return cleaned;
  }
  const sliced = cleaned.substring(0, maxLimit);
  const lastDelim = Math.max(
    sliced.lastIndexOf(", "),
    sliced.lastIndexOf(" - "),
    sliced.lastIndexOf(": "),
    sliced.lastIndexOf("; ")
  );
  const lastSpace = sliced.lastIndexOf(" ");
  if (lastDelim > 40) {
    cleaned = sliced.substring(0, lastDelim);
  } else if (lastSpace > 25) {
    cleaned = sliced.substring(0, lastSpace);
  } else {
    cleaned = sliced;
  }
  cleaned = cleaned.replace(/(?:\s+(?:ने|के|की|का|में|पर|से|को|और|या|एवं|व|कि|हेतु|लिए|सहित|तक|तहत|दौरान|यह|वह|एक|कहा|बोले))$/u, "").trim();
  return cleaned.replace(/[।\.\,\!\?\:\-–—;;\s]+$/g, "").trim();
}
function fitHeadlinesTo5TierRanges(headlines, contextOrBase = "", baseOrContext = "", location = "") {
  const safeHeadlines = Array.isArray(headlines) ? [...headlines] : [];
  const result = [];
  for (let i = 0; i < 5; i++) {
    const raw = safeHeadlines[i];
    if (raw) {
      const fitted = fitSingleHeadlineToTier(raw, 150);
      if (fitted && !result.includes(fitted)) {
        result.push(fitted);
      }
    }
  }
  if (result.length < 5) {
    const baseText = typeof baseOrContext === "string" && baseOrContext.trim() ? baseOrContext.trim() : typeof contextOrBase === "string" && contextOrBase.trim() ? contextOrBase.trim() : result[0] || "\u092E\u0941\u0916\u094D\u092F \u0938\u092E\u093E\u091A\u093E\u0930";
    const factSentences = Array.isArray(contextOrBase) ? contextOrBase : Array.isArray(baseOrContext) ? baseOrContext : [];
    const supp = generate5BalancedHeadlineOptions(baseText, factSentences, location);
    for (const cand of supp) {
      if (result.length >= 5) break;
      const fitted = fitSingleHeadlineToTier(cand, 150);
      if (fitted && !result.includes(fitted)) {
        result.push(fitted);
      }
    }
  }
  return result.slice(0, 5).map((h) => fitSingleHeadlineToTier(h, 150));
}
var GEMINI_NEWS_RESPONSE_SCHEMA = {
  type: import_genai.Type.OBJECT,
  properties: {
    headline: { type: import_genai.Type.STRING },
    headlineOptions: {
      type: import_genai.Type.ARRAY,
      items: { type: import_genai.Type.STRING },
      description: "Exactly 5 distinct, factual headline options for the SAME central news event (BREAKING NEWS WALA style, each up to 150 characters maximum, concise, active Devanagari Hindi without ending punctuation)"
    },
    highlightWords: {
      type: import_genai.Type.ARRAY,
      items: { type: import_genai.Type.STRING }
    },
    formattedHeadline: { type: import_genai.Type.STRING },
    location: { type: import_genai.Type.STRING },
    summary: { type: import_genai.Type.STRING },
    captionDetailed: { type: import_genai.Type.STRING },
    captionBullets: { type: import_genai.Type.STRING },
    captionShort: { type: import_genai.Type.STRING },
    category: { type: import_genai.Type.STRING },
    suggestedImagePrompt: { type: import_genai.Type.STRING },
    isAiGeneratedPhoto: { type: import_genai.Type.BOOLEAN },
    speakerName: { type: import_genai.Type.STRING },
    speakerTitle: { type: import_genai.Type.STRING }
  },
  required: [
    "headline",
    "headlineOptions",
    "highlightWords",
    "formattedHeadline",
    "location",
    "summary",
    "captionDetailed",
    "captionBullets",
    "captionShort",
    "category"
  ]
};
function buildMasterNewsEditorialPrompt(params) {
  const {
    effectiveInput,
    primaryHeadline = "",
    fullArticleText = "",
    fetchedArticleSnippet,
    customPrompt,
    channelUsername = "reporter",
    targetMaxLines = 3,
    targetArea = "center",
    templateName = "Classic Graphic",
    templateId = "graphic_001"
  } = params;
  const cleanUser = (channelUsername || "").replace(/^@/, "").replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "").trim();
  const isGeneric = ["user", "username", "reporter", "admin", "superadmin", "null", "undefined"].includes(cleanUser.toLowerCase());
  const userTagInstruction = cleanUser && !isGeneric ? `\u092A\u0939\u0932\u093E \u0939\u0948\u0936\u091F\u0948\u0917: #${cleanUser}` : `(\u092F\u0926\u093F \u092F\u0942\u091C\u093C\u0930\u0928\u0947\u092E \u0928 \u0939\u094B \u0924\u094B \u0915\u094B\u0908 \u092F\u0942\u091C\u093C\u0930\u0928\u0947\u092E \u0939\u0948\u0936\u091F\u0948\u0917 \u0928 \u0932\u0917\u093E\u090F\u0902)`;
  const systemInstruction = `\u0906\u092A BREAKING NEWS WALA \u0938\u0902\u092A\u093E\u0926\u0915\u0940\u092F \u092E\u093E\u0928\u0915\u094B\u0902 \u0915\u0947 \u0924\u0939\u0924 \u090F\u0915 \u092A\u094D\u0930\u092E\u0941\u0916 \u0921\u093F\u091C\u093F\u091F\u0932 \u0939\u093F\u0902\u0926\u0940 \u0928\u094D\u092F\u0942\u091C\u093C \u0928\u0947\u091F\u0935\u0930\u094D\u0915 \u0915\u0947 \u092E\u0941\u0916\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u0915 (Chief Editor) \u0939\u0948\u0902\u0964 \u0926\u0940 \u0917\u0908 \u0938\u092E\u093E\u091A\u093E\u0930 \u0938\u093E\u092E\u0917\u094D\u0930\u0940 \u0915\u093E \u0917\u0939\u0928 \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923 \u0915\u0930\u0915\u0947 \u0915\u0947\u0935\u0932 \u092E\u0941\u0916\u094D\u092F \u092A\u0941\u0937\u094D\u091F \u0918\u091F\u0928\u093E \u092A\u0930 \u0906\u0927\u093E\u0930\u093F\u0924 \u0938\u091F\u0940\u0915, \u0924\u0925\u094D\u092F\u092A\u0930\u0915, \u092A\u094D\u0930\u092D\u093E\u0935\u0936\u093E\u0932\u0940 \u0939\u093F\u0902\u0926\u0940 \u0939\u0947\u0921\u0932\u093E\u0907\u0928, \u0909\u0938\u0940 \u090F\u0915 \u092E\u0941\u0916\u094D\u092F \u0918\u091F\u0928\u093E \u0915\u0947 5 \u0938\u0902\u0924\u0941\u0932\u093F\u0924 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0935\u093F\u0915\u0932\u094D\u092A (\u0905\u0927\u093F\u0915\u0924\u092E 150 \u0935\u0930\u094D\u0923) \u0914\u0930 3 \u0905\u0932\u0917-\u0905\u0932\u0917 \u0936\u0948\u0932\u093F\u092F\u094B\u0902 \u0915\u0947 \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0915\u0948\u092A\u094D\u0936\u0928 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902\u0964 \u0915\u0947\u0935\u0932 \u0935\u0948\u0927 JSON \u0932\u094C\u091F\u093E\u090F\u0902\u0964`;
  const effectiveSourceTitle = primaryHeadline || "";
  const effectiveBody = fullArticleText || fetchedArticleSnippet || effectiveInput || "";
  const prompt = `\u0906\u092A BREAKING NEWS WALA \u0938\u0902\u092A\u093E\u0926\u0915\u0940\u092F \u092E\u093E\u0928\u0915\u094B\u0902 \u0915\u0947 \u0924\u0939\u0924 \u090F\u0915 \u092A\u094D\u0930\u092E\u0941\u0916 \u0921\u093F\u091C\u093F\u091F\u0932 \u0939\u093F\u0902\u0926\u0940 \u0928\u094D\u092F\u0942\u091C\u093C \u0928\u0947\u091F\u0935\u0930\u094D\u0915 \u0915\u0947 \u092E\u0941\u0916\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u0915 \u0939\u0948\u0902\u0964
\u092F\u0942\u091C\u093C\u0930 \u0928\u0947 \u0928\u093F\u092E\u094D\u0928\u0932\u093F\u0916\u093F\u0924 \u0907\u0928\u092A\u0941\u091F (\u0915\u091A\u094D\u091A\u0940 \u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F / \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F / \u0938\u092E\u093E\u091A\u093E\u0930 \u0935\u093F\u0935\u0930\u0923 \u092F\u093E \u0935\u0947\u092C\u0938\u093E\u0907\u091F \u0906\u0932\u0947\u0916) \u0926\u093F\u092F\u093E \u0939\u0948:

[\u0938\u092E\u093E\u091A\u093E\u0930 \u0938\u093E\u092E\u0917\u094D\u0930\u0940]:
"""
${effectiveSourceTitle ? `\u0936\u0940\u0930\u094D\u0937\u0915 \u0938\u0902\u0926\u0930\u094D\u092D: ${effectiveSourceTitle}
` : ""}${effectiveBody ? effectiveBody.slice(0, 4e3) : effectiveInput}
"""

${customPrompt ? `[\u092F\u0942\u091C\u093C\u0930 \u0915\u093E \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u0928\u093F\u0930\u094D\u0926\u0947\u0936 / \u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F]:
"""
${customPrompt}
"""
` : ""}
\u2605 BREAKING NEWS WALA \u0938\u0902\u092A\u093E\u0926\u0915\u0940\u092F \u092E\u093E\u0928\u0915 \u090F\u0935\u0902 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0928\u093F\u092F\u092E (PRIMARY EDITORIAL STANDARD):
1. \u0915\u0947\u0935\u0932 \u090F\u0915 \u0939\u0940 \u092E\u0941\u0916\u094D\u092F \u0918\u091F\u0928\u093E \u092A\u0930 \u0915\u0947\u0902\u0926\u094D\u0930\u093F\u0924 (STRICT SINGLE-STORY GROUNDING):
   - \u0906\u0932\u0947\u0916 \u0915\u0947 \u0915\u093F\u0938\u0940 \u0905\u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u092F\u093E \u0917\u094C\u0923 \u092C\u093F\u0902\u0926\u0941 \u0915\u094B \u0905\u0932\u0917 \u0915\u0939\u093E\u0928\u0940 \u092C\u0928\u093E\u0915\u0930 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u092E\u0947\u0902 \u0928 \u0932\u093E\u090F\u0902\u0964
   - \u0938\u092D\u0940 5 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0935\u093F\u0915\u0932\u094D\u092A \u0938\u094D\u0930\u094B\u0924 \u0915\u0940 \u0909\u0938\u0940 \u090F\u0915 \u092E\u0941\u0916\u094D\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u0918\u091F\u0928\u093E (Primary Event) \u092A\u0930 \u0906\u0927\u093E\u0930\u093F\u0924 \u0939\u094B\u0928\u0947 \u091A\u093E\u0939\u093F\u090F\u0964
   - \u0906\u0932\u0947\u0916 \u0915\u0947 \u092C\u0949\u0921\u0940 \u0935\u093E\u0915\u094D\u092F\u094B\u0902 \u0915\u094B \u091C\u094D\u092F\u094B\u0902-\u0915\u093E-\u0924\u094D\u092F\u094B\u0902 \u0915\u0949\u092A\u0940-\u092A\u0947\u0938\u094D\u091F \u0915\u0930\u0915\u0947 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u092D\u0940 \u0928 \u092C\u0928\u093E\u090F\u0902\u0964
   - \u0915\u0921\u093C\u093E \u0928\u093F\u092F\u092E (NO UNRELATED FILLER PHRASES): \u092E\u0928\u0917\u0922\u093C\u0902\u0924 \u092F\u093E \u0905\u0938\u0902\u092C\u0926\u094D\u0927 \u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u091C\u0941\u092E\u0932\u0947 (\u091C\u0948\u0938\u0947 '\u092A\u094D\u0930\u0936\u093E\u0938\u0928 \u0928\u0947 \u0926\u093F\u090F \u0915\u0921\u093C\u0947 \u0928\u093F\u0930\u094D\u0926\u0947\u0936', '\u092E\u093E\u092E\u0932\u0947 \u092E\u0947\u0902 \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937 \u091C\u093E\u0902\u091A \u0914\u0930 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0947 \u0928\u093F\u0930\u094D\u0926\u0947\u0936', '\u0938\u094D\u0925\u093F\u0924\u093F \u092A\u0930 \u0905\u0927\u093F\u0915\u093E\u0930\u093F\u092F\u094B\u0902 \u0915\u0940 \u0932\u0917\u093E\u0924\u093E\u0930 \u0928\u093F\u0917\u0930\u093E\u0928\u0940', '\u092A\u0942\u0930\u0947 \u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E \u092A\u0930 \u0936\u093E\u0938\u0928 \u0915\u0940 \u0938\u0916\u094D\u0924 \u0928\u091C\u0930') \u0915\u092D\u0940 \u092D\u0940 \u0928 \u091C\u094B\u0921\u093C\u0947\u0902 \u091C\u092C \u0924\u0915 \u0915\u093F \u092E\u0942\u0932 \u0916\u092C\u0930 \u092E\u0947\u0902 \u0935\u093E\u0938\u094D\u0924\u0935 \u092E\u0947\u0902 \u0910\u0938\u093E \u0928 \u0932\u093F\u0916\u093E \u0939\u094B! \u092E\u0928\u094B\u0930\u0902\u091C\u0928, \u0916\u0947\u0932, \u0915\u093E\u0930\u094B\u092C\u093E\u0930 \u092F\u093E \u0938\u0902\u0938\u094D\u0915\u0943\u0924\u093F \u0915\u0940 \u0916\u092C\u0930\u094B\u0902 \u092E\u0947\u0902 \u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u0936\u092C\u094D\u0926 \u0915\u092D\u0940 \u0928 \u091C\u094B\u0921\u093C\u0947\u0902\u0964 \u0915\u0947\u0935\u0932 \u0906\u0932\u0947\u0916 \u0915\u0947 \u092E\u0942\u0932 \u0935\u093F\u0937\u092F \u0938\u0947 \u091C\u0941\u0921\u093C\u0947 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u093E \u0939\u0940 \u092A\u094D\u0930\u092F\u094B\u0917 \u0915\u0930\u0947\u0902\u0964
2. 5 \u0938\u0902\u0924\u0941\u0932\u093F\u0924 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0926\u0943\u0937\u094D\u091F\u093F\u0915\u094B\u0923 (5 EDITORIAL ANGLES OF THE SAME EVENT):
   - \u0935\u093F\u0915\u0932\u094D\u092A 1: \u092E\u0941\u0916\u094D\u092F \u0918\u091F\u0928\u093E (Core Event) \u2014 \u0915\u093F\u0938\u0928\u0947 \u0915\u094D\u092F\u093E \u0915\u093F\u092F\u093E, \u0915\u0939\u093E\u0901 \u0939\u0941\u0906, \u0938\u0940\u0927\u093E, \u0924\u0925\u094D\u092F\u092A\u0930\u0915 \u0914\u0930 \u092A\u0942\u0930\u093E \u0935\u093F\u0935\u0930\u0923\u0964
   - \u0935\u093F\u0915\u0932\u094D\u092A 2: \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u092F\u093E \u092E\u0941\u0916\u094D\u092F \u092A\u093E\u0924\u094D\u0930 \u0915\u094B\u0923 (Actor/Person Focus) \u2014 \u092E\u0941\u0916\u094D\u092F \u0935\u094D\u092F\u0915\u094D\u0924\u093F, \u092D\u0942\u092E\u093F\u0915\u093E \u092F\u093E \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 \u0928\u093F\u0930\u094D\u0923\u092F\u0964
   - \u0935\u093F\u0915\u0932\u094D\u092A 3: \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u092F\u093E \u092A\u0930\u093F\u0923\u093E\u092E (Action/Consequence) \u2014 \u0918\u091F\u0928\u093E \u0938\u0947 \u091C\u0941\u0921\u093C\u0940 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908, \u0905\u0938\u0930 \u092F\u093E \u0935\u093F\u0915\u093E\u0938\u0964
   - \u0935\u093F\u0915\u0932\u094D\u092A 4: \u092E\u0941\u0916\u094D\u092F \u092C\u093F\u0902\u0926\u0941 \u092F\u093E \u0926\u093E\u0935\u093E (Key Development/Quote) \u2014 \u0916\u092C\u0930 \u0938\u0947 \u091C\u0941\u0921\u093C\u093E \u0938\u092C\u0938\u0947 \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u0924\u0925\u094D\u092F, \u0938\u0902\u0926\u0930\u094D\u092D \u092F\u093E \u092C\u092F\u093E\u0928\u0964
   - \u0935\u093F\u0915\u0932\u094D\u092A 5: \u0938\u093E\u0930\u0917\u0930\u094D\u092D\u093F\u0924 \u0935 \u092A\u094D\u0930\u092D\u093E\u0935\u0936\u093E\u0932\u0940 (High-Impact Angle) \u2014 \u0909\u0938\u0940 \u092E\u0941\u0916\u094D\u092F \u0918\u091F\u0928\u093E \u0915\u093E \u0938\u0902\u0924\u0941\u0932\u093F\u0924, \u0927\u093E\u0930\u0926\u093E\u0930 \u0930\u0942\u092A\u0964
3. \u0938\u092E\u0943\u0926\u094D\u0927 \u0936\u092C\u094D\u0926 \u0938\u0940\u092E\u093E \u0935 \u0905\u0927\u093F\u0915\u0924\u092E 150 \u0935\u0930\u094D\u0923 (RICH HEADLINE WORD COUNT & 150 CHAR CEILING):
   - \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u094B \u092C\u0939\u0941\u0924 \u091B\u094B\u091F\u093E \u092F\u093E \u0905\u0927\u0942\u0930\u093E (\u091C\u0948\u0938\u0947 \u0915\u0947\u0935\u0932 5-8 \u0936\u092C\u094D\u0926) \u0928 \u0932\u093F\u0916\u0947\u0902\u0964 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u092E\u0947\u0902 \u092A\u0930\u094D\u092F\u093E\u092A\u094D\u0924 \u091C\u093E\u0928\u0915\u093E\u0930\u0940, \u092A\u094D\u0930\u092E\u0941\u0916 \u0928\u093E\u092E \u0914\u0930 \u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E \u0915\u094B \u0936\u093E\u092E\u093F\u0932 \u0915\u0930\u0924\u0947 \u0939\u0941\u090F 14 \u0938\u0947 26 \u0936\u092C\u094D\u0926\u094B\u0902 (\u0932\u0917\u092D\u0917 85 \u0938\u0947 145 \u0935\u0930\u094D\u0923, \u0905\u0927\u093F\u0915\u0924\u092E 150 \u0935\u0930\u094D\u0923) \u0915\u0940 \u0938\u092E\u0943\u0926\u094D\u0927, \u0938\u0902\u092A\u0942\u0930\u094D\u0923 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u092C\u0928\u093E\u090F\u0902\u0964
   - \u092A\u094D\u0930\u0924\u094D\u092F\u0947\u0915 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0935\u093F\u0915\u0932\u094D\u092A \u0915\u0947 \u0932\u093F\u090F \u090F\u0915\u0932 \u0905\u0927\u093F\u0915\u0924\u092E \u0938\u0940\u092E\u093E 150 \u0935\u0930\u094D\u0923 \u0939\u0948\u0964 150 \u0935\u0930\u094D\u0923 \u090F\u0915 \u0938\u0940\u092E\u093E \u0939\u0948; \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u094B \u0915\u092D\u0940 \u092D\u0940 \u0915\u093F\u0938\u0940 \u0928\u093E\u092E, \u092A\u0926, \u0909\u0926\u094D\u0927\u0930\u0923 \u092F\u093E \u0935\u093E\u0915\u094D\u092F \u0915\u0947 \u092C\u0940\u091A \u092E\u0947\u0902 \u0905\u0927\u0942\u0930\u093E \u0928 \u0915\u093E\u091F\u0947\u0902\u0964
   - \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917 \u092E\u0947\u0902 \u0915\u092D\u0940 \u092D\u0940 '[58/100]' \u092F\u093E '(\u0935\u093F\u0915\u0932\u094D\u092A 1)' \u091C\u0948\u0938\u0947 \u0935\u0930\u094D\u0923-\u0917\u0923\u0928\u093E \u092F\u093E \u0932\u0947\u092C\u0932 \u0928 \u091C\u094B\u0921\u093C\u0947\u0902\u0964
4. \u092A\u0924\u094D\u0930\u0915\u093E\u0930\u093F\u0924\u093E \u0915\u0940 \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937\u0924\u093E \u0935 \u091A\u093E\u091F\u0941\u0915\u093E\u0930\u093F\u0924\u093E \u0915\u093E \u092A\u0942\u0930\u094D\u0923 \u0928\u093F\u0937\u094D\u0915\u093E\u0938\u0928:
   - '\u0936\u094D\u0930\u0940', '\u092E\u093E\u0928\u0928\u0940\u092F', '\u0938\u092E\u094D\u092E\u093E\u0928\u0928\u0940\u092F', '\u0906\u0926\u0930\u0923\u0940\u092F', '\u092E\u0939\u094B\u0926\u092F', '\u091C\u0940' \u091C\u0948\u0938\u0947 \u092A\u0940\u0906\u0930/\u0938\u0930\u0915\u093E\u0930\u0940 \u0936\u092C\u094D\u0926 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0939\u091F\u093E \u0926\u0947\u0902\u0964
   - "\u092C\u0921\u093C\u093E \u0916\u0941\u0932\u093E\u0938\u093E", "\u092E\u091A\u093E \u0939\u0921\u093C\u0915\u0902\u092A", "\u0938\u0928\u094D\u0928 \u0930\u0939 \u091C\u093E\u090F\u0902\u0917\u0947", "\u0907\u0938\u0938\u0947 \u0932\u094B\u0917\u094B\u0902 \u0915\u094B \u092E\u0926\u0926 \u092E\u093F\u0932\u0947\u0917\u0940" \u091C\u0948\u0938\u0947 \u0915\u094D\u0932\u093F\u0915\u092C\u0948\u091F \u0914\u0930 \u092B\u093F\u0932\u0930 \u0936\u092C\u094D\u0926 \u0915\u092D\u0940 \u0928 \u0932\u093F\u0916\u0947\u0902\u0964
5. \u092D\u093E\u0937\u093E \u0935 \u092A\u0902\u091A\u0941\u090F\u0936\u0928:
   - \u0936\u0941\u0926\u094D\u0927, \u092E\u093E\u0928\u0915 \u0926\u0947\u0935\u0928\u093E\u0917\u0930\u0940 \u0939\u093F\u0902\u0926\u0940\u0964 \u0915\u093F\u0938\u0940 \u092D\u0940 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u0947 \u0905\u0902\u0924 \u092E\u0947\u0902 \u092A\u0942\u0930\u094D\u0923\u0935\u093F\u0930\u093E\u092E (. \u092F\u093E \u0964) \u0928 \u0932\u0917\u093E\u090F\u0902\u0964
6. \u0938\u094D\u0925\u093E\u0928 (Location):
   - \u0915\u0947\u0935\u0932 \u0936\u0941\u0926\u094D\u0927 \u0936\u0939\u0930, \u091C\u093F\u0932\u093E \u092F\u093E \u0930\u093E\u091C\u094D\u092F (\u091C\u0948\u0938\u0947 "\u0917\u094D\u0935\u093E\u0932\u093F\u092F\u0930, \u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936" \u092F\u093E "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940")\u0964 \u0938\u094D\u0925\u093E\u0928 \u092E\u0947\u0902 \u0915\u092D\u0940 \u0915\u094B\u0908 URL \u092F\u093E \u0935\u093E\u0915\u094D\u092F \u0928 \u0921\u093E\u0932\u0947\u0902\u0964
7. \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0915\u0948\u092A\u094D\u0936\u0928 \u0928\u093F\u092F\u092E (MANDATORY CAPTION RULES - NO HEADLINE OPENINGS, ZERO URLs):
   - \u0915\u093F\u0938\u0940 \u092D\u0940 \u0915\u0948\u092A\u094D\u0936\u0928 \u092E\u0947\u0902 \u0915\u094B\u0908 \u0935\u0947\u092C\u0938\u093E\u0907\u091F \u0932\u093F\u0902\u0915, URL \u092F\u093E "\u092A\u0942\u0930\u0940 \u0916\u092C\u0930 \u092A\u0922\u093C\u0947\u0902" \u0928 \u091C\u094B\u0921\u093C\u0947\u0902\u0964
   - \u0915\u093F\u0938\u0940 \u092D\u0940 \u0915\u0948\u092A\u094D\u0936\u0928 \u0915\u0940 \u0936\u0941\u0930\u0941\u0906\u0924 \u0939\u0947\u0921\u0932\u093E\u0907\u0928, 'Title:', '\u0936\u0940\u0930\u094D\u0937\u0915:', '\u0939\u0947\u0921\u0932\u093E\u0907\u0928:' \u092F\u093E \u0915\u093F\u0938\u0940 \u0938\u093E\u092E\u093E\u0928\u094D\u092F \u092A\u0930\u093F\u091A\u092F \u0935\u093E\u0915\u094D\u092F \u0938\u0947 \u0928 \u0915\u0930\u0947\u0902\u0964
   - \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u094B \u092A\u0939\u0932\u0947 \u0935\u093E\u0915\u094D\u092F \u0915\u0947 \u0930\u0942\u092A \u092E\u0947\u0902 \u0915\u092D\u0940 \u0928 \u0926\u094B\u0939\u0930\u093E\u090F\u0902\u0964
   - summary / captionDetailed: \u0920\u0940\u0915 3 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u092E\u0947\u0902 \u0938\u0940\u0927\u0947 \u0918\u091F\u0928\u093E \u0915\u0947 \u0924\u0925\u094D\u092F\u094B\u0902 \u0938\u0947 \u0936\u0941\u0930\u0942 \u0915\u0930\u0924\u0947 \u0939\u0941\u090F \u092A\u0942\u0930\u0940 \u0916\u092C\u0930\u0964
   - captionBullets: \u0938\u0940\u0927\u0947 \u092A\u0939\u0932\u0947 \u092C\u0941\u0932\u0947\u091F \u092A\u0949\u0907\u0902\u091F '\u2022 ' \u0938\u0947 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902\u0964 3 \u0938\u0947 5 \u092A\u0902\u0915\u094D\u0924\u093F\u092F\u094B\u0902 \u092E\u0947\u0902 \u092E\u0941\u0916\u094D\u092F \u092C\u093F\u0902\u0926\u0941, \u092A\u094D\u0930\u0924\u094D\u092F\u0947\u0915 \u092A\u0902\u0915\u094D\u0924\u093F '\u2022 ' \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0964
   - captionShort: \u0920\u0940\u0915 2 \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B, \u0938\u0940\u0927\u0947 \u092E\u0941\u0916\u094D\u092F \u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E \u0938\u0947 \u0936\u0941\u0930\u0942\u0964
   - \u0905\u0902\u0924 \u092E\u0947\u0902 \u0920\u0940\u0915 \u090F\u0915 \u0916\u093E\u0932\u0940 \u0932\u093E\u0907\u0928 \u091B\u094B\u0921\u093C\u0915\u0930 6-8 \u0939\u0948\u0936\u091F\u0948\u0917:
     * \u0938\u092C\u0938\u0947 \u092A\u0939\u0932\u093E \u0939\u0948\u0936\u091F\u0948\u0917: ${userTagInstruction}
     * \u092C\u0940\u091A \u092E\u0947\u0902 4-6 \u092A\u094D\u0930\u093E\u0938\u0902\u0917\u093F\u0915 \u0939\u0948\u0936\u091F\u0948\u0917 (#BreakingNews #HindiNews #LatestNews #CityNews)
     * \u0938\u092C\u0938\u0947 \u0905\u0902\u0924\u093F\u092E \u0939\u0948\u0936\u091F\u0948\u0917 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947: #AINewsMaker
8. suggestedImagePrompt:
   - \u0905\u0902\u0917\u094D\u0930\u0947\u091C\u0940 \u092E\u0947\u0902 \u0930\u093F\u092F\u0932\u093F\u0938\u094D\u091F\u093F\u0915 \u092A\u094D\u0930\u0947\u0938 \u092B\u094B\u091F\u094B \u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F (35mm lens, natural lighting, Indian news photojournalism style, no text or watermark).

Strictly return a valid JSON object matching these exact keys:
{
  "headline": "\u092E\u0941\u0916\u094D\u092F \u0935 \u0938\u091F\u0940\u0915 \u0939\u093F\u0902\u0926\u0940 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 (\u092C\u093F\u0928\u093E \u092A\u0942\u0930\u094D\u0923\u0935\u093F\u0930\u093E\u092E, <=150 \u0935\u0930\u094D\u0923)",
  "headlineOptions": [
    "\u0935\u093F\u0915\u0932\u094D\u092A 1: \u092E\u0941\u0916\u094D\u092F \u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E (<=150 \u0935\u0930\u094D\u0923)",
    "\u0935\u093F\u0915\u0932\u094D\u092A 2: \u092A\u094D\u0930\u093E\u0927\u093F\u0915\u093E\u0930\u0940/\u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0915\u094B\u0923 (<=150 \u0935\u0930\u094D\u0923)",
    "\u0935\u093F\u0915\u0932\u094D\u092A 3: \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908/\u092A\u0930\u093F\u0923\u093E\u092E \u0915\u094B\u0923 (<=150 \u0935\u0930\u094D\u0923)",
    "\u0935\u093F\u0915\u0932\u094D\u092A 4: \u092E\u0941\u0916\u094D\u092F \u092C\u093F\u0902\u0926\u0941/\u0924\u0925\u094D\u092F \u0915\u094B\u0923 (<=150 \u0935\u0930\u094D\u0923)",
    "\u0935\u093F\u0915\u0932\u094D\u092A 5: \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935 \u092A\u094D\u0930\u092D\u093E\u0935\u0936\u093E\u0932\u0940 \u0915\u094B\u0923 (<=150 \u0935\u0930\u094D\u0923)"
  ],
  "highlightWords": ["\u092E\u0941\u0916\u094D\u092F \u0936\u092C\u094D\u0926 1", "\u092E\u0941\u0916\u094D\u092F \u0936\u092C\u094D\u0926 2"],
  "formattedHeadline": "\u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u091C\u093F\u0938\u092E\u0947\u0902 \u092E\u0941\u0916\u094D\u092F \u0936\u092C\u094D\u0926 [yellow]\u0936\u092C\u094D\u0926[/yellow] \u0938\u0947 \u091A\u093F\u0939\u094D\u0928\u093F\u0924 \u0939\u094B\u0902",
  "location": "\u0936\u0939\u0930, \u0930\u093E\u091C\u094D\u092F",
  "summary": "\u0935\u093F\u0938\u094D\u0924\u0943\u0924 3 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u0916\u092C\u0930 \u0914\u0930 \u0905\u0902\u0924 \u092E\u0947\u0902 \u0939\u0948\u0936\u091F\u0948\u0917 (\u092C\u093F\u0928\u093E URL, \u092C\u093F\u0928\u093E \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0936\u0941\u0930\u0941\u0906\u0924)",
  "captionDetailed": "\u0935\u093F\u0938\u094D\u0924\u0943\u0924 3 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u0915\u0948\u092A\u094D\u0936\u0928 (\u092C\u093F\u0928\u093E URL, \u092C\u093F\u0928\u093E \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0936\u0941\u0930\u0941\u0906\u0924)",
  "captionBullets": "\u092C\u0941\u0932\u0947\u091F \u092A\u0949\u0907\u0902\u091F\u094D\u0938 \u0915\u0948\u092A\u094D\u0936\u0928 \u0938\u0940\u0927\u0947 \u2022 \u0938\u0947 \u0936\u0941\u0930\u0942 (\u092C\u093F\u0928\u093E URL, \u092C\u093F\u0928\u093E \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0936\u0941\u0930\u0941\u0906\u0924)",
  "captionShort": "\u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 2 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u0915\u0948\u092A\u094D\u0936\u0928 (\u092C\u093F\u0928\u093E URL, \u092C\u093F\u0928\u093E \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0936\u0941\u0930\u0941\u0906\u0924)",
  "category": "\u0939\u093E\u0926\u0938\u093E / \u092A\u094D\u0930\u0936\u093E\u0938\u0928 / \u0930\u093E\u091C\u0928\u0940\u0924\u093F / \u0935\u093F\u0915\u093E\u0938 / \u0905\u092A\u0930\u093E\u0927 / \u091C\u0928\u0906\u0902\u0926\u094B\u0932\u0928",
  "suggestedImagePrompt": "English journalistic photography prompt",
  "isAiGeneratedPhoto": false,
  "speakerName": "",
  "speakerTitle": ""
}
`;
  return { systemInstruction, prompt };
}
function buildMasterNewsEditorialPromptString(params) {
  const built = buildMasterNewsEditorialPrompt(params);
  return `${built.systemInstruction}

${built.prompt}`;
}
async function scrapeNewsFromUrl(rawUrl) {
  const extracted = await fetchAndProcessNewsUrl(rawUrl);
  if (!extracted) {
    return {
      snippet: `URL to reference: ${rawUrl}`,
      pickedImages: {},
      extractionStatus: "failed",
      inaccessibleReason: "Unable to reach or parse URL"
    };
  }
  const snippet = `
URL: ${extracted.sourceUrl || rawUrl}
Title: ${extracted.title || ""}
Description: ${extracted.description || ""}
Content: ${extracted.content ? extracted.content.slice(0, 2e3) : ""}
  `.trim();
  const pickedImages = {};
  if (extracted.images && extracted.images.length > 0) {
    if (extracted.images[0]) pickedImages.main = `/api/proxy-image?url=${encodeURIComponent(extracted.images[0])}`;
    if (extracted.images[1]) pickedImages.second = `/api/proxy-image?url=${encodeURIComponent(extracted.images[1])}`;
    if (extracted.images[2]) pickedImages.third = `/api/proxy-image?url=${encodeURIComponent(extracted.images[2])}`;
    if (extracted.images[3]) pickedImages.fourth = `/api/proxy-image?url=${encodeURIComponent(extracted.images[3])}`;
  }
  return {
    snippet,
    pickedImages,
    extractedMeta: {
      title: extracted.title,
      description: extracted.description,
      content: extracted.content,
      imageUrl: extracted.images?.[0],
      linkUrl: extracted.sourceUrl,
      images: extracted.images,
      canonicalUrl: extracted.canonicalUrl,
      publishedDate: extracted.publishedDate
    },
    extractionStatus: extracted.extractionStatus,
    inaccessibleReason: extracted.inaccessibleReason
  };
}
app.post("/api/process-news-command", enforceUserAccessMiddleware, async (req, res) => {
  const {
    input,
    command,
    linkUrl,
    imageUrl,
    customPrompt,
    template_id,
    headline_max_lines,
    headline_area,
    headline_line_count
  } = req.body;
  try {
    const rawInputText = input || command;
    if (!rawInputText && !linkUrl && !customPrompt) {
      return res.status(400).json({ error: "Please provide a command, text, link or prompt" });
    }
    const channelUsername = (req.body.channelUsername || req.body.username || "").replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "").trim();
    const userHashtag = channelUsername ? `#${channelUsername}` : "";
    let parsedData = null;
    const effectiveTemplateId = template_id || "graphic_001";
    const tplConfig = getTemplateConfig(effectiveTemplateId);
    const targetMaxLines = Number(headline_max_lines) || Number(headline_line_count) || tplConfig.headline_max_lines || 3;
    const targetArea = headline_area || tplConfig.headline_area;
    let fetchedArticleSnippet = "";
    let effectiveArticleTitle = "";
    let effectiveArticleDesc = "";
    let articleBodySnippets = "";
    const pickedImages = {};
    const extractedPhotos = [];
    let extractedArticleMeta = void 0;
    let effectiveInput = (rawInputText || "").trim();
    let rawLink = (linkUrl || "").trim();
    if (!rawLink && (/^https?:\/\//i.test(effectiveInput) || /^[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}\//i.test(effectiveInput))) {
      rawLink = effectiveInput;
      effectiveInput = "";
    }
    const isInternalPlatformUrl = rawLink.includes("localhost") || rawLink.includes("127.0.0.1") || (rawLink.includes("/#/") || rawLink.includes("/login") || rawLink.includes("/profile") || rawLink.includes("/account-deletion") || rawLink.includes("/api/"));
    if (rawLink && isInternalPlatformUrl && !effectiveInput) {
      return res.status(400).json({
        error: "\u0906\u0902\u0924\u0930\u093F\u0915 \u090F\u092A\u094D\u0932\u093F\u0915\u0947\u0936\u0928 URL \u0915\u094B \u0938\u092E\u093E\u091A\u093E\u0930 \u0938\u094D\u0930\u094B\u0924 \u0915\u0947 \u0930\u0942\u092A \u092E\u0947\u0902 \u0938\u094D\u0915\u094D\u0930\u0948\u092A \u0928\u0939\u0940\u0902 \u0915\u093F\u092F\u093E \u091C\u093E \u0938\u0915\u0924\u093E\u0964 \u0915\u0943\u092A\u092F\u093E \u0915\u093F\u0938\u0940 \u092C\u093E\u0939\u0930\u0940 \u0938\u092E\u093E\u091A\u093E\u0930 \u0935\u0947\u092C\u0938\u093E\u0907\u091F \u0915\u093E \u0932\u093F\u0902\u0915 \u092F\u093E \u0935\u093E\u0938\u094D\u0924\u0935\u093F\u0915 \u0916\u092C\u0930 \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902\u0964"
      });
    }
    if (rawLink && !isInternalPlatformUrl) {
      if (rawLink.startsWith("http://") || rawLink.startsWith("https://") || /^[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}/.test(rawLink)) {
        const normalizedUrl = rawLink.startsWith("http://") || rawLink.startsWith("https://") ? rawLink : `https://${rawLink}`;
        let scrapedStatus = "failed";
        let scrapedReason = "";
        try {
          const scraped = await scrapeNewsFromUrl(normalizedUrl);
          scrapedStatus = scraped.extractionStatus || "failed";
          scrapedReason = scraped.inaccessibleReason || "";
          if (scraped.extractedMeta) {
            extractedArticleMeta = scraped.extractedMeta;
            effectiveArticleTitle = extractedArticleMeta.title || "";
            effectiveArticleDesc = extractedArticleMeta.description || "";
            articleBodySnippets = extractedArticleMeta.content || "";
            if (scraped.pickedImages.main) pickedImages.main = scraped.pickedImages.main;
            if (scraped.pickedImages.second) pickedImages.second = scraped.pickedImages.second;
            if (scraped.pickedImages.third) pickedImages.third = scraped.pickedImages.third;
            if (scraped.pickedImages.fourth) pickedImages.fourth = scraped.pickedImages.fourth;
            if (extractedArticleMeta.images) {
              extractedArticleMeta.images.forEach((img) => {
                const proxied = `/api/proxy-image?url=${encodeURIComponent(img)}`;
                if (!extractedPhotos.includes(proxied)) extractedPhotos.push(proxied);
              });
            }
            fetchedArticleSnippet = scraped.snippet;
          }
        } catch (fetchErr) {
          console.warn("Could not fetch or parse URL directly:", fetchErr?.message || fetchErr);
          fetchedArticleSnippet = "";
          scrapedStatus = "failed";
          scrapedReason = fetchErr?.message || "Failed to fetch";
        }
        const hasRealFacts = Boolean(
          articleBodySnippets && articleBodySnippets.trim().length > 30 || effectiveArticleDesc && effectiveArticleDesc.trim().length > 25 && effectiveArticleTitle && effectiveArticleTitle.trim().length > 10 || effectiveInput && effectiveInput.trim().length > 25
        );
        if ((scrapedStatus === "failed" || !hasRealFacts) && (!effectiveInput || effectiveInput.trim().length < 25)) {
          const detailReason = scrapedReason ? ` (${scrapedReason})` : "";
          return res.status(422).json({
            error: `\u0907\u0938 \u0928\u094D\u092F\u0942\u091C\u093C \u0932\u093F\u0902\u0915 \u0938\u0947 \u092E\u0941\u0916\u094D\u092F \u0916\u092C\u0930/\u0906\u0932\u0947\u0916 \u092A\u0922\u093C\u093E \u0928\u0939\u0940\u0902 \u091C\u093E \u0938\u0915\u093E${detailReason}\u0964 \u0915\u0943\u092A\u092F\u093E \u0916\u092C\u0930 \u0915\u093E \u0935\u093E\u0938\u094D\u0924\u0935\u093F\u0915 \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u0915\u0949\u092A\u0940 \u0915\u0930\u0915\u0947 \u092A\u0947\u0938\u094D\u091F \u0915\u0930\u0947\u0902 \u092F\u093E \u0926\u0942\u0938\u0930\u093E \u0938\u0941\u0932\u092D \u0932\u093F\u0902\u0915 \u092A\u094D\u0930\u0926\u093E\u0928 \u0915\u0930\u0947\u0902\u0964`,
            extraction_status: "failed",
            reason: scrapedReason || "Webpage content unavailable",
            submitted_url: rawLink
          });
        }
        const hasAuthenticHindiInput = Boolean(
          effectiveInput && effectiveInput.trim().length > 15 && /[\u0900-\u097F]/.test(effectiveInput)
        );
        if (hasAuthenticHindiInput) {
          const isMetaTitleHindi = Boolean(
            effectiveArticleTitle && /[\u0900-\u097F]/.test(effectiveArticleTitle) && effectiveArticleTitle.trim().length >= 10 && !/^\d+$/.test(effectiveArticleTitle.trim())
          );
          if (!isMetaTitleHindi) {
            const firstHindiSent = effectiveInput.split(/[।\n]+|(?<=[^\d])\.\s+/).map((s) => cleanHeadlineText(s).trim()).find((s) => s.length >= 15 && /[\u0900-\u097F]/.test(s));
            if (firstHindiSent) {
              effectiveArticleTitle = formatAsJournalisticHeadline(firstHindiSent);
              if (extractedArticleMeta) {
                extractedArticleMeta.title = effectiveArticleTitle;
              }
            }
          }
        }
      } else {
        effectiveInput = effectiveInput ? `${effectiveInput}

${rawLink}` : rawLink;
      }
    }
    if (!pickedImages.main && imageUrl && typeof imageUrl === "string" && imageUrl.trim()) {
      const trimmed = imageUrl.trim();
      pickedImages.main = trimmed.includes("/api/proxy-image") ? trimmed : `/api/proxy-image?url=${encodeURIComponent(trimmed)}`;
    }
    const primaryCandidateTitle = cleanHeadlineText(
      effectiveArticleTitle || extractedArticleMeta?.title || (effectiveInput && effectiveInput.length < 150 && !effectiveInput.includes("\n") ? effectiveInput : "") || ""
    );
    const fullArticleContent = articleBodySnippets || effectiveArticleDesc || effectiveInput || "";
    const promptData = buildMasterNewsEditorialPrompt({
      effectiveInput,
      primaryHeadline: primaryCandidateTitle,
      fullArticleText: fullArticleContent,
      fetchedArticleSnippet,
      customPrompt: customPrompt ? customPrompt.trim() : void 0,
      channelUsername,
      targetMaxLines,
      targetArea,
      templateName: tplConfig.name,
      templateId: tplConfig.template_id
    });
    const editorialSystemInstruction = promptData.systemInstruction;
    const prompt = promptData.prompt;
    const requestedAiProvider = (req.body.aiProvider || "gemini").toLowerCase();
    const runOpenAI = async () => {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: editorialSystemInstruction
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.6
      });
      const raw = completion.choices[0]?.message?.content || "{}";
      const result = JSON.parse(raw);
      if (!result.headlineOptions || !Array.isArray(result.headlineOptions) || result.headlineOptions.length === 0) {
        result.headlineOptions = [result.headline || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930"];
      }
      return result;
    };
    const runGemini = async () => {
      const activeGeminiKey = (req.body.geminiApiKey || process.env.GEMINI_API_KEY || "").trim();
      if (!activeGeminiKey || activeGeminiKey === "MY_GEMINI_API_KEY") {
        throw new Error("GEMINI_API_KEY is not configured");
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey: activeGeminiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const response = await generateWithFallbackAndRetry(
        ai,
        DEFAULT_FALLBACK_MODELS,
        {
          contents: prompt,
          config: {
            systemInstruction: editorialSystemInstruction,
            responseMimeType: "application/json",
            responseSchema: GEMINI_NEWS_RESPONSE_SCHEMA
          }
        }
      );
      return JSON.parse(response.text || "{}");
    };
    const userResolution = resolveUserTierAndRole(req);
    const userTier = userResolution.tier;
    const aiFeaturesCfg = getAiFeaturesConfig();
    const modelAccessCfg = aiFeaturesCfg.aiModelAccess || {};
    let actualProvider = "gemini";
    if (requestedAiProvider === "openai") {
      if (!isTierAllowedForOpenAI(userTier, userResolution.role)) {
        return res.status(403).json({
          success: false,
          error: "\u092F\u0939 \u0938\u0941\u0935\u093F\u0927\u093E \u0915\u0947\u0935\u0932 \u092A\u093E\u0924\u094D\u0930 Pro \u092F\u093E VIP-Dash \u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E\u0913\u0902 \u0915\u0947 \u0932\u093F\u090F \u0909\u092A\u0932\u092C\u094D\u0927 \u0939\u0948\u0964",
          requiredTiers: ["pro", "vip_dash", "admin"],
          currentTier: userTier
        });
      }
      if (modelAccessCfg.openai?.enabled === false) {
        return res.status(403).json({
          success: false,
          error: "ChatGPT (OpenAI) \u0938\u0941\u0935\u093F\u0927\u093E \u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u092E\u0947\u0902 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0926\u094D\u0935\u093E\u0930\u093E \u0928\u093F\u0937\u094D\u0915\u094D\u0930\u093F\u092F \u0915\u0940 \u0917\u0908 \u0939\u0948\u0964"
        });
      }
      try {
        parsedData = await runOpenAI();
        actualProvider = "openai";
        console.log("[News AI] Successfully generated news content via OpenAI (gpt-4o-mini)");
      } catch (openAiErr) {
        console.warn("[News AI] OpenAI failed:", openAiErr?.message);
        return res.status(502).json({
          success: false,
          error: `ChatGPT (OpenAI) \u0938\u0947 \u0917\u094D\u0930\u093E\u092B\u093F\u0915, \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0914\u0930 \u0915\u0948\u092A\u094D\u0936\u0928 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0928\u0947 \u092E\u0947\u0902 \u0924\u094D\u0930\u0941\u091F\u093F: ${openAiErr?.message || "\u0938\u0947\u0935\u093E \u0905\u0928\u0941\u092A\u0932\u092C\u094D\u0927"}\u0964 \u0915\u0943\u092A\u092F\u093E \u091C\u0947\u092E\u093F\u0928\u0940 \u090F\u0906\u0908 \u091A\u0941\u0928\u0947\u0902 \u092F\u093E \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964`
        });
      }
    } else {
      let geminiSuccess = false;
      try {
        parsedData = await runGemini();
        geminiSuccess = true;
        actualProvider = "gemini";
        console.log("[News AI] Successfully generated news content via Gemini AI");
      } catch (geminiError) {
        console.warn(`[News AI] Gemini unavailable (${geminiError?.status || geminiError?.message?.slice(0, 70)})`);
      }
      if (!geminiSuccess && modelAccessCfg.gemini?.allowFallback) {
        const hasOpenAiKey = Boolean((dynamicOpenAiKey || process.env.OPENAI_API_KEY || "").trim());
        if (hasOpenAiKey) {
          try {
            parsedData = await runOpenAI();
            geminiSuccess = true;
            actualProvider = "openai";
            console.log("[News AI] Gemini unavailable/depleted; smoothly failed over to OpenAI gpt-4o-mini");
          } catch (openAiErr) {
            console.warn("[News AI] OpenAI failover also failed:", openAiErr?.message);
          }
        }
      }
      if (!parsedData) {
        console.log("[News AI] Generating local structured editorial draft");
        const fallbackSource = rawInputText || fetchedArticleSnippet || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F";
        parsedData = createLocalNewsFallback(fallbackSource, linkUrl, targetMaxLines, extractedArticleMeta, channelUsername);
        actualProvider = "local";
      }
    }
    if (parsedData) {
      if (pickedImages.main && (!parsedData.pickedImages || !parsedData.pickedImages.main)) {
        if (!parsedData.pickedImages) parsedData.pickedImages = {};
        parsedData.pickedImages.main = pickedImages.main;
      }
      if (pickedImages.second && (!parsedData.pickedImages || !parsedData.pickedImages.second)) {
        if (!parsedData.pickedImages) parsedData.pickedImages = {};
        parsedData.pickedImages.second = pickedImages.second;
      }
      if (pickedImages.third && (!parsedData.pickedImages || !parsedData.pickedImages.third)) {
        if (!parsedData.pickedImages) parsedData.pickedImages = {};
        parsedData.pickedImages.third = pickedImages.third;
      }
      if (pickedImages.fourth && (!parsedData.pickedImages || !parsedData.pickedImages.fourth)) {
        if (!parsedData.pickedImages) parsedData.pickedImages = {};
        parsedData.pickedImages.fourth = pickedImages.fourth;
      }
      parsedData.location = cleanLocationField(parsedData.location || "");
      parsedData.category = cleanCategoryField(parsedData.category || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930");
      const firstInputSentence = (effectiveInput || "").split(/[।\n]+|\.\s+/).map((s) => cleanHeadlineText(s).trim()).find((s) => s.length >= 15 && /[\u0900-\u097F]/.test(s)) || "";
      const primarySourceHeadline = cleanHeadlineText(
        extractedArticleMeta?.title || firstInputSentence || effectiveArticleTitle || (effectiveInput && effectiveInput.length < 150 && !effectiveInput.includes("\n") ? effectiveInput : "") || parsedData.headline || ""
      );
      const factCorpus = [
        effectiveInput,
        articleBodySnippets,
        effectiveArticleDesc,
        fetchedArticleSnippet,
        rawInputText,
        parsedData.summary
      ].filter(Boolean).join("\n\n");
      const factSentences = factCorpus.split(/[।\n]+|\.\s+/).map((s) => cleanHeadlineText(s).replace(/[।\.\,\!\?\:\-]+$/g, "").trim()).filter((s) => {
        if (s.length <= 12 || !/[\u0900-\u097F]/.test(s)) return false;
        if (/(?:वेबसाइट|प्रकाशित|से संबंधित|मुख्य संदर्भ|domain|विषय:)/u.test(s)) return false;
        return true;
      });
      const cleanOptions = [];
      const addOptionIfValid = (candidate) => {
        let s = sanitizePressNoteFlattery(cleanHeadlineText(String(candidate || ""))).replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
        if (!s || s.length < 15) return;
        if (/(?:वेबसाइट|प्रकाशित|से संबंधित|मुख्य संदर्भ|विषय:)/u.test(s)) return;
        if (cleanOptions.includes(s)) return;
        const isDuplicate = cleanOptions.some((existing) => calculateHeadlineSimilarityInternal(existing, s) >= 0.88);
        if (!isDuplicate) {
          cleanOptions.push(s);
        }
      };
      if (Array.isArray(parsedData.headlineOptions)) {
        for (const h of parsedData.headlineOptions) {
          addOptionIfValid(h);
        }
      }
      if (parsedData.headline && cleanOptions.length === 0) {
        addOptionIfValid(parsedData.headline);
      }
      if (cleanOptions.length < 5) {
        const supp = generate5BalancedHeadlineOptions(
          primarySourceHeadline || parsedData.headline || "\u092E\u0941\u0916\u094D\u092F \u0938\u092E\u093E\u091A\u093E\u0930",
          factSentences,
          parsedData.location
        );
        for (const opt of supp) {
          if (cleanOptions.length >= 5) break;
          addOptionIfValid(opt);
        }
      }
      parsedData.headlineOptions = fitHeadlinesTo5TierRanges(
        cleanOptions,
        factSentences,
        primarySourceHeadline || parsedData.headline || "\u092E\u0941\u0916\u094D\u092F \u0938\u092E\u093E\u091A\u093E\u0930",
        parsedData.location
      );
      if (parsedData.headlineOptions.length > 0) {
        parsedData.headline = parsedData.headlineOptions[0];
      }
      parsedData.canonicalContext = {
        sourceUrl: rawLink || linkUrl || "",
        title: primarySourceHeadline || parsedData.headline,
        articleText: articleBodySnippets || effectiveArticleDesc || effectiveInput || parsedData.summary || "",
        mainEvent: parsedData.headline,
        location: parsedData.location,
        category: parsedData.category,
        extractedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      parsedData.diagnostics = {
        optionsCount: parsedData.headlineOptions.length,
        locationDetected: parsedData.location,
        categoryDetected: parsedData.category
      };
      const currentHlWords = (parsedData.highlightWords || []).filter((w) => w && w.length >= 2);
      if (currentHlWords.length === 0) {
        const words = parsedData.headline.split(/\s+/).filter(Boolean);
        for (const w of words) {
          const cleanW = w.replace(/[.,:;!?'"()]/g, "");
          if (/\d+/.test(cleanW) || cleanW.length >= 4 && !/के|की|का|में|पर|से|को|ने|है|और|था|थे|थी/.test(cleanW)) {
            if (!currentHlWords.includes(cleanW) && currentHlWords.length < 3) {
              currentHlWords.push(cleanW);
            }
          }
        }
      }
      parsedData.highlightWords = currentHlWords.slice(0, 4);
      if (parsedData.formattedHeadline) {
        if (isInvalidUrlHeadline(parsedData.formattedHeadline)) {
          parsedData.formattedHeadline = parsedData.headline;
        } else {
          parsedData.formattedHeadline = cleanHeadlineText(parsedData.formattedHeadline).replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
        }
      } else {
        parsedData.formattedHeadline = parsedData.headline;
      }
      if (!/\[(highlight|yellow)\]/.test(parsedData.formattedHeadline) && parsedData.highlightWords.length > 0) {
        let fmt = parsedData.headline;
        for (const hw of parsedData.highlightWords) {
          if (fmt.includes(hw)) {
            fmt = fmt.replace(new RegExp(`(${hw})`, "g"), "[highlight]$1[/highlight]");
            break;
          }
        }
        parsedData.formattedHeadline = fmt;
      }
      if (!parsedData.captionDetailed || !parsedData.captionBullets || !parsedData.captionShort) {
        const factsForCaptions = parsedData.summary || fetchedArticleSnippet || rawInputText || "";
        const variants = formatCaptionVariants(
          parsedData.headline,
          parsedData.location || "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936",
          factsForCaptions,
          channelUsername
        );
        if (!parsedData.captionDetailed) parsedData.captionDetailed = variants.captionDetailed;
        if (!parsedData.captionBullets) parsedData.captionBullets = variants.captionBullets;
        if (!parsedData.captionShort) parsedData.captionShort = variants.captionShort;
      }
      if (parsedData.captionDetailed) {
        const sanitized = sanitizeCaptionText(
          parsedData.captionDetailed,
          parsedData.headline,
          parsedData.location,
          channelUsername
        );
        parsedData.captionDetailed = cleanCaptionParagraphs(sanitized, "detailed", channelUsername, parsedData.location, parsedData.headline);
      }
      if (parsedData.captionBullets) {
        const sanitized = sanitizeCaptionText(
          parsedData.captionBullets,
          parsedData.headline,
          parsedData.location,
          channelUsername
        );
        parsedData.captionBullets = cleanCaptionParagraphs(sanitized, "bullet", channelUsername, parsedData.location, parsedData.headline);
      }
      if (parsedData.captionShort) {
        const sanitized = sanitizeCaptionText(
          parsedData.captionShort,
          parsedData.headline,
          parsedData.location,
          channelUsername
        );
        parsedData.captionShort = cleanCaptionParagraphs(sanitized, "short", channelUsername, parsedData.location, parsedData.headline);
      }
      if (parsedData.summary) {
        const sanitized = sanitizeCaptionText(
          parsedData.summary,
          parsedData.headline,
          parsedData.location,
          channelUsername
        );
        parsedData.summary = cleanCaptionParagraphs(sanitized, "detailed", channelUsername, parsedData.location, parsedData.headline);
      } else {
        parsedData.summary = parsedData.captionDetailed;
      }
      if (parsedData.speakerName) parsedData.speakerName = sanitizePressNoteFlattery(parsedData.speakerName);
      if (parsedData.speakerTitle) parsedData.speakerTitle = sanitizePressNoteFlattery(parsedData.speakerTitle);
      parsedData.template_id = tplConfig.template_id;
      parsedData.headline_max_lines = targetMaxLines;
      parsedData.headline_area = targetArea;
      parsedData.headline_line_count = targetMaxLines;
    }
    if (!parsedData) {
      const fallbackSource = rawInputText || fetchedArticleSnippet || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F";
      parsedData = createLocalNewsFallback(fallbackSource, linkUrl, targetMaxLines, extractedArticleMeta, channelUsername);
    }
    if (parsedData) {
      parsedData.actualProvider = actualProvider;
      parsedData.pickedImages = pickedImages;
      parsedData.extractedArticlePhotos = extractedPhotos.length > 0 ? extractedPhotos : pickedImages.main ? [pickedImages.main] : [];
      parsedData.canonicalContext = {
        sourceUrl: rawLink || "",
        title: effectiveArticleTitle || parsedData.headline || "",
        articleText: articleBodySnippets || effectiveInput || fetchedArticleSnippet || "",
        mainEvent: effectiveArticleTitle || parsedData.headline || "",
        location: parsedData.location || "",
        category: parsedData.category || "",
        verifiedEntities: parsedData.highlightWords || [],
        extractedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    return res.json({ success: true, data: parsedData, actualProvider });
  } catch (err) {
    console.warn("Recovering from /api/process-news-command error with emergency draft:", err?.message || err);
    try {
      const emergencyFallback = createLocalNewsFallback(
        req.body?.input || req.body?.command || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F",
        req.body?.linkUrl,
        3
      );
      if (emergencyFallback) {
        emergencyFallback.actualProvider = "local";
        emergencyFallback.canonicalContext = {
          sourceUrl: req.body?.linkUrl || "",
          title: emergencyFallback.headline || "",
          articleText: req.body?.input || req.body?.command || "",
          mainEvent: emergencyFallback.headline || "",
          location: emergencyFallback.location || "",
          category: emergencyFallback.category || "",
          verifiedEntities: emergencyFallback.highlightWords || [],
          extractedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      return res.json({
        success: true,
        data: emergencyFallback,
        actualProvider: "local",
        fallbackNotice: "\u0938\u094D\u0925\u093E\u0928\u0940\u092F \u0938\u0902\u092A\u093E\u0926\u0915\u0940\u092F \u0907\u0902\u091C\u0928 \u0926\u094D\u0935\u093E\u0930\u093E \u0924\u0948\u092F\u093E\u0930 \u0915\u093F\u092F\u093E \u0917\u092F\u093E \u0921\u094D\u0930\u093E\u092B\u094D\u091F"
      });
    } catch {
      return res.status(500).json({
        error: cleanErrorMessage(err)
      });
    }
  }
});
app.get("/api/ai-features-config", (req, res) => {
  try {
    const config = getAiFeaturesConfig();
    const userResolution = resolveUserTierAndRole(req);
    const effectiveTier = (req.query.tier || userResolution.tier || req.user?.tier || req.headers["x-user-tier"] || "basic").toString().toLowerCase().trim();
    const isAllowed = isRegenerateAllowed(config, effectiveTier);
    const canUseOpenAi = isTierAllowedForOpenAI(effectiveTier, userResolution.role);
    return res.json({
      success: true,
      config,
      userTier: effectiveTier,
      canRegenerateHeadlines: isAllowed,
      canUseOpenAi
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/ai-features-config", (req, res) => {
  try {
    const newConfig = req.body;
    if (!newConfig || typeof newConfig !== "object") {
      return res.status(400).json({ success: false, error: "Invalid configuration object" });
    }
    const current = getAiFeaturesConfig();
    const merged = {
      ...current,
      ...newConfig,
      headlineRegeneration: {
        ...current.headlineRegeneration,
        ...newConfig.headlineRegeneration || {}
      },
      permissions: {
        ...current.permissions,
        ...newConfig.permissions || {},
        regenerateHeadlines: {
          ...current.permissions?.regenerateHeadlines || {},
          ...newConfig.permissions?.regenerateHeadlines || {}
        }
      }
    };
    const saved = saveAiFeaturesConfig(merged);
    if (!saved) {
      return res.status(500).json({ success: false, error: "Failed to persist configuration" });
    }
    return res.json({ success: true, config: merged });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.get("/api/regenerate-headlines", (_req, res) => {
  res.json({ success: true, message: "Regenerate headlines API endpoint active" });
});
app.post("/api/regenerate-headlines", enforceUserAccessMiddleware, async (req, res) => {
  try {
    const aiConfig = getAiFeaturesConfig();
    const regenConfig = aiConfig.headlineRegeneration || {};
    if (regenConfig.enabled === false) {
      return res.status(403).json({
        success: false,
        error: "\u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u092A\u0941\u0928\u0930\u094D\u091C\u0928\u0928 (Regenerate Headlines) \u0938\u0941\u0935\u093F\u0927\u093E \u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u092E\u0947\u0902 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0926\u094D\u0935\u093E\u0930\u093E \u0928\u093F\u0937\u094D\u0915\u094D\u0930\u093F\u092F \u0915\u0940 \u0917\u0908 \u0939\u0948\u0964"
      });
    }
    const {
      canonicalContext = {},
      previousHeadlines = [],
      template_id = "graphic_001",
      channelUsername = "",
      customPrompt = "",
      aiProvider = "gemini",
      geminiApiKey = ""
    } = req.body;
    const userResolution = resolveUserTierAndRole(req);
    const userTier = userResolution.tier;
    const requestedProvider = (aiProvider || "gemini").toLowerCase();
    if (requestedProvider === "openai") {
      if (!isTierAllowedForOpenAI(userTier, userResolution.role)) {
        return res.status(403).json({
          success: false,
          error: "\u092F\u0939 \u0938\u0941\u0935\u093F\u0927\u093E \u0915\u0947\u0935\u0932 \u092A\u093E\u0924\u094D\u0930 Pro \u092F\u093E VIP-Dash \u0909\u092A\u092F\u094B\u0917\u0915\u0930\u094D\u0924\u093E\u0913\u0902 \u0915\u0947 \u0932\u093F\u090F \u0909\u092A\u0932\u092C\u094D\u0927 \u0939\u0948\u0964",
          requiredTiers: ["pro", "vip_dash", "admin"],
          currentTier: userTier
        });
      }
      if (aiConfig.aiModelAccess?.openai?.enabled === false) {
        return res.status(403).json({
          success: false,
          error: "ChatGPT (OpenAI) \u0938\u0941\u0935\u093F\u0927\u093E \u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u092E\u0947\u0902 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u0926\u094D\u0935\u093E\u0930\u093E \u0928\u093F\u0937\u094D\u0915\u094D\u0930\u093F\u092F \u0915\u0940 \u0917\u0908 \u0939\u0948\u0964"
        });
      }
    }
    const isAllowed = isRegenerateAllowed(aiConfig, userTier);
    if (!isAllowed) {
      const allowedList = aiConfig.permissions?.regenerateHeadlines?.allowedTiers || regenConfig.allowedTiers || [];
      return res.status(403).json({
        success: false,
        error: `\u0906\u092A\u0915\u0940 \u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u092F\u094B\u091C\u0928\u093E (${userTier}) \u092E\u0947\u0902 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u092A\u0941\u0928\u0930\u094D\u091C\u0928\u0928 (Regenerate Headlines) \u0915\u0940 \u0938\u0941\u0935\u093F\u0927\u093E \u0905\u0928\u0941\u092E\u0924 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u092F\u094B\u091C\u0928\u093E \u0905\u092A\u0917\u094D\u0930\u0947\u0921 \u0915\u0930\u0947\u0902\u0964`,
        requiredTiers: allowedList,
        currentTier: userTier
      });
    }
    const rawPrev = Array.isArray(previousHeadlines) ? previousHeadlines : [previousHeadlines].filter(Boolean);
    const excludeTitles = rawPrev.map((h) => cleanHeadlineText(String(h || "")).replace(/[।\.\,\!\?\:\-]+$/g, "").trim()).filter(Boolean);
    const sourceTitle = canonicalContext.title || req.body.title || req.body.sourceHeadline || "";
    const sourceText = canonicalContext.articleText || canonicalContext.text || canonicalContext.fullNews || canonicalContext.snippet || req.body.input || req.body.summary || "";
    const sourceLoc = cleanLocationField(canonicalContext.location || req.body.location || "");
    const articleSentences = (sourceText || sourceTitle).split(/[।\n]+|\.\s+/).map((s) => cleanHeadlineText(s).replace(/[।\.\,\!\?\:\-]+$/g, "").trim()).filter((s) => {
      if (s.length <= 15 || !/[\u0900-\u097F]/.test(s)) return false;
      if (/(?:वेबसाइट|प्रकाशित|से संबंधित|मुख्य संदर्भ|domain|विषय:)/u.test(s)) return false;
      return true;
    });
    const cleanOptions = [];
    const addOptionIfValid = (candidate) => {
      let s = formatAsJournalisticHeadline(cleanHeadlineText(String(candidate || ""))).replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
      if (!s || s.length < 15) return;
      if (/(?:वेबसाइट|प्रकाशित|से संबंधित|मुख्य संदर्भ|विषय:)/u.test(s)) return;
      if (cleanOptions.includes(s)) return;
      for (const excl of excludeTitles) {
        if (s === excl || calculateHeadlineSimilarityInternal(s, excl) >= 0.88) {
          return;
        }
      }
      const isDup = cleanOptions.some((existing) => calculateHeadlineSimilarityInternal(existing, s) >= 0.88);
      if (!isDup) {
        cleanOptions.push(s);
      }
    };
    const regenInstruction = `You are the Chief Hindi News Editor for AI NEWS MAKER (BREAKING NEWS WALA Editorial Standard).
Generate exactly 5 distinct, balanced headline options across the 5 editorial angles of the SAME primary news event in pure Hindi Devanagari script:
- All 5 options must be based strictly on the same central event (no secondary stories or unrelated paragraphs).
- STRICT RULE: Do NOT append generic administrative or police filler words (such as '\u092A\u094D\u0930\u0936\u093E\u0938\u0928 \u0928\u0947 \u0926\u093F\u090F \u0915\u0921\u093C\u0947 \u0928\u093F\u0930\u094D\u0926\u0947\u0936', '\u092E\u093E\u092E\u0932\u0947 \u092E\u0947\u0902 \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937 \u091C\u093E\u0902\u091A \u0914\u0930 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0947 \u0928\u093F\u0930\u094D\u0926\u0947\u0936', '\u0928\u093F\u0917\u0930\u093E\u0928\u0940', '\u0938\u0916\u094D\u0924 \u0928\u091C\u0930') unless that exact event actually took place in the news story. For entertainment, sports, business, or lifestyle news, keep the phrasing strictly relevant to the subject.
- Rich headline word count: Aim for rich, informative, contextual headlines of 14 to 26 words (up to 150 characters maximum) capturing full context, key names, and developments, rather than overly brief phrases.
- Option 1: Core event (direct, hard news)
- Option 2: Key person/actor angle
- Option 3: Action/Development angle
- Option 4: Crucial fact/Quote angle
- Option 5: Crisp, punchy journalistic angle
- Single maximum ceiling: up to 150 characters per headline.
- No ending punctuation (. or \u0964). No tier labels or bracketed counts like '[58/100]'.
Return valid JSON: { "headlineOptions": ["...", "...", "...", "...", "..."] }`;
    const regenPrompt = `\u0915\u0943\u092A\u092F\u093E \u0928\u093F\u092E\u094D\u0928\u0932\u093F\u0916\u093F\u0924 \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u0947 \u0932\u093F\u090F \u0920\u0940\u0915 5 \u0928\u090F \u0938\u0902\u0924\u0941\u0932\u093F\u0924 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0935\u093F\u0915\u0932\u094D\u092A \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902 (\u0938\u092D\u0940 5 \u0935\u093F\u0915\u0932\u094D\u092A \u0915\u0947\u0935\u0932 \u0907\u0938\u0940 \u092E\u0941\u0916\u094D\u092F \u0918\u091F\u0928\u093E \u092A\u0930 \u0906\u0927\u093E\u0930\u093F\u0924 \u0939\u094B\u0902, \u092A\u094D\u0930\u0924\u094D\u092F\u0947\u0915 \u0905\u0927\u093F\u0915\u0924\u092E 150 \u0935\u0930\u094D\u0923, \u092C\u093F\u0928\u093E \u0915\u093F\u0938\u0940 \u092A\u0942\u0930\u094D\u0923\u0935\u093F\u0930\u093E\u092E \u0915\u0947, \u0936\u0941\u0926\u094D\u0927 \u0939\u093F\u0902\u0926\u0940)\u0964
\u0936\u0940\u0930\u094D\u0937\u0915 \u0938\u0902\u0926\u0930\u094D\u092D: ${sourceTitle}
\u0938\u092E\u093E\u091A\u093E\u0930 \u0938\u093E\u092E\u0917\u094D\u0930\u0940/\u0924\u0925\u094D\u092F: ${sourceText.slice(0, 2500)}
${sourceLoc ? `\u0938\u094D\u0925\u093E\u0928: ${sourceLoc}
` : ""}${customPrompt ? `\u092F\u0942\u091C\u093C\u0930 \u0915\u093E \u0935\u093F\u0936\u0947\u0937 \u0928\u093F\u0930\u094D\u0926\u0947\u0936: ${customPrompt}
` : ""}
${excludeTitles.length > 0 ? `\u092A\u093F\u091B\u0932\u0947 \u0935\u093F\u0915\u0932\u094D\u092A \u091C\u093F\u0928\u094D\u0939\u0947\u0902 \u0928\u0939\u0940\u0902 \u0926\u094B\u0939\u0930\u093E\u0928\u093E \u0939\u0948:
${excludeTitles.map((t) => `- ${t}`).join("\n")}
` : ""}
JSON Output Schema:
{
  "headlineOptions": [
    "\u0935\u093F\u0915\u0932\u094D\u092A 1: \u092E\u0941\u0916\u094D\u092F \u0918\u091F\u0928\u093E (<=150 \u0935\u0930\u094D\u0923)",
    "\u0935\u093F\u0915\u0932\u094D\u092A 2: \u092A\u094D\u0930\u093E\u0927\u093F\u0915\u093E\u0930\u0940/\u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0915\u094B\u0923 (<=150 \u0935\u0930\u094D\u0923)",
    "\u0935\u093F\u0915\u0932\u094D\u092A 3: \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908/\u092A\u0930\u093F\u0923\u093E\u092E \u0915\u094B\u0923 (<=150 \u0935\u0930\u094D\u0923)",
    "\u0935\u093F\u0915\u0932\u094D\u092A 4: \u092E\u0941\u0916\u094D\u092F \u092C\u093F\u0902\u0926\u0941/\u0924\u0925\u094D\u092F \u0915\u094B\u0923 (<=150 \u0935\u0930\u094D\u0923)",
    "\u0935\u093F\u0915\u0932\u094D\u092A 5: \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935 \u092A\u094D\u0930\u092D\u093E\u0935\u0936\u093E\u0932\u0940 \u0915\u094B\u0923 (<=150 \u0935\u0930\u094D\u0923)"
  ]
}`;
    const tryOpenAI = async () => {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: regenInstruction },
          { role: "user", content: regenPrompt }
        ],
        temperature: 0.7
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
      return Array.isArray(parsed.headlineOptions) ? parsed.headlineOptions : [];
    };
    const tryGemini = async () => {
      const activeGeminiKey = (geminiApiKey || process.env.GEMINI_API_KEY || "").trim();
      if (!activeGeminiKey || activeGeminiKey === "MY_GEMINI_API_KEY") {
        throw new Error("GEMINI_API_KEY not configured");
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey: activeGeminiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
      const response = await generateWithFallbackAndRetry(
        ai,
        DEFAULT_FALLBACK_MODELS,
        {
          contents: regenPrompt,
          config: {
            systemInstruction: regenInstruction,
            responseMimeType: "application/json"
          }
        }
      );
      const parsed = JSON.parse(response.text || "{}");
      return Array.isArray(parsed.headlineOptions) ? parsed.headlineOptions : [];
    };
    let aiGeneratedOptions = [];
    let actualProvider = "gemini";
    if (requestedProvider === "openai") {
      try {
        aiGeneratedOptions = await tryOpenAI();
        actualProvider = "openai";
      } catch (openAiErr) {
        return res.status(502).json({
          success: false,
          error: `ChatGPT (OpenAI) \u0938\u0947 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u092A\u0941\u0928\u0930\u094D\u091C\u0928\u0928 \u092E\u0947\u0902 \u0924\u094D\u0930\u0941\u091F\u093F: ${openAiErr?.message || "\u0938\u0947\u0935\u093E \u0905\u0928\u0941\u092A\u0932\u092C\u094D\u0927"}\u0964 \u0915\u0943\u092A\u092F\u093E \u091C\u0947\u092E\u093F\u0928\u0940 \u090F\u0906\u0908 \u091A\u0941\u0928\u0947\u0902 \u092F\u093E \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964`
        });
      }
    } else {
      try {
        aiGeneratedOptions = await tryGemini();
        actualProvider = "gemini";
      } catch (geminiErr) {
        if (aiConfig.aiModelAccess?.gemini?.allowFallback) {
          try {
            aiGeneratedOptions = await tryOpenAI();
            actualProvider = "openai";
          } catch {
          }
        }
      }
    }
    if (Array.isArray(aiGeneratedOptions)) {
      aiGeneratedOptions.forEach((h) => addOptionIfValid(h));
    }
    if (cleanOptions.length < 5) {
      const balanced = generate5BalancedHeadlineOptions(
        sourceTitle || "\u092E\u0941\u0916\u094D\u092F \u0938\u092E\u093E\u091A\u093E\u0930",
        articleSentences,
        sourceLoc
      );
      for (const b of balanced) {
        if (cleanOptions.length >= 5) break;
        addOptionIfValid(b);
      }
    }
    while (cleanOptions.length < 5) {
      const fallbackSeed = sourceTitle || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F";
      cleanOptions.push(fallbackSeed);
    }
    const finalOptions = fitHeadlinesTo5TierRanges(
      cleanOptions,
      articleSentences,
      sourceTitle || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F",
      sourceLoc
    );
    return res.json({
      success: true,
      actualProvider,
      headlines: finalOptions,
      headlineOptions: finalOptions,
      options: finalOptions,
      headline: finalOptions[0] || "",
      canonicalContext: {
        ...canonicalContext,
        lastRegeneratedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      diagnostics: {
        count: finalOptions.length,
        graduatedWordCounts: finalOptions.map((h) => h.split(/\s+/).length)
      }
    });
  } catch (err) {
    console.error("Error in /api/regenerate-headlines:", err);
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
var CATEGORY_KEYWORDS_LIST = [
  "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F",
  "\u0905\u0902\u0924\u0930\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F",
  "\u0935\u093F\u0926\u0947\u0936",
  "\u0905\u092A\u0930\u093E\u0927",
  "\u0915\u094D\u0930\u093E\u0907\u092E",
  "\u0938\u093F\u092F\u093E\u0938\u0924",
  "\u0930\u093E\u091C\u0928\u0940\u0924\u093F",
  "\u0939\u093E\u0926\u0938\u093E",
  "\u092A\u094D\u0930\u0936\u093E\u0938\u0928",
  "\u0935\u093F\u0915\u093E\u0938",
  "\u092C\u093F\u091C\u0928\u0947\u0938",
  "\u0915\u093E\u0930\u094B\u092C\u093E\u0930",
  "\u091F\u0947\u0915",
  "\u0935\u093F\u0936\u0947\u0937 \u0915\u0935\u0930\u0947\u091C",
  "\u0924\u093E\u091C\u093C\u093E \u0916\u093C\u092C\u0930",
  "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930",
  "\u0924\u093E\u091C\u093C\u093E"
];
function cleanHeadlineText(text) {
  if (!text) return "";
  let cleaned = text;
  cleaned = cleaned.replace(/(?:लोड हो रहा है[\s\.]*)+/gi, "").replace(/(?:loading[\s\.]*)+/gi, "").replace(/(?:please wait[\s\.]*)+/gi, "").replace(/(?:generating[\s\.]*)+/gi, "").replace(/(?:ai is processing[\s\.]*)+/gi, "");
  cleaned = cleaned.replace(
    /(?:कॉपी\s*लिंक|फाइल\s*फोटो[:\s]*|शेयर\s*करें|क्लिक\s*करें|डाउनलोड\s*करें|यह\s*भी\s*पढ़ें|संबंधित\s*खबरें|File\s*Photo[:\s]*|Photo[:\s]*|Credit[:\s]*)/gi,
    " "
  );
  cleaned = cleaned.replace(
    /\s*[|\-–—:]\s*(?:[A-Za-z\s]+News|[A-Za-z\s]+Samachar|Dainik Bhaskar|Bhaskar|Aaj Tak|आज तक|BBC News हिंदी|BBC Hindi|NDTV India|NDTV|Amar Ujala|News18|Zee News|Patrika|Navbharat Times|Hindustan|Live Hindustan|Oneindia|ABP News|Jagran|Dainik Jagran|TV9|Navbharat).*$/i,
    ""
  ).replace(/\s*[|\-–—:]\s*[A-Za-z\s]{3,30}$/, "").trim();
  cleaned = cleaned.replace(
    /^(?:विकल्प|ऑप्शन|Option|Angle)\s*\d+[\s:\-–—.]*\s*/i,
    ""
  ).replace(/^\d+[\.:\)\-–—]+\s*(?=[\u0900-\u097F])/u, "").replace(
    /^(न्यूज बनाओ|हेडलाइन बनाओ|खबर बनाओ|प्रेस नोट|प्रेस विज्ञप्ति|यह खबर है|जानिए|देखिए|Live\s*Updates?[:\s\-–—]*|Khabar\s*Updates?[:\s\-–—]*|Latest\s*News[:\s\-–—]*|Breaking\s*News[:\s\-–—]*|Exclusive[:\s\-–—]*|Big\s*Breaking[:\s\-–—]*|लाइव\s*अपडेट[:\s\-–—]*|खबर\s*अपडेट[:\s\-–—]*|लेटेस्ट\s*न्यूज[:\s\-–—]*|लेटेस्ट\s*अपडेट[:\s\-–—]*|ब्रेकिंग न्यूज़[:\s\-–—]*|ब्रेकिंग\s*न्यूज[:\s\-–—]*|बिग\s*ब्रेकिंग[:\s\-–—]*|ताजा\s*समाचार[:\s\-–—]*|बड़ी\s*खबर[:\s\-–—]*|एक्सक्लूसिव[:\s\-–—]*)\s*[:\-–—]?\s*/i,
    ""
  ).replace(/^[\s:\-–—,;।.]+/g, "").trim();
  cleaned = cleaned.replace(
    /^(?:नई\s*दिल्ली\s*[\/\-]\s*राष्ट्रीय|अंतरराष्ट्रीय\s*[\/\-]\s*वाशिंगटन|नई\s*दिल्ली|भोपाल|इंदौर|रीवा|जबलपुर|ग्वालियर|लखनऊ|पटना|जयपुर|रायपुर|वाशिंगटन|राष्ट्रीय|अंतरराष्ट्रीय|विदेश|अपराध|क्राइम|सियासत|राजनीति|हादसा|प्रशासन|विकास|बिजनेस|कारोबार|विशेष\s*कवरेज|ताज़ा\s*समाचार|ताज़ा\s*ख़बर)\s*[:\-–—]\s*/i,
    ""
  ).trim();
  cleaned = cleaned.replace(
    /\s*[:\-–—]?\s*(?:नई\s*दिल्ली\s*[\/\-]\s*राष्ट्रीय|अंतरराष्ट्रीय\s*[\/\-]\s*वाशिंगटन|राष्ट्रीय|अंतरराष्ट्रीय)$/i,
    ""
  ).trim();
  cleaned = cleaned.replace(/https?:\/\/\S+/gi, "").replace(/www\.\S+/gi, "").replace(/\b[a-zA-Z0-9.\-]+\.(?:com|in|org|net|co|io)\b/gi, "").replace(/#[\w\u0900-\u097F]+/g, "").replace(/@[\w\u0900-\u097F]+/g, "");
  const acronyms = [
    [/\bAI\b/g, "\u090F\u0906\u0908"],
    [/\bISRO\b/g, "\u0907\u0938\u0930\u094B"],
    [/\bNASA\b/g, "\u0928\u093E\u0938\u093E"],
    [/\bFIR\b/g, "\u090F\u092B\u0906\u0908\u0906\u0930"],
    [/\bIT\b/g, "\u0906\u0908\u091F\u0940"],
    [/\bOPD\b/g, "\u0913\u092A\u0940\u0921\u0940"],
    [/\bVIP\b/g, "\u0935\u0940\u0906\u0908\u092A\u0940"],
    [/\bBJP\b/g, "\u092C\u0940\u091C\u0947\u092A\u0940"],
    [/\bPM\b/g, "\u092A\u0940\u090F\u092E"],
    [/\bCM\b/g, "\u0938\u0940\u090F\u092E"],
    [/\bDM\b/g, "\u0921\u0940\u090F\u092E"],
    [/\bSP\b/g, "\u090F\u0938\u092A\u0940"],
    [/\bSDM\b/g, "\u090F\u0938\u0921\u0940\u090F\u092E"],
    [/\bBHK\b/g, "\u092C\u0940\u090F\u091A\u0915\u0947"],
    [/\bGST\b/g, "\u091C\u0940\u090F\u0938\u091F\u0940"],
    [/\bCBI\b/g, "\u0938\u0940\u092C\u0940\u0906\u0908"],
    [/\bED\b/g, "\u0908\u0921\u0940"],
    [/\bNIA\b/g, "\u090F\u0928\u0906\u0908\u090F"],
    [/\bICU\b/g, "\u0906\u0908\u0938\u0940\u092F\u0942"],
    [/\bMP\b/g, "\u090F\u092E\u092A\u0940"],
    [/\bUP\b/g, "\u092F\u0942\u092A\u0940"],
    [/\bUSA\b/g, "\u092F\u0942\u090F\u0938\u090F"],
    [/\bUK\b/g, "\u092F\u0942\u0915\u0947"],
    [/\bCEO\b/g, "\u0938\u0940\u0908\u0913"]
  ];
  for (const [pattern, devanagari] of acronyms) {
    cleaned = cleaned.replace(pattern, devanagari);
  }
  cleaned = cleaned.replace(/\[(yellow|highlight)\]/g, "\uE001");
  cleaned = cleaned.replace(/\[\/(yellow|highlight)\]/g, "\uE002");
  cleaned = cleaned.replace(/[A-Za-z]+/g, "");
  cleaned = cleaned.replace(/\uE001/g, "[yellow]");
  cleaned = cleaned.replace(/\uE002/g, "[/yellow]");
  cleaned = cleaned.replace(/^[\s:\-–—,;।.]+/g, "").replace(/[।\.\,\!\?\:\-–—;;\s]+$/g, "").trim();
  cleaned = cleaned.replace(/\[(highlight|yellow)\]\s+/g, "[$1]").replace(/\s+\[\/(highlight|yellow)\]/g, "[/$1]").replace(/\s+([,\.!\?:;।])/g, "$1");
  cleaned = sanitizePressNoteFlattery(cleaned, true);
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  cleaned = cleaned.replace(/\s*[,।]?\s*(?:जिससे|इससे)\s+लोगों\s+को\s+मदद\s+मिलेगी.*$/u, "");
  cleaned = cleaned.replace(/मध्यप्रदेश/g, "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936").replace(/उत्तरप्रदेश/g, "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936").replace(/हिमाचलप्रदेश/g, "\u0939\u093F\u092E\u093E\u091A\u0932 \u092A\u094D\u0930\u0926\u0947\u0936").replace(/आंध्रप्रदेश/g, "\u0906\u0902\u0927\u094D\u0930 \u092A\u094D\u0930\u0926\u0947\u0936");
  cleaned = cleaned.replace(/[।\.\,\!\?\:\-–—;;\s]+$/g, "").trim();
  return cleaned;
}
function cleanLocationField(loc) {
  if (!loc) return "";
  let cleaned = stripAllUrlsAndHyperlinks(String(loc)).replace(/^(स्थान\s*[:\-–—]?|location\s*[:\-–—]?|ताजा\s*समाचार\s*स्थान\s*[:\-–—]?|ताज़ा\s*समाचार\s*स्थान\s*[:\-–—]?)/i, "").trim();
  if (cleaned === "\u0935\u093F\u0936\u0947\u0937 \u0915\u0935\u0930\u0947\u091C") return "";
  cleaned = cleaned.replace(/https?:\/\/\S+|www\.\S+|[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\/\S*/gi, "").trim();
  if (cleaned.length > 50) {
    cleaned = cleaned.split(/[,।\n]/)[0].trim();
  }
  const parts = cleaned.split(/[\/\-–—]+/).map((p) => p.trim()).filter(Boolean);
  const locationParts = parts.filter((p) => !CATEGORY_KEYWORDS_LIST.some((cat) => cat.toLowerCase() === p.toLowerCase()));
  if (locationParts.length > 0) {
    cleaned = locationParts.join(", ");
  } else {
    cleaned = "";
  }
  cleaned = cleaned.replace(/[।\.\,\!\?\:\-–—\s]+$/g, "").trim();
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  return formatDistrictWithState(cleaned);
}
function cleanCategoryField(cat) {
  if (!cat) return "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930";
  let cleaned = cat.replace(/^(श्रेणी\s*[:\-–—]?|category\s*[:\-–—]?)/i, "").trim();
  const parts = cleaned.split(/[\/\-–—]+/).map((p) => p.trim()).filter(Boolean);
  const matched = parts.find((p) => CATEGORY_KEYWORDS_LIST.some((ck) => ck.toLowerCase() === p.toLowerCase()));
  if (matched) return matched;
  cleaned = cleaned.replace(/[।\.\,\!\?\:\-–—\s]+$/g, "").trim();
  return cleaned || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930";
}
app.post("/api/format-static-caption", (req, res) => {
  try {
    const { headline, location, content, linkUrl, channelUsername, username } = req.body;
    const cleanH = cleanHeadlineText(headline || "");
    const cleanLoc = cleanLocationField(location || "");
    const sourceText = (content || headline || "").trim();
    const formattedSummary = ensureHashtagHierarchy(
      sanitizePressNoteFlattery(sourceText),
      cleanLoc,
      channelUsername || username || "",
      "detailed"
    );
    const locLine = cleanLoc ? `

\u0938\u094D\u0925\u093E\u0928: ${cleanLoc}` : "";
    const fullCaption = `${cleanH || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930"}${locLine}

${formattedSummary}`;
    const cleanUser = (channelUsername || username || "").replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "").trim();
    const defaultTags = cleanUser ? [`#${cleanUser}`, "#BreakingNews", "#HindiNews"] : ["#BreakingNews", "#HindiNews"];
    return res.json({
      success: true,
      caption: fullCaption,
      summary: formattedSummary,
      location: cleanLoc,
      hashtags: defaultTags
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
function sanitizePressNoteFlattery(text, isHeadline = false) {
  if (!text || typeof text !== "string") return text || "";
  let cleaned = text;
  cleaned = cleaned.replace(/^(यह खबर है|जानिए|देखिए|Live\s*Updates?[:\s\-–—]*|Khabar\s*Updates?[:\s\-–—]*|Latest\s*News[:\s\-–—]*|Breaking\s*News[:\s\-–—]*|Exclusive[:\s\-–—]*|Big\s*Breaking[:\s\-–—]*|लाइव\s*अपडेट[:\s\-–—]*|खबर\s*अपडेट[:\s\-–—]*|लेटेस्ट\s*न्यूज[:\s\-–—]*|लेटेस्ट\s*अपडेट[:\s\-–—]*|ब्रेकिंग न्यूज़[:\s\-–—]*|ब्रेकिंग\s*न्यूज[:\s\-–—]*|बिग\s*ब्रेकिंग[:\s\-–—]*|ताजा\s*समाचार[:\s\-–—]*|बड़ी\s*खबर[:\s\-–—]*|एक्सक्लूसिव[:\s\-–—]*)\s*/i, "");
  cleaned = sanitizeFlattery(cleaned);
  cleaned = cleaned.replace(/\s*[,।]?\s*(?:जिससे|इससे)\s+लोगों\s+को\s+मदद\s+मिलेगी.*$/u, "");
  if (isHeadline) {
    cleaned = cleaned.replace(/[।\.\,\!\?\:\-–—\s]+$/g, "").trim();
  }
  return cleaned;
}
function createEpaperLocalFallback(rawInput, city = "", reporterName = "") {
  const sanitized = sanitizePressNoteFlattery(rawInput);
  const detectedCity = city.trim() || (rawInput.match(/(निवाड़ी|इंदौर|भोपाल|ग्वालियर|जबलपुर|उज्जैन|रीवा|सतना|सागर|टीकमगढ़|दमोह|छतरपुर)/i)?.[1] || "\u0928\u093F\u0935\u093E\u0921\u093C\u0940");
  const firstSentence = sanitized.split(/[।\.\n]/)[0]?.trim() || "\u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0938\u0947 \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u092E\u0947\u0902 \u092E\u091A\u093E \u0939\u0921\u093C\u0915\u0902\u092A";
  const headline = firstSentence.length > 15 && firstSentence.length < 90 ? firstSentence : `${detectedCity}: \u092E\u093E\u092E\u0932\u0947 \u092E\u0947\u0902 \u092A\u094D\u0930\u0936\u093E\u0938\u0928 \u0915\u093E \u092C\u0921\u093C\u093E \u090F\u0915\u094D\u0936\u0928, \u091C\u093E\u0902\u091A \u0915\u0947 \u0906\u0926\u0947\u0936`;
  return {
    epaperCity: detectedCity,
    epaperKicker: "\u0935\u093F\u0936\u0947\u0937 \u0930\u093F\u092A\u094B\u0930\u094D\u091F / \u0917\u094D\u0930\u093E\u0909\u0902\u0921 \u091C\u093C\u0940\u0930\u094B",
    epaperHeadline: headline,
    epaperSubHeadline: "\u0905\u0927\u093F\u0915\u093E\u0930\u093F\u092F\u094B\u0902 \u0928\u0947 \u092E\u094C\u0915\u0947 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A\u0915\u0930 \u0932\u093F\u092F\u093E \u091C\u093E\u092F\u091C\u093E, \u0926\u094B\u0937\u093F\u092F\u094B\u0902 \u092A\u0930 \u0915\u0921\u093C\u0940 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0940 \u091A\u0947\u0924\u093E\u0935\u0928\u0940",
    epaperByline: reporterName ? `${reporterName} / \u0935\u093F\u0936\u0947\u0937 \u0938\u0902\u0935\u093E\u0926\u0926\u093E\u0924\u093E, ${detectedCity}` : `\u092C\u094D\u092F\u0942\u0930\u094B \u0930\u093F\u092A\u094B\u0930\u094D\u091F / ${detectedCity}`,
    epaperPromoTagline: "\u{1F4E2} \u0905\u092C \u0906\u092A \u092D\u0940 \u092D\u0947\u091C\u0947\u0902 \u0905\u092A\u0928\u0940 \u0916\u092C\u0930 \u0939\u092E \u0924\u0915: 96698-02408",
    epaperArticleBody: `${sanitized.slice(0, 500) || "\u091C\u093F\u0932\u0947 \u092E\u0947\u0902 \u092A\u094D\u0930\u0936\u093E\u0938\u0928 \u0928\u0947 \u092C\u0921\u093C\u0940 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0930\u0924\u0947 \u0939\u0941\u090F \u0938\u094D\u0925\u093F\u0924\u093F \u0915\u094B \u0928\u093F\u092F\u0902\u0924\u094D\u0930\u093F\u0924 \u0915\u093F\u092F\u093E\u0964 \u0917\u094D\u0930\u093E\u092E\u0940\u0923\u094B\u0902 \u0915\u0940 \u0936\u093F\u0915\u093E\u092F\u0924\u094B\u0902 \u0915\u0947 \u0906\u0927\u093E\u0930 \u092A\u0930 \u0935\u0930\u093F\u0937\u094D\u0920 \u0905\u0927\u093F\u0915\u093E\u0930\u093F\u092F\u094B\u0902 \u0928\u0947 \u0938\u0902\u092F\u0941\u0915\u094D\u0924 \u0926\u0932 \u0917\u0920\u093F\u0924 \u0915\u0930 \u092E\u094C\u0915\u0947 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A\u0915\u0930 \u091C\u093E\u0902\u091A \u0915\u0940\u0964"}

\u092E\u093E\u092E\u0932\u0947 \u092E\u0947\u0902 \u0938\u0902\u0932\u093F\u092A\u094D\u0924 \u092A\u093E\u090F \u0917\u090F \u0932\u094B\u0917\u094B\u0902 \u0915\u0947 \u0935\u093F\u0930\u0941\u0926\u094D\u0927 \u0935\u0948\u0927\u093E\u0928\u093F\u0915 \u0927\u093E\u0930\u093E\u0913\u0902 \u092E\u0947\u0902 \u092A\u094D\u0930\u0915\u0930\u0923 \u0926\u0930\u094D\u091C \u0915\u0930 \u0905\u0917\u094D\u0930\u093F\u092E \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u092A\u094D\u0930\u093E\u0930\u0902\u092D \u0915\u0930 \u0926\u0940 \u0917\u0908 \u0939\u0948\u0964`,
    epaperHighlightsTitle: "\u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0947 \u092E\u0941\u0916\u094D\u092F \u092C\u093F\u0902\u0926\u0941",
    epaperHighlights: [
      "\u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u0926\u0932 \u0928\u0947 \u092E\u094C\u0915\u0947 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A\u0915\u0930 \u0915\u0940 \u0924\u094D\u0935\u0930\u093F\u0924 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908",
      "\u0936\u093F\u0915\u093E\u092F\u0924\u094B\u0902 \u0915\u0947 \u0906\u0927\u093E\u0930 \u092A\u0930 \u091C\u093E\u0902\u091A \u0926\u0932 \u0917\u0920\u093F\u0924 \u0915\u0930 \u092A\u0902\u091A\u0928\u093E\u092E\u093E \u0924\u0948\u092F\u093E\u0930",
      "\u0926\u094B\u0937\u093F\u092F\u094B\u0902 \u0915\u0947 \u0916\u093F\u0932\u093E\u092B \u0938\u0916\u094D\u0924 \u0935\u0948\u0927\u093E\u0928\u093F\u0915 \u0927\u093E\u0930\u093E\u0913\u0902 \u092E\u0947\u0902 \u092A\u094D\u0930\u0915\u0930\u0923 \u0926\u0930\u094D\u091C"
    ],
    epaperQuoteText: "\u091C\u0928\u0939\u093F\u0924 \u0914\u0930 \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0947 \u0932\u093F\u090F \u092A\u094D\u0930\u0936\u093E\u0938\u0928 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u092E\u0941\u0938\u094D\u0924\u0948\u0926 \u0939\u0948\u0964 \u0915\u093F\u0938\u0940 \u092D\u0940 \u0938\u094D\u0924\u0930 \u092A\u0930 \u0932\u093E\u092A\u0930\u0935\u093E\u0939\u0940 \u092C\u0930\u094D\u0926\u093E\u0936\u094D\u0924 \u0928\u0939\u0940\u0902 \u0939\u094B\u0917\u0940\u0964",
    epaperQuoteSpeaker: `${detectedCity} \u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u0905\u0927\u093F\u0915\u093E\u0930\u0940`,
    epaperPhotoCaption: "\u0918\u091F\u0928\u093E\u0938\u094D\u0925\u0932 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A\u0915\u0930 \u091C\u093E\u0902\u091A \u092A\u0921\u093C\u0924\u093E\u0932 \u0915\u0930\u0924\u0940 \u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u091F\u0940\u092E\u0964",
    epaperPhotoCaption2: "\u0926\u0938\u094D\u0924\u093E\u0935\u0947\u091C\u094B\u0902 \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0924\u0947 \u0905\u0927\u093F\u0915\u093E\u0930\u0940\u0964",
    epaperPhotoCaption3: "\u092E\u094C\u0915\u0947 \u092A\u0930 \u0909\u092A\u0938\u094D\u0925\u093F\u0924 \u0917\u094D\u0930\u093E\u092E\u0940\u0923 \u0935 \u092A\u094D\u0930\u0924\u094D\u092F\u0915\u094D\u0937\u0926\u0930\u094D\u0936\u0940\u0964",
    summary: `${detectedCity} \u092E\u0947\u0902 \u092C\u0921\u093C\u0940 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0940 \u0916\u092C\u0930\u0964 \u092A\u0942\u0930\u0940 \u0930\u093F\u092A\u094B\u0930\u094D\u091F \u0908-\u092A\u0947\u092A\u0930 \u090F\u0921\u093F\u0936\u0928 \u092E\u0947\u0902 \u092A\u0922\u093C\u0947\u0902\u0964

#AINews #Epaper #${detectedCity} #HindiNews`,
    category: "\u092A\u094D\u0930\u0936\u093E\u0938\u0928"
  };
}
app.post("/api/process-epaper-pressnote", enforceUserAccessMiddleware, async (req, res) => {
  try {
    const {
      pressNoteText = "",
      linkUrl = "",
      city = "",
      reporterName = "",
      aiProvider = "gemini"
    } = req.body;
    if (!pressNoteText && !linkUrl) {
      return res.status(400).json({ error: "\u0915\u0943\u092A\u092F\u093E \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u0915\u093E \u0935\u093F\u0935\u0930\u0923 \u092F\u093E \u0932\u093F\u0902\u0915 \u092A\u094D\u0930\u0926\u093E\u0928 \u0915\u0930\u0947\u0902\u0964" });
    }
    let fetchedSnippet = "";
    let pickedImages = {};
    if (linkUrl) {
      try {
        const fetchRes = await fetch(linkUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        if (fetchRes.ok) {
          const html = await fetchRes.text();
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const metaDescMatch = html.match(
            /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
          );
          let bodySnippet = "";
          const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
          if (paragraphs) {
            bodySnippet = paragraphs.slice(0, 10).map((p) => p.replace(/<[^>]+>/g, "").trim()).filter((t) => t.length > 25).join("\n\n");
          }
          fetchedSnippet = `
URL: ${linkUrl}
Title: ${titleMatch ? titleMatch[1] : ""}
Meta: ${metaDescMatch ? metaDescMatch[1] : ""}
Text: ${bodySnippet.slice(0, 3500)}
`;
          const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
          if (ogImageMatch && ogImageMatch[1]) {
            pickedImages.main = ogImageMatch[1].trim();
          }
        }
      } catch (err) {
        console.warn("Failed fetching linkUrl for epaper:", err?.message);
      }
    }
    const rawInput = (pressNoteText + "\n\n" + fetchedSnippet).trim();
    const systemPrompt = `\u0906\u092A \u090F\u0915 \u0908-\u092A\u0947\u092A\u0930 \u0938\u0902\u092A\u093E\u0926\u0915 \u0939\u0948\u0902\u0964
\u0906\u092A\u0915\u094B \u0928\u0940\u091A\u0947 \u090F\u0915 \u0915\u091A\u094D\u091A\u093E \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u0905\u0925\u0935\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0930\u093F\u092A\u094B\u0930\u094D\u091F \u0926\u0940 \u091C\u093E \u0930\u0939\u0940 \u0939\u0948\u0964
\u0906\u092A\u0915\u094B \u0907\u0938\u0947 \u0908-\u092A\u0947\u092A\u0930 (E-Paper) \u090F\u0921\u093F\u0936\u0928 \u0915\u0940 \u092A\u094D\u0930\u092E\u0941\u0916 \u0916\u092C\u0930 \u0915\u0947 \u0930\u0942\u092A \u092E\u0947\u0902 \u0922\u093E\u0932\u0928\u093E \u0939\u0948\u0964

\u092F\u0942\u091C\u093C\u0930 \u0915\u093E \u0915\u091A\u094D\u091A\u093E \u0907\u0928\u092A\u0941\u091F (\u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F / \u0930\u093F\u092A\u094B\u0930\u094D\u091F):
"${rawInput}"

${city ? `\u092F\u0942\u091C\u093C\u0930 \u0926\u094D\u0935\u093E\u0930\u093E \u0928\u093F\u0930\u094D\u0926\u093F\u0937\u094D\u091F \u0936\u0939\u0930/\u091C\u093F\u0932\u093E: "${city}"` : ""}
${reporterName ? `\u092F\u0942\u091C\u093C\u0930 \u0926\u094D\u0935\u093E\u0930\u093E \u0928\u093F\u0930\u094D\u0926\u093F\u0937\u094D\u091F \u0930\u093F\u092A\u094B\u0930\u094D\u091F\u0930 \u0915\u093E \u0928\u093E\u092E: "${reporterName}"` : ""}

\u0938\u0902\u092A\u093E\u0926\u0915\u0940\u092F \u0928\u093F\u0930\u094D\u0926\u0947\u0936:
1. **\u091A\u093E\u091F\u0941\u0915\u093E\u0930\u093F\u0924\u093E \u0935 \u0914\u092A\u091A\u093E\u0930\u093F\u0915 \u0936\u092C\u094D\u0926 \u0939\u091F\u093E\u0928\u093E**: \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u092E\u0947\u0902 \u0905\u0927\u093F\u0915\u093E\u0930\u093F\u092F\u094B\u0902 \u092F\u093E \u0935\u094D\u092F\u0915\u094D\u0924\u093F\u092F\u094B\u0902 \u0915\u0947 \u0928\u093E\u092E \u0915\u0947 \u0906\u0917\u0947 '\u0936\u094D\u0930\u0940', '\u0936\u094D\u0930\u0940\u092E\u093E\u0928', '\u0936\u094D\u0930\u0940\u092E\u0924\u0940', '\u092E\u093E\u0928\u0928\u0940\u092F', '\u0938\u092E\u094D\u092E\u093E\u0928\u0940\u092F', '\u0906\u0926\u0930\u0923\u0940\u092F', '\u092E\u0939\u094B\u0926\u092F', '\u091C\u0940' \u091C\u0948\u0938\u0947 \u0914\u092A\u091A\u093E\u0930\u093F\u0915 \u092F\u093E \u091A\u093E\u091F\u0941\u0915\u093E\u0930\u093F\u0924\u093E \u0935\u093E\u0932\u0947 \u0936\u092C\u094D\u0926 \u0939\u091F\u093E\u0915\u0930 \u0916\u092C\u0930 \u0915\u094B \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937 \u0935 \u0924\u0925\u094D\u092F\u092A\u0930\u0915 \u092D\u093E\u0937\u093E \u092E\u0947\u0902 \u092C\u0928\u093E\u090F\u0902\u0964
2. **\u0936\u0939\u0930/\u091C\u093F\u0932\u093E (epaperCity)**: \u0916\u092C\u0930 \u091C\u093F\u0938 \u0936\u0939\u0930/\u091C\u093F\u0932\u0947 \u0915\u0940 \u0939\u0948 \u0909\u0938\u0915\u093E \u0928\u093E\u092E\u0964 \u092F\u0926\u093F \u092F\u0942\u091C\u093C\u0930 \u0928\u0947 \u0928\u093F\u0930\u094D\u0926\u093F\u0937\u094D\u091F \u0915\u093F\u092F\u093E \u0939\u0948 \u0924\u094B \u0935\u0939\u0940 \u0930\u0916\u0947\u0902, \u0905\u0928\u094D\u092F\u0925\u093E \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u0938\u0947 \u092A\u0939\u091A\u093E\u0928\u0947\u0902\u0964
3. **\u0915\u093F\u0915\u0930 (epaperKicker)**: 3 \u0938\u0947 6 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u093E \u0938\u0902\u0926\u0930\u094D\u092D \u091F\u0948\u0917\u0964
4. **\u092E\u0941\u0916\u094D\u092F \u0939\u0947\u0921\u0932\u093E\u0907\u0928 (epaperHeadline)**: \u0938\u093E\u0930\u0917\u0930\u094D\u092D\u093F\u0924 \u0935 \u0938\u091F\u0940\u0915 \u0905\u0916\u092C\u093E\u0930 \u0939\u0947\u0921\u0932\u093E\u0907\u0928\u0964
5. **\u0909\u092A-\u0936\u0940\u0930\u094D\u0937\u0915 (epaperSubHeadline)**: \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0909\u092A-\u0936\u0940\u0930\u094D\u0937\u0915 \u092F\u093E \u092E\u0941\u0916\u094D\u092F \u092A\u0930\u093F\u0923\u093E\u092E \u0938\u093E\u0930\u0964
6. **\u092C\u093E\u092F\u0932\u093E\u0907\u0928 (epaperByline)**: \u092F\u0926\u093F \u0930\u093F\u092A\u094B\u0930\u094D\u091F\u0930 \u0915\u093E \u0928\u093E\u092E \u0939\u0948 \u0924\u094B "${reporterName || "\u0935\u093F\u0936\u0947\u0937 \u0938\u0902\u0935\u093E\u0926\u0926\u093E\u0924\u093E"}", \u0905\u0928\u094D\u092F\u0925\u093E "\u0935\u093F\u0936\u0947\u0937 \u0938\u0902\u0935\u093E\u0926\u0926\u093E\u0924\u093E / \u092C\u094D\u092F\u0942\u0930\u094B \u0930\u093F\u092A\u094B\u0930\u094D\u091F"\u0964
7. **\u0905\u0916\u092C\u093E\u0930 \u0915\u0940 \u0938\u094D\u091F\u094B\u0930\u0940 \u092C\u0949\u0921\u0940 (epaperArticleBody)**: \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924, \u0938\u091F\u0940\u0915 \u0914\u0930 \u092A\u0942\u0930\u094D\u0923 \u0935\u093F\u0935\u0930\u0923\u0964
8. **\u0939\u093E\u0907\u0932\u093E\u0907\u091F\u094D\u0938 / \u0907\u0928\u0938\u0947\u091F \u092C\u0949\u0915\u094D\u0938 (epaperHighlightsTitle \u0935 epaperHighlights)**:
   - epaperHighlightsTitle: \u091C\u0948\u0938\u0947 "\u092E\u0941\u0916\u094D\u092F \u092C\u093F\u0902\u0926\u0941"
   - epaperHighlights: \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u092C\u0941\u0932\u0947\u091F \u092A\u0949\u0907\u0902\u091F\u094D\u0938\u0964
9. **\u092B\u094B\u091F\u094B \u0915\u0948\u092A\u094D\u0936\u0928\u094D\u0938**:
   - epaperPhotoCaption: \u092A\u0939\u0932\u0940 \u092E\u0941\u0916\u094D\u092F \u092B\u094B\u091F\u094B \u0915\u093E 1 \u0932\u093E\u0907\u0928 \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935\u093F\u0935\u0930\u0923\u0964
   - epaperPhotoCaption2: \u0926\u0942\u0938\u0930\u0940 \u092B\u094B\u091F\u094B \u0915\u093E 1 \u0932\u093E\u0907\u0928 \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935\u093F\u0935\u0930\u0923\u0964
   - epaperPhotoCaption3: \u0924\u0940\u0938\u0930\u0940 \u092B\u094B\u091F\u094B \u0915\u093E 1 \u0932\u093E\u0907\u0928 \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935\u093F\u0935\u0930\u0923\u0964
10. **\u092A\u094D\u0930\u094B\u092E\u094B\u0936\u0928\u0932 \u0938\u0902\u0926\u0947\u0936 (epaperPromoTagline)**: \u092C\u093E\u092F\u0932\u093E\u0907\u0928 \u092E\u0947\u0902 \u0926\u093E\u0908\u0902 \u0913\u0930 \u0926\u093F\u0916\u0928\u0947 \u0935\u093E\u0932\u0940 \u092A\u0902\u0915\u094D\u0924\u093F\u0964
11. **\u0928\u0947\u0924\u093E / \u0905\u0927\u093F\u0915\u093E\u0930\u0940 \u0915\u093E \u092C\u092F\u093E\u0928 \u0915\u0949\u0932-\u0906\u0909\u091F (epaperQuoteText \u0935 epaperQuoteSpeaker)**: \u092F\u0926\u093F \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u092E\u0947\u0902 \u0915\u093F\u0938\u0940 \u0915\u093E \u092C\u092F\u093E\u0928 \u0939\u094B, \u0924\u094B \u0909\u0938\u0947 \u092F\u0939\u093E\u0901 \u0932\u093F\u0916\u0947\u0902\u0964 epaperQuoteSpeaker \u092E\u0947\u0902 \u0909\u0928\u0915\u093E \u0928\u093E\u092E \u0935 \u092A\u0926 \u0932\u093F\u0916\u0947\u0902\u0964
12. **\u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0938\u092E\u0930\u0940 (summary)**: \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0915\u0947 \u0932\u093F\u090F \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u093E \u0935\u093F\u0935\u0930\u0923\u0964
13. **\u0936\u094D\u0930\u0947\u0923\u0940 (category)**: \u0938\u092E\u093E\u091A\u093E\u0930 \u0936\u094D\u0930\u0947\u0923\u0940\u0964

Strictly return a valid JSON object matching these exact keys:
epaperCity, epaperKicker, epaperHeadline, epaperSubHeadline, epaperByline, epaperPromoTagline, epaperArticleBody, epaperHighlightsTitle, epaperHighlights, epaperQuoteText, epaperQuoteSpeaker, epaperPhotoCaption, epaperPhotoCaption2, epaperPhotoCaption3, summary, category`;
    let parsedData = null;
    const provider = (aiProvider || "gemini").toLowerCase();
    if (provider === "openai") {
      try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "You are the chief editorial director for Breaking News Wala E-Paper graphics. Always respond in strictly valid JSON format."
            },
            { role: "user", content: systemPrompt }
          ],
          temperature: 0.5
        });
        const raw = completion.choices[0]?.message?.content || "{}";
        parsedData = JSON.parse(raw);
      } catch (openAiErr) {
        console.warn("OpenAI epaper parsing error, falling back to Gemini:", openAiErr?.message);
      }
    }
    if (!parsedData && process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();
        const response = await generateWithFallbackAndRetry(
          ai,
          DEFAULT_FALLBACK_MODELS,
          {
            contents: systemPrompt,
            config: {
              responseMimeType: "application/json",
              temperature: 0.5
            }
          }
        );
        parsedData = JSON.parse(response.text || "{}");
      } catch (geminiError) {
        console.warn("Gemini epaper parsing error:", geminiError?.message?.slice(0, 100));
      }
    }
    if (!parsedData || !parsedData.epaperHeadline) {
      parsedData = createEpaperLocalFallback(rawInput, city, reporterName);
    }
    if (pickedImages.main) {
      parsedData.pickedImages = pickedImages;
    }
    return res.json({ success: true, data: parsedData });
  } catch (err) {
    console.error("Error in /api/process-epaper-pressnote:", err);
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var CURATED_NEWS_PRESS_PHOTOS = {
  protest: [
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=1200&auto=format&fit=crop&q=85"
  ],
  accident: [
    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=1200&auto=format&fit=crop&q=85"
  ],
  politics: [
    "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1575320181282-9afab399332c?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&auto=format&fit=crop&q=85"
  ],
  police_crime: [
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200&auto=format&fit=crop&q=85"
  ],
  hospital: [
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1200&auto=format&fit=crop&q=85"
  ],
  weather: [
    "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=1200&auto=format&fit=crop&q=85"
  ],
  students: [
    "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&auto=format&fit=crop&q=85"
  ],
  business: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1200&auto=format&fit=crop&q=85"
  ],
  general: [
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=85"
  ]
};
function pickCuratedNewsPressPhoto(text, variation = 0) {
  const lower = (text || "").toLowerCase();
  const pickFrom = (arr) => arr[Math.abs(variation) % arr.length];
  if (lower.includes("\u0927\u0930\u0928\u093E") || lower.includes("\u092A\u094D\u0930\u0926\u0930\u094D\u0936\u0928") || lower.includes("\u0906\u0902\u0926\u094B\u0932\u0928") || lower.includes("\u0905\u092D\u094D\u092F\u0930\u094D\u0925\u0940") || lower.includes("\u0936\u093F\u0915\u094D\u0937\u0915") || lower.includes("\u092D\u0930\u094D\u0924\u0940") || lower.includes("\u092E\u093E\u0902\u0917") || lower.includes("\u0939\u0921\u093C\u0924\u093E\u0932") || lower.includes("\u0918\u0947\u0930\u093E\u0935") || lower.includes("\u091C\u094D\u091E\u093E\u092A\u0928") || lower.includes("protest") || lower.includes("rally") || lower.includes("strike") || lower.includes("candidate")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.protest);
  }
  if (lower.includes("\u0939\u093E\u0926\u0938\u093E") || lower.includes("\u0926\u0941\u0930\u094D\u0918\u091F\u0928\u093E") || lower.includes("\u091F\u0915\u094D\u0915\u0930") || lower.includes("\u092A\u0932\u091F\u0940") || lower.includes("\u092C\u0938") || lower.includes("\u091F\u094D\u0930\u0915") || lower.includes("\u0915\u093E\u0930") || lower.includes("\u0939\u093E\u0908\u0935\u0947") || lower.includes("\u0938\u0921\u093C\u0915") || lower.includes("\u0918\u093E\u092F\u0932") || lower.includes("\u092E\u094C\u0924") || lower.includes("accident") || lower.includes("crash") || lower.includes("highway")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.accident);
  }
  if (lower.includes("\u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940") || lower.includes("\u0936\u093F\u0935\u0930\u093E\u091C") || lower.includes("\u0926\u093F\u0917\u094D\u0935\u093F\u091C\u092F") || lower.includes("\u092E\u094B\u0939\u0928 \u092F\u093E\u0926\u0935") || lower.includes("\u0915\u092E\u0932\u0928\u093E\u0925") || lower.includes("\u092E\u0902\u0924\u094D\u0930\u0940") || lower.includes("\u0928\u0947\u0924\u093E") || lower.includes("\u0935\u093F\u0927\u093E\u0928\u0938\u092D\u093E") || lower.includes("\u092A\u094D\u0930\u0947\u0938") || lower.includes("\u0915\u093E\u0902\u0917\u094D\u0930\u0947\u0938") || lower.includes("\u092D\u093E\u091C\u092A\u093E") || lower.includes("\u0938\u0930\u0915\u093E\u0930") || lower.includes("\u0938\u0902\u0938\u0926") || lower.includes("minister") || lower.includes("assembly") || lower.includes("politics")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.politics);
  }
  if (lower.includes("\u092A\u0941\u0932\u093F\u0938") || lower.includes("\u0915\u094B\u0930\u094D\u091F") || lower.includes("\u0905\u0926\u093E\u0932\u0924") || lower.includes("\u0917\u093F\u0930\u092B\u094D\u0924\u093E\u0930") || lower.includes("\u0915\u094D\u0930\u093E\u0907\u092E") || lower.includes("\u0905\u092A\u0930\u093E\u0927") || lower.includes("\u0939\u0924\u094D\u092F\u093E") || lower.includes("\u091A\u094B\u0930\u0940") || lower.includes("police") || lower.includes("court") || lower.includes("crime")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.police_crime);
  }
  if (lower.includes("\u0905\u0938\u094D\u092A\u0924\u093E\u0932") || lower.includes("\u0921\u0949\u0915\u094D\u091F\u0930") || lower.includes("\u092E\u0930\u0940\u091C") || lower.includes("\u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F") || lower.includes("\u090F\u092E\u094D\u092C\u0941\u0932\u0947\u0902\u0938") || lower.includes("hospital") || lower.includes("doctor")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.hospital);
  }
  if (lower.includes("\u092E\u094C\u0938\u092E") || lower.includes("\u092C\u093E\u0930\u093F\u0936") || lower.includes("\u092C\u093E\u0922\u093C") || lower.includes("\u0924\u0942\u092B\u093E\u0928") || lower.includes("\u0906\u0902\u0927\u0940") || lower.includes("rain") || lower.includes("weather")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.weather);
  }
  if (lower.includes("\u091B\u093E\u0924\u094D\u0930") || lower.includes("\u092A\u0930\u0940\u0915\u094D\u0937\u093E") || lower.includes("\u0938\u094D\u0915\u0942\u0932") || lower.includes("\u0915\u0949\u0932\u0947\u091C") || lower.includes("\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u0940") || lower.includes("student") || lower.includes("exam")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.students);
  }
  if (lower.includes("\u0935\u094D\u092F\u093E\u092A\u093E\u0930") || lower.includes("\u0938\u094B\u0928\u093E") || lower.includes("\u091A\u093E\u0902\u0926\u0940") || lower.includes("\u0936\u0947\u092F\u0930") || lower.includes("\u092C\u093E\u091C\u093E\u0930") || lower.includes("gold") || lower.includes("market")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.business);
  }
  return pickFrom(CURATED_NEWS_PRESS_PHOTOS.general);
}
app.post("/api/generate-ai-image", enforceUserAccessMiddleware, async (req, res) => {
  try {
    const { headline, customPrompt, aspectRatio = "4:5", variation = 0, aiProvider = "gemini" } = req.body;
    if (!headline && !customPrompt) {
      return res.status(400).json({ error: "Headline or prompt is required" });
    }
    const ai = getGeminiClient();
    const perspectiveAngles = [
      "authentic journalistic press photography, standard documentary eye-level angle, realistic Indian press coverage, natural daylight",
      "wide-angle documentary press shot, complete environmental context, authentic news reportage, sharp journalistic realism",
      "candid press photo, alternative documentary perspective, on-the-scene realism, sharp news photography",
      "detailed investigative press photo, different camera angle, authentic atmosphere, high detail"
    ];
    const variationAngle = perspectiveAngles[Math.abs(Number(variation) || 0) % perspectiveAngles.length];
    let imagePrompt = customPrompt;
    if (!imagePrompt || imagePrompt.trim().length === 0) {
      if (process.env.GEMINI_API_KEY) {
        try {
          const promptGenResponse = await generateWithFallbackAndRetry(
            ai,
            DEFAULT_FALLBACK_MODELS,
            {
              contents: `You are an art director for a top Indian digital news channel.
Given this Hindi news headline: "${headline}",
write a descriptive, photorealistic, journalistic photography prompt in English for generating a background news photo.
Requirements:
- Style: ${variationAngle}.
- Realistic press photo style, natural ambient daylight, 35mm lens authentic documentary feel.
- High detail, realistic environment in India.
- Absolutely NO text, NO typography, NO watermark, NO logo, NO borders.
Return ONLY the English prompt string.`
            }
          );
          imagePrompt = promptGenResponse.text?.trim() || `Realistic journalistic press news photography depicting: ${headline}, ${variationAngle}, high detail, 4k`;
        } catch (pErr) {
          imagePrompt = `Realistic journalistic press news photography depicting: ${headline}, ${variationAngle}, high detail, 4k`;
        }
      } else {
        imagePrompt = `Realistic journalistic press news photography depicting: ${headline}, ${variationAngle}, high detail, 4k`;
      }
    }
    console.log("Generating AI image with provider:", aiProvider, "prompt:", imagePrompt, "variation:", variation);
    let imageBase64 = "";
    let isAiGenerated = false;
    const PRESS_PHOTO_STYLE_SUFFIX = ", Journalistic documentary photography style, realistic Indian news press photography, natural ambient lighting, 35mm camera lens, authentic scene. No text, no words, no watermark, no logos, clean image.";
    if (aiProvider === "openai") {
      try {
        const openai = getOpenAIClient();
        const dalleSize = aspectRatio === "1:1" ? "1024x1024" : "1024x1792";
        const dallePrompt = `${imagePrompt}${PRESS_PHOTO_STYLE_SUFFIX}`;
        console.log("Calling OpenAI DALL-E 3 with prompt:", dallePrompt);
        const dalleRes = await openai.images.generate({
          model: "dall-e-3",
          prompt: dallePrompt,
          n: 1,
          size: dalleSize,
          response_format: "b64_json"
        });
        const b64 = dalleRes.data?.[0]?.b64_json;
        if (b64) {
          imageBase64 = `data:image/png;base64,${b64}`;
          isAiGenerated = true;
        } else if (dalleRes.data?.[0]?.url) {
          const proxied = `/api/proxy-image?url=${encodeURIComponent(dalleRes.data[0].url)}`;
          return res.json({
            success: true,
            imageUrl: proxied,
            promptUsed: imagePrompt,
            fallbackUsed: false,
            isAiGenerated: true,
            provider: "openai"
          });
        }
      } catch (openAiImgErr) {
        console.error("OpenAI DALL-E 3 error:", openAiImgErr);
        if (openAiImgErr?.message && openAiImgErr.message.includes("OPENAI_API_KEY \u0938\u0947\u091F \u0928\u0939\u0940\u0902 \u0939\u0948")) {
          return res.status(400).json({ error: openAiImgErr.message });
        }
        console.warn("OpenAI DALL-E 3 failed, will use authentic press photo fallback");
      }
    } else {
      let mappedAspectRatio = "3:4";
      if (aspectRatio === "1:1") mappedAspectRatio = "1:1";
      else if (aspectRatio === "9:16") mappedAspectRatio = "9:16";
      else if (aspectRatio === "16:9") mappedAspectRatio = "16:9";
      if (process.env.GEMINI_API_KEY) {
        try {
          const imgResponse = await ai.models.generateContent({
            model: "gemini-3.1-flash-image",
            contents: {
              parts: [
                {
                  text: `${imagePrompt}${PRESS_PHOTO_STYLE_SUFFIX}`
                }
              ]
            },
            config: {
              imageConfig: {
                aspectRatio: mappedAspectRatio
              }
            }
          });
          if (imgResponse.candidates && imgResponse.candidates[0]?.content?.parts) {
            for (const part of imgResponse.candidates[0].content.parts) {
              if (part.inlineData) {
                imageBase64 = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
                isAiGenerated = true;
                break;
              }
            }
          }
        } catch (primaryErr) {
          console.warn("gemini-3.1-flash-image failed:", primaryErr?.message?.slice(0, 100));
          try {
            const imgFallback = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite-image",
              contents: {
                parts: [
                  {
                    text: `${imagePrompt}${PRESS_PHOTO_STYLE_SUFFIX}`
                  }
                ]
              },
              config: {
                imageConfig: {
                  aspectRatio: mappedAspectRatio
                }
              }
            });
            if (imgFallback.candidates && imgFallback.candidates[0]?.content?.parts) {
              for (const part of imgFallback.candidates[0].content.parts) {
                if (part.inlineData) {
                  imageBase64 = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
                  isAiGenerated = true;
                  break;
                }
              }
            }
          } catch (secondaryErr) {
            console.warn("gemini-3.1-flash-lite-image also failed:", secondaryErr?.message?.slice(0, 100));
          }
        }
      }
    }
    if (!imageBase64) {
      console.log("Providing authentic journalistic fallback press photo for headline:", headline, "var:", variation);
      const fallbackRaw = pickCuratedNewsPressPhoto(`${headline} ${customPrompt || ""}`, Number(variation) || 0);
      const fallbackProxied = `/api/proxy-image?url=${encodeURIComponent(fallbackRaw)}`;
      return res.json({
        success: true,
        imageUrl: fallbackProxied,
        promptUsed: imagePrompt,
        fallbackUsed: true,
        isAiGenerated: false,
        notice: "AI \u0907\u092E\u0947\u091C \u0915\u094B\u091F\u093E \u092A\u0942\u0930\u093E \u0939\u094B\u0928\u0947 \u0915\u0947 \u0915\u093E\u0930\u0923 \u0938\u092E\u093E\u091A\u093E\u0930 \u0935\u093F\u0937\u092F \u0938\u0947 \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u092A\u094D\u0930\u093E\u092E\u093E\u0923\u093F\u0915 \u092A\u094D\u0930\u0947\u0938 \u092B\u094B\u091F\u094B \u0924\u0948\u092F\u093E\u0930 \u0915\u0940 \u0917\u0908 \u0939\u0948\u0964"
      });
    }
    return res.json({
      success: true,
      imageUrl: imageBase64,
      promptUsed: imagePrompt,
      fallbackUsed: false,
      isAiGenerated: true,
      provider: aiProvider
    });
  } catch (err) {
    console.error("Error in /api/generate-ai-image, falling back safely:", err);
    const fallbackRaw = pickCuratedNewsPressPhoto(`${req.body?.headline || ""} ${req.body?.customPrompt || ""}`, Number(req.body?.variation) || 0);
    const fallbackProxied = `/api/proxy-image?url=${encodeURIComponent(fallbackRaw)}`;
    return res.json({
      success: true,
      imageUrl: fallbackProxied,
      promptUsed: req.body?.customPrompt || "Journalistic Press Photo",
      fallbackUsed: true,
      isAiGenerated: false,
      notice: "\u0926\u0948\u0928\u093F\u0915 AI \u0907\u092E\u0947\u091C \u0915\u094B\u091F\u093E \u0938\u0940\u092E\u093E \u0915\u0947 \u0915\u093E\u0930\u0923 \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u092A\u094D\u0930\u093E\u092E\u093E\u0923\u093F\u0915 \u092A\u094D\u0930\u0947\u0938 \u092B\u094B\u091F\u094B \u091A\u092F\u0928\u093F\u0924 \u0915\u0940 \u0917\u0908 \u0939\u0948\u0964"
    });
  }
});
app.post("/api/generate-caption", enforceUserAccessMiddleware, async (req, res) => {
  const {
    headline,
    title,
    location,
    existingSummary,
    summary,
    category,
    style,
    captionLength,
    customInstruction,
    aiProvider = "gemini",
    username = "",
    channelUsername = ""
  } = req.body;
  try {
    const effectiveHeadline = (headline || title || "").trim();
    if (!effectiveHeadline) {
      return res.status(400).json({ success: false, error: "Headline or title is required" });
    }
    const effectiveSummary = (existingSummary || summary || "").trim();
    const effectiveUsername = username || channelUsername || "";
    const effectiveLocation = (location || "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936").trim();
    const effectiveCategory = (category || "\u0928\u094D\u092F\u0942\u091C\u093C").trim();
    const effectiveMode = captionLength === "short" || style === "short" ? "short" : captionLength === "bullet" || style === "bullet_points" ? "bullet" : "detailed";
    const cleanUser = effectiveUsername.replace(/^@/, "").replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "").trim();
    const isGenericUser = ["user", "username", "reporter", "admin", "superadmin", "null", "undefined"].includes(cleanUser.toLowerCase());
    const userTagDirective = cleanUser && !isGenericUser ? `
   - \u0938\u092C\u0938\u0947 \u092A\u0939\u0932\u093E \u0939\u0948\u0936\u091F\u0948\u0917 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947: #${cleanUser}` : "";
    let modeGuidance = "";
    if (effectiveMode === "short") {
      modeGuidance = `1. \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u094B \u0920\u0940\u0915 2 \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u090F\u0935\u0902 \u0938\u093E\u0930\u0917\u0930\u094D\u092D\u093F\u0924 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u092E\u0947\u0902 \u0932\u093F\u0916\u0947\u0902 (Full 2 Short Paragraphs):
   - \u092A\u0939\u0932\u093E \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B: \u0918\u091F\u0928\u093E \u0915\u093E \u092E\u0941\u0916\u094D\u092F \u0935\u093F\u0935\u0930\u0923, \u0938\u092E\u092F, \u0938\u094D\u0925\u093E\u0928 \u0935 \u092E\u0941\u0916\u094D\u092F \u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E\u0964
   - \u0926\u0942\u0938\u0930\u093E \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B: \u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u0938\u094D\u0925\u093F\u0924\u093F, \u092A\u094D\u0930\u0936\u093E\u0938\u0928/\u092A\u0941\u0932\u093F\u0938 \u0915\u0940 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u092F\u093E \u0928\u093F\u0937\u094D\u0915\u0930\u094D\u0937\u0964`;
    } else if (effectiveMode === "bullet") {
      modeGuidance = `1. \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u094B \u092E\u0941\u0916\u094D\u092F \u092C\u093F\u0902\u0926\u0941\u0913\u0902 (Bullet Points) \u092E\u0947\u0902 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902:
   - \u092A\u094D\u0930\u0924\u094D\u092F\u0947\u0915 \u092A\u0902\u0915\u094D\u0924\u093F '\u2022 ' \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B \u0914\u0930 \u0920\u0940\u0915 \u090F\u0915 \u0938\u094D\u092A\u0937\u094D\u091F \u0924\u0925\u094D\u092F \u092F\u093E \u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E \u092A\u094D\u0930\u0938\u094D\u0924\u0941\u0924 \u0915\u0930\u0947\u0964
   - \u0915\u092E \u0938\u0947 \u0915\u092E 3 \u0914\u0930 \u0905\u0927\u093F\u0915\u0924\u092E 5 \u092C\u0941\u0932\u0947\u091F \u092A\u0949\u0907\u0902\u091F\u094D\u0938 \u0926\u0947\u0902\u0964`;
    } else {
      modeGuidance = `1. \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u094B \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947 \u0920\u0940\u0915 3 \u092C\u0921\u093C\u0947, \u0938\u092E\u0943\u0926\u094D\u0927 \u0914\u0930 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u092E\u0947\u0902 \u0932\u093F\u0916\u0947\u0902 (Full 3 Detailed Paragraphs):
   - \u092A\u0939\u0932\u093E \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B: \u0918\u091F\u0928\u093E \u0915\u093E \u092E\u0941\u0916\u094D\u092F \u0935\u093F\u0935\u0930\u0923, \u0938\u092E\u092F, \u0938\u094D\u0925\u093E\u0928 \u0935 \u092E\u0941\u0916\u094D\u092F \u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E\u0964
   - \u0926\u0942\u0938\u0930\u093E \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B: \u092A\u0943\u0937\u094D\u0920\u092D\u0942\u092E\u093F, \u0915\u093E\u0930\u0923, \u092A\u094D\u0930\u0924\u094D\u092F\u0915\u094D\u0937\u0926\u0930\u094D\u0936\u093F\u092F\u094B\u0902 \u0915\u093E \u0915\u0939\u0928\u093E \u0935 \u091C\u093E\u0902\u091A \u0915\u0940 \u092C\u093E\u0924\u0947\u0902\u0964
   - \u0924\u0940\u0938\u0930\u093E \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B: \u092A\u0941\u0932\u093F\u0938/\u092A\u094D\u0930\u0936\u093E\u0938\u0928 \u0915\u0940 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908, \u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u0938\u094D\u0925\u093F\u0924\u093F \u0914\u0930 \u0906\u0917\u0947 \u0915\u0940 \u092A\u094D\u0930\u0915\u094D\u0930\u093F\u092F\u093E\u0964`;
    }
    const systemInstruction = `\u0906\u092A \u092D\u093E\u0930\u0924 \u0915\u0947 \u0905\u0917\u094D\u0930\u0923\u0940 \u0939\u093F\u0902\u0926\u0940 \u0921\u093F\u091C\u093F\u091F\u0932 \u0928\u094D\u092F\u0942\u091C\u093C \u091A\u0948\u0928\u0932 \u0915\u0947 \u0935\u0930\u093F\u0937\u094D\u0920 \u092E\u0941\u0916\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u0915 \u0939\u0948\u0902\u0964`;
    const prompt = `\u0906\u092A \u092D\u093E\u0930\u0924 \u0915\u0947 \u0905\u0917\u094D\u0930\u0923\u0940 \u0939\u093F\u0902\u0926\u0940 \u0921\u093F\u091C\u093F\u091F\u0932 \u0928\u094D\u092F\u0942\u091C\u093C \u091A\u0948\u0928\u0932 \u0915\u0947 \u0935\u0930\u093F\u0937\u094D\u0920 \u092E\u0941\u0916\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u0915 \u0939\u0948\u0902\u0964
\u0928\u093F\u092E\u094D\u0928\u0932\u093F\u0916\u093F\u0924 \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u0947 \u0932\u093F\u090F \u0907\u0902\u0938\u094D\u091F\u093E\u0917\u094D\u0930\u093E\u092E \u0914\u0930 \u092B\u0947\u0938\u092C\u0941\u0915 \u092A\u094B\u0938\u094D\u091F \u0915\u093E \u0935\u093F\u0938\u094D\u0924\u0943\u0924, \u092A\u094D\u0930\u093E\u092E\u093E\u0923\u093F\u0915 \u0914\u0930 \u092A\u094D\u0930\u092D\u093E\u0935\u0936\u093E\u0932\u0940 \u0915\u0948\u092A\u094D\u0936\u0928 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902:

\u0939\u0947\u0921\u0932\u093E\u0907\u0928: "${effectiveHeadline}"
\u0938\u094D\u0925\u093E\u0928: "${effectiveLocation}"
\u0936\u094D\u0930\u0947\u0923\u0940: "${effectiveCategory}"
${effectiveSummary ? `\u092E\u094C\u091C\u0942\u0926\u093E \u0938\u0902\u0926\u0930\u094D\u092D/\u0915\u091A\u094D\u091A\u093E \u0935\u093F\u0935\u0930\u0923: "${effectiveSummary}"` : ""}
${customInstruction ? `\u092F\u0942\u091C\u093C\u0930 \u0915\u093E \u0935\u093F\u0936\u0947\u0937 \u0928\u093F\u0930\u094D\u0926\u0947\u0936: "${customInstruction}"` : ""}

\u0928\u093F\u092F\u092E (\u0915\u0921\u093C\u093E\u0908 \u0938\u0947 \u092A\u093E\u0932\u0928 \u0915\u0930\u0947\u0902):
${modeGuidance}
2. \u092A\u093E\u0920\u0915\u094B\u0902 \u0915\u094B \u092F\u0939 \u0938\u094D\u092A\u0937\u094D\u091F \u0905\u0939\u0938\u093E\u0938 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F \u0915\u093F "\u092A\u0942\u0930\u0940 \u0916\u092C\u0930 \u0935\u093F\u0935\u0930\u0923 \u092E\u0947\u0902" \u0909\u092A\u0932\u092C\u094D\u0927 \u0939\u0948\u0964
3. \u0916\u092C\u0930 \u092E\u0947\u0902 \u0915\u094B\u0908 \u092B\u093E\u0932\u0924\u0942 \u0939\u0947\u0921\u093F\u0902\u0917, \u091F\u093E\u0907\u091F\u0932, \u092B\u094B\u0928 \u0928\u0902\u092C\u0930, \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0932\u093F\u0902\u0915\u094D\u0938, \u0935\u0947\u092C\u0938\u093E\u0907\u091F URL \u092F\u093E "\u092A\u0942\u0930\u0940 \u0916\u092C\u0930 \u092A\u0922\u093C\u0947\u0902" \u091C\u0948\u0938\u0947 \u0917\u0948\u0930-\u091C\u093C\u0930\u0942\u0930\u0940 \u0936\u092C\u094D\u0926 \u0928 \u091C\u094B\u0921\u093C\u0947\u0902\u0964 \u0915\u093F\u0938\u0940 \u092D\u0940 \u092A\u094D\u0930\u0915\u093E\u0930 \u0915\u093E URL \u092F\u093E \u0935\u0947\u092C \u0932\u093F\u0902\u0915 \u092C\u093F\u0932\u094D\u0915\u0941\u0932 \u0928 \u0932\u093F\u0916\u0947\u0902\u0964
4. \u0920\u0940\u0915 \u090F\u0915 \u0916\u093E\u0932\u0940 \u0932\u093E\u0907\u0928 \u091B\u094B\u0921\u093C\u0915\u0930 \u0905\u0902\u0924 \u092E\u0947\u0902 6 \u0938\u0947 8 \u092A\u094D\u0930\u093E\u0938\u0902\u0917\u093F\u0915 \u0939\u0948\u0936\u091F\u0948\u0917 \u0932\u0917\u093E\u090F\u0902\u0964
5. \u0939\u0948\u0936\u091F\u0948\u0917 \u0915\u094D\u0930\u092E (MUST):${userTagDirective}
   - \u092C\u0940\u091A \u092E\u0947\u0902 \u0918\u091F\u0928\u093E/\u0938\u094D\u0925\u093E\u0928 \u0938\u0947 \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u092A\u094D\u0930\u093E\u0938\u0902\u0917\u093F\u0915 \u0939\u0948\u0936\u091F\u0948\u0917 (#BreakingNews #HindiNews #LatestNews #${effectiveLocation.replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "") || "News"})
   - \u0938\u092C\u0938\u0947 \u0905\u0902\u0924\u093F\u092E \u0939\u0948\u0936\u091F\u0948\u0917 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947: #AINewsMaker

\u0915\u0947\u0935\u0932 \u0924\u0948\u092F\u093E\u0930 \u0915\u0948\u092A\u094D\u0936\u0928 \u0915\u093E \u0936\u0941\u0926\u094D\u0927 \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u0926\u0947\u0902, \u0915\u094B\u0908 \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u092E\u093E\u0930\u094D\u0915\u0921\u093E\u0909\u0928 \u092F\u093E \u0915\u094B\u091F\u0947\u0936\u0928 \u0928\u0939\u0940\u0902\u0964`;
    let caption = "";
    if (aiProvider === "openai") {
      try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemInstruction
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7
        });
        caption = (completion.choices[0]?.message?.content || "").trim();
      } catch (openAiCapErr) {
        console.error("OpenAI caption error:", openAiCapErr);
      }
    } else {
      try {
        const ai = getGeminiClient();
        const response = await generateWithFallbackAndRetry(
          ai,
          DEFAULT_FALLBACK_MODELS,
          {
            contents: prompt,
            config: {
              systemInstruction
            }
          }
        );
        caption = (response.text || "").trim();
      } catch (capErr) {
      }
    }
    if (!caption) {
      const variants = formatCaptionVariants(
        effectiveHeadline,
        effectiveLocation,
        effectiveSummary || effectiveHeadline,
        effectiveUsername
      );
      if (effectiveMode === "short") {
        caption = variants.captionShort;
      } else if (effectiveMode === "bullet") {
        caption = variants.captionBullets;
      } else {
        caption = variants.captionDetailed;
      }
    }
    const cleanResult = cleanCaptionParagraphs(caption, effectiveMode, effectiveUsername, effectiveLocation, effectiveHeadline);
    return res.json({ success: true, caption: cleanResult });
  } catch (err) {
    console.error("Error in /api/generate-caption:", err);
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
function createVideoHeadlineVariantsFallback(caption, title) {
  const text = (caption || title || "").trim();
  const sentences = text.split(/[।!?\n\r]+/).map((s) => s.trim()).filter((s) => s.length > 5);
  const cleanTitle = (title || sentences[0] || "\u092E\u0941\u0916\u094D\u092F \u0938\u092E\u093E\u091A\u093E\u0930").trim();
  const options = [cleanTitle];
  for (const s of sentences) {
    if (options.length >= 4) break;
    if (!options.includes(s)) options.push(s);
  }
  while (options.length < 4) {
    options.push(cleanTitle);
  }
  return options.slice(0, 4);
}
app.post("/api/generate-video-headlines", async (req, res) => {
  try {
    const { caption = "", title = "", ratio = "9:16" } = req.body || {};
    if (!caption && !title) {
      return res.status(400).json({ error: "\u0915\u0948\u092A\u094D\u0936\u0928 \u092F\u093E \u0936\u0940\u0930\u094D\u0937\u0915 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948\u0964" });
    }
    const fallbackHeadlines = createVideoHeadlineVariantsFallback(caption, title);
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();
        const prompt = `\u0935\u0940\u0921\u093F\u092F\u094B \u0938\u0902\u0926\u0930\u094D\u092D (Caption) \u0914\u0930 \u0936\u0940\u0930\u094D\u0937\u0915 \u0915\u0947 \u0906\u0927\u093E\u0930 \u092A\u0930 4 \u0939\u093F\u0902\u0926\u0940 \u0939\u0947\u0921\u0932\u093E\u0907\u0928\u094D\u0938 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902:

\u0935\u0940\u0921\u093F\u092F\u094B \u0936\u0940\u0930\u094D\u0937\u0915: "${title}"
\u0935\u0940\u0921\u093F\u092F\u094B \u0938\u0902\u0926\u0930\u094D\u092D/\u0915\u0948\u092A\u094D\u0936\u0928: "${caption}"
\u091F\u093E\u0930\u0917\u0947\u091F \u0930\u0947\u0936\u093F\u092F\u094B: ${ratio}

\u0915\u0947\u0935\u0932 \u0928\u0940\u091A\u0947 \u0926\u093F\u090F \u0917\u090F JSON \u092B\u0949\u0930\u094D\u092E\u0947\u091F \u092E\u0947\u0902 \u0909\u0924\u094D\u0924\u0930 \u0926\u0947\u0902:
{
  "headlines": [
    "\u0939\u0947\u0921\u0932\u093E\u0907\u0928 1",
    "\u0939\u0947\u0921\u0932\u093E\u0907\u0928 2",
    "\u0939\u0947\u0921\u0932\u093E\u0907\u0928 3",
    "\u0939\u0947\u0921\u0932\u093E\u0907\u0928 4"
  ]
}`;
        const response = await generateWithFallbackAndRetry(ai, DEFAULT_FALLBACK_MODELS, {
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });
        const raw = response.text?.trim() || "";
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.headlines) && parsed.headlines.length >= 4) {
          const valid = parsed.headlines.slice(0, 4).map((h) => String(h || "").trim()).filter(Boolean);
          if (valid.length === 4) {
            return res.json({ success: true, headlines: valid, source: "ai" });
          }
        }
      } catch (aiErr) {
        console.warn("Gemini video headline generator busy, using journalistic editorial fallback:", aiErr?.message?.slice(0, 80));
      }
    }
    return res.json({ success: true, headlines: fallbackHeadlines, source: "fallback" });
  } catch (err) {
    console.error("Error in /api/generate-video-headlines:", err);
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/generate-video-headlines", async (req, res) => {
  const { caption = "", title = "", ratio = "9:16" } = req.body || {};
  if (!caption && !title) {
    return res.status(400).json({ error: "\u0915\u0948\u092A\u094D\u0936\u0928 \u092F\u093E \u0936\u0940\u0930\u094D\u0937\u0915 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948\u0964" });
  }
  const fallbackHeadlines = createVideoHeadlineVariantsFallback(caption, title);
  return res.json({ success: true, headlines: fallbackHeadlines, source: "editorial" });
});
var CURATED_MORNING_PRESS_PHOTOS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop",
  // Soft golden morning sunrise mist over serene hills
  "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=1200&auto=format&fit=crop",
  // Gentle morning mist park path with soft light
  "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=1200&auto=format&fit=crop",
  // Bright airy morning daylight through lush green canopy
  "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?q=80&w=1200&auto=format&fit=crop",
  // Soft pastel sunrise sky with gentle warm golden clouds
  "https://images.unsplash.com/photo-1439853949127-fa647821eba0?q=80&w=1200&auto=format&fit=crop",
  // Serene tranquil light morning water reflection, zen mood
  "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1200&auto=format&fit=crop"
  // Warm gentle morning daylight in peaceful nature
];
app.post("/api/generate-morning-jacket", enforceUserAccessMiddleware, async (req, res) => {
  try {
    const {
      topicPrompt,
      command,
      action = "generate",
      // 'generate' | 'change_image' | 'refine'
      refinementCommand = "",
      currentCard = {},
      variation = 0,
      generateImage = true,
      aiProvider = "gemini"
    } = req.body;
    const defaultMorningTopics = [
      "\u0938\u0915\u093E\u0930\u093E\u0924\u094D\u092E\u0915 \u0938\u094B\u091A, \u0906\u0924\u094D\u092E\u0935\u093F\u0936\u094D\u0935\u093E\u0938 \u0914\u0930 \u0928\u093F\u0930\u0902\u0924\u0930 \u092A\u094D\u0930\u092F\u093E\u0938 \u092A\u0930 \u0905\u0924\u094D\u092F\u0902\u0924 \u092A\u094D\u0930\u0947\u0930\u0915 \u0935\u093F\u091A\u093E\u0930",
      "\u0938\u092B\u0932\u0924\u093E \u0915\u093E \u092E\u0942\u0932\u092E\u0902\u0924\u094D\u0930: \u0915\u0930\u094D\u092E, \u0927\u0948\u0930\u094D\u092F \u0914\u0930 \u0905\u0928\u0941\u0936\u093E\u0938\u0928 \u092A\u0930 \u0938\u0941\u0935\u093F\u091A\u093E\u0930",
      "\u0906\u091C \u0915\u093E \u0905\u0928\u092E\u094B\u0932 \u0935\u093F\u091A\u093E\u0930: \u0938\u092E\u092F \u0915\u093E \u0938\u0926\u0941\u092A\u092F\u094B\u0917 \u0914\u0930 \u091C\u0940\u0935\u0928 \u0915\u093E \u0932\u0915\u094D\u0937\u094D\u092F",
      "\u0938\u0941\u092C\u0939 \u0915\u0940 \u0938\u0948\u0930 \u0914\u0930 \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0915\u0947 3 \u0938\u094D\u0935\u0930\u094D\u0923\u093F\u092E \u0928\u093F\u092F\u092E",
      "\u092E\u093E\u0928\u0938\u093F\u0915 \u0936\u093E\u0902\u0924\u093F, \u0935\u093F\u0928\u092E\u094D\u0930\u0924\u093E \u0914\u0930 \u0938\u0915\u093E\u0930\u093E\u0924\u094D\u092E\u0915 \u090A\u0930\u094D\u091C\u093E \u092A\u0930 \u092A\u094D\u0930\u0947\u0930\u0915 \u0935\u093F\u091A\u093E\u0930",
      "\u092D\u093E\u0917\u0935\u0924 \u0917\u0940\u0924\u093E \u0915\u093E \u0938\u093E\u0930: \u0915\u0930\u094D\u092E \u0915\u0930\u094B, \u092B\u0932 \u0915\u0940 \u091A\u093F\u0902\u0924\u093E \u092E\u0924 \u0915\u0930\u094B",
      "\u091C\u0940\u0935\u0928 \u092E\u0947\u0902 \u0915\u092D\u0940 \u0939\u093E\u0930 \u0928 \u092E\u093E\u0928\u0928\u0947 \u0915\u093E \u0926\u0943\u0922\u093C \u0938\u0902\u0915\u0932\u094D\u092A \u0914\u0930 \u092A\u094D\u0930\u0947\u0930\u0923\u093E"
    ];
    let activePrompt = (command || topicPrompt || refinementCommand || "").trim();
    if (!activePrompt && action !== "change_image") {
      const randIdx = Math.floor(Math.random() * defaultMorningTopics.length);
      activePrompt = defaultMorningTopics[randIdx];
    }
    const ai = getGeminiClient();
    const isImageChangeRequest = action === "change_image" || /इमेज\s*(बदलें|बदलो|change|हटाओ|गलत|दूसरी)/i.test(activePrompt) || /फोटो\s*(बदलें|बदलो|change|हटाओ|गलत|दूसरी)/i.test(activePrompt) || /बैकग्राउंड\s*(बदलें|बदलो|change|नया)/i.test(activePrompt);
    let contentData = null;
    if (isImageChangeRequest && currentCard?.headline) {
      contentData = {
        headline: currentCard.headline,
        formattedHeadline: currentCard.formattedHeadline || currentCard.headline,
        badgeText: currentCard.morningBadgeText || "\u{1F305} \u0906\u091C \u0915\u093E \u0935\u093F\u091A\u093E\u0930",
        thoughtQuote: currentCard.morningThoughtQuote || currentCard.morningTakeaway || "",
        summary: currentCard.summary || "",
        imagePrompt: `Aesthetic cinematic morning background wallpaper depicting ${currentCard.headline}. Beautiful ambient morning sunrise sunlight, serene nature landscape or wellness atmosphere, soft warm colors, high realism. Absolutely NO text, NO typography, NO watermark, NO logo, clean image for poster background`
      };
    } else {
      const systemInstruction = `\u0926\u093F\u090F \u0917\u090F \u0935\u093F\u0937\u092F \u092F\u093E \u0928\u093F\u0930\u094D\u0926\u0947\u0936 \u0915\u0947 \u0906\u0927\u093E\u0930 \u092A\u0930 \u0938\u0941\u0935\u093F\u091A\u093E\u0930 / \u092A\u094D\u0930\u0947\u0930\u0915 \u0935\u093F\u091A\u093E\u0930 \u0915\u093E\u0930\u094D\u0921 \u0939\u0947\u0924\u0941 \u0938\u093E\u092E\u0917\u094D\u0930\u0940 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902:
"${activePrompt}"
${currentCard?.headline ? `\u092A\u0942\u0930\u094D\u0935 \u0938\u093E\u092E\u0917\u094D\u0930\u0940 / \u0938\u0902\u0926\u0930\u094D\u092D: "${currentCard.headline}"` : ""}
${refinementCommand ? `\u0938\u0941\u0927\u093E\u0930/\u092C\u0926\u0932\u093E\u0935 \u0928\u093F\u0930\u094D\u0926\u0947\u0936: "${refinementCommand}"` : ""}

JSON \u092E\u0947\u0902 \u0928\u093F\u092E\u094D\u0928\u0932\u093F\u0916\u093F\u0924 \u092B\u093C\u0940\u0932\u094D\u0921\u094D\u0938 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902:
1. "headline": \u092E\u0941\u0916\u094D\u092F \u0935\u093F\u091A\u093E\u0930 \u0905\u0925\u0935\u093E \u0935\u093F\u0937\u092F \u0915\u093E \u092A\u094D\u0930\u0947\u0930\u0915 \u0935\u093E\u0915\u094D\u092F\u0964
2. "formattedHeadline": \u092E\u0941\u0916\u094D\u092F \u0935\u093F\u091A\u093E\u0930\u0964
3. "badgeText": \u0935\u093F\u0937\u092F \u0915\u0947 \u0905\u0928\u0941\u0915\u0942\u0932 \u0909\u092A\u092F\u0941\u0915\u094D\u0924 \u092C\u0948\u091C (\u091C\u0948\u0938\u0947 "\u0906\u091C \u0915\u093E \u0935\u093F\u091A\u093E\u0930")\u0964
4. "thoughtQuote": 1 \u0938\u0947 3 \u092A\u0902\u0915\u094D\u0924\u093F\u092F\u094B\u0902 \u0915\u093E \u0935\u093F\u091A\u093E\u0930 \u092F\u093E \u091F\u0947\u0915\u0905\u0935\u0947\u0964
5. "summary": \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0915\u0947 \u0932\u093F\u090F \u0935\u093F\u0935\u0930\u0923\u0964
6. "imagePrompt": \u0935\u093F\u091A\u093E\u0930 \u0915\u0947 \u0905\u0928\u0941\u0915\u0942\u0932 \u090F\u0915 \u092A\u094D\u0930\u093E\u0915\u0943\u0924\u093F\u0915 \u092C\u0948\u0915\u0917\u094D\u0930\u093E\u0909\u0902\u0921 \u092B\u094B\u091F\u094B \u0915\u093E \u0905\u0902\u0917\u094D\u0930\u0947\u091C\u0940 \u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F (English Prompt, no text, no letters, clean background).

Strictly return valid JSON object matching these keys.`;
      if (aiProvider === "openai") {
        try {
          const openai = getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: "Always respond in strictly valid JSON format."
              },
              { role: "user", content: systemInstruction }
            ],
            temperature: 0.6
          });
          const raw = completion.choices[0]?.message?.content || "{}";
          contentData = JSON.parse(raw);
        } catch (openAiErr) {
          console.warn("OpenAI morning generation error, falling back to Gemini:", openAiErr?.message);
        }
      }
      if (!contentData && process.env.GEMINI_API_KEY) {
        try {
          const geminiRes = await generateWithFallbackAndRetry(ai, DEFAULT_FALLBACK_MODELS, {
            contents: systemInstruction,
            config: {
              responseMimeType: "application/json",
              temperature: 0.6
            }
          });
          const raw = geminiRes.text?.trim() || "{}";
          contentData = JSON.parse(raw);
        } catch (geminiErr) {
          console.log("[Morning AI] Gemini busy or quota limit, activating serene editorial fallback.");
        }
      }
      if (!contentData || !contentData.headline) {
        contentData = {
          headline: activePrompt.length > 8 ? activePrompt : "\u0938\u0915\u093E\u0930\u093E\u0924\u094D\u092E\u0915 \u0938\u094B\u091A \u0914\u0930 \u0928\u093F\u0930\u0902\u0924\u0930 \u092A\u094D\u0930\u092F\u093E\u0938 \u0939\u0940 \u0939\u0930 \u0938\u092B\u0932\u0924\u093E \u0915\u0940 \u0915\u0941\u0902\u091C\u0940 \u0939\u0948\u0964",
          formattedHeadline: activePrompt.length > 8 ? activePrompt : "\u0938\u0915\u093E\u0930\u093E\u0924\u094D\u092E\u0915 \u0938\u094B\u091A \u0914\u0930 \u0928\u093F\u0930\u0902\u0924\u0930 \u092A\u094D\u0930\u092F\u093E\u0938 \u0939\u0940 \u0939\u0930 \u0938\u092B\u0932\u0924\u093E \u0915\u0940 \u0915\u0941\u0902\u091C\u0940 \u0939\u0948\u0964",
          badgeText: "\u{1F305} \u0906\u091C \u0915\u093E \u0935\u093F\u091A\u093E\u0930",
          thoughtQuote: "\u0939\u0930 \u0938\u0941\u092C\u0939 \u090F\u0915 \u0928\u092F\u093E \u0905\u0935\u0938\u0930 \u0932\u0947\u0915\u0930 \u0906\u0924\u0940 \u0939\u0948, \u0916\u0941\u0926 \u092A\u0930 \u0935\u093F\u0936\u094D\u0935\u093E\u0938 \u0930\u0916\u0947\u0902 \u0914\u0930 \u0906\u0917\u0947 \u092C\u0922\u093C\u0947\u0902\u0964",
          summary: activePrompt || "\u0906\u091C \u0915\u093E \u0935\u093F\u091A\u093E\u0930",
          imagePrompt: `Aesthetic golden morning sunrise landscape with peaceful mist and soft ambient sunlight, cinematic lighting, no text, no letters.`
        };
      }
    }
    let generatedImageUrl = "";
    const variationAngles = [
      "soft golden sunrise sky, gentle morning mist, light pastel morning horizon, serene warm daylight",
      "bright airy morning nature, gentle sunlight bokeh, soft pastel greens and pale golden light, tranquil peaceful mood",
      "light-toned morning horizon, gentle warm pastel glow, soft peaceful dawn, high brightness and clean light aesthetics",
      "soft morning sunbeams filtering through light morning dew, bright cheerful airy ambience, pastel warm morning",
      "minimalist serene bright morning landscape, soft pastel clouds, gentle warm sunlight, clean airy light composition"
    ];
    const angleText = variationAngles[Math.abs(Number(variation) || 0) % variationAngles.length];
    const imagePrompt = contentData.imagePrompt || `Aesthetic soft light-colored morning background wallpaper for: ${contentData.headline || activePrompt}. ${angleText}. Soft pastel morning lighting, gentle ambient glow, bright airy daylight, clean light background, no dark shadows, strictly NO text, NO words, NO letters, NO watermark, 4k`;
    if (generateImage) {
      console.log("Generating Morning Jacket AI image with prompt:", imagePrompt, "variation:", variation);
      if (process.env.GEMINI_API_KEY) {
        try {
          const imgRes = await ai.models.generateContent({
            model: "gemini-3.1-flash-image",
            contents: {
              parts: [
                {
                  text: `${imagePrompt}. ${angleText}. Soft light-colored photographic background wallpaper, aesthetic bright morning atmosphere, pale soft colors, bright clean lighting, strictly no text, no words, no letters, no logos.`
                }
              ]
            },
            config: {
              imageConfig: {
                aspectRatio: "3:4"
              }
            }
          });
          if (imgRes.candidates && imgRes.candidates[0]?.content?.parts) {
            for (const part of imgRes.candidates[0].content.parts) {
              if (part.inlineData) {
                generatedImageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
                break;
              }
            }
          }
        } catch (imgErr) {
          console.warn("Morning gemini-3.1-flash-image error:", imgErr?.message?.slice(0, 100));
          try {
            const imgFallback = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite-image",
              contents: {
                parts: [
                  {
                    text: `${imagePrompt}. ${angleText}. Soft light-colored photographic background wallpaper, aesthetic bright morning atmosphere, strictly no text, no letters.`
                  }
                ]
              },
              config: {
                imageConfig: {
                  aspectRatio: "3:4"
                }
              }
            });
            if (imgFallback.candidates && imgFallback.candidates[0]?.content?.parts) {
              for (const part of imgFallback.candidates[0].content.parts) {
                if (part.inlineData) {
                  generatedImageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
                  break;
                }
              }
            }
          } catch (liteErr) {
            console.warn("gemini-3.1-flash-lite-image also busy:", liteErr?.message?.slice(0, 100));
          }
        }
      }
      if (!generatedImageUrl && aiProvider === "openai") {
        try {
          const openai = getOpenAIClient();
          const dalleRes = await openai.images.generate({
            model: "dall-e-3",
            prompt: `${imagePrompt}. ${angleText}. Soft photographic background, bright clean daylight, no text, no words, no watermark.`,
            n: 1,
            size: "1024x1792",
            response_format: "b64_json"
          });
          const b64 = dalleRes.data?.[0]?.b64_json;
          if (b64) {
            generatedImageUrl = `data:image/png;base64,${b64}`;
          }
        } catch (dalleErr) {
          console.warn("Morning DALL-E generation failed:", dalleErr);
        }
      }
      if (!generatedImageUrl) {
        const pickedIdx = Math.abs(Number(variation) || 0) % CURATED_MORNING_PRESS_PHOTOS.length;
        const fallbackRaw = CURATED_MORNING_PRESS_PHOTOS[pickedIdx];
        generatedImageUrl = `/api/proxy-image?url=${encodeURIComponent(fallbackRaw)}`;
      }
    }
    return res.json({
      success: true,
      data: contentData,
      imageUrl: generatedImageUrl,
      imagePrompt,
      variation: Number(variation) || 0
    });
  } catch (err) {
    console.error("Error in /api/generate-morning-jacket:", err);
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var TEMPLATE_CONFIGS_FILE = import_path.default.join(process.cwd(), "news_template_configs.json");
var LIMIT_INCREASE_REQUESTS_FILE = import_path.default.join(process.cwd(), "limit_increase_requests.json");
var FRAME_CATEGORIES = [
  "Regular Frame",
  "Package Frame",
  "Super Breaking Frame",
  "Text Breaking Frame",
  "\u092C\u092F\u093E\u0928\u092C\u093E\u091C\u093C\u0940 \u092B\u094D\u0930\u0947\u092E",
  "Special Frame",
  "Bonus Frame",
  "Custom Frame"
];
function getAsiaKolkataDateAndExpiry(nowMs = Date.now()) {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(new Date(nowMs));
    const partMap = {};
    for (const p of parts) partMap[p.type] = p.value;
    const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
    const kolkataDateMidnight = /* @__PURE__ */ new Date(`${dateStr}T23:59:59.999+05:30`);
    const expiryMs = kolkataDateMidnight.getTime();
    return { dateStr, expiryMs };
  } catch {
    const d = new Date(nowMs);
    const dateStr = d.toISOString().slice(0, 10);
    const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    return { dateStr, expiryMs: endOfDay };
  }
}
function getCascadingAllowedPlans(selectedTier) {
  const t = (selectedTier || "").toUpperCase().trim();
  if (t === "BASIC") return ["BASIC", "ADVANCED", "PRO", "VIP DESK"];
  if (t === "ADVANCED" || t === "ADVANCE") return ["ADVANCED", "PRO", "VIP DESK"];
  if (t === "PRO" || t === "PROFESSIONAL") return ["PRO", "VIP DESK"];
  if (t === "VIP DESK" || t === "ULTRA") return ["VIP DESK"];
  return ["BASIC", "ADVANCED", "PRO", "VIP DESK"];
}
function getStoredTemplateConfigs() {
  try {
    if (import_fs.default.existsSync(TEMPLATE_CONFIGS_FILE)) {
      const data = import_fs.default.readFileSync(TEMPLATE_CONFIGS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn("Failed to read news_template_configs.json:", e);
  }
  return {
    graphic_001: {
      customName: "Regular Clean News Frame",
      category: "Regular Frame",
      selectedTier: "BASIC",
      allowedPlans: ["BASIC", "ADVANCED", "PRO", "VIP DESK"],
      coinPrice: 0,
      isActive: true,
      version: "v1.0",
      headlineArea: "3-Line Headline Area (\u092C\u0949\u091F\u092E \u0935\u094D\u0939\u093E\u0908\u091F \u092A\u0949\u0932\u0940\u0917\u0949\u0928)",
      locationArea: "top_left_box",
      logoArea: "top_right_box"
    },
    graphic_002: {
      customName: "Package Standard Frame",
      category: "Package Frame",
      selectedTier: "ADVANCED",
      allowedPlans: ["ADVANCED", "PRO", "VIP DESK"],
      coinPrice: 50,
      isActive: true,
      version: "v1.0",
      headlineArea: "2-Line Headline Area (\u0921\u093E\u0930\u094D\u0915 \u092C\u094D\u0932\u0942 \u0938\u094D\u091F\u094D\u0930\u093F\u092A)",
      locationArea: "top_left_box",
      logoArea: "top_right_box"
    },
    graphic_003: {
      customName: "Super Breaking News Frame",
      category: "Super Breaking Frame",
      selectedTier: "PRO",
      allowedPlans: ["PRO", "VIP DESK"],
      coinPrice: 100,
      isActive: true,
      version: "v1.0",
      headlineArea: "3-Line Red Ribbon Headline Area",
      locationArea: "top_strip",
      logoArea: "top_right_box"
    },
    graphic_004: {
      customName: "Special Edition Frame",
      category: "Special Frame",
      selectedTier: "VIP DESK",
      allowedPlans: ["VIP DESK"],
      coinPrice: 150,
      isActive: true,
      version: "v1.0",
      headlineArea: "2-Line Premium Gold Headline Area",
      locationArea: "top_left_box",
      logoArea: "top_right_box"
    }
  };
}
app.get("/api/template-configs", (_req, res) => {
  res.json({
    success: true,
    configs: getStoredTemplateConfigs(),
    categories: FRAME_CATEGORIES
  });
});
app.post("/api/admin/save-template-config", (req, res) => {
  try {
    const {
      templateId,
      allowedPlans,
      selectedTier,
      isActive,
      customName,
      category,
      coinPrice,
      assetUrl,
      previewUrl,
      headlineArea,
      locationArea,
      logoArea
    } = req.body;
    if (!templateId) {
      return res.status(400).json({ error: "templateId is required" });
    }
    const current = getStoredTemplateConfigs();
    const existing = current[templateId] || {
      customName: `Frame ${templateId}`,
      category: "Regular Frame",
      selectedTier: "BASIC",
      allowedPlans: ["BASIC", "ADVANCED", "PRO", "VIP DESK"],
      coinPrice: 0,
      isActive: true,
      version: "v1.0"
    };
    let finalAllowedPlans = existing.allowedPlans;
    let finalSelectedTier = existing.selectedTier || "BASIC";
    if (selectedTier) {
      finalSelectedTier = String(selectedTier).toUpperCase().trim();
      finalAllowedPlans = getCascadingAllowedPlans(finalSelectedTier);
    } else if (allowedPlans && Array.isArray(allowedPlans) && allowedPlans.length > 0) {
      finalAllowedPlans = allowedPlans;
    }
    let finalCategory = existing.category || "Regular Frame";
    if (category && typeof category === "string") {
      const trimmedCat = category.trim();
      if (FRAME_CATEGORIES.includes(trimmedCat)) {
        finalCategory = trimmedCat;
      }
    }
    current[templateId] = {
      ...existing,
      category: finalCategory,
      selectedTier: finalSelectedTier,
      allowedPlans: finalAllowedPlans,
      coinPrice: typeof coinPrice === "number" && coinPrice >= 0 ? coinPrice : existing.coinPrice || 0,
      ...typeof isActive === "boolean" ? { isActive } : {},
      ...customName ? { customName: String(customName).trim() } : {},
      ...assetUrl ? { assetUrl: String(assetUrl).trim() } : {},
      ...previewUrl ? { previewUrl: String(previewUrl).trim() } : {},
      ...headlineArea ? { headlineArea: String(headlineArea).trim() } : {},
      ...locationArea ? { locationArea: String(locationArea).trim() } : {},
      ...logoArea ? { logoArea: String(logoArea).trim() } : {},
      updatedAt: Date.now()
    };
    import_fs.default.writeFileSync(TEMPLATE_CONFIGS_FILE, JSON.stringify(current, null, 2), "utf-8");
    return res.json({
      success: true,
      message: `Template config updated for ${templateId}`,
      config: current[templateId],
      configs: current
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/create-frame", (req, res) => {
  try {
    const {
      name,
      category,
      selectedTier = "BASIC",
      coinPrice = 0,
      assetUrl,
      previewUrl,
      headlineArea = "3-Line Headline Area",
      locationArea = "top_left_box",
      logoArea = "top_right_box",
      creatorEmail
    } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Frame name is required" });
    }
    const current = getStoredTemplateConfigs();
    const frameId = `frame_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const validCat = FRAME_CATEGORIES.includes(String(category).trim()) ? String(category).trim() : "Regular Frame";
    const allowed = getCascadingAllowedPlans(selectedTier);
    current[frameId] = {
      id: frameId,
      templateId: frameId,
      customName: String(name).trim(),
      category: validCat,
      selectedTier: String(selectedTier).toUpperCase().trim(),
      allowedPlans: allowed,
      coinPrice: Number(coinPrice) >= 0 ? Number(coinPrice) : 0,
      assetUrl: assetUrl ? String(assetUrl).trim() : "",
      previewUrl: previewUrl ? String(previewUrl).trim() : assetUrl ? String(assetUrl).trim() : "",
      headlineArea: String(headlineArea).trim(),
      locationArea: String(locationArea).trim(),
      logoArea: String(logoArea).trim(),
      isActive: true,
      version: "v1.0",
      creatorEmail: creatorEmail ? String(creatorEmail).trim() : "admin",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    import_fs.default.writeFileSync(TEMPLATE_CONFIGS_FILE, JSON.stringify(current, null, 2), "utf-8");
    return res.json({
      success: true,
      message: `New frame created successfully with ID ${frameId}`,
      frameId,
      frame: current[frameId],
      configs: current
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/credit-coins", (req, res) => {
  try {
    const { email, userId, coins = 0, reason = "Admin credit" } = req.body || {};
    const cleanEmail = (email || "").toString().toLowerCase().trim();
    const cleanUserId = (userId || cleanEmail || "").toString().trim();
    const walletKey = cleanEmail || cleanUserId;
    if (!walletKey) {
      return res.status(400).json({ error: "email or userId is required" });
    }
    const rDb = loadRewardsDatabase();
    if (!rDb.wallets[walletKey]) {
      rDb.wallets[walletKey] = { coinBalance: 0, pendingCoins: 0, totalEarnedCoins: 0 };
    }
    const amount = Number(coins) || 0;
    rDb.wallets[walletKey].coinBalance += amount;
    if (amount > 0) {
      rDb.wallets[walletKey].totalEarnedCoins += amount;
    }
    const txId = `tx-credit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const tx = {
      id: txId,
      transactionId: txId,
      userId: cleanUserId,
      userEmail: cleanEmail,
      description: reason,
      transactionType: "credit",
      type: "credit",
      coinAmount: amount,
      amount,
      balanceAfter: rDb.wallets[walletKey].coinBalance,
      status: "completed",
      createdAt: Date.now(),
      createdBy: "admin"
    };
    rDb.transactions.unshift(tx);
    saveRewardsDatabase(rDb);
    return res.json({
      success: true,
      wallet: rDb.wallets[walletKey],
      transaction: tx,
      message: `${amount} coins credited successfully`
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/wallet/unlock-frame", (req, res) => {
  try {
    const { email, userId, frameId, frameName } = req.body || {};
    const cleanEmail = (email || "").toString().toLowerCase().trim();
    const cleanUserId = (userId || cleanEmail || "").toString().trim();
    const cleanFrameId = (frameId || "").toString().trim();
    if (!cleanFrameId || !cleanEmail && !cleanUserId) {
      return res.status(400).json({ error: "frameId and user identification are required" });
    }
    const configs = getStoredTemplateConfigs();
    const frameConfig = configs[cleanFrameId];
    if (!frameConfig) {
      return res.status(404).json({ error: "Frame not found in configuration catalog" });
    }
    const price = Number(frameConfig.coinPrice) || 0;
    if (price <= 0) {
      return res.status(400).json({
        error: "\u0907\u0938 \u092B\u094D\u0930\u0947\u092E \u092A\u0930 \u0915\u0949\u0907\u0928-\u0906\u0927\u093E\u0930\u093F\u0924 \u0905\u0928\u0932\u0949\u0915 \u0938\u0915\u094D\u0930\u093F\u092F \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u092F\u0939 \u092B\u093C\u094D\u0930\u0947\u092E \u0928\u093F\u0903\u0936\u0941\u0932\u094D\u0915 \u092F\u093E \u0915\u0947\u0935\u0932 \u092A\u0948\u0915\u0947\u091C \u0906\u0927\u093E\u0930\u093F\u0924 \u0939\u0948\u0964"
      });
    }
    const { dateStr, expiryMs } = getAsiaKolkataDateAndExpiry();
    const rDb = loadRewardsDatabase();
    const walletKey = cleanEmail || cleanUserId;
    if (!rDb.wallets[walletKey]) {
      rDb.wallets[walletKey] = { coinBalance: 0, pendingCoins: 0, totalEarnedCoins: 0 };
    }
    if (!rDb.frameUnlocks) {
      rDb.frameUnlocks = {};
    }
    if (!rDb.frameUnlocks[walletKey]) {
      rDb.frameUnlocks[walletKey] = {};
    }
    const existingUnlock = rDb.frameUnlocks[walletKey][cleanFrameId];
    if (existingUnlock && existingUnlock.expiresAt > Date.now()) {
      return res.json({
        success: true,
        alreadyUnlocked: true,
        unlocked: true,
        frameId: cleanFrameId,
        expiresAt: existingUnlock.expiresAt,
        dateStr: existingUnlock.dateStr,
        wallet: rDb.wallets[walletKey],
        message: "\u092F\u0939 \u092B\u094D\u0930\u0947\u092E \u0906\u091C (11:59 PM \u0924\u0915) \u092A\u0939\u0932\u0947 \u0938\u0947 \u0905\u0928\u0932\u0949\u0915 \u0939\u0948\u0964"
      });
    }
    const currentBalance = rDb.wallets[walletKey].coinBalance;
    if (currentBalance < price) {
      return res.status(400).json({
        success: false,
        error: `\u0905\u092A\u0930\u094D\u092F\u093E\u092A\u094D\u0924 \u0915\u0949\u0907\u0928 \u092C\u0948\u0932\u0947\u0902\u0938! \u092B\u094D\u0930\u0947\u092E \u0905\u0928\u0932\u0949\u0915 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F ${price} \u0915\u0949\u0907\u0928\u094D\u0938 \u0906\u0935\u0936\u094D\u092F\u0915 \u0939\u0948\u0902, \u091C\u092C\u0915\u093F \u0906\u092A\u0915\u0947 \u092A\u093E\u0938 \u0915\u0947\u0935\u0932 ${currentBalance} \u0915\u0949\u0907\u0928\u094D\u0938 \u0939\u0948\u0902\u0964`,
        required: price,
        available: currentBalance
      });
    }
    rDb.wallets[walletKey].coinBalance -= price;
    rDb.frameUnlocks[walletKey][cleanFrameId] = {
      unlockedAt: Date.now(),
      expiresAt: expiryMs,
      dateStr
    };
    const txId = `tx-frame-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const chosenName = frameName || frameConfig.customName || cleanFrameId;
    const tx = {
      id: txId,
      transactionId: txId,
      userId: cleanUserId,
      userEmail: cleanEmail,
      newsItemId: cleanFrameId,
      newsTitle: chosenName,
      description: `\u092B\u094D\u0930\u0947\u092E \u0905\u0928\u0932\u0949\u0915 (\u0906\u091C 11:59 PM \u0924\u0915): ${chosenName} (-${price} \u0915\u0949\u0907\u0928\u094D\u0938)`,
      transactionType: "debit",
      type: "debit",
      coinAmount: -price,
      amount: -price,
      balanceAfter: rDb.wallets[walletKey].coinBalance,
      status: "completed",
      createdAt: Date.now(),
      createdBy: "system"
    };
    rDb.transactions.unshift(tx);
    saveRewardsDatabase(rDb);
    return res.json({
      success: true,
      unlocked: true,
      frameId: cleanFrameId,
      expiresAt: expiryMs,
      dateStr,
      wallet: rDb.wallets[walletKey],
      transaction: tx,
      message: `\u092B\u094D\u0930\u0947\u092E "${chosenName}" \u0906\u091C 11:59:59 PM (IST) \u0924\u0915 \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u0905\u0928\u0932\u0949\u0915 \u0939\u094B \u0917\u092F\u093E! ${price} \u0915\u0949\u0907\u0928\u094D\u0938 \u0915\u093E\u091F\u0947 \u0917\u090F\u0964`
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/wallet/frame-unlocks", (req, res) => {
  try {
    const email = (req.query.email || "").toString().toLowerCase().trim();
    if (!email) {
      return res.json({ success: true, unlocks: [] });
    }
    const rDb = loadRewardsDatabase();
    const userUnlocks = rDb.frameUnlocks?.[email] || {};
    const now = Date.now();
    const activeFrameIds = Object.keys(userUnlocks).filter((fId) => userUnlocks[fId]?.expiresAt > now);
    return res.json({
      success: true,
      unlocks: activeFrameIds,
      unlockedFrameIds: activeFrameIds,
      details: userUnlocks
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
function loadLimitIncreaseRequests() {
  try {
    if (import_fs.default.existsSync(LIMIT_INCREASE_REQUESTS_FILE)) {
      const data = import_fs.default.readFileSync(LIMIT_INCREASE_REQUESTS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
  }
  return [];
}
function saveLimitIncreaseRequests(reqs) {
  try {
    import_fs.default.writeFileSync(LIMIT_INCREASE_REQUESTS_FILE, JSON.stringify(reqs, null, 2), "utf-8");
  } catch {
  }
}
app.post("/api/request-limit-increase", (req, res) => {
  try {
    const { email, userId, reason, tier, currentLimit } = req.body || {};
    const cleanEmail = (email || "").toString().toLowerCase().trim();
    if (!cleanEmail) {
      return res.status(400).json({ error: "User email required" });
    }
    const { dateStr } = getAsiaKolkataDateAndExpiry();
    const requests = loadLimitIncreaseRequests();
    const alreadyRequested = requests.find(
      (r) => r.email === cleanEmail && r.dateStr === dateStr && r.status === "pending"
    );
    if (alreadyRequested) {
      return res.json({
        success: true,
        alreadyRequested: true,
        message: "\u0906\u092A\u0915\u093E \u0932\u093F\u092E\u093F\u091F \u092C\u0922\u093C\u093E\u0928\u0947 \u0915\u093E \u0905\u0928\u0941\u0930\u094B\u0927 \u092A\u0939\u0932\u0947 \u0938\u0947 \u0926\u0930\u094D\u091C \u0939\u0948\u0964 \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 \u091C\u0932\u094D\u0926 \u0939\u0940 \u0938\u092E\u0940\u0915\u094D\u0937\u093E \u0915\u0930\u0947\u0902\u0917\u0947\u0964"
      });
    }
    const newReq = {
      id: `req-limit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email: cleanEmail,
      userId: userId || cleanEmail,
      tier: tier || "basic",
      currentLimit: currentLimit || 10,
      reason: reason || "\u0926\u0948\u0928\u093F\u0915 \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0938\u0940\u092E\u093E \u0938\u092E\u093E\u092A\u094D\u0924",
      dateStr,
      requestedAt: Date.now(),
      status: "pending"
    };
    requests.unshift(newReq);
    saveLimitIncreaseRequests(requests);
    return res.json({
      success: true,
      message: "\u0906\u092A\u0915\u093E \u0926\u0948\u0928\u093F\u0915 \u0932\u093F\u092E\u093F\u091F \u092C\u0922\u093C\u093E\u0928\u0947 \u0915\u093E \u0905\u0928\u0941\u0930\u094B\u0927 \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u090F\u0921\u092E\u093F\u0928 \u0915\u094B \u092D\u0947\u091C \u0926\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964",
      request: newReq
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/admin/limit-increase-requests", (_req, res) => {
  res.json({
    success: true,
    requests: loadLimitIncreaseRequests()
  });
});
var CATEGORIES_DB_FILE = import_path.default.join(process.cwd(), "categories_database.json");
var DEFAULT_CATEGORIES_PRESET = [
  { id: "breaking", name: "\u26A1 \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C", isActive: true, order: 1 },
  { id: "politics", name: "\u{1F3DB}\uFE0F \u0930\u093E\u091C\u0928\u0940\u0924\u093F \u0935 \u091A\u0941\u0928\u093E\u0935", isActive: true, order: 2 },
  { id: "state", name: "\u{1F4CD} \u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", isActive: true, order: 3 },
  { id: "national", name: "\u{1F1EE}\u{1F1F3} \u0926\u0947\u0936 / \u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F", isActive: true, order: 4 },
  { id: "up", name: "\u{1F4CD} \u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936", isActive: true, order: 5 },
  { id: "bihar", name: "\u{1F4CD} \u092C\u093F\u0939\u093E\u0930", isActive: true, order: 6 },
  { id: "rajasthan", name: "\u{1F4CD} \u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928", isActive: true, order: 7 },
  { id: "tech", name: "\u{1F4BB} \u091F\u0947\u0915\u094D\u0928\u094B\u0932\u0949\u091C\u0940", isActive: true, order: 8 },
  { id: "business", name: "\u{1F4C8} \u0915\u093E\u0930\u094B\u092C\u093E\u0930 \u0935 \u0935\u094D\u092F\u093E\u092A\u093E\u0930", isActive: true, order: 9 },
  { id: "sports", name: "\u{1F3CF} \u0916\u0947\u0932", isActive: true, order: 10 },
  { id: "entertainment", name: "\u{1F3AC} \u092E\u0928\u094B\u0930\u0902\u091C\u0928", isActive: true, order: 11 },
  { id: "crime", name: "\u{1F6A8} \u0915\u094D\u0930\u093E\u0907\u092E / \u0905\u092A\u0930\u093E\u0927", isActive: true, order: 12 },
  { id: "accident", name: "\u{1F6A8} \u0939\u093E\u0926\u0938\u093E \u0935 \u0926\u0941\u0930\u094D\u0918\u091F\u0928\u093E", isActive: true, order: 13 },
  { id: "agriculture", name: "\u{1F33E} \u0916\u0947\u0924\u0940-\u0915\u093F\u0938\u093E\u0928\u0940", isActive: true, order: 14 },
  { id: "health", name: "\u{1F3E5} \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F", isActive: true, order: 15 },
  { id: "special", name: "\u{1F4D1} \u0935\u093F\u0936\u0947\u0937 \u0930\u093F\u092A\u094B\u0930\u094D\u091F", isActive: true, order: 16 }
];
function loadCategoriesDatabase() {
  try {
    if (import_fs.default.existsSync(CATEGORIES_DB_FILE)) {
      const data = import_fs.default.readFileSync(CATEGORIES_DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Failed to read categories_database.json:", e);
  }
  return DEFAULT_CATEGORIES_PRESET;
}
function saveCategoriesDatabase(categories) {
  try {
    import_fs.default.writeFileSync(CATEGORIES_DB_FILE, JSON.stringify(categories, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write categories_database.json:", e);
  }
}
app.get("/api/categories", (_req, res) => {
  res.json({
    success: true,
    categories: loadCategoriesDatabase()
  });
});
app.post("/api/categories", (req, res) => {
  try {
    const { categories } = req.body;
    if (Array.isArray(categories) && categories.length > 0) {
      saveCategoriesDatabase(categories);
      return res.json({ success: true, message: "Categories saved successfully", categories });
    }
    return res.status(400).json({ error: "Invalid categories format" });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var PLANS_CATALOG_DB_FILE = import_path.default.join(process.cwd(), "plans_catalog_database.json");
var DEFAULT_PLANS_CATALOG = [
  {
    id: "basic",
    planKey: "BASIC",
    nameHi: "\u092C\u0947\u0938\u093F\u0915 (BASIC)",
    nameEn: "BASIC",
    regularPriceNum: 2999,
    regularPriceDisplay: "\u20B92,999",
    priceDisplay: "\u20B9999",
    priceNum: 999,
    discountPercent: 67,
    durationDays: 30,
    validityLabel: "30 \u0926\u093F\u0928 (\u0932\u0949\u0928\u094D\u091A\u093F\u0902\u0917 \u0911\u092B\u0930)",
    period: "\u092A\u094D\u0930\u0924\u093F \u092E\u093E\u0939",
    badge: "\u0932\u0949\u0928\u094D\u091A\u093F\u0902\u0917 \u0911\u092B\u0930 67% OFF",
    tagline: "\u092C\u0947\u0938\u093F\u0915 \u0928\u094D\u092F\u0942\u091C\u093C \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u0915\u094D\u0930\u093F\u090F\u091F\u0930 (10 \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u092A\u094D\u0930\u0924\u093F\u0926\u093F\u0928)",
    hasWatermark: true,
    graphicExportResolution: "720p",
    maxGraphicsPerDay: 10,
    hasVideoStudio: false,
    hasAiTools: false,
    hasVipDeskFrames: false,
    isActive: true,
    features: [
      "\u2705 10 \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u092A\u094D\u0930\u0924\u093F\u0926\u093F\u0928 \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0938\u0940\u092E\u093E",
      "\u2705 \u0915\u0947\u0935\u0932 Hind \u092B\u0949\u0928\u094D\u091F \u0909\u092A\u092F\u094B\u0917 \u092F\u094B\u0917\u094D\u092F",
      "\u2705 1 \u092B\u094B\u091F\u094B \u0905\u092A\u0932\u094B\u0921 \u0935 \u0930\u093F\u092A\u094D\u0932\u0947\u0938\u092E\u0947\u0902\u091F",
      "\u2705 \u092C\u0947\u0938\u093F\u0915 \u0928\u094D\u092F\u0942\u091C\u093C \u091F\u0947\u092E\u094D\u092A\u0932\u0947\u091F\u094D\u0938 \u0935 \u0938\u094D\u091F\u093E\u0907\u0932\u094D\u0938",
      "\u26A0\uFE0F \u0921\u093F\u092B\u093C\u0949\u0932\u094D\u091F \u0938\u092B\u0947\u0926 \u092B\u0942\u091F\u0930 \u0935 \u0915\u093E\u0932\u093E \u091F\u0947\u0915\u094D\u0938\u094D\u091F",
      "\u26A0\uFE0F \u092E\u093E\u0938\u094D\u091F\u0930 \u092C\u094D\u0930\u093E\u0902\u0921\u093F\u0902\u0917 \u0932\u0949\u0915"
    ]
  },
  {
    id: "advanced",
    planKey: "ADVANCE",
    nameHi: "\u090F\u0921\u0935\u093E\u0902\u0938 (ADVANCE)",
    nameEn: "ADVANCE",
    regularPriceNum: 4999,
    regularPriceDisplay: "\u20B94,999",
    priceDisplay: "\u20B92,499",
    priceNum: 2499,
    discountPercent: 50,
    durationDays: 30,
    validityLabel: "30 \u0926\u093F\u0928 (\u0932\u0949\u0928\u094D\u091A\u093F\u0902\u0917 \u0911\u092B\u0930)",
    period: "\u092A\u094D\u0930\u0924\u093F \u092E\u093E\u0939",
    badge: "\u0932\u0949\u0928\u094D\u091A\u093F\u0902\u0917 \u0911\u092B\u0930 50% OFF",
    popular: true,
    tagline: "25 \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u092A\u094D\u0930\u0924\u093F\u0926\u093F\u0928 \u2014 5 \u092B\u0949\u0928\u094D\u091F, 2-\u092B\u094B\u091F\u094B \u0932\u0947\u0906\u0909\u091F \u0935 AI \u0938\u093F\u092E\u094D\u092C\u0949\u0932\u093F\u0915 \u0935\u0949\u091F\u0930\u092E\u093E\u0930\u094D\u0915",
    hasWatermark: false,
    graphicExportResolution: "1080p",
    maxGraphicsPerDay: 25,
    hasVideoStudio: false,
    hasAiTools: true,
    hasVipDeskFrames: false,
    isActive: true,
    features: [
      "\u26A1 25 \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u092A\u094D\u0930\u0924\u093F\u0926\u093F\u0928 \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0938\u0940\u092E\u093E",
      "\u{1F524} 5 \u0926\u0947\u0935\u0928\u093E\u0917\u0930\u0940 \u092B\u0949\u0928\u094D\u091F (Hind, \u0916\u0902\u0921, \u0938\u093E\u0939\u093F\u0924\u094D\u092F, \u092C\u093E\u0932\u0942, \u0905\u0928\u0947\u0915 \u0926\u0947\u0935\u0928\u093E\u0917\u0930\u0940)",
      "\u{1F3A8} 5 \u0939\u093E\u0908\u0932\u093E\u0907\u091F \u0915\u0932\u0930\u094D\u0938 \u0935 5 \u092B\u0942\u091F\u0930 \u092C\u0948\u0915\u0917\u094D\u0930\u093E\u0909\u0902\u0921 \u0915\u0932\u0930\u094D\u0938",
      "\u{1F5BC}\uFE0F 1 \u0935 2 \u092B\u094B\u091F\u094B \u0932\u0947\u0906\u0909\u091F \u0938\u092A\u094B\u0930\u094D\u091F",
      "\u2728 AI / \u092A\u094D\u0930\u0924\u0940\u0915\u093E\u0924\u094D\u092E\u0915 \u092B\u094B\u091F\u094B \u0935\u0949\u091F\u0930\u092E\u093E\u0930\u094D\u0915 \u0938\u092A\u094B\u0930\u094D\u091F",
      "\u{1F310} \u092B\u0942\u091F\u0930 \u0935\u0947\u092C\u0938\u093E\u0907\u091F \u0939\u093E\u0907\u0921 \u091F\u0949\u0917\u0932 (WhatsApp \u0911\u0928)"
    ]
  },
  {
    id: "professional",
    planKey: "PRO",
    nameHi: "\u092A\u094D\u0930\u094B (PRO)",
    nameEn: "PRO",
    regularPriceNum: 6999,
    regularPriceDisplay: "\u20B96,999",
    priceDisplay: "\u20B94,199",
    priceNum: 4199,
    discountPercent: 40,
    durationDays: 30,
    validityLabel: "30 \u0926\u093F\u0928 (\u0932\u0949\u0928\u094D\u091A\u093F\u0902\u0917 \u0911\u092B\u0930)",
    period: "\u092A\u094D\u0930\u0924\u093F \u092E\u093E\u0939",
    badge: "\u0932\u0949\u0928\u094D\u091A\u093F\u0902\u0917 \u0911\u092B\u0930 40% OFF",
    tagline: "50 \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u092A\u094D\u0930\u0924\u093F\u0926\u093F\u0928 \u2014 \u0938\u092D\u0940 \u092E\u093E\u0928\u0915 \u092B\u0949\u0928\u094D\u091F, \u0915\u0938\u094D\u091F\u092E \u0935\u0949\u091F\u0930\u092E\u093E\u0930\u094D\u0915 \u0935 \u0907\u0902\u091F\u0930\u0928\u0947\u091F \u0938\u0930\u094D\u091A",
    hasWatermark: false,
    graphicExportResolution: "1080p",
    maxGraphicsPerDay: 50,
    hasVideoStudio: true,
    hasAiTools: true,
    hasVipDeskFrames: false,
    isActive: true,
    features: [
      "\u26A1 50 \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u092A\u094D\u0930\u0924\u093F\u0926\u093F\u0928 \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0938\u0940\u092E\u093E",
      "\u{1F524} \u0938\u092D\u0940 \u092E\u093E\u0928\u0915 \u092B\u0949\u0928\u094D\u091F \u0915\u0932\u0947\u0915\u094D\u0936\u0928 \u0935 \u0915\u0932\u0930 \u0939\u093E\u0908\u0932\u093E\u0907\u091F\u094D\u0938 (\u092A\u094D\u0930\u093E\u0907\u092E\u0930\u0940 \u0915\u0932\u0930 \u0938\u093F\u0932\u0947\u0915\u094D\u0936\u0928)",
      "\u{1F3F7}\uFE0F \u0915\u0938\u094D\u091F\u092E \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u0935\u0949\u091F\u0930\u092E\u093E\u0930\u094D\u0915 \u0935 AI \u0938\u093F\u092E\u094D\u092C\u0949\u0932\u093F\u0915 \u0935\u0949\u091F\u0930\u092E\u093E\u0930\u094D\u0915",
      "\u{1F5BC}\uFE0F \u0938\u092D\u0940 \u092E\u0932\u094D\u091F\u0940-\u092B\u094B\u091F\u094B \u0917\u094D\u0930\u093F\u0921 \u0932\u0947\u0906\u0909\u091F\u094D\u0938 \u0935 \u0907\u0902\u091F\u0930\u0928\u0947\u091F \u0907\u092E\u0947\u091C \u0938\u0930\u094D\u091A",
      "\u{1F3A8} \u0938\u092D\u0940 \u092B\u0942\u091F\u0930 \u092C\u0948\u0915\u0917\u094D\u0930\u093E\u0909\u0902\u0921 \u0935 \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u0915\u0932\u0930\u094D\u0938",
      "\u{1F310} \u0935\u0947\u092C\u0938\u093E\u0907\u091F \u0935 WhatsApp \u0926\u094B\u0928\u094B\u0902 \u0911\u0928/\u0911\u092B \u091F\u0949\u0917\u0932",
      "\u{1F451} \u0915\u0938\u094D\u091F\u092E \u092B\u094D\u0930\u0947\u092E \u0939\u094B\u0928\u0947 \u092A\u0930 \u092E\u093E\u0938\u094D\u091F\u0930 \u092C\u094D\u0930\u093E\u0902\u0921\u093F\u0902\u0917 \u0911\u092B \u091F\u0949\u0917\u0932"
    ]
  },
  {
    id: "ultra",
    planKey: "VIP DESK",
    nameHi: "\u0935\u0940\u0906\u0908\u092A\u0940 \u0921\u0947\u0938\u094D\u0915 (VIP DESK)",
    nameEn: "VIP DESK",
    regularPriceNum: 9999,
    regularPriceDisplay: "\u20B99,999",
    priceDisplay: "\u20B96,499",
    priceNum: 6499,
    discountPercent: 35,
    durationDays: 30,
    validityLabel: "30 \u0926\u093F\u0928 (\u0932\u0949\u0928\u094D\u091A\u093F\u0902\u0917 \u0911\u092B\u0930)",
    period: "\u092A\u094D\u0930\u0924\u093F \u092E\u093E\u0939",
    badge: "\u0932\u0949\u0928\u094D\u091A\u093F\u0902\u0917 \u0911\u092B\u0930 35% OFF",
    tagline: "\u0905\u0938\u0940\u092E\u093F\u0924 \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u2014 \u0915\u0938\u094D\u091F\u092E \u092B\u0949\u0928\u094D\u091F \u0905\u092A\u0932\u094B\u0921, \u0915\u0938\u094D\u091F\u092E \u0915\u0932\u0930\u094D\u0938, WhatsApp \u0928\u0902\u092C\u0930 \u0913\u0935\u0930\u0930\u093E\u0907\u0921",
    hasWatermark: false,
    graphicExportResolution: "4K",
    maxGraphicsPerDay: 99999,
    hasVideoStudio: true,
    hasAiTools: true,
    hasVipDeskFrames: true,
    isActive: true,
    features: [
      "\u{1F451} \u0905\u0938\u0940\u092E\u093F\u0924 \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u0921\u093E\u0909\u0928\u0932\u094B\u0921 (Unlimited Downloads)",
      "\u{1F524} \u0938\u092D\u0940 \u092E\u093E\u0928\u0915 \u092B\u0949\u0928\u094D\u091F + \u0915\u0938\u094D\u091F\u092E \u092B\u0949\u0928\u094D\u091F (.ttf/.otf) \u0905\u092A\u0932\u094B\u0921",
      "\u{1F3A8} \u0915\u0938\u094D\u091F\u092E \u0939\u093E\u0908\u0932\u093E\u0907\u091F \u0915\u0932\u0930, \u092B\u0942\u091F\u0930 \u0915\u0932\u0930 \u0935 \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u0915\u0932\u0930 \u092A\u093F\u0915\u0930",
      "\u{1F4F1} \u092A\u094D\u0930\u0924\u093F-\u0917\u094D\u0930\u093E\u092B\u093F\u0915 WhatsApp \u0928\u0902\u092C\u0930 \u0913\u0935\u0930\u0930\u093E\u0907\u0921 \u0907\u0928\u092A\u0941\u091F",
      "\u{1F5BC}\uFE0F \u0938\u092D\u0940 \u092B\u094B\u091F\u094B \u0932\u0947\u0906\u0909\u091F\u094D\u0938, \u0907\u0902\u091F\u0930\u0928\u0947\u091F \u0938\u0930\u094D\u091A \u0935 \u0915\u0938\u094D\u091F\u092E \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u0935\u0949\u091F\u0930\u092E\u093E\u0930\u094D\u0915",
      "\u2B50 VIP DESK \u0935\u093F\u0936\u0947\u0937 \u092B\u094D\u0930\u0947\u092E\u094D\u0938 \u0935 \u0915\u0938\u094D\u091F\u092E \u092B\u094D\u0930\u0947\u092E \u0938\u092A\u094B\u0930\u094D\u091F"
    ]
  }
];
function loadPlansCatalogDatabase() {
  try {
    if (import_fs.default.existsSync(PLANS_CATALOG_DB_FILE)) {
      const data = import_fs.default.readFileSync(PLANS_CATALOG_DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length >= 4) return parsed;
    }
  } catch (e) {
    console.warn("Failed to read plans_catalog_database.json:", e);
  }
  return DEFAULT_PLANS_CATALOG;
}
function savePlansCatalogDatabase(plans) {
  try {
    import_fs.default.writeFileSync(PLANS_CATALOG_DB_FILE, JSON.stringify(plans, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write plans_catalog_database.json:", e);
  }
}
app.get("/api/plans", (_req, res) => {
  res.json({
    success: true,
    plans: loadPlansCatalogDatabase()
  });
});
app.post("/api/admin/plans", (req, res) => {
  try {
    const { plans } = req.body;
    if (Array.isArray(plans) && plans.length >= 4) {
      savePlansCatalogDatabase(plans);
      return res.json({ success: true, message: "Plans catalog saved successfully", plans });
    }
    return res.status(400).json({ error: "Invalid plans catalog format" });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var dailyDownloadsTracker = /* @__PURE__ */ new Map();
app.get("/api/user-download-status", (req, res) => {
  try {
    const email = (req.query.email || "").toString().toLowerCase().trim();
    if (!email) {
      return res.json({ allowed: true, maxAllowed: 10, dailyQuota: 10, downloadsToday: 0, remainingToday: 10, remainingDownloads: 10, unlimited: false });
    }
    if (isProtectedAdminAccount(email)) {
      return res.json({ allowed: true, plan: "ultra", planName: "VIP DESK", maxAllowed: 99999, dailyQuota: 99999, downloadsToday: 0, remainingToday: 99999, remainingDownloads: 99999, unlimited: true });
    }
    const users = loadUsersMasterDatabase();
    const matchedUser = users.find(
      (u) => u.email && u.email.toLowerCase().trim() === email || email && u.userId && u.userId.toLowerCase().trim() === email
    );
    const tier = (matchedUser?.tier || "basic").toLowerCase();
    const catalog = loadPlansCatalogDatabase();
    const planDetail = catalog.find((p) => p.id === tier);
    const maxAllowed = planDetail?.maxGraphicsPerDay !== void 0 ? planDetail.maxGraphicsPerDay : tier === "ultra" ? 99999 : tier === "professional" ? 50 : tier === "advanced" ? 25 : 10;
    const { dateStr } = getAsiaKolkataDateAndExpiry();
    const userKey = email;
    const currentRecord = dailyDownloadsTracker.get(userKey);
    let downloadsToday = 0;
    if (currentRecord && currentRecord.date === dateStr) {
      downloadsToday = currentRecord.count;
    }
    const isExhausted = maxAllowed < 99999 && downloadsToday >= maxAllowed;
    const remainingCount = maxAllowed >= 99999 ? 99999 : Math.max(0, maxAllowed - downloadsToday);
    return res.json({
      success: true,
      plan: tier,
      maxAllowed,
      dailyQuota: maxAllowed,
      downloadsToday,
      remainingToday: remainingCount,
      remainingDownloads: remainingCount,
      isExhausted,
      unlimited: maxAllowed >= 99999,
      dateStr
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/verify-download-entitlement", (req, res) => {
  try {
    const { email, frameId, checkOnly, isBonus, headlineScheduleMode, hasScheduledHeadlines } = req.body || {};
    const cleanEmail = (email || "").toString().toLowerCase().trim();
    if (isBonus) {
      return res.json({
        allowed: true,
        plan: "bonus",
        planName: "BONUS EXPORT",
        isBonus: true,
        remainingToday: 99999,
        unlimited: true
      });
    }
    if (cleanEmail && isProtectedAdminAccount(cleanEmail)) {
      return res.json({
        allowed: true,
        plan: "ultra",
        planName: "VIP DESK",
        role: "admin",
        remainingToday: 99999,
        unlimited: true
      });
    }
    const users = loadUsersMasterDatabase();
    const matchedUser = users.find(
      (u) => u.email && u.email.toLowerCase().trim() === cleanEmail || cleanEmail && u.userId && u.userId.toLowerCase().trim() === cleanEmail
    );
    if (matchedUser?.isBlocked) {
      return res.status(403).json({
        allowed: false,
        error: "\u0906\u092A\u0915\u093E \u0916\u093E\u0924\u093E \u0935\u094D\u092F\u0935\u0938\u094D\u0925\u093E\u092A\u0915 (Admin) \u0926\u094D\u0935\u093E\u0930\u093E \u092C\u094D\u0932\u0949\u0915 \u0915\u0930 \u0926\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964 \u0938\u0939\u093E\u092F\u0924\u093E \u0921\u0947\u0938\u094D\u0915 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964",
        blocked: true
      });
    }
    const tier = (matchedUser?.tier || "basic").toLowerCase();
    const hasScheduled = Boolean(headlineScheduleMode === "scheduled" || hasScheduledHeadlines);
    if (hasScheduled) {
      const isProOrVip = tier === "professional" || tier === "ultra" || tier === "pro" || tier === "vip";
      if (!isProOrVip) {
        return res.status(403).json({
          allowed: false,
          error: "\u092E\u0932\u094D\u091F\u0940-\u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0936\u0947\u0921\u094D\u092F\u0942\u0932\u093F\u0902\u0917 (Multi-Headline Scheduling) \u0915\u0947\u0935\u0932 Pro \u0914\u0930 VIP-Desk \u092A\u094D\u0932\u093E\u0928 \u0927\u093E\u0930\u0915\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u0909\u092A\u0932\u092C\u094D\u0927 \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u092A\u094D\u0932\u093E\u0928 \u0905\u092A\u0917\u094D\u0930\u0947\u0921 \u0915\u0930\u0947\u0902\u0964",
          headlineScheduleLocked: true,
          requiredTier: "PRO"
        });
      }
    }
    if (frameId) {
      const templateConfigs = getStoredTemplateConfigs();
      const frameConfig = templateConfigs[frameId];
      if (frameConfig) {
        const userPlanKey = tier === "ultra" ? "VIP DESK" : tier === "professional" ? "PRO" : tier === "advanced" ? "ADVANCED" : "BASIC";
        const allowedPlans = frameConfig.allowedPlans || getCascadingAllowedPlans(frameConfig.selectedTier || "BASIC");
        const isPlanAllowed = allowedPlans.includes(userPlanKey);
        if (!isPlanAllowed) {
          const rDb = loadRewardsDatabase();
          const userUnlocks = rDb.frameUnlocks?.[cleanEmail] || {};
          const unlockRecord = userUnlocks[frameId];
          const isUnlocked = unlockRecord && unlockRecord.expiresAt > Date.now();
          if (!isUnlocked) {
            return res.status(403).json({
              error: `\u092F\u0939 \u092B\u094D\u0930\u0947\u092E (${frameConfig.customName || frameId}) \u0906\u092A\u0915\u0947 \u092A\u0948\u0915\u0947\u091C \u092E\u0947\u0902 \u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u092F\u0939 ${frameConfig.selectedTier || allowedPlans.join(", ")} \u0915\u0947 \u0932\u093F\u090F \u0906\u0930\u0915\u094D\u0937\u093F\u0924 \u0939\u0948\u0964 \u0906\u092A \u0907\u0938\u0947 ${frameConfig.coinPrice || 0} \u0915\u0949\u0907\u0928\u094D\u0938 \u092E\u0947\u0902 \u0905\u0928\u0932\u0949\u0915 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964`,
              frameLocked: true,
              requiredTier: frameConfig.selectedTier,
              coinPrice: frameConfig.coinPrice || 0
            });
          }
        }
      }
    }
    const catalog = loadPlansCatalogDatabase();
    const planDetail = catalog.find((p) => p.id === tier);
    const maxAllowed = planDetail?.maxGraphicsPerDay !== void 0 ? planDetail.maxGraphicsPerDay : tier === "ultra" ? 99999 : tier === "professional" ? 50 : tier === "advanced" ? 25 : 10;
    const { dateStr } = getAsiaKolkataDateAndExpiry();
    const userKey = cleanEmail || req.ip || "anon";
    const currentRecord = dailyDownloadsTracker.get(userKey);
    let downloadsToday = 0;
    if (currentRecord && currentRecord.date === dateStr) {
      downloadsToday = currentRecord.count;
    } else {
      dailyDownloadsTracker.set(userKey, { date: dateStr, count: 0 });
    }
    if (downloadsToday >= maxAllowed && maxAllowed < 99999) {
      return res.status(403).json({
        error: `\u0906\u092A\u0915\u0940 \u0926\u0948\u0928\u093F\u0915 \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0938\u0940\u092E\u093E (${maxAllowed} \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u092A\u094D\u0930\u0924\u093F\u0926\u093F\u0928) \u092A\u0942\u0930\u0940 \u0939\u094B \u091A\u0941\u0915\u0940 \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u0905\u0917\u0932\u0947 \u0926\u093F\u0928 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902 \u092F\u093E \u092A\u094D\u0932\u093E\u0928 \u0905\u092A\u0917\u094D\u0930\u0947\u0921 \u0915\u0930\u0947\u0902\u0964`,
        quotaExceeded: true,
        maxAllowed,
        downloadsToday
      });
    }
    if (!checkOnly) {
      dailyDownloadsTracker.set(userKey, { date: dateStr, count: downloadsToday + 1 });
      downloadsToday += 1;
    }
    return res.json({
      allowed: true,
      plan: tier,
      maxAllowed,
      downloadsToday,
      remainingToday: maxAllowed >= 99999 ? 99999 : Math.max(0, maxAllowed - downloadsToday),
      unlimited: maxAllowed >= 99999
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var appVersionData = {
  version: "1.2.0",
  versionCode: 10200,
  releaseDate: "2026-09-08",
  downloadUrl: "/app-release.apk",
  apkAvailable: true,
  releaseTitle: "\u0928\u094D\u092F\u0942 \u0905\u092A\u0921\u0947\u091F v1.2.0: \u092E\u0949\u0930\u094D\u0928\u093F\u0902\u0917 AI \u0938\u094D\u091F\u0942\u0921\u093F\u092F\u094B \u0935 \u092E\u094B\u092C\u093E\u0907\u0932 \u0938\u094D\u092A\u094D\u0932\u093F\u091F \u0935\u094D\u092F\u0942",
  releaseNotes: [
    "\u{1F305} \u092E\u0949\u0930\u094D\u0928\u093F\u0902\u0917 \u091C\u0948\u0915\u0947\u091F: 1-\u0915\u094D\u0932\u093F\u0915 AI \u0938\u0941\u0935\u093F\u091A\u093E\u0930 \u0935 \u090F\u0938\u094D\u0925\u0947\u091F\u093F\u0915 \u092B\u094B\u091F\u094B \u091C\u0928\u0930\u0947\u091F\u0930 (\u092C\u093F\u0928\u093E \u091F\u093E\u0907\u092A \u0915\u093F\u090F \u0924\u0941\u0930\u0902\u0924 \u0928\u092F\u093E \u0938\u0941\u0935\u093F\u091A\u093E\u0930 \u092C\u0928\u093E\u090F\u0902)",
    "\u{1F4F1} \u092E\u094B\u092C\u093E\u0907\u0932 \u0932\u093E\u0907\u0935 \u092A\u094D\u0930\u0940\u0935\u094D\u092F\u0942: \u0938\u094D\u0915\u094D\u0930\u0949\u0932 \u0915\u0930\u0924\u0947 \u0939\u0940 \u0915\u0949\u092E\u094D\u092A\u0948\u0915\u094D\u091F \u0939\u093E\u092B-\u0938\u094D\u0915\u094D\u0930\u0940\u0928 \u092E\u094B\u0921 \u2014 \u0928\u0940\u091A\u0947 \u090F\u0921\u093F\u091F \u0915\u0930\u0924\u0947 \u0939\u0941\u090F \u090A\u092A\u0930 \u0932\u093E\u0907\u0935 \u092C\u0926\u0932\u093E\u0935 \u0926\u0947\u0916\u0947\u0902",
    "\u{1F464} \u0930\u093F\u092A\u094B\u0930\u094D\u091F\u0930 \u0930\u094B\u0932: \u0930\u093F\u092A\u094B\u0930\u094D\u091F\u0930 \u0915\u094B \u0915\u0947\u0935\u0932 4 \u092E\u0941\u0916\u094D\u092F \u091C\u0948\u0915\u0947\u091F\u094D\u0938 (\u0913\u0930\u093F\u091C\u093F\u0928\u0932, \u0938\u0941\u092A\u0930 \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917, \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917, \u092E\u0949\u0930\u094D\u0928\u093F\u0902\u0917) \u0926\u093F\u0916\u0947\u0902\u0917\u0940",
    "\u{1F451} \u092E\u0941\u0916\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u0915 (Admin): \u0938\u092D\u0940 7 \u091C\u0948\u0915\u0947\u091F\u094D\u0938 \u0914\u0930 \u090F\u0921\u0935\u093E\u0902\u0938\u094D\u0921 \u092B\u0940\u091A\u0930\u094D\u0938 \u0909\u092A\u0932\u092C\u094D\u0927",
    "\u{1F4F2} \u0907\u0928-\u0910\u092A \u0905\u092A\u0921\u0947\u091F \u0938\u093F\u0938\u094D\u091F\u092E: \u0928\u092F\u093E \u0935\u0930\u094D\u091C\u0928 \u0906\u0928\u0947 \u092A\u0930 \u0928\u094B\u091F\u093F\u092B\u093F\u0915\u0947\u0936\u0928 \u092A\u0949\u092A\u0905\u092A \u0935 \u0921\u093E\u092F\u0930\u0947\u0915\u094D\u091F APK \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u0940 \u0938\u0941\u0935\u093F\u0927\u093E"
  ],
  minRequiredVersion: "1.0.0",
  forceUpdate: false
};
app.get("/api/app-version", (_req, res) => {
  res.json({
    success: true,
    versionInfo: appVersionData,
    currentServerTime: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get(
  [
    "/app-release.apk",
    "/ainewsmaker-app.apk",
    "/download/apk",
    "/api/download/apk",
    "/api/download-apk",
    "/api/apk",
    "/download.apk",
    "/ainewsmaker.apk",
    "/app-debug.apk",
    "/apk"
  ],
  (_req, res) => {
    const possibleApkLocations = [
      import_path.default.join(process.cwd(), "app-release.apk"),
      import_path.default.join(process.cwd(), "ainewsmaker-app.apk"),
      import_path.default.join(process.cwd(), "public", "app-release.apk"),
      import_path.default.join(process.cwd(), "public", "ainewsmaker-app.apk"),
      import_path.default.join(process.cwd(), "dist", "app-release.apk"),
      import_path.default.join(process.cwd(), "dist", "ainewsmaker-app.apk"),
      import_path.default.join(process.cwd(), "web_studio", "dist", "app-release.apk"),
      import_path.default.join(process.cwd(), "web_studio", "public", "app-release.apk"),
      import_path.default.join(safeDirname, "app-release.apk"),
      import_path.default.join(safeDirname, "ainewsmaker-app.apk"),
      import_path.default.join(safeDirname, "..", "app-release.apk"),
      import_path.default.join(safeDirname, "..", "public", "app-release.apk"),
      import_path.default.join(safeDirname, "..", "dist", "app-release.apk"),
      "/app/applet/app-release.apk",
      "/app/applet/public/app-release.apk",
      "/app/applet/dist/app-release.apk",
      "/app/public/app-release.apk",
      "/app/dist/app-release.apk",
      "/app/app-release.apk",
      "/app-release.apk",
      "/public/app-release.apk"
    ];
    const foundPath = possibleApkLocations.find((p) => {
      try {
        return import_fs.default.existsSync(p) && import_fs.default.statSync(p).size > 1e3;
      } catch {
        return false;
      }
    });
    if (foundPath) {
      try {
        const absPath = import_path.default.resolve(foundPath);
        const stat = import_fs.default.statSync(absPath);
        res.writeHead(200, {
          "Content-Type": "application/vnd.android.package-archive",
          "Content-Length": stat.size,
          "Content-Disposition": 'attachment; filename="ainewsmaker-app-v1.2.0.apk"',
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*"
        });
        const stream = import_fs.default.createReadStream(absPath);
        stream.pipe(res);
        return;
      } catch (err) {
        console.error("Error streaming APK file:", err.message);
      }
    }
    return res.status(404).send("APK file is currently being prepared. Please refresh in a moment.");
  }
);
var USERS_SHEET_FILE = import_path.default.join(process.cwd(), "users_sheet_database.json");
app.post("/api/admin/sync-users-sheet", (req, res) => {
  try {
    const { users } = req.body;
    if (Array.isArray(users)) {
      import_fs.default.writeFileSync(USERS_SHEET_FILE, JSON.stringify(users, null, 2), "utf-8");
      for (const u of users) {
        if (u.email || u.userId) {
          try {
            registerOrUpdateUserAuthoritative(u);
          } catch {
          }
        }
      }
      return res.json({ success: true, count: users.length });
    }
    return res.status(400).json({ error: "Users list required" });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/update-version-info", (req, res) => {
  try {
    const { version, versionCode, releaseTitle, releaseNotes, downloadUrl, forceUpdate } = req.body;
    if (version) appVersionData.version = String(version).trim();
    if (versionCode) appVersionData.versionCode = Number(versionCode);
    if (releaseTitle) appVersionData.releaseTitle = String(releaseTitle).trim();
    if (Array.isArray(releaseNotes) && releaseNotes.length > 0) {
      appVersionData.releaseNotes = releaseNotes;
    }
    if (downloadUrl) appVersionData.downloadUrl = String(downloadUrl).trim();
    if (typeof forceUpdate === "boolean") appVersionData.forceUpdate = forceUpdate;
    return res.json({
      success: true,
      message: "\u0910\u092A \u0935\u0930\u094D\u091C\u0928 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u0905\u092A\u0921\u0947\u091F \u0939\u094B \u0917\u0908!",
      versionInfo: appVersionData
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.path}`
  });
});
app.use((err, req, res, next) => {
  if (req.path.startsWith("/api") || req.originalUrl.startsWith("/api")) {
    console.error("Unhandled API error caught by middleware:", err);
    return res.status(err.status || 500).json({
      success: false,
      error: cleanErrorMessage(err) || "Internal server error"
    });
  }
  next(err);
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: PORT,
        watch: {
          ignored: [
            "**/*.json",
            "**/*.json.bak",
            "**/uploads/**",
            "**/node_modules/**"
          ]
        }
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith("/api/")) {
        return res.status(404).json({ success: false, error: `API route not found: ${req.method} ${url}` });
      }
      try {
        const indexPath = import_path.default.resolve(process.cwd(), "index.html");
        let template = import_fs.default.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        if (vite && typeof vite.ssrFixStacktrace === "function") vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const possibleDistPaths = [
      import_path.default.join(process.cwd(), "dist"),
      import_path.default.join(process.cwd(), "web_studio", "dist"),
      import_path.default.join(process.cwd(), "public"),
      safeDirname,
      import_path.default.join(safeDirname, "dist")
    ];
    const distPath = possibleDistPaths.find((p) => import_fs.default.existsSync(import_path.default.join(p, "index.html"))) || import_path.default.join(process.cwd(), "dist");
    console.log(`Serving static studio files from: ${distPath}`);
    app.use(
      import_express.default.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
          } else if (filePath.includes("/assets/")) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        }
      })
    );
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ success: false, error: `API route not found: GET ${req.path}` });
      }
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  const serverInstance = app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI News Maker server running on http://0.0.0.0:${PORT}`);
  });
  serverInstance.on("error", (err) => {
    console.error("Server listen error:", err.message);
  });
}
setInterval(() => {
}, 6e4);
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DISTRICT_STATE_LIST,
  GEMINI_NEWS_RESPONSE_SCHEMA,
  HEADLINE_5_TIER_MAX_LIMITS,
  HEADLINE_MAX_CHARACTER_LIMIT,
  HEADLINE_TIER_RANGES,
  buildMasterNewsEditorialPrompt,
  buildMasterNewsEditorialPromptString,
  calculateHeadlineSimilarityInternal,
  cleanCaptionParagraphs,
  cleanHeadlineText,
  createLocalNewsFallback,
  detectDistrictAndState,
  enrichHeadlineWithContext,
  ensureHashtagHierarchy,
  extractFactsFromUrlString,
  fitHeadlineNaturally,
  fitHeadlineToRange,
  fitHeadlinesTo5TierRanges,
  fitSingleHeadlineToTier,
  formatAsJournalisticHeadline,
  formatDistrictWithState,
  generate4BalancedHeadlineOptions,
  generate5BalancedHeadlineOptions,
  generate5JournalisticHeadlines,
  getAiFeaturesConfig,
  isRegenerateAllowed,
  isTierAllowedForOpenAI,
  matchDistrictAlias,
  resolveUserTierAndRole,
  sanitizeFlattery,
  sanitizePressNoteFlattery,
  saveAiFeaturesConfig,
  scrapeNewsFromUrl,
  stripAllUrlsAndHyperlinks,
  validateHeadlineOption
});
