from __init__ import create_app
from models.user import db
from models.course import Course

app = create_app()

courses_list = [
    "Τεχνητή Νοημοσύνη",
    "Λειτουργικά Συστήματα",
    "Δίκτυα Υπολογιστών",
    "Βάσεις Δεδομένων",
    "Θεωρία Υπολογισμού",
    "Γραμμική Άλγεβρα"
]

with app.app_context():
    db.create_all()  # δημιουργεί τους πίνακες αν δεν υπάρχουν
    for name in courses_list:
        if not Course.query.filter_by(name=name).first():
            db.session.add(Course(name=name))
    db.session.commit()
    print("✔ Τα μαθήματα φορτώθηκαν στη βάση!")
