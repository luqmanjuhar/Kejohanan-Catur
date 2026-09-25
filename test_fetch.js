async function test() {
  const url = 'https://drive.google.com/thumbnail?id=1D5Fk_HhV5w3Gq2hR5uV0ZcT_qW_8W-Y8&sz=w1500';
  let r = await fetch(url);
  console.log("Status:", r.status);
  let text = await r.text();
  console.log(text.substring(0, 200));
}
test();
