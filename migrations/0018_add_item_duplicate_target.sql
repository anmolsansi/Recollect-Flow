-- OPE-248: persist the canonical target selected during manual duplicate review.

ALTER TABLE items
ADD COLUMN duplicate_of TEXT REFERENCES items(id) ON DELETE RESTRICT;

CREATE INDEX idx_items_duplicate_of ON items(duplicate_of);
