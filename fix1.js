const fs = require('fs');
let content = fs.readFileSync('src/index.ts', 'utf8');

// Fix handleCompleteLesson loop
content = content.replace(
  /if \(progress >= 100 && existingEnr\.progress < 100\) {/g,
  'if (progress >= 100 && existingEnr.status !== "completed") {'
);

// Fix handleUpdateProgress loop
content = content.replace(
  /if \(progress === 100 && existing\.progress < 100\) {/g,
  'if (progress === 100 && existing.status !== "completed") {'
);

// Fix webhook - transactions update & select (to support book_purchase as well)
// Fix 1: txForAmount query
content = content.replace(
  /SELECT amount_inr FROM Transactions WHERE razorpay_order_id = \? AND type = 'course_purchase'/g,
  "SELECT amount_inr FROM Transactions WHERE razorpay_order_id = ? AND type IN ('course_purchase', 'book_purchase')"
);

// Fix 2: Transactions update query
content = content.replace(
  /UPDATE Transactions SET status = 'successful' WHERE razorpay_order_id = \? AND type = 'course_purchase' AND status = 'created'/g,
  "UPDATE Transactions SET status = 'successful' WHERE razorpay_order_id = ? AND type IN ('course_purchase', 'book_purchase') AND status = 'created'"
);

// Fix 3: Enrollment notify logic in Webhook
content = content.replace(
  /const enrollment: any = await env\.DB\.prepare\(\s*"SELECT e\.user_id, c\.title FROM Enrollments e JOIN Courses c ON e\.course_id = c\.id WHERE e\.payment_id = \?",\s*\)\s*\.bind\(orderId\)\s*\.first\(\);/g,
  `const enrollment: any = await env.DB.prepare(
          "SELECT e.user_id, COALESCE(c.title, b.title) as title FROM Enrollments e LEFT JOIN Courses c ON e.course_id = c.id LEFT JOIN Books b ON e.book_id = b.id WHERE e.payment_id = ?",
        )
          .bind(orderId)
          .first();`
);


fs.writeFileSync('src/index.ts', content);
console.log("Replacements done.");
