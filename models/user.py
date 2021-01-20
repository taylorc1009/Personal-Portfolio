from db import db

class UserModel(db.Model):
     # SQLAlchemy attributes:
    __tablename__ = 'users' # tells SQLAlchemy the table that is being used
    id = db.Column(db.Integer, primary_key=True) # there's a column 'id' of type 'INTEGER' that's a primary key
    username = db.Column(db.String(80)) # character limit of 80; it's good practice to limit this as some users might abuse a limitless length
    password = db.Column(db.String(80)) # same as above

    def __init__(self, username, password):
        self.username = username
        self.password = password

    @classmethod
    def find_by_username(cls, username):
        return cls.query.filter_by(username=username).first()

    @classmethod
    def find_by_id(cls, _id):
        return cls.query.filter_by(id=_id).first()

    def save_to_database(self):
        db.session.add(self)
        db.session.commit()
