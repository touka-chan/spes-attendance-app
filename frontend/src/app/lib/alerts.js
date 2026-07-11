import Swal from 'sweetalert2';

export function showSuccess(title, message) {
  return Swal.fire({ icon: 'success', title, text: message, confirmButtonColor: '#1a73e8', timer: 3000, timerProgressBar: true });
}

export function showError(title, message) {
  return Swal.fire({ icon: 'error', title, text: message, confirmButtonColor: '#d32f2f' });
}

export function showInfo(title, message) {
  return Swal.fire({ icon: 'info', title, text: message, confirmButtonColor: '#1a73e8' });
}

export function showConfirm(title, message) {
  return Swal.fire({
    icon: 'question', title, text: message, showCancelButton: true,
    confirmButtonColor: '#d32f2f', cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, delete', cancelButtonText: 'Cancel',
  });
}

export function showCredentials(email, idNo, password) {
  return Swal.fire({
    icon: 'success', title: 'Employee Created!',
    html: `<div style="text-align:left;font-size:14px">
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>ID No.:</strong> ${idNo}</p>
      <p><strong>Password:</strong> <code style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:16px">${password}</code></p>
    </div>
    <p style="font-size:12px;color:#6b7280;margin-top:12px">Please share these credentials with the employee.</p>`,
    confirmButtonColor: '#1a73e8', confirmButtonText: 'Copied',
  });
}

export function showToast(icon, message) {
  const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true });
  return Toast.fire({ icon, title: message });
}
