'use client';

import Link from 'next/link';
import {
  BookOpen,
  GraduationCap,
  BookText,
  PenTool,
  Sparkles,
  Headphones,
  Heart,
  Twitter,
  Youtube,
  MessageCircle,
} from 'lucide-react';

const FOOTER_LINKS = {
  'Học tập': [
    { label: 'Luyện tập', href: '/home', icon: BookOpen },
    { label: 'Thi thử', href: '/home/exam', icon: GraduationCap },
    { label: 'Từ vựng', href: '/home/vocabulary', icon: BookText },
    { label: 'Ngữ pháp', href: '/home/grammar', icon: PenTool },
  ],
  'Hỗ trợ': [
    { label: 'Liên hệ', href: '/home/support', icon: Headphones },
    { label: 'Nâng cấp Premium', href: '/home/upgrade', icon: Sparkles },
  ],
};

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-linear-to-r from-primary to-teal-600 text-white">
      {/* Top wave decoration */}
    
      {/* Main footer */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl overflow-hidden border-2 border-white/30 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/lexii.jpg" alt="Lexii logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Lexii</h3>
                <p className="text-xs text-white/60 font-medium tracking-wide uppercase">TOEIC® Learning</p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-white/70 max-w-sm mb-6">
              Nền tảng học TOEIC hàng đầu Việt Nam với hơn 12.000+ học viên, cung cấp đề thi ETS chuẩn quốc tế và lộ trình học cá nhân hóa.
            </p>

            {/* Social */}
            <div className="flex items-center gap-2.5">
              {[
                {
                  label: 'Facebook',
                  bg: 'hover:bg-[#1877F2]',
                  icon: <Twitter className="w-4 h-4" />,
                },
                {
                  label: 'YouTube',
                  bg: 'hover:bg-[#FF0000]',
                  icon: <Youtube className="w-4 h-4" />,
                },
                {
                  label: 'Zalo',
                  bg: 'hover:bg-[#0068FF]',
                  icon: <MessageCircle className="w-4 h-4" />,
                },
              ].map(s => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className={`w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-all duration-200 ${s.bg}`}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-sm font-semibold text-white mb-5 uppercase tracking-wider">
                {group}
              </h4>
              <ul className="space-y-3">
                {links.map(link => {
                  const Icon = link.icon;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex items-center gap-2.5 text-sm text-white/70 hover:text-white transition-colors duration-200 group"
                      >
                        <Icon className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/15" />

      {/* Bottom bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/45">
            © {currentYear} Lexii. TOEIC® là thương hiệu của ETS.
          </p>
          <p className="text-xs text-white/45 flex items-center gap-1.5">
            Made with <Heart className="w-3 h-3 text-rose-300 fill-rose-300" /> in Vietnam
          </p>
        </div>
      </div>
    </footer>
  );
}
