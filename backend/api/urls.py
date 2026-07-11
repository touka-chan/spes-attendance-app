from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_view, name='login'),
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
