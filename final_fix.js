const fs = require('fs');
let code = fs.readFileSync('src/index.ts', 'utf8');

const replacements = [
  { func: 'handleAdminListBooks(request: Request, env: Env, bookId?: string): Promise<Response>', line: 7238 },
  { func: 'handleAdminCreateBook(request: Request, env: Env): Promise<Response>', line: 7265 },
  { func: 'handleAdminUpdateBook(request: Request, env: Env, bookId: string): Promise<Response>', line: 7293 },
  { func: 'handleAdminDeleteBook(request: Request, env: Env, bookId: string): Promise<Response>', line: 7320 },
  { func: 'handleAdminGetBookLessons(request: Request, env: Env, bookId: string): Promise<Response>', line: 7334 },
  { func: 'handleAdminCreateBookLesson(request: Request, env: Env, bookId: string): Promise<Response>', line: 7346 },
  { func: 'handleAdminUpdateBookLesson(request: Request, env: Env, bookId: string, lessonId: string): Promise<Response>', line: 7381 },
  { func: 'handleAdminDeleteBookLesson(request: Request, env: Env, bookId: string, lessonId: string): Promise<Response>', line: 7425 },
  { func: 'handleAdminGetCourseBooks(request: Request, env: Env, courseId: string): Promise<Response>', line: 7451 },
  { func: 'handleAdminLinkBookToCourse(request: Request, env: Env, courseId: string, bookId: string): Promise<Response>', line: 7461 },
  { func: 'handleAdminUnlinkBookFromCourse(request: Request, env: Env, courseId: string, bookId: string): Promise<Response>', line: 7472 }
];

// Instead of relying on exact lines, we just replace them sequentially, since we know they appear in this exact order.
let occurrence = 0;
code = code.replace(/\\n\s*await requireAdminOrTeacher\(request, env\);/g, () => {
  if (occurrence < replacements.length) {
    const signature = replacements[occurrence].func;
    occurrence++;
    return \`async function \${signature} {\\n  try {\\n    await requireAdminOrTeacher(request, env);\`;
  }
  return '\\n    await requireAdminOrTeacher(request, env);';
});

fs.writeFileSync('src/index.ts', code);
console.log('Restored all function signatures successfully!');
