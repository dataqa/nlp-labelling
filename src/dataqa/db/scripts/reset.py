from dataqa.db.scripts.create_tables import create_all_tables
from dataqa.db.scripts.drop_tables import drop_tables
import sqlite3


def get_tables_and_row_counts(cursor):
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [x[0] for x in cursor.fetchall()]
    print("Tables:", tables)

    if "projects" in tables:
        print("Number of rows in projects table:", end="\t")
        cursor.execute("SELECT count(*) FROM projects;")
        print(cursor.fetchone())

    if "rules" in tables:
        print("Number of rows in rules table:", end="\t")
        cursor.execute("SELECT count(*) FROM rules;")
        print(cursor.fetchone())

    print()


def main(database_file):
    conn = sqlite3.connect(database_file)
    cursor = conn.cursor()

    # we drop all tables
    drop_tables(database_file)

    print("*** Tables and row counts ***")
    get_tables_and_row_counts(cursor)

    # we create the tables
    create_all_tables(database_file)
