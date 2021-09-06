import argparse
from ..utils import get_engine
from ..models import *

parser = argparse.ArgumentParser(description='Drop all tables or all rows.')
parser.add_argument("--only-content", action="store_true")


def drop_tables(database_file):
    engine = get_engine(database_file)
    Base.metadata.drop_all(bind=engine)