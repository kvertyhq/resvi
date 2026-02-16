-- Migration: Enforce Single Default Station Per Type
-- Description: Ensures only one station can be marked as default for a given type within a restaurant.

-- 1. Clean up existing duplicates (keep the most recently created one as default)
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY restaurant_id, type 
               ORDER BY created_at DESC
           ) as rn
    FROM stations
    WHERE is_default = true
)
UPDATE stations
SET is_default = false
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- 2. Add partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS unique_default_station_type 
ON stations (restaurant_id, type) 
WHERE is_default = true;
