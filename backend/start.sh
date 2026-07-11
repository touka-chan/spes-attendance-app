#!/bin/bash
python manage.py migrate
python manage.py seed
exec gunicorn spes_backend.wsgi:application --bind 0.0.0.0:$PORT
