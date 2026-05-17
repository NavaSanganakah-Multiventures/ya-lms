const fs = require('fs');

const file = 'src/index.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `        SELECT c.*, e.progress, e.status as enrollment_status, e.payment_status, e.payment_source, e.amount_paid,
               (SELECT MIN(NULLIF(COALESCE(b.group_class_credit_cost, 0), 0)) FROM Batches b WHERE b.course_id = c.id AND COALESCE(b.self_study_group_enabled, 1) = 1 AND b.status != 'completed') as min_group_class_credit_cost
        FROM Enrollments e
        JOIN Courses c ON e.course_id = c.id
        WHERE e.user_id = ? AND e.status IN ('active', 'completed')
        ORDER BY e.purchased_at DESC`;

const replace = `        SELECT c.*, cat.name as category_name, e.progress, e.status as enrollment_status, e.payment_status, e.payment_source, e.amount_paid,
               (SELECT MIN(NULLIF(COALESCE(b.group_class_credit_cost, 0), 0)) FROM Batches b WHERE b.course_id = c.id AND COALESCE(b.self_study_group_enabled, 1) = 1 AND b.status != 'completed') as min_group_class_credit_cost
        FROM Enrollments e
        JOIN Courses c ON e.course_id = c.id
        LEFT JOIN Categories cat ON c.category_id = cat.id
        WHERE e.user_id = ? AND e.status IN ('active', 'completed')
        ORDER BY e.purchased_at DESC`;

if (code.includes(target)) {
    code = code.replace(target, replace);
    fs.writeFileSync(file, code);
    console.log("Successfully patched src/index.ts");
} else {
    console.log("Target string not found in src/index.ts");
}
