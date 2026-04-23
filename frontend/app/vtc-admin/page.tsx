import { redirect } from 'next/navigation';

// /vtc-admin → forward to the login page
export default function VtcAdminRoot() {
  redirect('/vtc-admin/login');
}
