from flask_restful import Resource, reqparse
from models.user import UserModel

class UserRegister(Resource):
    parser = reqparse.RequestParser() # parses the JSON data recieved in the request (it isn't defined here, Flask will find it automatically)
    # request arguments that are expected for the 'UserModel'
    parser.add_argument('username',
        type=str,
        required=True,
        help="Field cannot be blank - you need a username to login."
    )
    parser.add_argument('password',
        type=str,
        required=True,
        help="Field cannot be blank - you must have a password to allow access to this user."
    )

    def post(self):
        request_data = UserRegister.parser.parse_args()

        if UserModel.find_by_username(request_data['username']):
            return {"message": "Username already exists."}, 400

        user = UserModel(**request_data)

        try:
            user.save_to_database()
        except:
                return {"message": "An error occurred while inserting the item to the database."}, 500

        return {"message": "User created successfully."}, 201
