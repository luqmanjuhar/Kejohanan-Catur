const fs = require('fs');
let content = fs.readFileSync('components/SetupModal.tsx', 'utf8');

const bad = `  if (reg.teachers.length > 0) {
    const last4 = phone.slice(-4);
    if (last4 === password) {`;

const good = `  if (reg.teachers.length > 0) {
    const phone = String(reg.teachers[0].phone || '').replace(/\\D/g, '');
    const last4 = phone.slice(-4);
    if (last4 === password) {`;

if(content.includes(bad)) {
  content = content.replace(bad, good);
  fs.writeFileSync('components/SetupModal.tsx', content);
  console.log("Fixed phone bug");
} else {
  console.log("Bug not found");
}
