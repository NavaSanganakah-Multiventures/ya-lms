const fs = require('fs');

const file = 'app/dashboard/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const target1 = `<h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                    {getCourseTitle(course)}
                  </h3>`;

const replace1 = `<div className="flex items-center gap-2 text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    {course.category_name || 'General'}
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                    {getCourseTitle(course)}
                  </h3>`;

const target2 = `<h3 className="text-lg font-bold text-white mb-2">
                    {getCourseTitle(course)}
                  </h3>`;

const replace2 = `<div className="flex items-center gap-2 text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    {course.category_name || 'General'}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {getCourseTitle(course)}
                  </h3>`;

if (code.includes(target1)) {
    code = code.replace(target1, replace1);
    console.log("Successfully patched target 1 in app/dashboard/page.tsx");
} else {
    console.log("Target 1 not found");
}

if (code.includes(target2)) {
    code = code.replace(target2, replace2);
    console.log("Successfully patched target 2 in app/dashboard/page.tsx");
} else {
    console.log("Target 2 not found");
}

fs.writeFileSync(file, code);
