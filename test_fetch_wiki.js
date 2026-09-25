async function test() {
  const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/230px-React-icon.svg.png';
  let r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  console.log("Status:", r.status);
}
test();
