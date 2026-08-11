import Swal from 'sweetalert2';

/**
 * Drivers must use the FleetTrack Driver APK — web portal login is blocked.
 */
export async function showDriverApkRequiredDialog(): Promise<void> {
  await Swal.fire({
    icon: 'info',
    title: 'Please use the Driver App',
    html: `
      <p style="margin:0 0 8px;color:#475569;font-size:14px;line-height:1.5;">
        Drivers cannot use the web dashboard.
      </p>
      <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;line-height:1.5;">
        Please login with the FleetTrack Driver APK.
      </p>
    `,
    confirmButtonText: 'Got it',
    confirmButtonColor: '#00AEEF',
    allowOutsideClick: false,
    customClass: {
      popup: 'rounded-xl',
      confirmButton: 'rounded-lg',
    },
  });
}
