import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(cors());
  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));

  // Health check endpoint for Cloud Run
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  const PG_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyWC9iylUvTB6fPpl6JtYAAeczatsmSd29RylR6m1_Zx7qUkAg1QhF0UNaUvYfZo3Kv/exec';
  const PG_SS_ID = '1fzAo5ZLVS_Bt7ZYg2QE1jolakE_99gL42IBW5x2e890';

  // Backend API route to push configuration and orientation directly to Google Sheet
  app.post('/api/update-config', async (req, res) => {
    try {
      const { config, spreadsheetId } = req.body;
      if (!config) {
        return res.status(400).json({ error: 'Objek konfigurasi diperlukan.' });
      }

      const targetSsId = spreadsheetId || PG_SS_ID;
      
      // Pastikan setiap templat E-Cert mempunyai orientasi dan simpan ke templat & fields untuk keserasian skrip
      if (Array.isArray(config.ecertTemplates)) {
        config.ecertTemplates = config.ecertTemplates.map((t: any) => {
          const orientation = t.orientation || 'landscape';
          return {
            ...t,
            orientation,
            fields: {
              ...t.fields,
              orientation: orientation // Keserasian jika Google Apps Script masih versi lama
            }
          };
        });
      }

      console.log('Menyegerak konfigurasi E-Cert ke Google Sheet melalui Google Apps Script...');
      const payload = {
        action: 'updateConfig',
        spreadsheetId: targetSsId,
        config: config
      };

      const response = await fetch(PG_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`Google Apps Script ralat HTTP status: ${response.status}`);
      }

      const responseText = await response.text();
      let responseJson: any = {};
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        responseJson = { raw: responseText };
      }

      if (responseJson && responseJson.error) {
        throw new Error(responseJson.error);
      }

      console.log('Konfigurasi berjaya disimpan ke Google Sheet:', responseJson);
      return res.json({
        success: true,
        message: 'Konfigurasi termasuk tetapan orientasi berjaya disimpan ke Google Sheet.',
        result: responseJson,
        config: config
      });
    } catch (error: any) {
      console.error('Ralat semasa mengemaskini konfigurasi ke Google Sheet:', error);
      return res.status(500).json({ 
        error: error.message || 'Gagal menyimpan konfigurasi ke Google Sheet' 
      });
    }
  });

  // Backend API route to upload and auto-rename PDF documentation
  app.post('/api/upload-document', async (req, res) => {
    try {
      const { regId, schoolCode, schoolName, schoolType, docType, fileName, base64File, driveUrl, folderId, spreadsheetId } = req.body;
      if (!regId) {
        return res.status(400).json({ error: 'ID Pendaftaran diperlukan.' });
      }

      const targetFolderId = (folderId || '1z8f7sHF_AOX39IJDhRYMZAM5tYejvDiR').trim();
      const targetSsId = spreadsheetId || PG_SS_ID;
      const cleanSchoolName = (schoolName || 'SEKOLAH').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      const cleanSchoolCode = (schoolCode || 'KOD').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      const cleanRegId = regId.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      const isSecondary = (schoolType || '').toUpperCase().includes('MENENGAH');

      let typeTag = 'DOKUMEN';
      if (docType === 'borang') typeTag = isSecondary ? 'BORANG_M01' : 'BORANG_R01';
      else if (docType === 'ic') typeTag = 'SALINAN_IC_MYKID';
      else if (docType === 'kebenaran') typeTag = 'KEBENARAN_KEJOHANAN';
      else if (docType === 'media') typeTag = 'KEBENARAN_MEDIA';
      else typeTag = 'DOKUMEN_KOMPILASI';

      const targetFileName = fileName || `${cleanSchoolCode}_${cleanSchoolName}_${typeTag}_${cleanRegId}.pdf`;

      console.log(`Memproses muat naik dokumen (${docType || 'all'}) bagi ${cleanRegId} -> ${targetFileName}... (Target Folder: ${targetFolderId})`);

      const payload = {
        action: 'uploadDocument',
        spreadsheetId: targetSsId,
        regId: regId,
        schoolCode: cleanSchoolCode,
        schoolName: cleanSchoolName,
        schoolType: schoolType || '',
        docType: docType || 'all',
        fileName: targetFileName,
        base64File: base64File,
        driveUrl: driveUrl,
        folderId: targetFolderId,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(PG_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`Google Apps Script HTTP status: ${response.status}`);
      }

      const responseText = await response.text();
      let responseJson: any = {};
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        responseJson = { raw: responseText };
      }

      if (responseJson && responseJson.error) {
        throw new Error(responseJson.error);
      }

      return res.json({
        success: true,
        docType: docType || 'all',
        fileName: targetFileName,
        fileUrl: responseJson.fileUrl || driveUrl || '',
        message: `Dokumen ${typeTag} berjaya dimuat naik dan direkodkan.`,
        result: responseJson
      });
    } catch (error: any) {
      console.error('Ralat semasa muat naik dokumen:', error);
      return res.status(500).json({
        error: error.message || 'Gagal memproses muat naik dokumen'
      });
    }
  });

  // Backend API route to sync/save/update registration reliably
  app.post('/api/sync-registration', async (req, res) => {
    try {
      const payload = req.body;
      const targetSsId = payload.spreadsheetId || PG_SS_ID;
      const fullPayload = {
        ...payload,
        spreadsheetId: targetSsId,
        timestamp: payload.timestamp || new Date().toISOString()
      };

      console.log(`Menyegerak pendaftaran [${payload.action || 'submit'}] bagi ID: ${payload.registrationId || 'BARU'}...`);

      const response = await fetch(PG_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(fullPayload),
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`Google Apps Script HTTP status: ${response.status}`);
      }

      const responseText = await response.text();
      let responseJson: any = {};
      try {
        responseJson = JSON.parse(responseText);
      } catch (e) {
        responseJson = { raw: responseText };
      }

      if (responseJson && responseJson.error) {
        console.warn('Apps Script returned error during sync-registration:', responseJson.error);
        return res.status(400).json(responseJson);
      }

      return res.json(responseJson);
    } catch (error: any) {
      console.error('Ralat semasa menyegerak pendaftaran:', error);
      return res.status(500).json({
        error: error.message || 'Gagal menyegerak pendaftaran ke Google Sheet'
      });
    }
  });

  // Helper to fetch from Google Apps Script handling 302 redirects reliably
  async function fetchGoogleAppsScript(url: string, retries = 2): Promise<Response> {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': '*/*'
          },
          redirect: 'manual'
        });

        if (response.status === 302 || response.status === 301) {
          const location = response.headers.get('location');
          if (location) {
            const redirectResponse = await fetch(location, {
              headers: {
                'User-Agent': userAgent,
                'Accept': '*/*'
              }
            });
            if (redirectResponse.ok) {
              return redirectResponse;
            }
          }
        } else if (response.ok) {
          return response;
        }

        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      } catch (e) {
        if (attempt === retries) throw e;
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    // Fallback: regular fetch
    return fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': '*/*'
      },
      redirect: 'follow'
    });
  }

  // Backend API route to load all data reliably bypassing jsonp
  app.get('/api/load-all', async (req, res) => {
    try {
      const ssId = (req.query.spreadsheetId as string) || PG_SS_ID;
      const targetUrl = `${PG_SCRIPT_URL}?action=loadAll&spreadsheetId=${encodeURIComponent(ssId)}`;
      const response = await fetchGoogleAppsScript(targetUrl);

      if (!response.ok) {
        throw new Error(`Gagal memuat turun data dari Google Apps Script: ${response.status}`);
      }

      const data: any = await response.json();
      
      // Selaraskan orientasi templat E-Cert
      if (data && data.config && Array.isArray(data.config.ecertTemplates)) {
        data.config.ecertTemplates = data.config.ecertTemplates.map((t: any) => {
          const orientation = t.orientation || t.fields?.orientation || t.fields?._orientation || 'landscape';
          const cleanFields = { ...t.fields };
          delete cleanFields.orientation;
          delete cleanFields._orientation;
          return {
            ...t,
            orientation,
            fields: cleanFields
          };
        });
      }

      return res.json(data);
    } catch (error: any) {
      console.error('Ralat backend load-all:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Proxy route for images to bypass CORS
  app.get('/api/proxy-image', async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      console.log("Proxying image:", url);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image. Status: ${response.status}`);
      }

      // Check content type to ensure we are actually getting an image
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.startsWith('image/')) {
        // Warning: It's not an image, might be a Google Drive warning page or something else
        console.warn(`URL returned non-image content type: ${contentType}`);
      }

      // Pipe the image buffer back to the client
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      res.set('Content-Type', contentType || 'image/jpeg');
      // Set caching headers so the browser caches the image proxy response
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch (error: any) {
      console.error('Image proxy error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Static production serving vs development Vite middleware
  const distPath = path.join(process.cwd(), 'dist');
  let hasDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isCloudRun = !!process.env.K_SERVICE || !!process.env.K_REVISION;

  // If in production/Cloud Run environment and dist is missing, build it automatically
  if (!hasDist && (isCloudRun || process.env.NODE_ENV === 'production')) {
    console.log('dist/index.html not found in production environment! Triggering Vite build...');
    try {
      const { build } = await import('vite');
      await build();
      hasDist = fs.existsSync(path.join(distPath, 'index.html'));
      console.log('Vite build completed. hasDist:', hasDist);
    } catch (buildErr) {
      console.error('Automatic Vite build failed:', buildErr);
    }
  }

  const isProduction = (process.env.NODE_ENV === 'production' || isCloudRun || (process.env.NODE_ENV !== 'development' && hasDist)) && hasDist;

  if (isProduction && hasDist) {
    // Production: serve built files from dist
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  } else {
    // Development or fallback: Vite middleware
    console.log('Starting Vite server in middleware mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT} (${isProduction ? 'production' : 'development'})`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

startServer();
