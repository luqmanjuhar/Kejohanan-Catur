async function test() {
  const id = '1D5Fk_HhV5w3Gq2hR5uV0ZcT_qW_8W-Y8';
  const target = `https://drive.google.com/uc?id=${id}&export=download`;
  
  const proxies = [
    `https://cors-anywhere.herokuapp.com/${target}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    `https://proxy.cors.sh/${target}`
  ];
  
  for(let p of proxies) {
    try {
        let r = await fetch(p);
        console.log(p, "->", r.status, r.headers.get('content-type'));
    } catch(e) {
        console.log(p, "-> Error");
    }
  }
}
test();
