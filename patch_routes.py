import sys

with open("src/index.ts", "r") as f:
    content = f.read()

search_block = """        else if (url.pathname === "/api/ai/chat")
          response = await handleAIChat(request, env);"""

replace_block = """        else if (url.pathname === "/api/ai/chat" && request.method === "POST")
          response = await handleAIChat(request, env);"""

if search_block in content:
    content = content.replace(search_block, replace_block)
    with open("src/index.ts", "w") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Search block not found")
