from flask import Flask
from dataqa.api.blueprints.common import bp, db
from dataqa.api.blueprints.supervised import supervised_bp
from dataqa.api.blueprints.entity_disambiguation import kb_bp


def create_app(db_file):
    app = Flask(__name__)
    app.register_blueprint(bp)
    app.register_blueprint(supervised_bp)
    app.register_blueprint(kb_bp)

    db.init_session_maker(db_file)
    return app