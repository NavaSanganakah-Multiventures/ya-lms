const fs = require('fs');
let code = fs.readFileSync('src/index.ts', 'utf8');

const funcs = [
  'handleAdminListBooks(request: Request, env: Env, bookId?: string): Promise<Response>',
  'handleAdminCreateBook(request: Request, env: Env): Promise<Response>',
  'handleAdminUpdateBook(request: Request, env: Env, bookId: string): Promise<Response>',
  'handleAdminDeleteBook(request: Request, env: Env, bookId: string): Promise<Response>',
  'handleAdminGetBookLessons(request: Request, env: Env, bookId: string): Promise<Response>',
  'handleAdminCreateBookLesson(request: Request, env: Env, bookId: string): Promise<Response>',
  'handleAdminUpdateBookLesson(request: Request, env: Env, bookId: string, lessonId: string): Promise<Response>',
  'handleAdminDeleteBookLesson(request: Request, env: Env, bookId: string, lessonId: string): Promise<Response>',
  'handleAdminGetCourseBooks(request: Request, env: Env, courseId: string): Promise<Response>',
  'handleAdminLinkBookToCourse(request: Request, env: Env, courseId: string, bookId: string): Promise<Response>',
  'handleAdminUnlinkBookFromCourse(request: Request, env: Env, courseId: string, bookId: string): Promise<Response>'
];

// Instead of regex, just find the string and replace 11 times.
const target = '\\\\n    await requireAdminOrTeacher(request, env);';

for (let i = 0; i < funcs.length; i++) {
  const replacement = 'async function ' + funcs[i] + ' {\\n  try {\\n    await requireAdminOrTeacher(request, env);';
  code = code.replace(target, replacement);
}

fs.writeFileSync('src/index.ts', code);
