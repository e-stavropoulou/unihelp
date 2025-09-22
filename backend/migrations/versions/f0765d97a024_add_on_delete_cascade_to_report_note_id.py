"""Add ON DELETE CASCADE to report.note_id

Revision ID: f0765d97a024
Revises: ee8d410413c4
Create Date: 2025-09-22 04:29:37.452597
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'f0765d97a024'
down_revision = 'ee8d410413c4'
branch_labels = None
depends_on = None


def upgrade():
    # Drop το παλιό foreign key για note_id
    op.drop_constraint('report_ibfk_1', 'report', type_='foreignkey')

    # Δημιουργία νέου FK με ON DELETE CASCADE
    op.create_foreign_key(
        'report_ibfk_1',  # ίδιο όνομα constraint
        'report', 'note',
        ['note_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade():
    # Αν χρειαστεί rollback, επαναφέρουμε το παλιό FK χωρίς cascade
    op.drop_constraint('report_ibfk_1', 'report', type_='foreignkey')
    op.create_foreign_key(
        'report_ibfk_1',
        'report', 'note',
        ['note_id'], ['id']
    )
