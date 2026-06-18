from datetime import datetime as dt, timedelta
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.contrib.auth.hashers import make_password, check_password
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from google.api_core import datetime_helpers
from .firebase_db import users_collection, attendance_collection, settings_doc, SERVER_TIMESTAMP, DESCENDING

import uuid


def _user_to_dict(doc):
    data = doc.to_dict()
    data['id'] = doc.id
    return data


def _get_user_by_token(auth_header):
    if not auth_header or not auth_header.startswith('Token '):
        return None
    token_key = auth_header.split(' ', 1)[1]
    users = users_collection().where('auth_token', '==', token_key).limit(1).get()
    for u in users:
        return _user_to_dict(u)
    return None


def _get_user_by_email(email):
    users = users_collection().where('email', '==', email).limit(1).get()
    for u in users:
        return _user_to_dict(u)
    return None


def _serialize_attendance(att_doc, user=None):
    data = att_doc.to_dict() if hasattr(att_doc, 'to_dict') else dict(att_doc)
    data['id'] = att_doc.id if hasattr(att_doc, 'id') else str(att_doc.get('id', ''))
    if user:
        data['user_name'] = f"{user.get('firstname', '')} {user.get('lastname', '')}"
        data['user_id_no'] = user.get('id_no', '')
    if data.get('clock_in'):
        ci = data['clock_in']
        data['clock_in'] = ci.isoformat() if hasattr(ci, 'isoformat') else str(ci)
    if data.get('clock_out'):
        co = data['clock_out']
        data['clock_out'] = co.isoformat() if hasattr(co, 'isoformat') else str(co)
    return data


def _attendance_to_dict(att_doc, user_dict=None):
    data = att_doc.to_dict() if hasattr(att_doc, 'to_dict') else dict(att_doc)
    data['id'] = att_doc.id if hasattr(att_doc, 'id') else str(att_doc.get('id', ''))
    if user_dict:
        data['user_name'] = f"{user_dict.get('firstname', '')} {user_dict.get('lastname', '')}"
        data['user_id_no'] = user_dict.get('id_no', '')
    return data


def _get_settings():
    doc = settings_doc().get()
    if doc.exists:
        return doc.to_dict()
    default = {
        'clock_in_start': '07:00',
        'clock_in_end': '07:20',
        'clock_out_start': '17:00',
        'clock_out_end': '17:20',
        'clock_in_enabled': False,
        'clock_out_enabled': False,
    }
    settings_doc().set(default)
    return default


# ---------- Auth ----------

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')

    user_doc = _get_user_by_email(email)
    if not user_doc or not check_password(password, user_doc.get('password', '')):
        return Response({'message': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    token_key = str(uuid.uuid4()).replace('-', '') + str(uuid.uuid4()).replace('-', '')
    users_collection().document(user_doc['id']).update({'auth_token': token_key})

    return Response({
        'message': 'Login successful',
        'token': token_key,
        'user': {
            'id': user_doc['id'],
            'id_no': user_doc.get('id_no', ''),
            'name': f"{user_doc.get('firstname', '')} {user_doc.get('lastname', '')}",
            'email': user_doc.get('email', ''),
            'role': user_doc.get('role', 'user'),
        },
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    email = request.data.get('email')
    password = request.data.get('password')
    id_no = request.data.get('id_no', '')
    firstname = request.data.get('firstname', '')
    middlename = request.data.get('middlename', '')
    lastname = request.data.get('lastname', '')
    suffix = request.data.get('suffix', '')
    role = request.data.get('role', 'user')

    if not email or not password:
        return Response({'message': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

    existing = _get_user_by_email(email)
    if existing:
        return Response({'message': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)

    token_key = str(uuid.uuid4()).replace('-', '') + str(uuid.uuid4()).replace('-', '')
    doc_ref = users_collection().document()
    doc_ref.set({
        'email': email,
        'password': make_password(password),
        'id_no': id_no,
        'firstname': firstname,
        'middlename': middlename,
        'lastname': lastname,
        'suffix': suffix,
        'role': role,
        'auth_token': token_key,
        'created_at': firestore.SERVER_TIMESTAMP,
    })

    user_data = _user_to_dict(doc_ref.get())

    return Response({
        'message': 'User registered successfully',
        'token': token_key,
        'user': {
            'id': user_data['id'],
            'id_no': user_data.get('id_no', ''),
            'name': f"{user_data.get('firstname', '')} {user_data.get('lastname', '')}",
            'email': user_data.get('email', ''),
            'role': user_data.get('role', 'user'),
        },
    }, status=status.HTTP_201_CREATED)


class FirestoreUser:
    def __init__(self, data):
        self.id = data.get('id')
        self.email = data.get('email', '')
        self.role = data.get('role', 'user')
        self.firstname = data.get('firstname', '')
        self.lastname = data.get('lastname', '')
        self.id_no = data.get('id_no', '')
        self.is_authenticated = True


class FirestoreAuth(IsAuthenticated):
    def has_permission(self, request, view):
        user_dict = _get_user_by_token(request.headers.get('Authorization', ''))
        if user_dict:
            request.user = FirestoreUser(user_dict)
            return True
        return False


firestore_auth = FirestoreAuth()


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    user_dict = _get_user_by_token(request.headers.get('Authorization', ''))
    if user_dict:
        users_collection().document(user_dict['id']).update({'auth_token': ''})
    return Response({'message': 'Logged out'})


@api_view(['GET'])
@permission_classes([AllowAny])
def user_view(request):
    user_dict = _get_user_by_token(request.headers.get('Authorization', ''))
    if not user_dict:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)
    return Response({
        'id': user_dict['id'],
        'id_no': user_dict.get('id_no', ''),
        'email': user_dict.get('email', ''),
        'firstname': user_dict.get('firstname', ''),
        'middlename': user_dict.get('middlename', ''),
        'lastname': user_dict.get('lastname', ''),
        'suffix': user_dict.get('suffix', ''),
        'role': user_dict.get('role', 'user'),
        'name': f"{user_dict.get('firstname', '')} {user_dict.get('lastname', '')}",
    })


# ---------- Attendance ----------

def _get_firestore_user(request):
    return _get_user_by_token(request.headers.get('Authorization', ''))


@api_view(['POST'])
@permission_classes([AllowAny])
def clock_in(request):
    user_dict = _get_firestore_user(request)
    if not user_dict:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    s = _get_settings()
    if not s.get('clock_in_enabled'):
        return Response({'message': 'Clock-in is currently disabled'}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.localtime()
    t = now.strftime('%H:%M')
    if t < s['clock_in_start'] or t > s['clock_in_end']:
        return Response({
            'message': f'Clock-in is only allowed between {s["clock_in_start"]} and {s["clock_in_end"]}'
        }, status=status.HTTP_400_BAD_REQUEST)

    active = attendance_collection().where('user_email', '==', user_dict['email']).where('clock_out', '==', None).limit(1).get()
    for a in active:
        return Response({'message': 'Already clocked in'}, status=status.HTTP_400_BAD_REQUEST)

    doc_ref = attendance_collection().document()
    doc_ref.set({
        'user_email': user_dict['email'],
        'user_id_no': user_dict.get('id_no', ''),
        'user_name': f"{user_dict.get('firstname', '')} {user_dict.get('lastname', '')}",
        'clock_in': now,
        'clock_out': None,
        'is_late': False,
        'created_at': now,
    })

    att_data = _attendance_to_dict(doc_ref.get())

    return Response({
        'message': 'Clocked in successfully',
        'attendance': att_data,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def clock_out(request):
    user_dict = _get_firestore_user(request)
    if not user_dict:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    s = _get_settings()
    if not s.get('clock_out_enabled'):
        return Response({'message': 'Clock-out is currently disabled'}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.localtime()
    t = now.strftime('%H:%M')
    if t < s['clock_out_start'] or t > s['clock_out_end']:
        return Response({
            'message': f'Clock-out is only allowed between {s["clock_out_start"]} and {s["clock_out_end"]}'
        }, status=status.HTTP_400_BAD_REQUEST)

    active = attendance_collection().where('user_email', '==', user_dict['email']).where('clock_out', '==', None).limit(1).get()
    att_doc = None
    for a in active:
        att_doc = a
        break

    if not att_doc:
        return Response({'message': 'No active clock-in found'}, status=status.HTTP_400_BAD_REQUEST)

    att_doc.reference.update({'clock_out': now})
    updated = _attendance_to_dict(att_doc.get())

    return Response({
        'message': 'Clocked out successfully',
        'attendance': updated,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def active_session_view(request):
    user_dict = _get_firestore_user(request)
    if not user_dict:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    s = _get_settings()
    active = attendance_collection().where('user_email', '==', user_dict['email']).where('clock_out', '==', None).limit(1).get()
    for a in active:
        data = _attendance_to_dict(a)
        data.update({
            'clock_in_start': s.get('clock_in_start'),
            'clock_in_end': s.get('clock_in_end'),
            'clock_out_start': s.get('clock_out_start'),
            'clock_out_end': s.get('clock_out_end'),
            'clock_in_enabled': s.get('clock_in_enabled'),
            'clock_out_enabled': s.get('clock_out_enabled'),
        })
        return Response(data)

    return Response({
        'clock_in_start': s.get('clock_in_start'),
        'clock_in_end': s.get('clock_in_end'),
        'clock_out_start': s.get('clock_out_start'),
        'clock_out_end': s.get('clock_out_end'),
        'clock_in_enabled': s.get('clock_in_enabled'),
        'clock_out_enabled': s.get('clock_out_enabled'),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def history_view(request):
    user_dict = _get_firestore_user(request)
    if not user_dict:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    atts = attendance_collection().where('user_email', '==', user_dict['email']).order_by('clock_in', direction=DESCENDING).limit(20).get()
    return Response([_attendance_to_dict(a) for a in atts])


@api_view(['GET'])
@permission_classes([AllowAny])
def admin_attendance_view(request):
    user_dict = _get_firestore_user(request)
    if not user_dict or user_dict.get('role') != 'admin':
        return Response({'message': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    atts = attendance_collection().order_by('clock_in', direction=DESCENDING).limit(50).get()
    return Response([_attendance_to_dict(a) for a in atts])


# ---------- Settings ----------

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def settings_view(request):
    user_dict = _get_firestore_user(request)
    if not user_dict or user_dict.get('role') != 'admin':
        return Response({'message': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    s = _get_settings()

    if request.method == 'GET':
        return Response(s)

    for key in ['clock_in_start', 'clock_in_end', 'clock_out_start', 'clock_out_end', 'clock_in_enabled', 'clock_out_enabled']:
        val = request.data.get(key)
        if val is not None:
            s[key] = val if key.endswith('_enabled') else str(val)

    settings_doc().set(s)
    return Response({'message': 'Settings updated', **s})


# ---------- Employees ----------

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def employees_view(request):
    user_dict = _get_firestore_user(request)
    if not user_dict or user_dict.get('role') != 'admin':
        return Response({'message': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        users = users_collection().where('role', '==', 'user').order_by('lastname', 'firstname').get()
        result = []
        for u in users:
            d = _user_to_dict(u)
            d.pop('password', None)
            d.pop('auth_token', None)
            result.append(d)
        return Response(result)

    data = request.data
    email = data.get('email')
    firstname = data.get('firstname', '')
    middlename = data.get('middlename', '')
    lastname = data.get('lastname', '')
    suffix = data.get('suffix', '')
    id_no = data.get('id_no', '')

    if not id_no:
        all_users = users_collection().order_by('id_no', direction='DESCENDING').limit(1).get()
        last_no = 0
        for u in all_users:
            uid = u.to_dict().get('id_no', 'EMP-000')
            last_no = int(uid.split('-')[1]) if '-' in uid else 0
        id_no = f'EMP-{str(last_no + 1).zfill(3)}'

    temp_password = get_random_string(10)

    doc_ref = users_collection().document()
    doc_ref.set({
        'email': email,
        'password': make_password(temp_password),
        'id_no': id_no,
        'firstname': firstname,
        'middlename': middlename,
        'lastname': lastname,
        'suffix': suffix,
        'role': 'user',
        'auth_token': '',
        'created_at': timezone.now(),
    })

    try:
        send_mail(
            subject='SpesAttendance - Account Created',
            message=f'Hello {firstname},\n\nYour account has been created.\n\nEmail: {email}\nID No.: {id_no}\nTemporary Password: {temp_password}\n\nPlease change your password after logging in.\n\n- SpesAttendance Team',
            from_email=None,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception:
        pass

    user_data = _user_to_dict(doc_ref.get())
    user_data.pop('password', None)
    user_data.pop('auth_token', None)
    return Response(user_data, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([AllowAny])
def employee_detail_view(request, user_id):
    user_dict = _get_firestore_user(request)
    if not user_dict or user_dict.get('role') != 'admin':
        return Response({'message': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    doc_ref = users_collection().document(user_id)
    doc = doc_ref.get()
    if not doc.exists:
        return Response({'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        doc_ref.delete()
        return Response({'message': 'User deleted'})

    updates = {}
    for key in ['firstname', 'middlename', 'lastname', 'suffix', 'email', 'id_no']:
        val = request.data.get(key)
        if val is not None:
            updates[key] = val
    password = request.data.get('password')
    if password:
        updates['password'] = make_password(password)
    if updates:
        doc_ref.update(updates)

    updated = _user_to_dict(doc_ref.get())
    updated.pop('password', None)
    updated.pop('auth_token', None)
    return Response(updated)


# ---------- Analytics ----------

@api_view(['GET'])
@permission_classes([AllowAny])
def admin_analytics_view(request):
    user_dict = _get_firestore_user(request)
    if not user_dict or user_dict.get('role') != 'admin':
        return Response({'message': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    total_employees = len(list(users_collection().where('role', '==', 'user').get()))

    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    today_atts = attendance_collection().where('clock_in', '>=', today_start).where('clock_in', '<', today_end).get()
    present_emails = set()
    late_emails = set()
    for a in today_atts:
        d = a.to_dict()
        present_emails.add(d.get('user_email'))
        if d.get('is_late'):
            late_emails.add(d.get('user_email'))

    present_today = len(present_emails)
    late_today = len(late_emails)

    all_atts = attendance_collection().get()
    completed = [a for a in all_atts if a.to_dict().get('clock_out')]
    total_attendance_count = len(completed)
    total_seconds = 0
    for a in completed:
        d = a.to_dict()
        ci, co = d.get('clock_in'), d.get('clock_out')
        if ci and co:
            total_seconds += (co - ci).total_seconds()
    avg_hours = round(total_seconds / 3600 / total_attendance_count, 1) if total_attendance_count else 0

    last_7 = []
    for i in range(6, -1, -1):
        day = timezone.now() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        day_atts = attendance_collection().where('clock_in', '>=', day_start).where('clock_in', '<', day_end).get()
        day_emails = set()
        for a in day_atts:
            day_emails.add(a.to_dict().get('user_email'))
        last_7.append({'date': day.strftime('%Y-%m-%d'), 'count': len(day_emails)})

    return Response({
        'total_employees': total_employees,
        'present_today': present_today,
        'late_today': late_today,
        'total_attendance_records': total_attendance_count,
        'average_hours': avg_hours,
        'daily_attendance': last_7,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def user_analytics_view(request):
    user_dict = _get_firestore_user(request)
    if not user_dict:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    all_atts = attendance_collection().where('user_email', '==', user_dict['email']).get()
    completed = [a for a in all_atts if a.to_dict().get('clock_out')]
    total_days = len(completed)
    total_seconds = 0
    late_count = 0
    for a in all_atts:
        d = a.to_dict()
        if d.get('is_late'):
            late_count += 1
        co = d.get('clock_out')
        ci = d.get('clock_in')
        if ci and co:
            total_seconds += (co - ci).total_seconds()

    total_hours = round(total_seconds / 3600, 1)
    avg_hours = round(total_hours / total_days, 1) if total_days else 0

    today = timezone.now()
    last_7 = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        day_atts = attendance_collection().where('user_email', '==', user_dict['email']).where('clock_in', '>=', day_start).where('clock_in', '<', day_end).get()
        day_hours = 0
        for a in day_atts:
            d = a.to_dict()
            ci, co = d.get('clock_in'), d.get('clock_out')
            if ci and co:
                day_hours += (co - ci).total_seconds() / 3600
        last_7.append({'date': day.strftime('%Y-%m-%d'), 'hours': round(day_hours, 1)})

    return Response({
        'total_days_worked': total_days,
        'total_hours': total_hours,
        'average_hours_per_day': avg_hours,
        'late_count': late_count,
        'attendance_count': len(all_atts),
        'daily_hours': last_7,
    })


# ---------- Forgot Password ----------

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_view(request):
    email = request.data.get('email')
    if not email:
        return Response({'message': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    user_doc = _get_user_by_email(email)
    if not user_doc:
        return Response({'message': 'Email not found'}, status=status.HTTP_404_NOT_FOUND)

    temp_password = get_random_string(10)
    users_collection().document(user_doc['id']).update({'password': make_password(temp_password)})

    try:
        send_mail(
            subject='SpesAttendance - Password Reset',
            message=f"Hello {user_doc.get('firstname', '')},\n\nYour password has been reset.\n\nEmail: {email}\nNew Password: {temp_password}\n\nPlease change your password after logging in.\n\n- SpesAttendance Team",
            from_email=None,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception:
        return Response({'message': 'Failed to send email. Check server configuration.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'message': 'Check your email for the new password.'})
