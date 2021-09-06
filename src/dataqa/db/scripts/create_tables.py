from ..models import Base
from ..utils import get_engine


def create_all_tables(db_file):
    engine = get_engine(db_file)
    Base.metadata.create_all(engine)


if __name__ == '__main__':
    create_all_tables()
