import os

from flask import Flask, jsonify, render_template
from flask_restful import Api
from flask_jwt import JWT

from security import authenticate, identity
from resources.user import UserRegister

from datetime import timedelta
from db import db

app = Flask(__name__)
"""app.secret_key = 'example-key'
app.config['JWT_AUTH_URL_RULE'] = '/login'
app.config['JWT_EXPIRATION_DELTA'] = timedelta(seconds=1800)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///data.db') # try to load the 'DATABASE_URL' variable, if it fails then revert back to the SQLite implementation
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # disables Flasks' native tracker but not SQLAlchemys': tracking twice would use more resources

db.init_app(app)
api = Api(app)

@app.before_first_request # stop any app requests being made before this method is ran
def create_tables():
	db.create_all(); # SQLAlchemy will only create the tables it sees, for example: 'app.py' imports 'resources.store' and 'resources.store' imports 'models.store', this is where it finds the 'stores' table as it is in 'StoreModel' of 'store.py'

jwt = JWT(app, authenticate, identity)

@jwt.auth_response_handler
def customized_response_handler(access_token, identity):
	return jsonify({
		'access_token': access_token.decode('utf-8'),
		'user_id': identity.id
	})

api.add_resource(UserRegister, '/register')"""

@app.route("/")
def home():
	return render_template("index.html")

if __name__ == '__main__':
	from argparse import ArgumentParser, BooleanOptionalAction
	parser = ArgumentParser()

	parser.add_argument("-d", "--debug", action=BooleanOptionalAction, dest="debug")

	if parser.parse_args().debug:
		app.run(port=5000, debug=True)
	else:
		from waitress import serve
		serve(app, host="0.0.0.0", port=8080)
