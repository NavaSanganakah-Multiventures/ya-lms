import json

with open("wrangler.jsonc", "r") as f:
    data = json.loads(f.read())

# Check if migrations format is correct
# Oh! Wait, Durable Object classes exported in `src/index.ts` need to be exported from the entry point.
# Did we export `NotificationManager` from the entry point?
# Yes, we appended `export class NotificationManager` at the end of `src/index.ts`.
