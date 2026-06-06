const fs = require('fs');

let config = JSON.parse(fs.readFileSync('wrangler.jsonc', 'utf8'));

// If `new_sqlite_classes` is required in Cloudflare's newest updates:
config.migrations = [
  {
    tag: "v1",
    new_sqlite_classes: ["NotificationManager"],
    new_classes: ["NotificationManager"]
  }
];

fs.writeFileSync('wrangler.jsonc', JSON.stringify(config, null, 2));
