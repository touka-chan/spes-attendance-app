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
