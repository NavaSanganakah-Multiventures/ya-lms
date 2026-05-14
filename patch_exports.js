const fs = require('fs');

let file = fs.readFileSync('src/index.ts', 'utf8');

// There are two "export default worker;" lines. We only need the one at the end of the file.
// Or we can just remove the second one. Let's see the context.
const parts = file.split('export default worker;');
if (parts.length > 2) {
   // Assuming the last one is our trailing code we added or an extra duplicate
   file = parts[0] + 'export default worker;' + parts[1] + parts[2];
}

fs.writeFileSync('src/index.ts', file);
