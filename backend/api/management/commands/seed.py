from django.core.management.base import BaseCommand
from api.models import User
from rest_framework.authtoken.models import Token

class Command(BaseCommand):
    help = 'Seed database with default users'

    def handle(self, *args, **kwargs):
        admin, created = User.objects.get_or_create(
            email='admin@spes.com',
            defaults={
                'password': 'admin123',
                'id_no': 'ADM-001',
                'firstname': 'Admin',
                'lastname': 'User',
                'role': 'admin',
            }
        )
        if created:
            admin.set_password('admin123')
            admin.save()
            self.stdout.write(self.style.SUCCESS('Admin user created'))
        Token.objects.get_or_create(user=admin)

        user, created = User.objects.get_or_create(
            email='user@spes.com',
            defaults={
                'password': 'user123',
                'id_no': 'EMP-001',
                'firstname': 'Alex',
                'lastname': 'Johnson',
                'role': 'user',
            }
        )
        if created:
            user.set_password('user123')
            user.save()
            self.stdout.write(self.style.SUCCESS('User created'))
        Token.objects.get_or_create(user=user)

        self.stdout.write(self.style.SUCCESS('Seeding complete'))
