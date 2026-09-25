async function test() {
  const id = '1D5Fk_HhV5w3Gq2hR5uV0ZcT_qW_8W-Y8';
  const target = `https://drive.google.com/uc?id=${id}&export=download`;
  const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(target)}`);
  const data = await r.json();
  console.log("Allorigins get base64 start:", data.contents.substring(0, 50));
}
test();
