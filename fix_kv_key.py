import sys

def modify_index():
    with open('src/index.ts', 'r') as f:
        content = f.read()

    # We will rename GOOGLE_SERVICE_ACCOUNT to PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON
    content = content.replace('"GOOGLE_SERVICE_ACCOUNT"', '"PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON"')

    with open('src/index.ts', 'w') as f:
        f.write(content)
    print("Fixed KV key successfully.")

modify_index()
