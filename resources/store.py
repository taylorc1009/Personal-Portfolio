from flask_restful import Resource
from models.store import StoreModel

class Store(Resource):
    def get(self, name):
        try:
            store = StoreModel.find_by_name(name)
        except:
            return {"message": "An error occurred while reading the store from the database."}, 500

        if store:
            return store.json()
        return {'message': 'Store not found.'}, 404

    def post(self, name):
        try:
            if StoreModel.find_by_name(name):
                return {'message': "A store with name '{}' already exists.".format(name)}, 400
        except:
            return {"message": "An error occurred while reading the store from the database."}, 500

        store = StoreModel(name)

        try:
            store.save_to_database()
        except:
            return {"message": "An error occurred while inserting the store to the database."}, 500
        return store.json(), 201

    def delete(self, name):
        try:
            try:
                store = StoreModel.find_by_name(name)
            except:
                return {"message": "An error occurred while reading the store from the database."}, 500

            if store:
                store.delete_from_database()
        except:
            return {"message": "An error occurred while deleting the store from the database."}, 500
        return {'message': 'Store deleted.'}

class Stores(Resource):
    def get(self):
        return {'stores': [store.json() for store in StoreModel.query.all()]}
