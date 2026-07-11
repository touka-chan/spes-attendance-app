from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('login/requirements/', views.check_security_requirements, name='check-security-requirements'),
    path('login/verify-captcha/', views.verify_captcha, name='verify-captcha'),
    path('login/verify-challenge/', views.verify_challenge, name='verify-challenge'),
    path('login/setup-2fa/', views.setup_2fa, name='setup-2fa'),
    path('login/verify-2fa/', views.verify_2fa_setup, name='verify-2fa'),
    path('login/disable-2fa/', views.disable_2fa, name='disable-2fa'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('user/', views.user_view, name='user'),
    path('attendance/clock-in/', views.clock_in, name='clock-in'),
    path('attendance/clock-out/', views.clock_out, name='clock-out'),
    path('attendance/active/', views.active_session_view, name='active'),
    path('attendance/history/', views.history_view, name='history'),
    path('admin/attendance/', views.admin_attendance_view, name='admin-attendance'),
    path('admin/analytics/', views.admin_analytics_view, name='admin-analytics'),
    path('user/analytics/', views.user_analytics_view, name='user-analytics'),
    path('forgot-password/', views.forgot_password_view, name='forgot-password'),
    path('reset-password/', views.reset_password_view, name='reset-password'),
    path('admin/settings/', views.settings_view, name='settings'),
    path('admin/employees/', views.employees_view, name='employees'),
    path('admin/employees/<int:user_id>/', views.employee_detail_view, name='employee-detail'),
]
