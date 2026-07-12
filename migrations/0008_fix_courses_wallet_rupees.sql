-- Migration number: 0008 	 2026-07-12T08:44:00.000Z
-- Fix: Courses.wallet_rupees was being divided by 20 instead of 10 in v005 migration
-- (db-migrate.ts line 524: / 20.0 was used instead of / 10.0)
-- This corrects existing data to the proper value.

UPDATE Courses 
SET wallet_rupees = (COALESCE(self_study_credit_cost, 0) + COALESCE(individual_class_credit_cost, 0)) / 10.0 
WHERE (COALESCE(self_study_credit_cost, 0) + COALESCE(individual_class_credit_cost, 0)) > 0;
