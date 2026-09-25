async function test() {
  const id = '1D5Fk_HhV5w3Gq2hR5uV0ZcT_qW_8W-Y8';
  
  const target = `https://drive.google.com/thumbnail?id=${id}&sz=w1500`;
  
  let r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(target)}`);
  let text = await r.text();
  console.log("AllOrigins response:", text.substring(0, 150));
}
test();
