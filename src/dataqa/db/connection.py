from .utils import get_engine
from sqlalchemy.orm import sessionmaker


class DB:
    def __init__(self):
        self.sessionmaker = None

    def init_session_maker(self, db_file):
        engine = get_engine(db_file)
        self.Session = sessionmaker(bind=engine)

    def get_session(self):
        return self.Session()
