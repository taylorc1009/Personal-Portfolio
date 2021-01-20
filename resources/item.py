from flask_restful import Resource, reqparse
from flask_jwt import jwt_required
from models.item import ItemModel

class Item(Resource):
    parser = reqparse.RequestParser()
    parser.add_argument('price',
        type=float,
    )
    parser.add_argument('store_id',
        type=int,
        required=True,
        help="Field cannot be blank - items must have a store ID."
    )

    @jwt_required()
    def get(self, name):
        request_data = Item.parser.parse_args()

        try:
            item = ItemModel.find_item_in_store(name, request_data['store_id'])
        except:
            return {"message": "An error occurred while reading the item from the database."}, 500

        if item:
            return item.json()
        return {'message': 'Item not found.'}, 404

    def post(self, name):
        request_data = Item.parser.parse_args()

        if not request_data['price']:
            return {'message': 'Field cannot be blank - items must have a price.'}

        try:
            if ItemModel.find_item_in_store(name, request_data['store_id']):
                return {'message': "An item with name '{}' already exists in this store.".format(name)}, 400
        except:
            return {"message": "An error occurred while reading the item from the database."}, 500

        item = ItemModel(name, **request_data)

        try:
            item.save_to_database()
        except:
            return {"message": "An error occurred while inserting the item to the database."}, 500
        return item.json(), 201

    def delete(self, name):
        request_data = Item.parser.parse_args()

        try:
            try:
                item = ItemModel.find_item_in_store(name, request_data['store_id'])
            except:
                return {"message": "An error occurred while reading the item from the database."}, 500

            if item:
                item.delete_from_database()
        except:
            return {"message": "An error occurred while deleting the item from the database."}, 500
        return {'message': 'Item deleted.'}

    def put(self, name):
        request_data = Item.parser.parse_args()

        try:
            item = ItemModel.find_item_in_store(name, request_data['store_id'])
        except:
            return {"message": "An error occurred while reading the item from the database."}, 500

        if item is None:
            item = ItemModel(name, **request_data)
        else:
            if not request_data['price']:
                return {'message': 'Field cannot be blank - items must have a price.'}

            item.price = request_data['price']
            item.store_id = request_data['store_id']

        try:
            item.save_to_database()
        except:
            return {"message": "An error occurred while inserting the item to the database."}, 500

        return item.json()

class Items(Resource):
    def get(self):
        return {'items': [item.json() for item in ItemModel.query.all()]}
