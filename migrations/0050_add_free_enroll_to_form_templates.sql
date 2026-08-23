-- 0050: Add free_enroll flag to FormTemplates.
-- When enabled on a form template linked to a paid course/book, the submitter is granted
-- FREE access (payment_status='paid', amount_paid=0, payment_source='form-free-grant')
-- instead of an 'unpaid' enrollment that requires payment.
ALTER TABLE FormTemplates ADD COLUMN free_enroll INTEGER DEFAULT 0;
