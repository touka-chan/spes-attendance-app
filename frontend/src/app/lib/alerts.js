import Swal from 'sweetalert2';

const THEME = {
  primary: '#1a73e8',
  primaryHover: '#155ab6',
  success: '#00b894',
  error: '#e17055',
  secondary: '#6b7280',
  background: 'var(--surface)',
  onSurface: 'var(--on-surface)',
  onPrimary: '#ffffff',
};

const baseOptions = {
  background: THEME.background,
  color: THEME.onSurface,
  customClass: {
    popup: 'swal-themed-popup',
    title: 'swal-themed-title',
    htmlContainer: 'swal-themed-html',
    confirmButton: 'swal-themed-btn swal-themed-btn-confirm',
    cancelButton: 'swal-themed-btn swal-themed-btn-cancel',
    actions: 'swal-themed-actions',
    icon: 'swal-themed-icon',
  },
  buttonsStyling: false,
  showClass: {
    popup: 'animate__animated animate__fadeInDown animate__faster',
  },
  hideClass: {
    popup: 'animate__animated animate__fadeOutUp animate__faster',
  },
};

function closeExisting() {
  if (Swal.isVisible()) Swal.close();
}

const toast = Swal.mixin({
  ...baseOptions,
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  width: 'auto',
});

export function showSuccess(title, message) {
  closeExisting();
  return Swal.fire({
    ...baseOptions,
    icon: 'success',
    title,
    text: message,
    confirmButtonColor: THEME.success,
    timer: 3000,
    timerProgressBar: true,
  });
}

export function showError(title, message) {
  closeExisting();
  return Swal.fire({
    ...baseOptions,
    icon: 'error',
    title,
    text: message,
    confirmButtonColor: THEME.error,
  });
}

export function showInfo(title, message) {
  closeExisting();
  return Swal.fire({
    ...baseOptions,
    icon: 'info',
    title,
    text: message,
    confirmButtonColor: THEME.primary,
  });
}

export function showConfirm(title, message, confirmText = 'Yes', cancelText = 'Cancel') {
  closeExisting();
  return Swal.fire({
    ...baseOptions,
    icon: 'question',
    title,
    text: message,
    showCancelButton: true,
    confirmButtonColor: THEME.primary,
    cancelButtonColor: THEME.secondary,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
  });
}

export function showCredentials(email, idNo, password) {
  closeExisting();
  return Swal.fire({
    ...baseOptions,
    icon: 'success',
    title: 'Employee Created!',
    html: `<div style="text-align:left;font-size:13px;color:var(--on-surface);line-height:1.5">
      <p style="margin:4px 0"><strong>Email:</strong> ${email}</p>
      <p style="margin:4px 0"><strong>ID No.:</strong> ${idNo}</p>
      <p style="margin:4px 0"><strong>Password:</strong> <code style="background:var(--background);padding:2px 8px;border-radius:4px;font-size:14px;font-family:monospace">${password}</code></p>
      <p style="font-size:11px;color:var(--secondary);margin:8px 0 0">Share these credentials with the employee.</p>
    </div>`,
    confirmButtonColor: THEME.primary,
    confirmButtonText: 'Got it',
  });
}

export function showToast(icon, message) {
  return toast.fire({ icon, title: message });
}

export function showSessionExpired(role) {
  closeExisting();
  const isAdmin = role === 'admin';
  return Swal.fire({
    ...baseOptions,
    icon: 'warning',
    title: 'Session Expired',
    text: `Your ${isAdmin ? 'admin' : 'user'} session has expired. Please log in again.`,
    confirmButtonColor: THEME.primary,
    confirmButtonText: 'Log In Again',
    allowOutsideClick: false,
    allowEscapeKey: false,
  }).then(() => {
    localStorage.removeItem('spesAuth');
    localStorage.removeItem('spesToken');
    localStorage.removeItem('attendanceClock');
    window.location.href = '/';
  });
}

export function showSessionExpiringSoon(minutesLeft, role) {
  closeExisting();
  return Swal.fire({
    ...baseOptions,
    icon: 'info',
    title: 'Session Expiring Soon',
    text: `Your session will expire in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}. Save your work.`,
    confirmButtonColor: THEME.primary,
    confirmButtonText: 'OK',
    timer: 10000,
    timerProgressBar: true,
  });
}
