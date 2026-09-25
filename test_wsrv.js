async function test() {
  const id = '1D5Fk_HhV5w3Gq2hR5uV0ZcT_qW_8W-Y8';
  const target = `drive.google.com/thumbnail?id=${id}&sz=w1500`;
  const url = `https://wsrv.nl/?url=${encodeURIComponent(target)}&output=jpg`;
  console.log("Fetching", url);
  let r = await fetch(url);
  console.log("Status:", r.status);
  console.log("CORS:", r.headers.get('access-control-allow-origin'));
  console.log("Content-type:", r.headers.get('content-type'));
}
test();
