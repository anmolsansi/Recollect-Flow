-- OPE-248: persist the canonical item selected during manual duplicate review.
-- The source item retains its own capture history while linking to the reviewed target.

ALTER TABLE items
ADD COLUMN duplicate_of TEXT REFERENCES items(id) ON DELETE RESTRICT;

CREATE INDEX idx_items_duplicate_of ON items(duplicate_of);
