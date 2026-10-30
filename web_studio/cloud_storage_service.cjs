/**
 * Google Cloud Storage Service
 * AI News Maker - Centralized Media Upload & Persistence Engine
 * 
 * Manages uploads, streaming, deletions, and public URL generation for:
 * - User Avatars
 * - Custom Logos & Branding
 * - Custom Fonts (.ttf, .otf, .woff, .woff2)
 * - Music Library & Audio Tracks
 * - Screenshots & Reward Proofs
 * - Admin Videos & Thumbnails
 * - Support Request Attachments
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { getMetadataAccessToken } = require('./server_firestore_adapter.cjs');

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 25,
});

class CloudStorageService {
  constructor(options = {}) {
    this.projectId = options.projectId || process.env.GOOGLE_CLOUD_PROJECT || 'ai-news-maker-app';
    this.bucketName = options.bucketName || process.env.GCS_BUCKET_NAME || 'ai-news-maker-app.firebasestorage.app';
    this.useGcs = options.useGcs !== undefined ? Boolean(options.useGcs) : (process.env.USE_GCS !== 'false');
    this.localUploadsDir = options.localUploadsDir || path.join(process.cwd(), 'public', 'uploads');
    this.webLocalUploadsDir = path.join(process.cwd(), 'web_studio', 'public', 'uploads');
  }

  async getAccessToken() {
    return await getMetadataAccessToken();
  }

  isGcsActive() {
    return Boolean(this.useGcs && this.bucketName);
  }

  /**
   * Upload or save a media file buffer to Google Cloud Storage (and local disk cache)
   * @param {Object} params
   * @param {Buffer} params.buffer - File buffer
   * @param {string} params.filename - Desired filename
   * @param {string} params.contentType - MIME type
   * @param {string} params.category - 'logos' | 'screenshots' | 'videos' | 'thumbnails' | 'fonts' | 'support' | 'music' | 'branding' | 'avatars'
   * @param {boolean} [params.publicRead=true] - Set object ACL to publicRead
   */
  async saveMedia(params) {
    const { buffer, filename, contentType = 'application/octet-stream', category = 'misc', publicRead = true } = params;

    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('Valid media buffer is required for saveMedia');
    }
    if (!filename) {
      throw new Error('Filename is required for saveMedia');
    }

    const gcsPath = `uploads/${category}/${filename}`;
    const localDir = path.join(this.localUploadsDir, category);
    const localFilePath = path.join(localDir, filename);

    // Save to local cache dir for development and low-latency local streaming
    try {
      fs.mkdirSync(localDir, { recursive: true });
      fs.writeFileSync(localFilePath, buffer);

      const webDir = path.join(this.webLocalUploadsDir, category);
      fs.mkdirSync(webDir, { recursive: true });
      fs.writeFileSync(path.join(webDir, filename), buffer);
    } catch (localErr) {
      console.warn(`[CloudStorageService] Warning: Could not write local cache file:`, localErr.message);
    }

    const localRelativeUrl = `/uploads/${category}/${filename}`;
    const canonicalPublicGcsUrl = `https://storage.googleapis.com/${this.bucketName}/${gcsPath}`;

    // If GCS is disabled, return local URL immediately
    if (!this.isGcsActive()) {
      return {
        success: true,
        url: localRelativeUrl,
        localUrl: localRelativeUrl,
        publicGcsUrl: null,
        gcsPath,
        storageProvider: 'local',
        filename,
        size: buffer.length,
        contentType,
      };
    }

    // Upload to Google Cloud Storage via REST API
    try {
      const token = await this.getAccessToken();
      if (!token) {
        console.warn(`[CloudStorageService] No GCS token available. Fallback to local storage: ${localRelativeUrl}`);
        return {
          success: true,
          url: localRelativeUrl,
          localUrl: localRelativeUrl,
          publicGcsUrl: canonicalPublicGcsUrl,
          gcsPath,
          storageProvider: 'local_fallback',
          filename,
          size: buffer.length,
          contentType,
        };
      }

      let uploadEndpoint = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(this.bucketName)}/o?uploadType=media&name=${encodeURIComponent(gcsPath)}`;
      if (publicRead) {
        uploadEndpoint += '&predefinedAcl=publicRead';
      }

      const uploadResult = await new Promise((resolve, reject) => {
        const uReq = https.request(
          uploadEndpoint,
          {
            method: 'POST',
            agent: httpsAgent,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': contentType,
              'Content-Length': buffer.length,
            },
            timeout: 30000,
          },
          (res) => {
            let body = '';
            res.on('data', (d) => (body += d));
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const parsed = JSON.parse(body);
                  resolve(parsed);
                } catch {
                  resolve({ status: res.statusCode });
                }
              } else {
                reject(new Error(`GCS Upload failed with HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
              }
            });
          }
        );

        uReq.on('error', (err) => reject(err));
        uReq.on('timeout', () => {
          uReq.destroy();
          reject(new Error('GCS upload timed out after 30000ms'));
        });

        uReq.write(buffer);
        uReq.end();
      });

      return {
        success: true,
        url: canonicalPublicGcsUrl,
        publicGcsUrl: canonicalPublicGcsUrl,
        localUrl: localRelativeUrl,
        gcsPath,
        bucket: this.bucketName,
        storageProvider: 'gcs',
        filename,
        size: buffer.length,
        contentType,
        generation: uploadResult?.generation,
      };
    } catch (gcsErr) {
      console.error(`[CloudStorageService] GCS upload error:`, gcsErr.message);
      // If GCS upload throws an error in development, fall back gracefully to local file
      return {
        success: true,
        url: localRelativeUrl,
        localUrl: localRelativeUrl,
        publicGcsUrl: canonicalPublicGcsUrl,
        gcsPath,
        storageProvider: 'local_fallback',
        warning: `GCS upload failed: ${gcsErr.message}`,
        filename,
        size: buffer.length,
        contentType,
      };
    }
  }

  /**
   * Delete a media file from Google Cloud Storage (and local disk cache)
   * @param {Object} params
   * @param {string} [params.url] - URL of the file
   * @param {string} [params.gcsPath] - Direct GCS path e.g. uploads/logos/abc.png
   * @param {string} [params.category] - File category
   * @param {string} [params.filename] - Filename
   */
  async deleteMedia(params) {
    let { url, gcsPath, category, filename } = params;

    if (!gcsPath && url) {
      // Parse from URL
      if (url.includes(`storage.googleapis.com/${this.bucketName}/`)) {
        gcsPath = url.split(`storage.googleapis.com/${this.bucketName}/`)[1];
      } else if (url.startsWith('/uploads/')) {
        gcsPath = url.replace(/^\//, '');
      }
    }

    if (!gcsPath && category && filename) {
      gcsPath = `uploads/${category}/${filename}`;
    }

    if (!gcsPath) {
      throw new Error('Could not determine gcsPath or URL for deleteMedia');
    }

    // Delete local cache if present
    try {
      const parts = gcsPath.split('/');
      if (parts.length >= 3 && parts[0] === 'uploads') {
        const cat = parts[1];
        const fn = parts[2];
        const p1 = path.join(this.localUploadsDir, cat, fn);
        const p2 = path.join(this.webLocalUploadsDir, cat, fn);
        if (fs.existsSync(p1)) fs.unlinkSync(p1);
        if (fs.existsSync(p2)) fs.unlinkSync(p2);
      }
    } catch (err) {
      console.warn(`[CloudStorageService] Warning: Could not remove local cache:`, err.message);
    }

    // Delete from GCS
    if (!this.isGcsActive()) {
      return { success: true, storageProvider: 'local' };
    }

    try {
      const token = await this.getAccessToken();
      if (!token) return { success: true, warning: 'No token to delete GCS object' };

      const deleteEndpoint = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(this.bucketName)}/o/${encodeURIComponent(gcsPath)}`;
      await new Promise((resolve, reject) => {
        const dReq = https.request(
          deleteEndpoint,
          {
            method: 'DELETE',
            agent: httpsAgent,
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          },
          (res) => {
            if (res.statusCode === 204 || res.statusCode === 200 || res.statusCode === 404) {
              resolve();
            } else {
              reject(new Error(`GCS Delete returned status ${res.statusCode}`));
            }
          }
        );
        dReq.on('error', (err) => reject(err));
        dReq.on('timeout', () => {
          dReq.destroy();
          resolve(); // don't fail hard on timeout
        });
        dReq.end();
      });

      return { success: true, gcsPath, storageProvider: 'gcs' };
    } catch (delErr) {
      console.warn(`[CloudStorageService] Warning on GCS delete:`, delErr.message);
      return { success: true, warning: delErr.message };
    }
  }

  /**
   * Express middleware to serve or redirect /uploads/:category/:filename seamlessly.
   * If file exists on local disk, it passes through to express.static.
   * If file does NOT exist on local disk (e.g. fresh Cloud Run instance),
   * it 302 redirects directly to GCS or streams it.
   */
  createUploadsMiddleware() {
    return (req, res, next) => {
      const rawPath = req.path.replace(/^\//, '');
      const localFilePath = path.join(this.localUploadsDir, rawPath);

      if (fs.existsSync(localFilePath)) {
        return next();
      }

      // If not present locally and GCS is active, redirect to GCS public URL
      if (this.isGcsActive()) {
        const gcsRedirectUrl = `https://storage.googleapis.com/${this.bucketName}/uploads/${rawPath}`;
        return res.redirect(302, gcsRedirectUrl);
      }

      next();
    };
  }
}

const defaultCloudStorageService = new CloudStorageService();

module.exports = {
  CloudStorageService,
  defaultCloudStorageService,
};
