# Master Data CSV Pack

These CSV files are templates and sample data for exporting/importing WMS master data.

Import in this order so foreign-key references are available:

1. `branches.csv`
2. `suppliers.csv`
3. `warehouses.csv`
4. `zones.csv`
5. `bins.csv`
6. `units.csv`
7. `payment_types.csv`
8. `products.csv`
9. `supplier_products.csv`
10. `bom_recipes.csv`
11. `bom_lines.csv`
12. `uhf_readers.csv`
13. `label_templates.csv`

Notes:

- Keep `id` when doing a full export/import round trip. Leave `id` blank only when importing through create APIs that auto-generate IDs, then update dependent files to use the new IDs.
- `products.csv` uses `uom`, which is the backend field name. Older mock JSON may call this `unit`.
- `suppliers.csv` uses `contact_person`, which is the backend field name. Some frontend/mock data may call this `contact_name`.
- `supplier_products.csv` links suppliers to products they sell by `supplier_id` and `product_id`.
- Date/time fields use `YYYY-MM-DD HH:MM:SS`.
- Boolean fields use `true` or `false`.
- Empty cells import as `NULL`/blank values, depending on the importer.
