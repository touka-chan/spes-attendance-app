import os
import requests
from datetime import time as time_obj, timedelta
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from .models import User, Attendance, AttendanceSettings


def _get_settings():
    s = AttendanceSettings.objects.first()
    if not s:
        s = AttendanceSettings.objects.create(
            clock_in_start='07:00',
            clock_in_end='07:20',
            clock_out_start='17:00',
            clock_out_end='17:20',
            clock_in_enabled=False,
            clock_out_enabled=False,
        )
    return s


def _parse_time(val):
    if isinstance(val, str) and ':' in val:
        parts = val.split(':')
        return time_obj(int(parts[0]), int(parts[1]))
    return val


def _serialize_user(u):
    return {
        'id': u.id,
        'id_no': u.id_no,
        'firstname': u.firstname,
        'middlename': u.middlename,
        'lastname': u.lastname,
        'suffix': u.suffix,
        'email': u.email,
        'role': u.role,
        'name': f"{u.firstname} {u.lastname}",
    }


def _serialize_attendance(a):
    duration = None
    if a.clock_out and a.clock_in:
        diff = a.clock_out - a.clock_in
        hours = int(diff.total_seconds() // 3600)
        minutes = int((diff.total_seconds() % 3600) // 60)
        duration = f"{hours}h {minutes}m"
    return {
        'id': a.id,
        'user_email': a.user.email,
        'user_name': f"{a.user.firstname} {a.user.lastname}",
        'user_id_no': a.user.id_no,
        'clock_in': a.clock_in.isoformat() if a.clock_in else None,
        'clock_out': a.clock_out.isoformat() if a.clock_out else None,
        'is_late': a.is_late,
        'duration': duration,
        'created_at': a.created_at.isoformat() if a.created_at else None,
    }


def _time_str(t):
    if t is None:
        return ''
    if isinstance(t, str):
        return t
    return t.strftime('%H:%M')


# ---------- Auth ----------

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get('email')
    password = request.data.get('password')

    user = authenticate(email=email, password=password)
    if not user:
        return Response({'message': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'message': 'Login successful',
        'token': token.key,
        'user': {
            'id': user.id,
            'id_no': user.id_no,
            'name': f"{user.firstname} {user.lastname}",
            'email': user.email,
            'role': user.role,
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

    if User.objects.filter(email=email).exists():
        return Response({'message': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)

    if not id_no:
        last_count = User.objects.filter(role='user', id_no__startswith='EMP-').count()
        id_no = f'EMP-{str(last_count + 1).zfill(3)}'

    user = User.objects.create_user(
        email=email,
        password=password,
        id_no=id_no,
        firstname=firstname,
        middlename=middlename,
        lastname=lastname,
        suffix=suffix,
        role=role,
    )

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'message': 'User registered successfully',
        'token': token.key,
        'user': _serialize_user(user),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    if request.user.is_authenticated:
        try:
            request.user.auth_token.delete()
        except Exception:
            pass
    return Response({'message': 'Logged out'})


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def user_view(request):
    if not request.user.is_authenticated:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)
    return Response(_serialize_user(request.user))


# ---------- Attendance ----------

@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def clock_in(request):
    if not request.user.is_authenticated:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    s = _get_settings()
    if not s.clock_in_enabled:
        return Response({'message': 'Clock-in is currently disabled'}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.localtime()
    t = now.time()
    if t < s.clock_in_start or t > s.clock_in_end:
        return Response({
            'message': f'Clock-in is only allowed between {_time_str(s.clock_in_start)} and {_time_str(s.clock_in_end)}'
        }, status=status.HTTP_400_BAD_REQUEST)

    if Attendance.objects.filter(user=request.user, clock_out__isnull=True).exists():
        return Response({'message': 'Already clocked in'}, status=status.HTTP_400_BAD_REQUEST)

    att = Attendance.objects.create(
        user=request.user,
        clock_in=now,
        is_late=False,
    )

    return Response({
        'message': 'Clocked in successfully',
        'attendance': _serialize_attendance(att),
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def clock_out(request):
    if not request.user.is_authenticated:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    s = _get_settings()
    if not s.clock_out_enabled:
        return Response({'message': 'Clock-out is currently disabled'}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.localtime()
    t = now.time()
    if t < s.clock_out_start or t > s.clock_out_end:
        return Response({
            'message': f'Clock-out is only allowed between {_time_str(s.clock_out_start)} and {_time_str(s.clock_out_end)}'
        }, status=status.HTTP_400_BAD_REQUEST)

    att = Attendance.objects.filter(user=request.user, clock_out__isnull=True).first()
    if not att:
        return Response({'message': 'No active clock-in found'}, status=status.HTTP_400_BAD_REQUEST)

    att.clock_out = now
    att.save()

    return Response({
        'message': 'Clocked out successfully',
        'attendance': _serialize_attendance(att),
    })


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def active_session_view(request):
    if not request.user.is_authenticated:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    s = _get_settings()
    base = {
        'clock_in_start': _time_str(s.clock_in_start),
        'clock_in_end': _time_str(s.clock_in_end),
        'clock_out_start': _time_str(s.clock_out_start),
        'clock_out_end': _time_str(s.clock_out_end),
        'clock_in_enabled': s.clock_in_enabled,
        'clock_out_enabled': s.clock_out_enabled,
    }

    active = Attendance.objects.filter(user=request.user, clock_out__isnull=True).first()
    if active:
        data = _serialize_attendance(active)
        data.update(base)
        return Response(data)

    return Response(base)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def history_view(request):
    if not request.user.is_authenticated:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    atts = Attendance.objects.filter(user=request.user).order_by('-clock_in')[:20]
    return Response([_serialize_attendance(a) for a in atts])


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def admin_attendance_view(request):
    if not request.user.is_authenticated or request.user.role != 'admin':
        return Response({'message': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    atts = Attendance.objects.select_related('user').order_by('-clock_in')[:50]
    return Response([_serialize_attendance(a) for a in atts])


# ---------- Settings ----------

@api_view(['GET', 'POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def settings_view(request):
    if not request.user.is_authenticated or request.user.role != 'admin':
        return Response({'message': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    s = _get_settings()

    if request.method == 'GET':
        return Response({
            'clock_in_start': _time_str(s.clock_in_start),
            'clock_in_end': _time_str(s.clock_in_end),
            'clock_out_start': _time_str(s.clock_out_start),
            'clock_out_end': _time_str(s.clock_out_end),
            'clock_in_enabled': s.clock_in_enabled,
            'clock_out_enabled': s.clock_out_enabled,
        })

    for key in ['clock_in_start', 'clock_in_end', 'clock_out_start', 'clock_out_end']:
        val = request.data.get(key)
        if val is not None:
            setattr(s, key, _parse_time(val))
    for key in ['clock_in_enabled', 'clock_out_enabled']:
        val = request.data.get(key)
        if val is not None:
            setattr(s, key, bool(val))
    s.updated_by = request.user
    s.save()

    return Response({
        'message': 'Settings updated',
        'clock_in_start': _time_str(s.clock_in_start),
        'clock_in_end': _time_str(s.clock_in_end),
        'clock_out_start': _time_str(s.clock_out_start),
        'clock_out_end': _time_str(s.clock_out_end),
        'clock_in_enabled': s.clock_in_enabled,
        'clock_out_enabled': s.clock_out_enabled,
    })


# ---------- Employees ----------

@api_view(['GET', 'POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def employees_view(request):
    if not request.user.is_authenticated or request.user.role != 'admin':
        return Response({'message': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        users = User.objects.filter(role='user').order_by('lastname', 'firstname')
        return Response([_serialize_user(u) for u in users])

    data = request.data
    email = data.get('email')
    firstname = data.get('firstname', '')
    middlename = data.get('middlename', '')
    lastname = data.get('lastname', '')
    suffix = data.get('suffix', '')
    id_no = data.get('id_no', '')

    if not id_no:
        last_count = User.objects.filter(role='user', id_no__startswith='EMP-').count()
        id_no = f'EMP-{str(last_count + 1).zfill(3)}'

    temp_password = get_random_string(10)

    user = User.objects.create_user(
        email=email,
        password=temp_password,
        id_no=id_no,
        firstname=firstname,
        middlename=middlename,
        lastname=lastname,
        suffix=suffix,
        role='user',
    )

    try:
        brevo_key = os.getenv('BREVO_API_KEY')
        if brevo_key:
            requests.post(
                'https://api.brevo.com/v3/smtp/email',
                headers={
                    'api-key': brevo_key,
                    'Content-Type': 'application/json',
                },
                json={
                    'sender': {'email': os.getenv('DEFAULT_FROM_EMAIL'), 'name': 'SpesAttendance'},
                    'to': [{'email': email}],
                    'subject': 'SpesAttendance - Account Created',
                    'textContent': f'Hello {firstname},\n\nYour account has been created.\n\nEmail: {email}\nID No.: {id_no}\nTemporary Password: {temp_password}\n\nPlease change your password after logging in.\n\n- SpesAttendance Team',
                },
                timeout=10,
            )
            print(f"Brevo email sent to {email}")
    except Exception as e:
        print(f"Brevo email error: {e}")

    result = _serialize_user(user)
    result['temp_password'] = temp_password
    return Response(result, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def employee_detail_view(request, user_id):
    if not request.user.is_authenticated or request.user.role != 'admin':
        return Response({'message': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        user.delete()
        return Response({'message': 'User deleted'})

    for key in ['firstname', 'middlename', 'lastname', 'suffix', 'email', 'id_no']:
        val = request.data.get(key)
        if val is not None:
            setattr(user, key, val)
    password = request.data.get('password')
    if password:
        user.set_password(password)
    user.save()

    return Response(_serialize_user(user))


# ---------- Analytics ----------

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def admin_analytics_view(request):
    if not request.user.is_authenticated or request.user.role != 'admin':
        return Response({'message': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    total_employees = User.objects.filter(role='user').count()

    today = timezone.now().date()
    today_atts = Attendance.objects.filter(clock_in__date=today)
    present_emails = set(today_atts.values_list('user__email', flat=True).distinct())
    late_emails = set(today_atts.filter(is_late=True).values_list('user__email', flat=True).distinct())

    present_today = len(present_emails)
    late_today = len(late_emails)

    completed = Attendance.objects.filter(clock_out__isnull=False)
    total_attendance_count = completed.count()
    total_seconds = 0
    for a in completed:
        diff = a.clock_out - a.clock_in
        total_seconds += diff.total_seconds()
    avg_hours = round(total_seconds / 3600 / total_attendance_count, 1) if total_attendance_count else 0

    last_7 = []
    for i in range(6, -1, -1):
        day = timezone.now() - timedelta(days=i)
        count = Attendance.objects.filter(clock_in__date=day.date()).values('user').distinct().count()
        last_7.append({'date': day.strftime('%Y-%m-%d'), 'count': count})

    return Response({
        'total_employees': total_employees,
        'present_today': present_today,
        'late_today': late_today,
        'total_attendance_records': total_attendance_count,
        'average_hours': avg_hours,
        'daily_attendance': last_7,
    })


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def user_analytics_view(request):
    if not request.user.is_authenticated:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    all_atts = Attendance.objects.filter(user=request.user)
    completed = all_atts.filter(clock_out__isnull=False)
    total_days = completed.count()
    total_seconds = 0
    late_count = all_atts.filter(is_late=True).count()
    for a in completed:
        diff = a.clock_out - a.clock_in
        total_seconds += diff.total_seconds()

    total_hours = round(total_seconds / 3600, 1)
    avg_hours = round(total_hours / total_days, 1) if total_days else 0

    last_7 = []
    for i in range(6, -1, -1):
        day = timezone.now() - timedelta(days=i)
        day_atts = all_atts.filter(clock_in__date=day.date())
        day_hours = 0
        for a in day_atts:
            if a.clock_out and a.clock_in:
                diff = a.clock_out - a.clock_in
                day_hours += diff.total_seconds() / 3600
        last_7.append({'date': day.strftime('%Y-%m-%d'), 'hours': round(day_hours, 1)})

    return Response({
        'total_days_worked': total_days,
        'total_hours': total_hours,
        'average_hours_per_day': avg_hours,
        'late_count': late_count,
        'attendance_count': all_atts.count(),
        'daily_hours': last_7,
    })


# ---------- Forgot Password ----------

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_view(request):
    email = request.data.get('email')
    if not email:
        return Response({'message': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'message': 'Email not found'}, status=status.HTTP_404_NOT_FOUND)

    temp_password = get_random_string(10)
    user.set_password(temp_password)
    user.save()

    try:
        brevo_key = os.getenv('BREVO_API_KEY')
        if brevo_key:
            requests.post(
                'https://api.brevo.com/v3/smtp/email',
                headers={
                    'api-key': brevo_key,
                    'Content-Type': 'application/json',
                },
                json={
                    'sender': {'email': os.getenv('DEFAULT_FROM_EMAIL'), 'name': 'SpesAttendance'},
                    'to': [{'email': email}],
                    'subject': 'SpesAttendance - Password Reset',
                    'textContent': f"Hello {user.firstname},\n\nYour password has been reset.\n\nEmail: {email}\nNew Password: {temp_password}\n\nPlease change your password after logging in.\n\n- SpesAttendance Team",
                },
                timeout=10,
            )
            print(f"Brevo reset email sent to {email}")
    except Exception as e:
        print(f"Brevo email error: {e}")
        return Response({'message': 'Failed to send email. Check Render logs.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'message': 'Check your email for the new password.'})
