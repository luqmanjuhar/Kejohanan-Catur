const fs = require('fs');
let content = fs.readFileSync('utils/ecert.ts', 'utf8');

const bad = `const loadImage = async (url: string): Promise<HTMLImageElement> => {
  const loadFromSrc = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    // Kalau ia base64 data URI, kita tak perlukan Anonymous
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'Anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load from src"));
    img.src = src;
  });

  // Cuba 1: Guna proxy AllOrigins (paling stabil untuk Google Drive - pulangkan base64)
  try {
    const response = await fetch(\`https://api.allorigins.win/get?url=\${encodeURIComponent(url)}\`);
    const data = await response.json();
    if (data && data.contents && data.contents.startsWith('data:image')) {
      return await loadFromSrc(data.contents);
    }
  } catch (err) {
    console.warn("AllOrigins base64 failed", err);
  }

  // Cuba 2: Guna CORS Proxy IO
  try {
    return await loadFromSrc(\`https://corsproxy.io/?\${encodeURIComponent(url)}\`);
  } catch (err) {
    console.warn("corsproxy.io failed", err);
  }

  // Cuba 3: Tarik direct dengan parameter cache-buster
  try {
    const urlWithCb = url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
    return await loadFromSrc(urlWithCb);
  } catch (err) {
    console.warn("Direct load failed", err);
  }

  throw new Error("Semua proksi gagal memuat turun gambar.");
};`;

const good = `const loadImage = async (url: string): Promise<HTMLImageElement> => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.error("Failed to load image from proxy:", url);
      reject(new Error("Gagal memuat turun gambar melalui proksi pelayan."));
    };
    // Gunakan proksi backend kita sendiri untuk bypass CORS sepenuhnya!
    img.src = \`/api/proxy-image?url=\${encodeURIComponent(url)}\`;
  });
};`;

if(content.includes(bad)) {
  content = content.replace(bad, good);
  fs.writeFileSync('utils/ecert.ts', content);
  console.log("Fixed loadImage in ecert.ts");
} else {
  console.log("Bug not found in ecert.ts");
}
