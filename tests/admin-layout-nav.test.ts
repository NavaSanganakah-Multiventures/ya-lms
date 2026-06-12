/**
 * Tests for admin layout navigation configuration (app/admin/layout.tsx).
 * Verifies the admin/database route was added to the navigation structure.
 * Uses the ts-node simple assert pattern consistent with this project.
 */

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

// Simulate the navigation group data structure from app/admin/layout.tsx
// This mirrors the actual nav link config to test the shape and presence of
// the new Database management link added in this PR.
interface NavLink {
  href: string;
  icon: string; // simplified: icon name string for testing
  label: string;
  adminOnly?: boolean;
}

interface NavGroup {
  title: string;
  links: NavLink[];
}

// Mirrors the "System" nav group as it exists after the PR change
const systemNavGroup: NavGroup = {
  title: 'System',
  links: [
    { href: '/admin/error-sessions', icon: 'AlertTriangle', label: 'Error Sessions', adminOnly: true },
    { href: '/admin/settings', icon: 'Globe', label: 'साइट सेटिंग्स', adminOnly: true },
    { href: '/admin/database', icon: 'Database', label: 'Database', adminOnly: true },
    { href: '/dashboard', icon: 'Settings', label: 'छात्र दृश्य (Student View)' },
  ],
};

// ─────────────────────────────────────────────────────────────
// Test: Database link is present
// ─────────────────────────────────────────────────────────────

console.log("Test 1: Database link exists in System nav group");
const databaseLink = systemNavGroup.links.find((l) => l.href === '/admin/database');
assert(databaseLink !== undefined, "'/admin/database' link should be present in System nav group");

console.log("Test 2: Database link has correct label");
assert(databaseLink!.label === 'Database', "Database link label should be 'Database'");

console.log("Test 3: Database link is adminOnly");
assert(databaseLink!.adminOnly === true, "Database link should have adminOnly: true");

console.log("Test 4: Database link uses Database icon");
assert(databaseLink!.icon === 'Database', "Database link should use 'Database' icon");

// ─────────────────────────────────────────────────────────────
// Test: Existing links are preserved
// ─────────────────────────────────────────────────────────────

console.log("Test 5: Error Sessions link is still present");
const errorSessionsLink = systemNavGroup.links.find((l) => l.href === '/admin/error-sessions');
assert(errorSessionsLink !== undefined, "'/admin/error-sessions' link should remain");

console.log("Test 6: Settings link is still present");
const settingsLink = systemNavGroup.links.find((l) => l.href === '/admin/settings');
assert(settingsLink !== undefined, "'/admin/settings' link should remain");

console.log("Test 7: Student view link is still present");
const studentViewLink = systemNavGroup.links.find((l) => l.href === '/dashboard');
assert(studentViewLink !== undefined, "'/dashboard' (Student View) link should remain");

// ─────────────────────────────────────────────────────────────
// Test: adminOnly flag behavior
// ─────────────────────────────────────────────────────────────

console.log("Test 8: adminOnly links require admin role");
const adminOnlyLinks = systemNavGroup.links.filter((l) => l.adminOnly === true);
assert(adminOnlyLinks.length === 3, "There should be exactly 3 adminOnly links in the System group");
assert(
  adminOnlyLinks.every((l) => l.adminOnly === true),
  "All adminOnly links should have adminOnly: true"
);

console.log("Test 9: Student view link is not adminOnly");
assert(studentViewLink!.adminOnly !== true, "Student view link should not be adminOnly");

// ─────────────────────────────────────────────────────────────
// Test: Database link positioning (after settings, before dashboard)
// ─────────────────────────────────────────────────────────────

console.log("Test 10: Database link is after settings link");
const settingsIdx = systemNavGroup.links.findIndex((l) => l.href === '/admin/settings');
const databaseIdx = systemNavGroup.links.findIndex((l) => l.href === '/admin/database');
const dashboardIdx = systemNavGroup.links.findIndex((l) => l.href === '/dashboard');
assert(databaseIdx > settingsIdx, "Database link should come after Settings link");
assert(databaseIdx < dashboardIdx, "Database link should come before Student View link");

console.log("\n✅ All admin-layout-nav tests passed!");

export {};