async function test() {
  const url = 'https://drive.google.com/uc?export=download&id=1D5Fk_HhV5w3Gq2hR5uV0ZcT_qW_8W-Y8';
  let r = await fetch(url);
  console.log("Status:", r.status);
  console.log("Content-Type:", r.headers.get('content-type'));
}
test();
