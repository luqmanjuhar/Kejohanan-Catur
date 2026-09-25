async function test() {
  const id = '1D5Fk_HhV5w3Gq2hR5uV0ZcT_qW_8W-Y8';
  const target = `https://drive.google.com/uc?id=${id}&export=download`;
  let r = await fetch(`https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(target)}`);
  console.log("Status:", r.status);
  console.log("CORS:", r.headers.get('access-control-allow-origin'));
  console.log("Type:", r.headers.get('content-type'));
}
test();
