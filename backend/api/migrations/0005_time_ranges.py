# Generated manually for time range fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_attendance_is_late'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='attendancesettings',
            name='clock_in_time',
        ),
        migrations.RemoveField(
            model_name='attendancesettings',
            name='clock_out_time',
        ),
        migrations.AddField(
            model_name='attendancesettings',
            name='clock_in_start',
            field=models.TimeField(default='07:00'),
        ),
        migrations.AddField(
            model_name='attendancesettings',
            name='clock_in_end',
            field=models.TimeField(default='07:20'),
        ),
        migrations.AddField(
            model_name='attendancesettings',
            name='clock_out_start',
            field=models.TimeField(default='17:00'),
        ),
        migrations.AddField(
            model_name='attendancesettings',
            name='clock_out_end',
            field=models.TimeField(default='17:20'),
        ),
    ]
