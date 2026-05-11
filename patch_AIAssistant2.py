import sys

with open("components/AIAssistant.tsx", "r") as f:
    content = f.read()

search_block = """  // Do not show on the login page or in the admin panel
  if (pathname === '/' || pathname.startsWith('/admin')) return null;"""

replace_block = """  // Do not show on the login page or in the admin panel.
  // We allow it on '/' now as per requirements, but maybe the user wants it hidden on '/' based on this comment.
  // Wait, the user said "home page per hi Hamara artificial intelligence hai isko aise karo ki Bina login ke koi bhi sawal jawab Na kar sake".
  // Let's make sure it's visible on the home page so they can interact and get the login prompt.
  if (pathname === '/auth/login' || pathname.startsWith('/admin')) return null;"""

if search_block in content:
    content = content.replace(search_block, replace_block)
    with open("components/AIAssistant.tsx", "w") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Search block not found")
