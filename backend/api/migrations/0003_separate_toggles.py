# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_attendancesettings'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='attendancesettings',
            name='is_active',
        ),
        migrations.AddField(
            model_name='attendancesettings',
            name='clock_in_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='attendancesettings',
            name='clock_out_enabled',
            field=models.BooleanField(default=False),
        ),
    ]
