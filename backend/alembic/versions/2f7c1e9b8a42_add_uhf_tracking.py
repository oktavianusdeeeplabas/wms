"""add_uhf_tracking

Revision ID: 2f7c1e9b8a42
Revises: f96d444bb7ea
Create Date: 2026-04-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2f7c1e9b8a42"
down_revision: Union[str, Sequence[str], None] = "f96d444bb7ea"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "uhf_readers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("device_identifier", sa.String(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("antenna_port", sa.Integer(), nullable=True),
        sa.Column("zone_id", sa.Integer(), nullable=True),
        sa.Column("bin_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index(op.f("ix_uhf_readers_code"), "uhf_readers", ["code"], unique=False)
    op.create_index(op.f("ix_uhf_readers_id"), "uhf_readers", ["id"], unique=False)

    op.create_table(
        "uhf_tags",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("epc", sa.String(), nullable=False),
        sa.Column("tid", sa.String(), nullable=True),
        sa.Column("sticker_label", sa.String(), nullable=True),
        sa.Column("product_id", sa.Integer(), nullable=True),
        sa.Column("lot_id", sa.Integer(), nullable=True),
        sa.Column("assigned_quantity", sa.Float(), nullable=True),
        sa.Column("current_zone_id", sa.Integer(), nullable=True),
        sa.Column("current_bin_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("encoded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("epc"),
    )
    op.create_index(op.f("ix_uhf_tags_epc"), "uhf_tags", ["epc"], unique=False)
    op.create_index(op.f("ix_uhf_tags_id"), "uhf_tags", ["id"], unique=False)
    op.create_index(op.f("ix_uhf_tags_lot_id"), "uhf_tags", ["lot_id"], unique=False)

    op.create_table(
        "uhf_tag_reads",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=True),
        sa.Column("epc", sa.String(), nullable=False),
        sa.Column("reader_id", sa.Integer(), nullable=True),
        sa.Column("zone_id", sa.Integer(), nullable=True),
        sa.Column("bin_id", sa.Integer(), nullable=True),
        sa.Column("rssi", sa.Float(), nullable=True),
        sa.Column("read_count", sa.Integer(), nullable=True),
        sa.Column("direction", sa.String(), nullable=True),
        sa.Column("event_type", sa.String(), nullable=True),
        sa.Column("seen_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_uhf_tag_reads_epc"), "uhf_tag_reads", ["epc"], unique=False)
    op.create_index(op.f("ix_uhf_tag_reads_id"), "uhf_tag_reads", ["id"], unique=False)
    op.create_index(op.f("ix_uhf_tag_reads_tag_id"), "uhf_tag_reads", ["tag_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_uhf_tag_reads_tag_id"), table_name="uhf_tag_reads")
    op.drop_index(op.f("ix_uhf_tag_reads_id"), table_name="uhf_tag_reads")
    op.drop_index(op.f("ix_uhf_tag_reads_epc"), table_name="uhf_tag_reads")
    op.drop_table("uhf_tag_reads")
    op.drop_index(op.f("ix_uhf_tags_lot_id"), table_name="uhf_tags")
    op.drop_index(op.f("ix_uhf_tags_id"), table_name="uhf_tags")
    op.drop_index(op.f("ix_uhf_tags_epc"), table_name="uhf_tags")
    op.drop_table("uhf_tags")
    op.drop_index(op.f("ix_uhf_readers_id"), table_name="uhf_readers")
    op.drop_index(op.f("ix_uhf_readers_code"), table_name="uhf_readers")
    op.drop_table("uhf_readers")
