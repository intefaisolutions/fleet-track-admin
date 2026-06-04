import { useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { Pencil, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth.service';
import { uploadImage } from '../../services/storage.service';
import { getApiErrorMessage } from '../../utils/validation';

export function AdminProfileSection() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      });
    }
  }, [user]);

  const handleAvatarFile = async (file: File | null) => {
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar must be under 5MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const { url } = await uploadImage(file, 'profiles');
      const res = await authService.updateProfile({ profileImage: url });
      if (res.data) {
        setUser({ ...user, ...res.data });
      }
      toast.success('Profile photo updated');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Avatar upload failed'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authService.updateProfile({
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
      });
      if (res.data && user) {
        setUser({ ...user, ...res.data });
      }
      if (passwords.oldPassword && passwords.newPassword) {
        await authService.changePassword(passwords.oldPassword, passwords.newPassword);
        setPasswords({ oldPassword: '', newPassword: '' });
        toast.success('Profile and password updated');
      } else {
        toast.success('Profile saved');
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSaveProfile}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      <h2 className="text-lg font-bold text-slate-900">My Profile</h2>
      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={profile.fullName}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-fleet-100">
                <UserCircle className="h-14 w-14 text-fleet-500" />
              </div>
            )}
            <button
              type="button"
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 rounded-full bg-fleet-500 p-1.5 text-white shadow disabled:opacity-60"
              onClick={() => avatarInputRef.current?.click()}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => void handleAvatarFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <span className="text-xs text-slate-500">
            {uploadingAvatar ? 'Uploading…' : 'Avatar (Supabase)'}
          </span>
        </div>

        <div className="grid flex-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
            <input
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email Address
            </label>
            <input
              type="email"
              readOnly
              value={profile.email}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Phone Number
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-100 pt-6">
        <h3 className="text-sm font-semibold text-slate-900">Change Password</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Old Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={passwords.oldPassword}
              onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              New Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-fleet-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </form>
  );
}
