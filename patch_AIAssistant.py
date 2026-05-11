import sys

with open("components/AIAssistant.tsx", "r") as f:
    content = f.read()

search_block = """      if (res.ok) {
        const data = await res.json() as any;
        setMessages(prev => [...prev, { role: 'ai', content: data.reply || 'कार्य पूर्ण हुआ।' }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: 'सिस्टम में तकनीकी समस्या है, कृपया बाद में प्रयास करें।' }]);
      }"""

replace_block = """      if (res.ok) {
        const data = await res.json() as any;
        setMessages(prev => [...prev, { role: 'ai', content: data.reply || 'कार्य पूर्ण हुआ।' }]);
      } else if (res.status === 401) {
        setMessages(prev => [...prev, { role: 'ai', content: 'कृपया AI सहायक का उपयोग करने के लिए लॉगिन करें। (Please log in to use the AI Assistant)' }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: 'सिस्टम में तकनीकी समस्या है, कृपया बाद में प्रयास करें।' }]);
      }"""

if search_block in content:
    content = content.replace(search_block, replace_block)
    with open("components/AIAssistant.tsx", "w") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Search block not found")
