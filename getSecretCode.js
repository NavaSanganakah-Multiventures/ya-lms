const fs = require('fs');
const content = fs.readFileSync('src/index.ts', 'utf8');

const regex = /async function getSecret\b[\s\S]*?\n\}/;
const match = content.match(regex);
console.log(match ? match[0] : "Not found");
