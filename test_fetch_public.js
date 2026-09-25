async function test() {
  const url = 'https://picsum.photos/200/300';
  let r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  console.log("Status:", r.status);
}
test();
