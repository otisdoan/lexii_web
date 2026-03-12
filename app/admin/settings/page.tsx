'use client';

import { useState } from 'react';
import { Save, Globe, Bell, Shield, Database, Check } from 'lucide-react';

interface Section { id: string; label: string; icon: React.ElementType }

const sections: Section[] = [
  { id: 'general', label: 'Chung', icon: Globe },
  { id: 'notifications', label: 'Thông báo', icon: Bell },
  { id: 'security', label: 'Bảo mật', icon: Shield },
  { id: 'database', label: 'Dữ liệu', icon: Database },
];

export default function AdminSettingsPage() {
  const [active, setActive] = useState('general');
  const [saved, setSaved] = useState(false);

  const [general, setGeneral] = useState({
    appName: 'Lexii',
    appTagline: 'Luyện thi TOEIC thông minh',
    supportEmail: 'support@lexii.app',
    maxFreeTests: 3,
    maintenanceMode: false,
  });

  const [notifications, setNotifications] = useState({
    emailNewUser: true,
    emailPremiumPurchase: true,
    emailLowScore: false,
    pushTestReminder: true,
    pushStreakReminder: true,
  });

  const [security, setSecurity] = useState({
    requireEmailVerification: true,
    sessionDurationDays: 30,
    maxLoginAttempts: 5,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Cài đặt hệ thống</h1>
          <p className="text-sm text-slate-500 mt-0.5">Quản lý cấu hình ứng dụng</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-primary text-white hover:bg-primary-dark'
          }`}
        >
          {saved ? <><Check className="w-4 h-4" /> Đã lưu</> : <><Save className="w-4 h-4" /> Lưu cài đặt</>}
        </button>
      </div>

      <div className="flex gap-5">
        {/* Sidebar nav */}
        <div className="w-44 shrink-0 space-y-1">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active === s.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1">
          {active === 'general' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
              <div className="p-5">
                <h2 className="font-semibold text-slate-800 mb-4">Thông tin ứng dụng</h2>
                <div className="space-y-4">
                  <Field label="Tên ứng dụng">
                    <input value={general.appName} onChange={e => setGeneral(g => ({ ...g, appName: e.target.value }))}
                      className="field-input" />
                  </Field>
                  <Field label="Slogan">
                    <input value={general.appTagline} onChange={e => setGeneral(g => ({ ...g, appTagline: e.target.value }))}
                      className="field-input" />
                  </Field>
                  <Field label="Email hỗ trợ">
                    <input type="email" value={general.supportEmail} onChange={e => setGeneral(g => ({ ...g, supportEmail: e.target.value }))}
                      className="field-input" />
                  </Field>
                </div>
              </div>
              <div className="p-5">
                <h2 className="font-semibold text-slate-800 mb-4">Giới hạn & Trạng thái</h2>
                <div className="space-y-4">
                  <Field label="Số đề thi miễn phí">
                    <input type="number" value={general.maxFreeTests} onChange={e => setGeneral(g => ({ ...g, maxFreeTests: Number(e.target.value) }))}
                      className="field-input w-24" min={0} />
                  </Field>
                  <Field label="Chế độ bảo trì">
                    <Toggle value={general.maintenanceMode} onChange={v => setGeneral(g => ({ ...g, maintenanceMode: v }))} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {active === 'notifications' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
              <div className="p-5">
                <h2 className="font-semibold text-slate-800 mb-4">Email</h2>
                <div className="space-y-4">
                  <Field label="Người dùng mới đăng ký">
                    <Toggle value={notifications.emailNewUser} onChange={v => setNotifications(n => ({ ...n, emailNewUser: v }))} />
                  </Field>
                  <Field label="Mua gói Premium">
                    <Toggle value={notifications.emailPremiumPurchase} onChange={v => setNotifications(n => ({ ...n, emailPremiumPurchase: v }))} />
                  </Field>
                  <Field label="Điểm thấp (Dưới 400)">
                    <Toggle value={notifications.emailLowScore} onChange={v => setNotifications(n => ({ ...n, emailLowScore: v }))} />
                  </Field>
                </div>
              </div>
              <div className="p-5">
                <h2 className="font-semibold text-slate-800 mb-4">Push Notification</h2>
                <div className="space-y-4">
                  <Field label="Nhắc luyện đề">
                    <Toggle value={notifications.pushTestReminder} onChange={v => setNotifications(n => ({ ...n, pushTestReminder: v }))} />
                  </Field>
                  <Field label="Nhắc chuỗi học liên tiếp">
                    <Toggle value={notifications.pushStreakReminder} onChange={v => setNotifications(n => ({ ...n, pushStreakReminder: v }))} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {active === 'security' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
              <div className="p-5">
                <h2 className="font-semibold text-slate-800 mb-4">Xác thực & Phiên</h2>
                <div className="space-y-4">
                  <Field label="Yêu cầu xác minh email">
                    <Toggle value={security.requireEmailVerification} onChange={v => setSecurity(s => ({ ...s, requireEmailVerification: v }))} />
                  </Field>
                  <Field label="Thời gian phiên (ngày)">
                    <input type="number" value={security.sessionDurationDays} onChange={e => setSecurity(s => ({ ...s, sessionDurationDays: Number(e.target.value) }))}
                      className="field-input w-24" min={1} max={365} />
                  </Field>
                  <Field label="Giới hạn đăng nhập sai (lần)">
                    <input type="number" value={security.maxLoginAttempts} onChange={e => setSecurity(s => ({ ...s, maxLoginAttempts: Number(e.target.value) }))}
                      className="field-input w-24" min={1} max={20} />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {active === 'database' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="p-5">
                <h2 className="font-semibold text-slate-800 mb-1">Quản lý dữ liệu</h2>
                <p className="text-sm text-slate-500 mb-5">Các thao tác ảnh hưởng trực tiếp đến cơ sở dữ liệu</p>
                <div className="space-y-3">
                  <ActionRow
                    label="Xoá cache hệ thống"
                    description="Làm mới dữ liệu đệm, không ảnh hưởng người dùng"
                    buttonLabel="Xoá cache"
                    variant="default"
                  />
                  <ActionRow
                    label="Xuất danh sách người dùng"
                    description="Tải về file CSV danh sách tài khoản"
                    buttonLabel="Xuất CSV"
                    variant="default"
                  />
                  <ActionRow
                    label="Reset dữ liệu thử nghiệm"
                    description="Xoá tất cả dữ liệu từ tài khoản test"
                    buttonLabel="Reset"
                    variant="danger"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .field-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .field-input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 1px var(--color-primary);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-slate-700 font-medium min-w-0 flex-1">{label}</label>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function ActionRow({ label, description, buttonLabel, variant }: {
  label: string; description: string; buttonLabel: string; variant: 'default' | 'danger';
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
        variant === 'danger'
          ? 'border-red-200 text-red-600 hover:bg-red-50'
          : 'border-slate-200 text-slate-600 hover:bg-white'
      }`}>
        {buttonLabel}
      </button>
    </div>
  );
}
