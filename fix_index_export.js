const fs = require('fs');

let content = fs.readFileSync('src/index.ts', 'utf8');

// Is the class truly exported at the end? Yes, `export class NotificationManager`
// Let's verify `export default worker;`
if (content.includes('export default worker;')) {
    console.log("export default worker; is present.");
} else {
    console.log("WARNING: export default worker; missing!");
}
