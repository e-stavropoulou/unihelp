from __init__ import create_app
from models.course import Course
from models.shared import db  

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
    for name in courses_list:
        if not Course.query.filter_by(name=name).first():
            db.session.add(Course(name=name))
    db.session.commit()
    print("✔ Τα μαθήματα φορτώθηκαν στη MySQL βάση!")
