# डेवलपमेंट एनवायरनमेंट कॉन्फ़िगरेशन

## अवलोकन
यह दस्तावेज़ VSCode, IDX, Kilo, OpenCode, और अन्य डेवलपमेंट टूल कॉन्फ़िगरेशन का विवरण प्रदान करता है।

---

## 1. VSCode कॉन्फ़िगरेशन

### फ़ाइल: `.vscode/settings.json`

```json
{
  // TypeScript ऑटो-क्लोज़िंग टैग अक्षम
  "typescript.preferences.autoClosingTags": false,
  
  // IDX AI चैट को एडिटर टैब में सक्षम
  "IDX.webInspector.port": 0,
  
  // एजेंटिक वर्कस्पेस सक्षम
  "IDX.agenticWorkspace.enabled": true
}
```

---

## 2. IDX डेवलपमेंट एनवायरनमेंट

### फ़ाइल: `.idx/dev.nix`

Nix-आधारित विकास वातावरण:

```nix
{
  # Node.js 22 + pnpm
  packages = [nodejs_22 pkgs.pnpm];
  
  # ESLint एक्सटेंशन
  extensions = ["dbaeumer.vscode-eslint"];
  
  # onCreate: pnpm install
  onCreate.command = "pnpm install";
  
  # onStart: pnpm run dev
  onStart.command = "pnpm run dev";
  
  # वेब प्रीव्यू
  previews = {
    web = {
      command = ["$PORT"];
      manager = "web";
    };
  };
}
```

**मुख्य विशेषताएं:**
- Node.js 22 + pnpm प्री-इंस्टॉल
- ESLint एक्सटेंशन प्री-लोडेड
- स्वचालित `pnpm install` और `pnpm run dev`
- वेब प्रीव्यू कॉन्फ़िगरेशन

---

## 3. Kilo कॉन्फ़िगरेशन

### फ़ाइलें: `.kilo/`

| फ़ाइल | विवरण |
|-------|--------|
| `agent-manager.json` | एजेंट मैनेजर स्थिति: 1 वर्कट्री, 11 सत्र, टैब ऑर्डरिंग |
| `.gitignore` | node_modules, package फ़ाइलें, agent-manager.json इग्नोर |
| `worktrees/` | वर्कट्री डायरेक्टरी (खाली) |

**agent-manager.json विवरण:**
- 1 वर्कट्री: `feat/push-with-emails` → PR #376 (बंद)
- 11 सत्र इतिहास
- टैब ऑर्डरिंग और साइडबार स्थिति

---

## 4. OpenCode कॉन्फ़िगरेशन

### फ़ाइलें: `.opencode/`

| फ़ाइल | विवरण |
|-------|--------|
| `.gitignore` | node_modules, package फ़ाइलें इग्नोर |
| `plans/book-admin-fix.md` | पुस्तक एडमिन फिक्स योजना (373 लाइनें) |

**book-admin-fix.md योजना:**
- बुक API रूट्स + एडमिन ऑथ वायरिंग
- इनपुट वैलिडेशन जोड़ना
- ट्रिपल-फ़ेच useEffect फिक्स (66% API कमी)
- एरर मैसेज सुधार
- परीक्षण चरण

---

## 5. Git कॉन्फ़िगरेशन

### `.gitignore`
इग्नोर किए गए पैटर्न:
```
node_modules/
.next/
coverage/
.env
.vercel
.wrangler
flutter/student_app/ios/
flutter/student_app/linux/
flutter/student_app/macos/
flutter/student_app/web/
flutter/student_app/windows/
flutter/admin_app/linux/
flutter/admin_app/ios/
flutter/admin_app/macos/
flutter/admin_app/web/
flutter/admin_app/windows/
```

### `.npmrc`
```
package-lock=true
legacy-peer-deps=true
fund=false
audit=false
```

### `pnpm-workspace.yaml`
- खाली `packages` एरे
- `onlyBuiltDependencies` सूची
- `closure-net` के लिए ओवरराइड्स

---

यह दस्तावेज़ डेवलपमेंट एनवायरनमेंट कॉन्फ़िगरेशन का विवरण प्रदान करता है।
