import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

  // Backend API route to load all data reliably bypassing jsonp
  app.get('/api/load-all', async (req, res) => {
    try {
      const ssId = (req.query.spreadsheetId as string) || PG_SS_ID;
      const response = await fetch(`${PG_SCRIPT_URL}?action=loadAll&spreadsheetId=${encodeURIComponent(ssId)}`, {
        headers: {
          'Accept': 'application/json'
        },
        redirect: 'follow'
      });

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built files from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
