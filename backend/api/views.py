import os
import secrets
import requests
import pyotp
from datetime import time as time_obj, timedelta, datetime
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from django.conf import settings
from django.db import models
from .models import User, Attendance, AttendanceSettings, PasswordResetToken, Notification


def verify_turnstile(token, secret_key):
    """Verify Turnstile token."""
    if not token or not secret_key:
        return False
    try:
        response = requests.post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            data={'secret': secret_key, 'response': token},
            timeout=5
        )
        result = response.json()
        return result.get('success', False)
    except Exception:
        return False


def create_notification(notif_type, title, message, recipient_role='all', recipient=None, related_user=None):
    """Create a notification for users."""
    Notification.objects.create(
        recipient_role=recipient_role,
        recipient=recipient,
        notif_type=notif_type,
        title=title,
        message=message,
        related_user=related_user,
    )


def verify_totp(secret, code):
    """Verify TOTP code."""
    if not secret or not code:
        return False
    try:
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)
    except Exception:
        return False


def generate_totp_secret():
    """Generate a new TOTP secret."""
    return pyotp.random_base32()


def get_totp_uri(secret, email, issuer='SpesAttendance'):
    """Get TOTP URI for QR code."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


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

    expires_in = 30 * 60 if user.role == 'user' else 3 * 60 * 60
    from django.utils import timezone
    from datetime import timedelta
    expires_at = timezone.now() + timedelta(seconds=expires_in)

    return Response({
        'message': 'Login successful',
        'token': token.key,
        'expires_in': expires_in,
        'expires_at': expires_at.isoformat(),
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
def check_security_requirements(request):
    """Check if CAPTCHA or 2FA is required for the given email.
    Called when user visits login page to show appropriate challenge."""
    email = request.data.get('email')
    if not email:
        return Response({'require_captcha': False, 'require_2fa': False})

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'require_captcha': False, 'require_2fa': False})

    # Check if account is locked
    if user.is_locked():
        from django.utils import timezone
        lockout_minutes = int((user.lockout_until - timezone.now()).total_seconds() / 60)
        return Response({
            'locked': True,
            'lockout_minutes': lockout_minutes,
            'require_captcha': True,
            'require_2fa': user.two_fa_enabled,
        })

    return Response({
        'require_captcha': user.require_captcha,
        'require_2fa': user.two_fa_enabled,
        'site_key': os.getenv('CAPTCHA_SITE_KEY', ''),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_captcha(request):
    """Verify CAPTCHA token."""
    email = request.data.get('email')
    captcha_token = request.data.get('captcha_token')
    
    if not email or not captcha_token:
        return Response({'message': 'Email and CAPTCHA token required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if not user.require_captcha:
        return Response({'message': 'CAPTCHA not required'}, status=status.HTTP_400_BAD_REQUEST)

    captcha_secret = os.getenv('CAPTCHA_SECRET_KEY', '')
    if not verify_turnstile(captcha_token, captcha_secret):
        return Response({'message': 'CAPTCHA verification failed'}, status=status.HTTP_400_BAD_REQUEST)

    user.verify_captcha()
    return Response({'message': 'CAPTCHA verified successfully'})


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_challenge(request):
    """Verify CAPTCHA or 2FA from challenge page and set session cookie."""
    try:
        email = request.data.get('email')
        captcha_token = request.data.get('captcha_token')
        totp_code = request.data.get('totp_code')
        redirect = request.data.get('redirect') or request.data.get('redirect_url', '/')

        # Handle fresh CAPTCHA verification (no email yet - first visit challenge)
        if not email and captcha_token:
            captcha_secret = os.getenv('CAPTCHA_SECRET_KEY', '')
            if not verify_turnstile(captcha_token, captcha_secret):
                return Response({'message': 'CAPTCHA verification failed'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'message': 'CAPTCHA verified successfully', 'fresh_verified': True})

        if not email:
            return Response({'message': 'Email required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Handle CAPTCHA verification for known user
        if user.require_captcha:
            if not captcha_token:
                return Response({'message': 'CAPTCHA token required'}, status=status.HTTP_400_BAD_REQUEST)

            captcha_secret = os.getenv('CAPTCHA_SECRET_KEY', '')
            if not verify_turnstile(captcha_token, captcha_secret):
                return Response({'message': 'CAPTCHA verification failed'}, status=status.HTTP_400_BAD_REQUEST)

            user.verify_captcha()

        # Handle 2FA verification
        if user.two_fa_enabled:
            totp_code = request.data.get('totp_code')
            if not totp_code:
                return Response({'message': '2FA code required'}, status=status.HTTP_400_BAD_REQUEST)

            if not verify_totp(user.two_fa_secret, totp_code):
                return Response({'message': 'Invalid 2FA code'}, status=status.HTTP_400_BAD_REQUEST)

        # Challenge verified - redirect back to login
        return Response({
            'message': 'Challenge verified successfully',
            'redirect': redirect,
            'verified': True,
        })
    except Exception as e:
        return Response({'message': f'Server error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_site_key(request):
    """Return the Turnstile CAPTCHA site key for frontend."""
    return Response({
        'site_key': os.getenv('CAPTCHA_SITE_KEY', ''),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def setup_2fa(request):
    """Generate 2FA secret and QR code for user."""
    email = request.data.get('email')
    if not email:
        return Response({'message': 'Email required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Generate secret
    secret = pyotp.random_base32()
    user.two_fa_secret = secret
    user.save(update_fields=['two_fa_secret'])

    # Generate provisioning URI for QR code
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(email, issuer_name='SpesAttendance')

    return Response({
        'secret': secret,
        'provisioning_uri': provisioning_uri,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_2fa_setup(request):
    """Verify 2FA code during setup to enable it."""
    email = request.data.get('email')
    totp_code = request.data.get('totp_code')

    if not email or not totp_code:
        return Response({'message': 'Email and code required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if not user.two_fa_secret:
        return Response({'message': '2FA not set up'}, status=status.HTTP_400_BAD_REQUEST)

    if verify_totp(user.two_fa_secret, totp_code):
        user.two_fa_enabled = True
        user.save(update_fields=['two_fa_enabled'])
        return Response({'message': '2FA enabled successfully'})
    else:
        return Response({'message': 'Invalid code'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def disable_2fa(request):
    """Disable 2FA for user."""
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response({'message': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(email=email, password=password)
    if not user:
        return Response({'message': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    user.two_fa_enabled = False
    user.two_fa_secret = ''
    user.save(update_fields=['two_fa_enabled', 'two_fa_secret'])

    return Response({'message': '2FA disabled successfully'})


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

    grace_end = (datetime.combine(datetime.today(), s.clock_in_start) + timedelta(minutes=s.grace_minutes)).time()
    att = Attendance.objects.create(
        user=request.user,
        clock_in=now,
        is_late=t > grace_end,
    )

    name = request.user.get_full_name
    create_notification('clock_in', f'{name} clocked in', f'{name} clocked in at {now.strftime("%I:%M %p")}', recipient_role='admin', related_user=request.user)

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

    name = request.user.get_full_name
    duration = att.duration
    create_notification('clock_out', f'{name} clocked out', f'{name} clocked out at {now.strftime("%I:%M %p")}. Duration: {duration}', recipient_role='admin', related_user=request.user)

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
        'grace_minutes': s.grace_minutes,
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
            'grace_minutes': s.grace_minutes,
        })

    for key in ['clock_in_start', 'clock_in_end', 'clock_out_start', 'clock_out_end']:
        val = request.data.get(key)
        if val is not None:
            setattr(s, key, _parse_time(val))
    for key in ['clock_in_enabled', 'clock_out_enabled']:
        val = request.data.get(key)
        if val is not None:
            setattr(s, key, bool(val))
    grace = request.data.get('grace_minutes')
    if grace is not None:
        s.grace_minutes = max(0, int(grace))
    s.updated_by = request.user
    s.save()

    old_in = request.data.get('clock_in_enabled')
    old_out = request.data.get('clock_out_enabled')
    if old_in is not None:
        enabled = s.clock_in_enabled
        create_notification('settings', f'Clock-in {"enabled" if enabled else "disabled"}', f'Admin {"enabled" if enabled else "disabled"} clock-in. Window: {_time_str(s.clock_in_start)} - {_time_str(s.clock_in_end)}', recipient_role='user')
    if old_out is not None:
        enabled = s.clock_out_enabled
        create_notification('settings', f'Clock-out {"enabled" if enabled else "disabled"}', f'Admin {"enabled" if enabled else "disabled"} clock-out. Window: {_time_str(s.clock_out_start)} - {_time_str(s.clock_out_end)}', recipient_role='user')

    return Response({
        'message': 'Settings updated',
        'clock_in_start': _time_str(s.clock_in_start),
        'clock_in_end': _time_str(s.clock_in_end),
        'clock_out_start': _time_str(s.clock_out_start),
        'clock_out_end': _time_str(s.clock_out_end),
        'clock_in_enabled': s.clock_in_enabled,
        'clock_out_enabled': s.clock_out_enabled,
        'grace_minutes': s.grace_minutes,
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
                    'sender': {'email': settings.DEFAULT_FROM_EMAIL or 'noreply@spes-attendance.com', 'name': 'SpesAttendance'},
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
        # Don't reveal if email exists
        return Response({'message': 'If the email exists, a reset link will be sent.'})

    # Delete old unused tokens for this user
    PasswordResetToken.objects.filter(user=user, used=False).delete()

    # Create new reset token (valid for 1 hour)
    token = secrets.token_urlsafe(32)
    expires_at = timezone.now() + timedelta(hours=1)
    PasswordResetToken.objects.create(user=user, token=token, expires_at=expires_at)

    # Send reset link email via Brevo HTTP API
    reset_url = f"https://spes-attendance.web.app/reset-password?token={token}"
    
    try:
        brevo_key = os.getenv('BREVO_API_KEY')
        if brevo_key:
            resp = requests.post(
                'https://api.brevo.com/v3/smtp/email',
                headers={
                    'api-key': brevo_key,
                    'Content-Type': 'application/json',
                },
                json={
                    'sender': {'email': settings.DEFAULT_FROM_EMAIL or 'noreply@spes-attendance.com', 'name': 'SpesAttendance'},
                    'to': [{'email': email}],
                    'subject': 'SpesAttendance - Password Reset',
                    'textContent': f"Hello {user.firstname},\n\nClick the link below to reset your password:\n\n{reset_url}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.\n\n- SpesAttendance Team",
                },
                timeout=10,
            )
            print(f"Brevo reset email status: {resp.status_code}")
        else:
            print("BREVO_API_KEY not set")
    except Exception as e:
        print(f"Email error: {e}")
        return Response({'message': 'Failed to send email. Check Render logs.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'message': 'If the email exists, a reset link will be sent.'})


# ---------- Reset Password ----------

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')

    if not token or not new_password or not confirm_password:
        return Response({'message': 'Token, new password, and confirm password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({'message': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({'message': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        reset_token = PasswordResetToken.objects.get(token=token, used=False)
    except PasswordResetToken.DoesNotExist:
        return Response({'message': 'Invalid or expired reset token.'}, status=status.HTTP_400_BAD_REQUEST)

    if not reset_token.is_valid():
        return Response({'message': 'Reset token has expired.'}, status=status.HTTP_400_BAD_REQUEST)

    # Reset password
    user = reset_token.user
    user.set_password(new_password)
    user.save()

    # Mark token as used
    reset_token.used = True
    reset_token.save()

    return Response({'message': 'Password reset successful. You can now login.'})


# ===== Notifications =====

@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def notifications_view(request):
    if not request.user.is_authenticated:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    notifs = Notification.objects.filter(
        models.Q(recipient=request.user) |
        models.Q(recipient_role=request.user.role) |
        models.Q(recipient_role='all'),
        recipient__isnull=False,
    ).distinct()[:50]

    return Response([{
        'id': n.id,
        'type': n.notif_type,
        'title': n.title,
        'message': n.message,
        'is_read': n.is_read,
        'created_at': n.created_at.isoformat(),
        'related_user': n.related_user.get_full_name if n.related_user else None,
    } for n in notifs])


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def mark_notification_read(request, notif_id):
    if not request.user.is_authenticated:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        notif = Notification.objects.get(id=notif_id)
        notif.is_read = True
        notif.save()
        return Response({'message': 'Marked as read'})
    except Notification.DoesNotExist:
        return Response({'message': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([AllowAny])
def mark_all_notifications_read(request):
    if not request.user.is_authenticated:
        return Response({'message': 'Invalid token'}, status=status.HTTP_401_UNAUTHORIZED)

    Notification.objects.filter(
        models.Q(recipient=request.user) |
        models.Q(recipient_role=request.user.role) |
        models.Q(recipient_role='all'),
        is_read=False,
    ).update(is_read=True)

    return Response({'message': 'All marked as read'})

