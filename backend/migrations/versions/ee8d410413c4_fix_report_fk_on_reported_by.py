"""Fix report FK on reported_by

Revision ID: ee8d410413c4
Revises: d4443a7afc83
Create Date: 2025-09-22 04:15:24.912255

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ee8d410413c4'
down_revision = 'd4443a7afc83'
branch_labels = None
depends_on = None


def upgrade():
    # ✅ Διόρθωση του comment_edit_history
    with op.batch_alter_table('comment_edit_history', schema=None) as batch_op:
        batch_op.drop_constraint('comment_edit_history_ibfk_1', type_='foreignkey')
        batch_op.create_foreign_key(None, 'comment', ['comment_id'], ['id'], ondelete='CASCADE')

    # ✅ Διόρθωση του reported_by: κάνε το nullable ΠΡΙΝ βάλεις το FK
    with op.batch_alter_table('report', schema=None) as batch_op:
        batch_op.alter_column('reported_by',
            existing_type=sa.Integer(),
            nullable=True  # ΠΡΕΠΕΙ να επιτρέπεται το NULL
        )
        batch_op.create_foreign_key(None, 'user', ['reported_by'], ['id'], ondelete='SET NULL')


    # ### end Alembic commands ###


def downgrade():
    # ⬅️ Αφαίρεση FK από reported_by
    with op.batch_alter_table('report', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.alter_column('reported_by',
            existing_type=sa.Integer(),
            nullable=False  # Επαναφορά σε NOT NULL
        )

    # ⬅️ Αφαίρεση και επαναφορά FK στο comment_edit_history
    with op.batch_alter_table('comment_edit_history', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.create_foreign_key('comment_edit_history_ibfk_1', 'comment', ['comment_id'], ['id'])


    # ### end Alembic commands ###
