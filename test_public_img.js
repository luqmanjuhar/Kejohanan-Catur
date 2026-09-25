async function test() {
  // A public image from Wikimedia
  const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/230px-React-icon.svg.png';
  let r = await fetch(`http://localhost:3000/api/proxy-image?url=${encodeURIComponent(url)}`);
  console.log("Status:", r.status);
  console.log("Content-Type:", r.headers.get('content-type'));
}
test();
