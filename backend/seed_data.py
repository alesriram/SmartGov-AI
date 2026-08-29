"""Seeds the database with departments and realistic historical complaints
so the dashboard, forecasts, and hotspot map have data to show immediately."""
import datetime
import json
import random

from database import Base, SessionLocal, engine
from models import Complaint, Department, Priority, ComplaintStatus

Base.metadata.create_all(bind=engine)

DEPARTMENTS = [
    ("Roads & Infrastructure Department", "roads", "roads@smartcity.gov"),
    ("Sanitation & Waste Management Department", "sanitation", "sanitation@smartcity.gov"),
    ("Water Supply & Sewerage Board", "water_supply", "water@smartcity.gov"),
    ("Electricity & Street Lighting Department", "electricity", "electricity@smartcity.gov"),
    ("Traffic Police / Urban Transport Authority", "traffic", "traffic@smartcity.gov"),
    ("Public Health Department", "public_health", "health@smartcity.gov"),
    ("General Grievance Cell", "general", "grievance@smartcity.gov"),
]

# Hyderabad-area coordinates for realistic demo hotspots
AREAS = [
    ("Miyapur", 17.4959, 78.3803),
    ("Kukatpally", 17.4849, 78.4108),
    ("LB Nagar", 17.3457, 78.5511),
    ("Ameerpet", 17.4374, 78.4482),
    ("Secunderabad", 17.4399, 78.4983),
    ("Gachibowli", 17.4401, 78.3489),
    ("Uppal", 17.4058, 78.5590),
]

SAMPLE_DESCRIPTIONS = {
    "roads": [
        "Large pothole near {area} main road causing accidents for 2 weeks",
        "Road surface badly damaged after recent rains near {area}",
    ],
    "sanitation": [
        "Garbage overflow near {area} market, not collected for 5 days, bad smell",
        "Trash dump spilling onto street in {area}",
    ],
    "water_supply": [
        "Water pipe leaking heavily on main street in {area}",
        "No water supply in {area} for 3 days",
    ],
    "electricity": [
        "Streetlight not working near {area} bus stop, unsafe at night",
        "Power outage in {area} for several hours",
    ],
    "traffic": [
        "Illegal parking blocking road near {area} junction",
        "Traffic signal malfunctioning at {area} circle",
    ],
    "public_health": [
        "Stagnant water breeding mosquitoes near {area}, dengue risk",
        "Health hazard from uncollected waste near {area} school",
    ],
}

PRIORITIES = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL]
STATUSES = [ComplaintStatus.RECEIVED, ComplaintStatus.IN_PROGRESS,
            ComplaintStatus.RESOLVED, ComplaintStatus.ROUTED]


def seed():
    db = SessionLocal()
    try:
        if db.query(Department).count() == 0:
            for name, category, email in DEPARTMENTS:
                db.add(Department(name=name, category=category, email=email,
                                   active_officers=random.randint(4, 15)))
            db.commit()
            print(f"Seeded {len(DEPARTMENTS)} departments")

        dept_by_category = {d.category: d for d in db.query(Department).all()}

        if db.query(Complaint).count() == 0:
            random.seed(42)
            today = datetime.datetime.utcnow()
            count = 0
            for days_ago in range(45, -1, -1):
                date = today - datetime.timedelta(days=days_ago)
                num_today = random.randint(3, 14)
                for _ in range(num_today):
                    category = random.choice(list(SAMPLE_DESCRIPTIONS.keys()))
                    area_name, base_lat, base_lng = random.choice(AREAS)
                    template = random.choice(SAMPLE_DESCRIPTIONS[category])
                    description = template.format(area=area_name)

                    status = random.choices(
                        STATUSES, weights=[0.15, 0.25, 0.5, 0.10]
                    )[0]
                    priority = random.choices(
                        PRIORITIES, weights=[0.3, 0.4, 0.2, 0.1]
                    )[0]

                    resolved_at = None
                    if status == ComplaintStatus.RESOLVED:
                        resolved_at = date + datetime.timedelta(hours=random.randint(2, 96))

                    complaint = Complaint(
                        citizen_name=f"Citizen{count%97}",
                        citizen_contact=f"+91-90000{count%10000:05d}",
                        description=description,
                        translated_description=description,
                        category=category,
                        subcategory=None,
                        priority=priority,
                        status=status,
                        latitude=base_lat + random.uniform(-0.01, 0.01),
                        longitude=base_lng + random.uniform(-0.01, 0.01),
                        address=f"{area_name}, Hyderabad",
                        department_id=dept_by_category[category].id,
                        ai_summary=description[:100],
                        ai_response=f"Routed to {dept_by_category[category].name}.",
                        agent_trace=json.dumps([{"agent": "seed", "decision": "synthetic"}]),
                        created_at=date,
                        updated_at=date,
                        resolved_at=resolved_at,
                    )
                    db.add(complaint)
                    count += 1
            db.commit()
            print(f"Seeded {count} historical complaints")
        else:
            print("Complaints already seeded, skipping")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
