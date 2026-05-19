1. **Analyze `app/admin/credits/page.tsx` for Missing ARIA Labels:**
   - Identified two icon-only buttons (`RefreshCw`, `ToggleRight`/`ToggleLeft`, and `Trash2`) without `aria-label` or `title` attributes.

2. **Add `aria-label` and `title` to the `RefreshCw` button:**
   - Update line 161 to include `aria-label="Refresh Data"` and `title="Refresh Data"`.

3. **Add `aria-label` and `title` to the `TogglePack` button:**
   - Update line 268 to include `aria-label={pack.is_active === 1 ? 'Deactivate pack' : 'Activate pack'}` and `title={pack.is_active === 1 ? 'Deactivate pack' : 'Activate pack'}`.

4. **Add `aria-label` and `title` to the `DeletePack` button:**
   - Update line 271 to include `aria-label="Delete pack"` and `title="Delete pack"`.

5. **Verify Changes:**
   - Run `pnpm lint` and `pnpm test` (if applicable) to ensure the changes are valid and do not break the build.

6. **Complete Pre-Commit Steps:**
   - Use `pre_commit_instructions` to ensure proper testing, verification, review, and reflection are done.

7. **Submit the PR:**
   - Use `submit` to push the changes with the PR format specified in the instructions.
