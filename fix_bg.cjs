const fs = require('fs');
let content = fs.readFileSync('components/SetupModal.tsx', 'utf8');

const bad = `        ecertTemplates.push({
          id: ecertRows[i][0].toLowerCase().replace(/\\s+/g, '-'),
          name: ecertRows[i][0],
          orientation: orientation,
          fields: fields
        });`;

const good = `        ecertTemplates.push({
          id: ecertRows[i][0].toLowerCase().replace(/\\s+/g, '-'),
          name: ecertRows[i][0],
          backgroundUrl: ecertRows[i][1],
          orientation: orientation,
          fields: fields
        });`;

if(content.includes(bad)) {
  content = content.replace(bad, good);
  fs.writeFileSync('components/SetupModal.tsx', content);
  console.log("Fixed backgroundUrl bug");
} else {
  console.log("Bug not found");
}
