import json
import os
import firebase_admin
from firebase_admin import credentials, firestore as admin_firestore
from google.cloud.firestore import SERVER_TIMESTAMP
from google.cloud.firestore_v1 import Query
from django.conf import settings

if not firebase_admin._apps:
    sa_key_raw = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY')
    if sa_key_raw:
        try:
            cred = credentials.Certificate(json.loads(sa_key_raw))
        except json.JSONDecodeError:
            cred = credentials.Certificate(json.loads(__import__('base64').b64decode(sa_key_raw).decode()))
        firebase_admin.initialize_app(cred)
    else:
        _cred_path = os.path.join(settings.BASE_DIR, 'serviceAccountKey.json')
        if os.path.exists(_cred_path):
            cred = credentials.Certificate(_cred_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()

db = admin_firestore.client()
DESCENDING = Query.DESCENDING


def users_collection():
    return db.collection('users')


def attendance_collection():
    return db.collection('attendance')


def settings_doc():
    return db.collection('settings').document('default')
