with open('src/index.ts', 'r') as f:
    content = f.read()

content = content.replace("    if (isReady && downloadUrl && env.STORAGE) {\n      // Stream directly to R2 to avoid OOM\n      const fileRes = await fetch(downloadUrl);\n      if (fileRes.ok && fileRes.body) {",
"    if (isReady && downloadUrl && env.STORAGE) {\n      const apiToken = await getSecret(env, 'CLOUDFLARE_API_TOKEN', false) || await getSecret(env, 'CF_API_TOKEN', false);\n      // Stream directly to R2 to avoid OOM\n      const fileRes = await fetch(downloadUrl, {\n        headers: {\n          'Authorization': `Bearer ${apiToken}`\n        }\n      });\n      if (fileRes.ok && fileRes.body) {")

content = content.replace("    if (env.STORAGE) {\n       // Stream directly to R2 to avoid OOM\n       const fileRes = await fetch(downloadUrl);\n       if (fileRes.ok && fileRes.body) {",
"    if (env.STORAGE) {\n       const apiToken = await getSecret(env, 'CLOUDFLARE_API_TOKEN', false) || await getSecret(env, 'CF_API_TOKEN', false);\n       // Stream directly to R2 to avoid OOM\n       const fileRes = await fetch(downloadUrl, {\n         headers: {\n           'Authorization': `Bearer ${apiToken}`\n         }\n       });\n       if (fileRes.ok && fileRes.body) {")

with open('src/index.ts', 'w') as f:
    f.write(content)
