from db import db

class StoreModel(db.Model):
    # SQLAlchemy attributes; look at 'user.py' for the implementation descriptions
    __tablename__ = 'stores'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80))

    # back-reference to the 'items' table
    items = db.relationship('ItemModel', lazy='dynamic') # SQLAlchemy looks in the 'ItemModel' class and, because we have a relationship to this class in there, finds the relationship
    # notice the 'lazy' parameter - this prevents the creation of a StoreModel automatically building an object for each item in the store as, if we have a lot of items, this becomes an expensive operation (now, look at the 'json()' method here)

    def __init__(self, name):
        self.name = name

    def json(self):
        return {'name': self.name, 'items': [item.json() for item in self.items.all()]} # 'items.all()' queries all of the 'items' from the table - this way we don't need to load all of the items as objects during initialisation and we can just query the database when we need them instead
        # doing this is slower than creating the objects during initialization because we need to query the database again every time we want to get 'StoreModel.json()', but it will use (much - depending on the quantity of items) less memory

    @classmethod
    def find_by_name(cls, name):
        return cls.query.filter_by(name=name).first() # does the same thing as 'Item.find_by_name()' from the old code saved in 'item.py - Udemy Section 5'

    def save_to_database(self):
        db.session.add(self) # performs an UPDATE query instead of an INSERT so we can now use thos method for both events
        db.session.commit()

    def delete_from_database(self):
        db.session.delete(self)
        db.session.commit()
