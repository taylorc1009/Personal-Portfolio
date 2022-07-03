from hmac import compare_digest
from models.user import UserModel

def authenticate(username, password): # checks if the user entered the correct password for a username
    user = UserModel.find_by_username(username)

     # convert string encodings to the same format: comparing ASCII with Unicode will cause issues
    stored_password, password_provided = user.password, password
    if isinstance(stored_password, str):
        stored_password = stored_password.encode("utf-8")
    if isinstance(password_provided, str):
        password_provided = password_provided.encode("utf-8")

    if user and compare_digest(stored_password, password_provided):
        return user

def identity(payload): # returns the user details, acquired by ID
    user_id = payload['identity']
    return UserModel.find_by_id(user_id)
