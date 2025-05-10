from __init__ import create_app
from models.user import db
from models.course import Course

app = create_app()

# Λίστα μαθημάτων προς διαγραφή
courses_to_delete = [
    "Αναγνώριση Προτύπων",
    "Σήματα & Συστήματα",
    "Υπολογιστική Νοημοσύνη",
    "Ανάπτυξη Λογισμικού",
    "Μηχανική Μάθηση",
    "Αλγόριθμοι"
]

with app.app_context():
    for name in courses_to_delete:
        course = Course.query.filter_by(name=name).first()
        if course:
            db.session.delete(course)
            print(f"🗑️ Διαγράφηκε: {name}")
        else:
            print(f"⚠️ Δεν βρέθηκε: {name}")
    db.session.commit()
    print("✔ Ολοκληρώθηκε η διαγραφή.")
