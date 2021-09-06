from sqlalchemy import create_engine


def get_engine(db_file):
    engine = create_engine(f'sqlite:///{db_file}')
    return engine
