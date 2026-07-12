import pandas as pd
import random
from datetime import date, timedelta

random.seed(42)

# ---------------- VEHICLES ----------------
vehicle_types = ["Van", "Mini-Truck", "Truck", "Pickup", "Trailer"]
regions = ["North", "South", "East", "West", "Central"]
models = {
    "Van": ["Tata Ace EV", "Force Traveller", "Mahindra Supro", "Maruti Eeco Cargo"],
    "Mini-Truck": ["Tata Ace Gold", "Mahindra Jeeto", "Ashok Leyland Dost"],
    "Truck": ["Tata 1109", "Eicher Pro 2049", "BharatBenz 1617"],
    "Pickup": ["Mahindra Bolero Pickup", "Tata Yodha", "Isuzu D-Max"],
    "Trailer": ["Ashok Leyland U-3520", "Tata Signa 4018.T"],
}
capacity_by_type = {"Van": (400, 900), "Mini-Truck": (750, 1500), "Truck": (3000, 9000),
                     "Pickup": (1000, 1800), "Trailer": (12000, 25000)}

N_VEH = 16
vehicles = []
veh_regs = []
for i in range(1, N_VEH + 1):
    vtype = random.choice(vehicle_types)
    reg = f"VEH-{i:02d}"
    veh_regs.append(reg)
    cap_lo, cap_hi = capacity_by_type[vtype]
    max_cap = random.randrange(cap_lo, cap_hi, 50)
    status = random.choices(
        ["Available", "On Trip", "In Shop", "Retired"], weights=[45, 30, 15, 10]
    )[0]
    vehicles.append({
        "registration_number": reg,
        "vehicle_name_model": random.choice(models[vtype]),
        "type": vtype,
        "max_load_capacity_kg": max_cap,
        "odometer_km": random.randint(5000, 180000),
        "acquisition_cost": random.randint(400000, 4500000),
        "status": status,
        "region": random.choice(regions),
    })

# force a few deterministic edge cases (indices 0-3)
vehicles[0]["status"] = "Available"          # normal case, e.g. our "Van-05" style example
vehicles[0]["registration_number"] = "VAN-05"
vehicles[0]["max_load_capacity_kg"] = 500
veh_regs[0] = "VAN-05"
vehicles[1]["status"] = "Retired"            # must never appear in dispatch pool
vehicles[2]["status"] = "In Shop"            # linked to an open maintenance record below
vehicles[3]["status"] = "On Trip"            # linked to a dispatched trip below

df_vehicles = pd.DataFrame(vehicles)

# ---------------- DRIVERS ----------------
first_names = ["Alex", "Priya", "Rahul", "Sara", "Vikram", "Meera", "Karan", "Neha",
                "Arjun", "Divya", "Sanjay", "Anita", "Rohit", "Pooja", "Imran", "Kavya",
                "Dev", "Ritu"]
license_categories = ["LMV", "HMV", "LMV-TR", "HMV-TR"]

N_DRV = 18
drivers = []
today = date(2026, 7, 12)
for i in range(1, N_DRV + 1):
    expiry = today + timedelta(days=random.randint(-120, 730))  # some already expired
    status = random.choices(
        ["Available", "On Trip", "Off Duty", "Suspended"], weights=[45, 30, 15, 10]
    )[0]
    drivers.append({
        "driver_id": f"DRV-{i:02d}",
        "name": first_names[i - 1],
        "license_number": f"GJ{random.randint(10,29)}{random.randint(2015,2024)}{random.randint(100000,999999)}",
        "license_category": random.choice(license_categories),
        "license_expiry_date": expiry.isoformat(),
        "contact_number": f"+91 9{random.randint(100000000,999999999)}",
        "safety_score": random.randint(55, 99),
        "status": status,
    })

# deterministic edge cases
drivers[0]["name"] = "Alex"                                  # pairs with VAN-05 example
drivers[0]["status"] = "Available"
drivers[0]["license_expiry_date"] = (today + timedelta(days=300)).isoformat()
drivers[1]["status"] = "Suspended"                            # must be blocked from dispatch
drivers[2]["license_expiry_date"] = (today - timedelta(days=30)).isoformat()  # expired license, status still shows Available -> must still be blocked
drivers[2]["status"] = "Available"
drivers[3]["status"] = "On Trip"                              # linked to dispatched trip below

df_drivers = pd.DataFrame(drivers)

# ---------------- TRIPS ----------------
cities = ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Mumbai", "Pune", "Indore", "Jaipur"]

N_TRIPS = 45
trips = []
trip_id = 1

def pick_available_vehicle(exclude):
    pool = df_vehicles[(df_vehicles.status == "Available") & (~df_vehicles.registration_number.isin(exclude))]
    return pool.sample(1).iloc[0] if len(pool) else None

def pick_available_driver(exclude):
    pool = df_drivers[(df_drivers.status == "Available") & (~df_drivers.driver_id.isin(exclude))]
    return pool.sample(1).iloc[0] if len(pool) else None

used_vehicles, used_drivers = set(), set()

# Completed trips (historical)
for _ in range(28):
    veh = df_vehicles.sample(1).iloc[0]  # historical trip, vehicle may now be in any state
    drv = df_drivers.sample(1).iloc[0]
    cap = veh["max_load_capacity_kg"]
    cargo = random.randint(int(cap * 0.3), int(cap * 0.95))
    planned = random.randint(50, 900)
    actual = planned + random.randint(-10, 40)
    fuel = round(actual / random.uniform(4.5, 8.5), 1)
    created = today - timedelta(days=random.randint(20, 200))
    dispatched = created + timedelta(hours=random.randint(1, 12))
    completed = dispatched + timedelta(hours=random.randint(4, 48))
    trips.append({
        "trip_id": f"TRIP-{trip_id:03d}", "source": random.choice(cities),
        "destination": random.choice(cities), "vehicle_reg": veh["registration_number"],
        "driver_id": drv["driver_id"], "cargo_weight_kg": cargo,
        "planned_distance_km": planned, "actual_distance_km": actual,
        "fuel_consumed_liters": fuel, "revenue": round(planned * random.uniform(35, 55), 2),
        "status": "Completed", "created_date": created.isoformat(),
        "dispatched_date": dispatched.isoformat(), "completed_date": completed.isoformat(),
    })
    trip_id += 1

# A few cancelled trips
for _ in range(6):
    veh = df_vehicles.sample(1).iloc[0]
    drv = df_drivers.sample(1).iloc[0]
    cap = veh["max_load_capacity_kg"]
    created = today - timedelta(days=random.randint(5, 60))
    trips.append({
        "trip_id": f"TRIP-{trip_id:03d}", "source": random.choice(cities),
        "destination": random.choice(cities), "vehicle_reg": veh["registration_number"],
        "driver_id": drv["driver_id"], "cargo_weight_kg": random.randint(int(cap*0.2), int(cap*0.8)),
        "planned_distance_km": random.randint(50, 600), "actual_distance_km": None,
        "fuel_consumed_liters": None, "revenue": 0,
        "status": "Cancelled", "created_date": created.isoformat(),
        "dispatched_date": (created + timedelta(hours=2)).isoformat(), "completed_date": None,
    })
    trip_id += 1

# Draft trips (not yet dispatched)
for _ in range(5):
    veh_row = pick_available_vehicle(used_vehicles)
    drv_row = pick_available_driver(used_drivers)
    if veh_row is None or drv_row is None:
        continue
    cap = veh_row["max_load_capacity_kg"]
    created = today - timedelta(days=random.randint(0, 3))
    trips.append({
        "trip_id": f"TRIP-{trip_id:03d}", "source": random.choice(cities),
        "destination": random.choice(cities), "vehicle_reg": veh_row["registration_number"],
        "driver_id": drv_row["driver_id"], "cargo_weight_kg": random.randint(int(cap*0.3), int(cap*0.7)),
        "planned_distance_km": random.randint(50, 500), "actual_distance_km": None,
        "fuel_consumed_liters": None, "revenue": 0,
        "status": "Draft", "created_date": created.isoformat(),
        "dispatched_date": None, "completed_date": None,
    })
    trip_id += 1

# Dispatched (currently active) trips -> must match vehicles/drivers already marked On Trip
on_trip_vehicles = df_vehicles[df_vehicles.status == "On Trip"]["registration_number"].tolist()
on_trip_drivers = df_drivers[df_drivers.status == "On Trip"]["driver_id"].tolist()
n_active = min(len(on_trip_vehicles), len(on_trip_drivers))
for i in range(n_active):
    veh_reg = on_trip_vehicles[i]
    cap = df_vehicles.loc[df_vehicles.registration_number == veh_reg, "max_load_capacity_kg"].iloc[0]
    drv_id = on_trip_drivers[i]
    dispatched = today - timedelta(hours=random.randint(2, 30))
    trips.append({
        "trip_id": f"TRIP-{trip_id:03d}", "source": random.choice(cities),
        "destination": random.choice(cities), "vehicle_reg": veh_reg,
        "driver_id": drv_id, "cargo_weight_kg": random.randint(int(cap*0.4), int(cap*0.9)),
        "planned_distance_km": random.randint(80, 700), "actual_distance_km": None,
        "fuel_consumed_liters": None, "revenue": 0,
        "status": "Dispatched", "created_date": (dispatched - timedelta(hours=1)).isoformat(),
        "dispatched_date": dispatched.isoformat(), "completed_date": None,
    })
    trip_id += 1

df_trips = pd.DataFrame(trips)

# ---------------- MAINTENANCE LOGS ----------------
maint_types = ["Oil Change", "Tire Replacement", "Brake Service", "Engine Overhaul",
               "General Inspection", "Battery Replacement", "AC Service"]
N_MAINT = 20
maint = []
for i in range(1, N_MAINT + 1):
    veh = df_vehicles.sample(1).iloc[0]
    start = today - timedelta(days=random.randint(5, 250))
    is_active_record = False
    end = start + timedelta(days=random.randint(1, 6))
    status = "Closed"
    maint.append({
        "maintenance_id": f"MNT-{i:03d}", "vehicle_reg": veh["registration_number"],
        "maintenance_type": random.choice(maint_types),
        "cost": random.randint(1500, 45000),
        "start_date": start.isoformat(), "end_date": end.isoformat(),
        "status": status,
    })

# deterministic open maintenance record tying to the "In Shop" vehicle (index 2)
in_shop_reg = vehicles[2]["registration_number"]
maint.append({
    "maintenance_id": f"MNT-{N_MAINT+1:03d}", "vehicle_reg": in_shop_reg,
    "maintenance_type": "Engine Overhaul", "cost": 38500,
    "start_date": (today - timedelta(days=3)).isoformat(), "end_date": None,
    "status": "Active",
})
df_maint = pd.DataFrame(maint)

# ---------------- FUEL LOGS ----------------
N_FUEL = 60
fuel_logs = []
completed_trip_ids = df_trips[df_trips.status == "Completed"]["trip_id"].tolist()
for i in range(1, N_FUEL + 1):
    veh = df_vehicles.sample(1).iloc[0]
    linked_trip = random.choice(completed_trip_ids) if random.random() < 0.6 and completed_trip_ids else ""
    d = today - timedelta(days=random.randint(1, 200))
    liters = round(random.uniform(15, 220), 1)
    fuel_logs.append({
        "fuel_log_id": f"FUEL-{i:03d}", "vehicle_reg": veh["registration_number"],
        "trip_id": linked_trip, "liters": liters,
        "cost": round(liters * random.uniform(92, 105), 2),
        "date": d.isoformat(),
    })
df_fuel = pd.DataFrame(fuel_logs)

# ---------------- EXPENSES ----------------
expense_types = ["Toll", "Parking", "Traffic Fine", "Permit Renewal", "Loading Charges", "Miscellaneous"]
N_EXP = 30
expenses = []
for i in range(1, N_EXP + 1):
    veh = df_vehicles.sample(1).iloc[0]
    d = today - timedelta(days=random.randint(1, 200))
    expenses.append({
        "expense_id": f"EXP-{i:03d}", "vehicle_reg": veh["registration_number"],
        "expense_type": random.choice(expense_types),
        "amount": round(random.uniform(100, 5000), 2),
        "date": d.isoformat(),
    })
df_expenses = pd.DataFrame(expenses)

# ---------------- WRITE OUT ----------------
df_vehicles.to_csv("vehicles.csv", index=False)
df_drivers.to_csv("drivers.csv", index=False)
df_trips.to_csv("trips.csv", index=False)
df_maint.to_csv("maintenance_logs.csv", index=False)
df_fuel.to_csv("fuel_logs.csv", index=False)
df_expenses.to_csv("expenses.csv", index=False)

print("vehicles:", len(df_vehicles), "drivers:", len(df_drivers), "trips:", len(df_trips),
      "maintenance:", len(df_maint), "fuel_logs:", len(df_fuel), "expenses:", len(df_expenses))
print("\nEdge cases baked in:")
print("- VAN-05 / Alex: exact example pair from the PDF workflow (500kg capacity, Available)")
print("- Vehicle", vehicles[1]["registration_number"], ": Retired -> must be excluded from dispatch")
print("- Vehicle", in_shop_reg, ": In Shop with an open (Active) maintenance record")
print("- Vehicle", vehicles[3]["registration_number"], ": On Trip, paired with a Dispatched trip")
print("- Driver", drivers[1]["driver_id"], "(", drivers[1]["name"], "): Suspended -> must be blocked from dispatch")
print("- Driver", drivers[2]["driver_id"], "(", drivers[2]["name"], "): license EXPIRED but status still 'Available' -> tests that expiry check isn't skipped")
