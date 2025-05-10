"""Add favorite table

Revision ID: a24ea0be9650
Revises: 01ba7f4d06bd
Create Date: 2025-05-04 19:04:45.915782
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a24ea0be9650'
down_revision = '01ba7f4d06bd'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'favorite',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('note_id', sa.Integer(), sa.ForeignKey('note.id'), nullable=False),
        sa.UniqueConstraint('user_id', 'note_id', name='unique_favorite')
    )

def downgrade():
    op.drop_table('favorite')
