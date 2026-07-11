from django.contrib import admin
from .models import User, Attendance, AttendanceSettings


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'id_no', 'firstname', 'lastname', 'role', 'is_staff']
    search_fields = ['email', 'firstname', 'lastname', 'id_no']
    list_filter = ['role']


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['user', 'clock_in', 'clock_out', 'is_late']
    list_filter = ['is_late', 'clock_in']


@admin.register(AttendanceSettings)
class AttendanceSettingsAdmin(admin.ModelAdmin):
    list_display = ['clock_in_start', 'clock_in_end', 'clock_out_start', 'clock_out_end', 'clock_in_enabled', 'clock_out_enabled']
