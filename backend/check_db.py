import firebase_admin, json
from firebase_admin import credentials, firestore
import os

cred_path = r'C:\Users\monah\Downloads\Spes\backend\serviceAccountKey.json'
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
else:
    firebase_admin.initialize_app()

db = firestore.client()

collections = list(db.collections())
print('Collections:', [c.id for c in collections])

users_ref = db.collection('users')
users = users_ref.stream()
for u in users:
    data = u.to_dict()
    print("User ({}): email={}, role={}, name={} {}".format(
        u.id, data.get("email"), data.get("role"),
        data.get("firstname",""), data.get("lastname","")))

settings_ref = db.collection('settings')
settings = settings_ref.stream()
for s in settings:
    print("Settings ({}): {}".format(s.id, s.to_dict()))

print("Done.")
