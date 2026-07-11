from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None
    id_no = models.CharField(max_length=50, unique=True, verbose_name="Number Identifier")
    firstname = models.CharField(max_length=100)
    middlename = models.CharField(max_length=100, blank=True, default='')
    lastname = models.CharField(max_length=100)
    suffix = models.CharField(max_length=20, blank=True, default='')
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=[('user', 'User'), ('admin', 'Admin')], default='user')

    # Security fields for brute-force protection
    failed_login_attempts = models.PositiveIntegerField(default=0)
    lockout_until = models.DateTimeField(null=True, blank=True)
    lockout_count = models.PositiveIntegerField(default=0)  # Number of times locked out (for exponential backoff)
    require_captcha = models.BooleanField(default=False)  # Show CAPTCHA after failed attempts
    captcha_verified_at = models.DateTimeField(null=True, blank=True)  # When CAPTCHA was last verified
    two_fa_secret = models.CharField(max_length=32, blank=True, default='')  # TOTP secret for 2FA
    two_fa_enabled = models.BooleanField(default=False)  # Whether 2FA is enabled

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['id_no', 'firstname', 'lastname']

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.get_full_name} ({self.id_no})"

    @property
    def get_full_name(self):
        parts = [self.firstname]
        if self.middlename:
            parts.append(self.middlename)
        parts.append(self.lastname)
        name = ' '.join(parts)
        if self.suffix:
            name += f' {self.suffix}'
        return name

    def is_locked(self):
        """Check if account is currently locked."""
        from django.utils import timezone
        if self.lockout_until and self.lockout_until > timezone.now():
            return True
        return False

    def get_lockout_duration(self):
        """Calculate lockout duration based on lockout count (exponential backoff)."""
        # 5 min, 15 min, 1 hour, 4 hours, 24 hours, then cap at 24 hours
        durations = [5, 15, 60, 240, 1440]  # minutes
        index = min(self.lockout_count, len(durations) - 1)
        return durations[index]

    def increment_failed_attempt(self):
        """Increment failed attempts and handle lockout."""
        from django.utils import timezone
        from datetime import timedelta

        self.failed_login_attempts += 1

        # Trigger CAPTCHA after 3 failed attempts
        if self.failed_login_attempts >= 3 and not self.require_captcha:
            self.require_captcha = True

        # Lockout after 5 failed attempts
        if self.failed_login_attempts >= 5:
            duration = self.get_lockout_duration()
            self.lockout_until = timezone.now() + timedelta(minutes=duration)
            self.lockout_count += 1
            self.require_captcha = True  # Require CAPTCHA after lockout too

        self.save(update_fields=['failed_login_attempts', 'lockout_until', 'lockout_count', 'require_captcha'])

    def reset_failed_attempts(self):
        """Reset failed attempts on successful login."""
        self.failed_login_attempts = 0
        self.lockout_until = None
        self.lockout_count = 0
        self.require_captcha = False
        self.captcha_verified_at = None
        self.save(update_fields=['failed_login_attempts', 'lockout_until', 'lockout_count', 'require_captcha', 'captcha_verified_at'])

    def verify_captcha(self):
        """Mark CAPTCHA as verified."""
        from django.utils import timezone
        self.captcha_verified_at = timezone.now()
        self.save(update_fields=['captcha_verified_at'])

    def is_captcha_valid(self):
        """Check if CAPTCHA verification is still valid (valid for 10 minutes)."""
        from django.utils import timezone
        if not self.captcha_verified_at:
            return False
        return (timezone.now() - self.captcha_verified_at).total_seconds() < 600  # 10 minutes


class AttendanceSettings(models.Model):
    clock_in_start = models.TimeField(default='07:00')
    clock_in_end = models.TimeField(default='07:20')
    clock_out_start = models.TimeField(default='17:00')
    clock_out_end = models.TimeField(default='17:20')
    clock_in_enabled = models.BooleanField(default=False)
    clock_out_enabled = models.BooleanField(default=False)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'attendance_settings'


class Attendance(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendances')
    clock_in = models.DateTimeField()
    clock_out = models.DateTimeField(null=True, blank=True)
    is_late = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'attendance'
        ordering = ['-clock_in']

    def __str__(self):
        return f"{self.user.email} - {self.clock_in}"

    @property
    def duration(self):
        if not self.clock_out:
            return None
        diff = self.clock_out - self.clock_in
        hours = diff.seconds // 3600
        minutes = (diff.seconds % 3600) // 60
        return f"{hours}h {minutes}m"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_tokens')
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        db_table = 'password_reset_tokens'

    def is_valid(self):
        from django.utils import timezone
        return not self.used and self.expires_at > timezone.now()
