DELETE FROM inventory
WHERE product IN (
  SELECT id FROM products
  WHERE deleted_at IS NOT NULL AND deleted_at != ''
);
