const fs = require('fs');

let config = JSON.parse(fs.readFileSync('wrangler.jsonc', 'utf8'));

console.log(JSON.stringify(config.migrations, null, 2));
