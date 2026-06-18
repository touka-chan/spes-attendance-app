from rest_framework import serializers
from .models import User, Attendance

class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'id_no', 'firstname', 'middlename', 'lastname', 'suffix', 'email', 'role', 'name']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['id_no', 'firstname', 'middlename', 'lastname', 'suffix', 'email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            id_no=validated_data['id_no'],
            firstname=validated_data['firstname'],
            middlename=validated_data.get('middlename', ''),
            lastname=validated_data['lastname'],
            suffix=validated_data.get('suffix', ''),
            role='user',
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class AttendanceSerializer(serializers.ModelSerializer):
    duration = serializers.CharField(read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_id_no = serializers.CharField(source='user.id_no', read_only=True)

    class Meta:
        model = Attendance
        fields = ['id', 'user', 'user_name', 'user_id_no', 'clock_in', 'clock_out', 'is_late', 'duration', 'created_at']
        read_only_fields = ['user']


class AttendanceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ['clock_in', 'clock_out']
