from __init__ import create_app
from models.course import Course
from models.shared import db

app = create_app()

courses_list = [
    {"name": "Τεχνητή Νοημοσύνη", "semester": 5, "type": "υποχρεωτικό"},
    {"name": "Λειτουργικά Συστήματα", "semester": 5, "type": "υποχρεωτικό"},
    {"name": "Δίκτυα Υπολογιστών", "semester": 6, "type": "υποχρεωτικό"},
    {"name": "Βάσεις Δεδομένων", "semester": 5, "type": "υποχρεωτικό"},
    {"name": "Θεωρία Υπολογισμού", "semester": 6, "type": "υποχρεωτικό"},
    {"name": "Γραμμική Άλγεβρα", "semester": 1, "type": "υποχρεωτικό"}
]

with app.app_context():
    for course_data in courses_list:
        existing = Course.query.filter_by(name=course_data["name"]).first()
        if existing:
            existing.semester = course_data["semester"]
            existing.type = course_data["type"]
            print(f"🔁 Ενημερώθηκε το μάθημα: {existing.name}")
        else:
            new_course = Course(
                name=course_data["name"],
                semester=course_data["semester"],
                type=course_data["type"]
            )
            db.session.add(new_course)
            print(f"➕ Προστέθηκε νέο μάθημα: {new_course.name}")
    
    db.session.commit()
    print("✅ Όλα τα μαθήματα ενημερώθηκαν/εισάχθηκαν με semester & type!")
