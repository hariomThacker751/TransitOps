# TransitOps Seed Data

No official dataset is provided for this problem statement — it's a build-from-scratch
app, and there's no public dataset that matches this exact schema. This is a synthetic
dataset generated to match the entities and fields from the problem PDF, so you can seed
your DB and demo immediately instead of hand-typing test rows during the hackathon.

## Files
| File | Rows | Notes |
|---|---|---|
| `vehicles.csv` | 16 | reg number, type, capacity, odometer, cost, status, region |
| `drivers.csv` | 18 | license number/category/expiry, safety score, status |
| `trips.csv` | 44 | Draft / Dispatched / Completed / Cancelled, with revenue for ROI |
| `maintenance_logs.csv` | 21 | Active / Closed records |
| `fuel_logs.csv` | 60 | linked to vehicles and (where applicable) trips |
| `expenses.csv` | 30 | tolls, fines, permits, etc. |

## Built-in edge cases (use these to demo your validation rules)
- **VAN-05 / Alex (DRV-01)** — the exact example pair from the PDF's workflow section (500kg capacity, both Available). Good for the happy-path demo.
- **VEH-02 (Retired)** — must never appear in the dispatch vehicle picker.
- **VEH-03 (In Shop)** — has an open `Active` maintenance record (`MNT-021`); must be hidden from dispatch until that record is closed.
- **VEH-04 (On Trip)** — paired with a `Dispatched` trip, proving the vehicle/driver status lock works.
- **DRV-02 / Priya (Suspended)** — must be blocked from trip assignment.
- **DRV-03 / Rahul** — license `license_expiry_date` is already in the past *even though status still shows "Available"* — this is the trap case: your validation must check the expiry date itself, not just the status field.

## Loading it
Plain CSVs — import with whatever your stack uses (`pandas.read_csv`, Odoo's data import, a
seed script with your ORM, etc.). Foreign keys are plain string columns (`vehicle_reg`,
`driver_id`, `trip_id`) so they map directly to your primary keys as long as you keep the
same reg numbers/IDs, or bulk-insert then remap.

Regenerate with different volumes/seed by editing `generate.py` (`N_VEH`, `N_DRV`,
`N_TRIPS`, etc.) and re-running `python3 generate.py`.
