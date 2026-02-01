-- Migration: Revert categories from allowedTypes[] to type field
-- This reverts the structure to match your code files

BEGIN;

-- Step 1: Add the 'type' column if it doesn't exist
ALTER TABLE categories ADD COLUMN IF NOT EXISTS type "TransactionType";

-- Step 2: Migrate data from allowedTypes to type (take first value from array)
UPDATE categories 
SET type = allowedTypes[1]
WHERE type IS NULL AND allowedTypes IS NOT NULL AND array_length(allowedTypes, 1) > 0;

-- Step 3: Set default for system categories if needed
UPDATE categories 
SET type = 'EXPENSE'
WHERE type IS NULL;

-- Step 4: Make type column NOT NULL
ALTER TABLE categories ALTER COLUMN type SET NOT NULL;

-- Step 5: Remove the allowedTypes column
ALTER TABLE categories DROP COLUMN IF EXISTS allowedTypes;

COMMIT;
