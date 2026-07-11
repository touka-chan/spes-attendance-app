#!/bin/bash
python manage.py migrate
python manage.py seed
python -c "import django; django.setup(); from django.contrib.auth import get_user_model; User=get_user_model(); u=User.objects.filter(email='admin@spes.com').first(); u and (u.set_password('admin123'), u.save()); u=User.objects.filter(email='user@spes.com').first(); u and (u.set_password('user123'), u.save())"
exec gunicorn spes_backend.wsgi:application --bind 0.0.0.0:$PORT
