import sys

def modify_index():
    with open('src/index.ts', 'r') as f:
        content = f.read()

    # line 21447 and 21516
    content = content.replace(
        "const newToken = await signJWT({ sub: 'play_integrity_verified', env: env.ENVIRONMENT }, appSecret, 24 * 60 * 60); // 24 hours",
        "const newToken = await signJWT({ sub: 'play_integrity_verified', env: env.ENVIRONMENT, exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 }, appSecret); // 24 hours"
    )

    content = content.replace(
        "const newToken = await signJWT({ sub: 'play_integrity_verified', env: env.ENVIRONMENT }, appSecret, 24 * 60 * 60);",
        "const newToken = await signJWT({ sub: 'play_integrity_verified', env: env.ENVIRONMENT, exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 }, appSecret);"
    )

    with open('src/index.ts', 'w') as f:
        f.write(content)
    print("Fixed signJWT successfully.")

modify_index()
