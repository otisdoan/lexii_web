"use client";

import { useState } from "react";
import {
  X,
  BookOpen,
  FlaskConical,
  GraduationCap,
  ExternalLink,
  Award,
} from "lucide-react";

const TABS = [
  { id: "edtech", label: "Nền tảng EdTech", icon: BookOpen },
  { id: "science", label: "Cơ sở Khoa học", icon: FlaskConical },
  { id: "timeline", label: "Lộ trình cụ thể", icon: GraduationCap },
  { id: "references", label: "Tài liệu tham khảo", icon: BookOpen },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TIMELINE_DATA = [
  {
    stage: "Giai đoạn 1: 0 - 350",
    time: "1,5 - 2 tháng",
    content:
      'Giai đoạn "mất gốc". Tập trung bổ sung kiến thức nền tảng vững chắc về từ vựng (chủ đề văn phòng, sinh hoạt) và ngữ pháp (từ loại, câu đơn).',
    color: "bg-blue-50 border-blue-200 text-blue-800",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    stage: "Giai đoạn 2: 350 - 550",
    time: "1,5 - 2 tháng",
    content:
      "Mốc điểm phổ biến để tốt nghiệp. Chuẩn bị các chiến thuật nâng cao, tập trung vào kỹ thuật bắt từ khóa (keyword spotting) và hiểu bối cảnh.",
    color: "bg-green-50 border-green-200 text-green-800",
    badge: "bg-green-100 text-green-700",
  },
  {
    stage: "Giai đoạn 3: 550 - 750",
    time: "2 tháng",
    content:
      "Giai đoạn luyện đề thực tế. Cần chọn nền tảng phù hợp, luyện tập hằng ngày với áp lực thời gian thực và rèn luyện kỹ năng Skimming/Scanning.",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    badge: "bg-amber-100 text-amber-700",
  },
  {
    stage: "Giai đoạn 4: 750 - 990",
    time: "1 - 2 tháng",
    content:
      'Giai đoạn "nước rút". Ôn luyện đề chuyên sâu, phân tích lỗi sai chi tiết (Post-mortem) để rút kinh nghiệm và tinh chỉnh phản xạ nhạy bén.',
    color: "bg-red-50 border-red-200 text-red-800",
    badge: "bg-red-100 text-red-700",
  },
];

export function RoadmapCertificationButton({
  variant = "subtle",
}: {
  variant?: "subtle" | "prominent";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          variant === "prominent"
            ? "inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-slate-700 bg-white border border-slate-200 rounded-2xl hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50 transition-all shadow-sm"
            : "inline-flex items-center gap-1 text-xs text-slate-500 hover:text-teal-600 transition-colors underline decoration-dotted underline-offset-2"
        }
      >
        <Award className={variant === "prominent" ? "w-5 h-5" : "w-3 h-3"} />
        {variant === "prominent"
          ? "Chứng thực lộ trình"
          : "Xem cơ sở khoa học của lộ trình"}
      </button>

      {open && <RoadmapCertificationModal onClose={() => setOpen(false)} />}
    </>
  );
}

function RoadmapCertificationModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>("edtech");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Chứng Thực Lộ Trình Học Thuật
              </h2>
              <p className="text-xs text-slate-500">
                Cơ sở khoa học và phương pháp luận
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/50">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  isActive
                    ? "border-teal-500 text-teal-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === "edtech" && <TabEdTech />}
          {activeTab === "science" && <TabScience />}
          {activeTab === "timeline" && <TabTimeline />}
          {activeTab === "references" && <TabReferences />}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-center">
          <p className="text-[11px] text-slate-400">
            Lexii — Hệ thống luyện thi TOEIC thông minh, được thiết kế dựa trên
            nghiên cứu giáo dục
          </p>
        </div>
      </div>
    </div>
  );
}

/* ==================== Tab Contents ==================== */

function TabEdTech() {
  return (
    <div className="space-y-4">
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
        <h3 className="font-semibold text-teal-800 mb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Nguồn Tham Chiếu Nền Tảng EdTech
        </h3>
        <p className="text-sm text-teal-700 leading-relaxed">
          Hệ thống Lexii được xây dựng dựa trên sự tổng hợp phương pháp luận từ
          các nền tảng giáo dục tiên phong trong lĩnh vực luyện thi TOEIC.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-sm text-slate-700 leading-relaxed mb-3">
          Bạn có thể xem bài phân tích chuyên sâu về các nguồn học TOEIC Online
          hiệu quả nhất hiện nay, bao gồm các ứng dụng AI và hệ thống đánh giá
          thích ứng (MST) tại:
        </p>
        <a
          href="https://prepedu.com/vi/blog/nguon-hoc-toeic-online-hieu-qua"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-teal-200 transition-all"
        >
          👉 Xem bài viết tại PrepEdu
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">
          Phương pháp chính được áp dụng:
        </h4>
        <ul className="space-y-2 text-sm text-slate-600">
          {[
            "Adaptive Testing (MST) — Đánh giá thích ứng theo năng lực",
            "Spaced Repetition — Ôn tập lặp lại theo khoảng cách khoa học",
            "Rolling Schedule — Lịch học cuốn chiếu, không bỏ lỡ bài nào",
            "AI-Powered Feedback — Phản hồi tức thì bằng trí tuệ nhân tạo",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-600 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TabScience() {
  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
        <h3 className="font-semibold text-indigo-800 mb-2 flex items-center gap-2">
          <FlaskConical className="w-4 h-4" />
          Cơ Sở Khoa Học
        </h3>
        <p className="text-sm text-indigo-700 leading-relaxed">
          Lộ trình được thiết kế dựa trên các dữ liệu khảo sát và phân tích
          chuyên môn về năng lực ngôn ngữ.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <p className="text-sm text-slate-700 leading-relaxed mb-3">
          Tài liệu cơ sở khoa học chi tiết:
        </p>
        <a
          href="https://docs.google.com/document/d/1gH668b8rG61gjXIWTYKeDyvOi5Z7Uyl8yaXcQUDGkCc/edit?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-indigo-200 transition-all"
        >
          👉 Xem tài liệu chi tiết
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Kiến trúc Đào tạo */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h4 className="text-sm font-bold text-slate-800 mb-2">
          🏗️ Kiến trúc Đào tạo
        </h4>
        <p className="text-sm text-slate-600 leading-relaxed">
          Chuyển dịch từ việc chỉ ghi nhớ ngữ pháp sang rèn luyện năng lực ứng
          dụng thực chiến trong môi trường công sở.
        </p>
      </div>

      {/* Đo lường thời gian */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h4 className="text-sm font-bold text-slate-800 mb-3">
          ⏱️ Đo lường thời gian
        </h4>
        <div className="space-y-2.5">
          {[
            {
              range: "0 → 350",
              hours: "~150 giờ",
              desc: "Xây dựng lại hệ thống ngữ âm (IPA) và ngữ pháp cốt lõi.",
              color: "bg-blue-50 border-blue-100",
            },
            {
              range: "350 → 750",
              hours: "200 - 250 giờ",
              desc: 'Chuyển đổi từ "hiểu" sang "xử lý thông tin dưới áp lực thời gian".',
              color: "bg-green-50 border-green-100",
            },
            {
              range: "750 → 990",
              hours: "~200+ giờ",
              desc: "Tinh chỉnh collocations và idioms ở cường độ cao.",
              color: "bg-amber-50 border-amber-100",
            },
          ].map((item, i) => (
            <div key={i} className={`rounded-lg border p-3 ${item.color}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-800">
                  {item.range}
                </span>
                <span className="text-xs font-semibold text-slate-600 bg-white/80 px-2 py-0.5 rounded-full">
                  {item.hours}
                </span>
              </div>
              <p className="text-xs text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Nguyên lý 80/20 + Công cụ AI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-sm font-bold text-slate-800 mb-2">
            📊 Nguyên lý 80/20
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tập trung vào 20% cấu trúc ngữ pháp xuất hiện trong 80% tần suất đề
            thi để tối ưu kết quả.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-sm font-bold text-slate-800 mb-2">
            🤖 Công cụ AI
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tích hợp hệ thống chấm chữa AI giúp rút ngắn chu kỳ phản hồi, nâng
            cao hiệu suất học thử - sai.
          </p>
        </div>
      </div>
    </div>
  );
}

function TabTimeline() {
  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
        <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          Lộ trình học TOEIC Online cụ thể
        </h3>
        <p className="text-sm text-purple-700 leading-relaxed">
          Khung thời gian và nội dung trọng tâm được quy chuẩn cho từng chặng
          điểm.
        </p>
      </div>

      <div className="space-y-3">
        {TIMELINE_DATA.map((item, i) => (
          <div key={i} className={`rounded-xl border p-4 ${item.color}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold">{item.stage}</h4>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.badge}`}
              >
                {item.time}
              </span>
            </div>
            <p className="text-sm leading-relaxed opacity-90">{item.content}</p>
          </div>
        ))}
      </div>

      {/* Tổng kết */}
      <div className="bg-slate-800 text-white rounded-xl p-4">
        <h4 className="text-sm font-bold mb-2">📌 Tổng kết</h4>
        <p className="text-xs leading-relaxed text-slate-300">
          Tổng cộng khoảng <strong className="text-white">6 - 8 tháng</strong>{" "}
          học nghiêm túc để đi từ 0 đến 900+ điểm TOEIC. Thời gian cụ thể phụ
          thuộc vào nền tảng hiện tại, mức cam kết, và phương pháp học của từng
          cá nhân.
        </p>
      </div>
    </div>
  );
}

function TabReferences() {
  const references = [
    {
      title:
        "TOEIC 4 kỹ năng: Cấu trúc đề thi, thang điểm, lệ phí & tài liệu học",
      source: "PrepEdu",
      accessed: "tháng 3 24, 2026",
      url: "https://prepedu.com/vi/blog/toeic-4-ky-nang",
    },
    {
      title: "Lộ trình tự học TOEIC 4 kỹ năng hiệu quả nhất",
      source: "ZIM Academy",
      accessed: "tháng 3 24, 2026",
      url: "https://zim.vn/tu-hoc-toeic-4-ky-nang",
    },
    {
      title: "Lộ trình ôn luyện thi Toeic 900 – 990 Hiệu Quả",
      source: "PrepEdu",
      accessed: "tháng 3 24, 2026",
      url: "https://prepedu.com/vi/blog/toeic-900",
    },
    {
      title: "Lộ trình ôn luyện TOEIC độc quyền IIG Việt Nam",
      source: "IIG Vietnam",
      accessed: "tháng 3 24, 2026",
      url: "https://hoctoeic.iigvietnam.com/",
    },
    {
      title: '10+ Lộ trình học TOEIC từ "Gà mờ" đến "Cao Thủ"',
      source: "WESET",
      accessed: "tháng 3 24, 2026",
      url: "https://weset.edu.vn/tin-tuc-moi/10-lo-trinh-hoc-toeic-tu-ga-mo-den-cao-thu/",
    },
    {
      title: "TOEIC - IIG Việt Nam",
      source: "IIG Vietnam",
      accessed: "tháng 3 24, 2026",
      url: "https://iigvietnam.com/bai-thi-toeic/",
    },
    {
      title: "Lộ trình TOEIC 700+ 4 Kỹ năng trong 10 tháng",
      source: "Zenlish",
      accessed: "tháng 3 24, 2026",
      url: "https://zenlishtoeic.vn/lo-trinh-toeic-700-4-ky-nang-trong-10-thang/",
    },
    {
      title: "Lộ trình học TOEIC từ 0 đến 990 cho người mất gốc hiệu quả",
      source: "IIG Vietnam E-learning",
      accessed: "tháng 3 24, 2026",
      url: "https://elearning.iigvietnam.com/news/lo-trinh-hoc-toeic-tu-0-den-990",
    },
    {
      title:
        "Lộ trình thi TOEIC cho người mới bắt đầu từ 0-800+ trong 3-5 tháng",
      source: "PrepEdu",
      accessed: "tháng 3 24, 2026",
      url: "https://prepedu.com/vi/blog/lo-trinh-hoc-toeic-cho-nguoi-moi-bat-dau",
    },
    {
      title: "Lộ trình học TOEIC từ A-Z tại nhà cho người mất gốc miễn phí",
      source: "ELSA Speak",
      accessed: "tháng 3 24, 2026",
      url: "https://vn.elsaspeak.com/lo-trinh-hoc-toeic-tai-nha/",
    },
    {
      title: "Xây dựng lộ trình học TOEIC 450 dễ tiếp thu cho người mới",
      source: "Wise English",
      accessed: "tháng 3 24, 2026",
      url: "https://wiseenglish.edu.vn/lo-trinh-hoc-toeic-450",
    },
    {
      title: "Một số nguồn học TOEIC Online hiệu quả nhất năm 2024",
      source: "PrepEdu",
      accessed: "tháng 3 24, 2026",
      url: "https://prepedu.com/vi/blog/nguon-hoc-toeic-online-hieu-qua",
    },
    {
      title: "Học TOEIC cho người đi làm thế nào hiệu quả nhất?",
      source: "r/vozforums - Reddit",
      accessed: "tháng 3 24, 2026",
      url: "https://www.reddit.com/r/vozforums/comments/14pdcc0/h%E1%BB%8Dc_toeic_cho_ng%C6%B0%E1%BB%9Di_%C4%91i_l%C3%A0m_th%E1%BA%BF_n%C3%A0o_hi%E1%BB%87u_qu%E1%BA%A3_nh%E1%BA%A5t/",
    },
    {
      title: "Lộ trình học TOEIC 4 kỹ năng đầu tiên tại Việt Nam",
      source: "Ms Hoa TOEIC",
      accessed: "tháng 3 24, 2026",
      url: "https://www.anhngumshoa.com/tin-tuc/lo-trinh-hoc-toeic-4-ky-nang-dau-tien-tai-viet-nam-37037.html",
    },
    {
      title: "Lộ trình từ 0 - 990 TOEIC dành cho người mất gốc",
      source: "Ms Hoa TOEIC",
      accessed: "tháng 3 24, 2026",
      url: "https://www.anhngumshoa.com/tin-tuc/lo-trinh-tu-0-990-toeic-danh-cho-nguoi-mat-goc-36902.html",
    },
    {
      title: "TOP 5 website luyện thi TOEIC online miễn phí tốt nhất",
      source: "Ms Hoa TOEIC",
      accessed: "tháng 3 24, 2026",
      url: "https://www.anhngumshoa.com/tin-tuc/top-5-website-luyen-thi-toeic-online-mien-phi-tot-nhat-35120.html",
    },
    {
      title: "Top 5 trang web học TOEIC online miễn phí cho người mới bắt đầu",
      source: "ZIM",
      accessed: "tháng 3 24, 2026",
      url: "https://zim.vn/cac-trang-web-hoc-toeic-mien-phi",
    },
    {
      title: "Top 7 website luyện thi TOEIC online miễn phí, chất lượng",
      source: "FPT Shop",
      accessed: "tháng 3 24, 2026",
      url: "https://fptshop.com.vn/tin-tuc/thu-thuat/top-7-website-luyen-thi-toeic-online-mien-phi-168525",
    },
    {
      title:
        "Trọn Bộ Tài Liệu Tự Học Toeic 0-900+ (File Pdf + Video Bài Giảng + Audio)",
      source: "Scribd",
      accessed: "tháng 3 24, 2026",
      url: "https://www.scribd.com/document/672843193/M%E1%BB%A5c-l%E1%BB%A5c",
    },
    {
      title: "Top 12 Cuốn Sách Luyện Thi TOEIC Tại Nhà Cực Kì Hiệu Quả",
      source: "EIV Education",
      accessed: "tháng 3 24, 2026",
      url: "https://eiv.edu.vn/sach-luyen-thi-toeic/",
    },
    {
      title: "10+ cuốn sách tự học TOEIC hiệu quả dành cho mọi trình độ",
      source: "PrepEdu",
      accessed: "tháng 3 24, 2026",
      url: "https://prepedu.com/vi/blog/sach-tu-hoc-toeic",
    },
    {
      title:
        "Bộ tài liệu ôn thi TOEIC 900 này sẽ giúp bạn chinh phục mức điểm tối đa",
      source: "WISE ENGLISH",
      accessed: "tháng 3 24, 2026",
      url: "https://wiseenglish.edu.vn/tai-lieu-on-thi-toeic-900",
    },
    {
      title: "Hướng dẫn tự học TOEIC bổ ích cho người mới mau giỏi",
      source: "r/vozforums - Reddit",
      accessed: "tháng 3 24, 2026",
      url: "https://www.reddit.com/r/vozforums/comments/14pjy8c/h%C6%B0%E1%BB%9Bng_d%E1%BA%ABn_t%E1%BB%B1_h%E1%BB%8Dc_toeic_b%E1%BB%95_%C3%ADch_cho_ng%C6%B0%E1%BB%9Di_m%E1%BB%9Bi_mau/",
    },
    {
      title: "TOEIC study",
      source: "r/vozforums - Reddit",
      accessed: "tháng 3 24, 2026",
      url: "https://www.reddit.com/r/vozforums/comments/1ndze9u/h%E1%BB%8Dc_toeic/?tl=en",
    },
    {
      title: "Where to study for TOEIC?",
      source: "r/vozforums - Reddit",
      accessed: "tháng 3 24, 2026",
      url: "https://www.reddit.com/r/vozforums/comments/1lph4w8/h%E1%BB%8Dc_toeic_%E1%BB%9F_%C4%91%C3%A2u/?tl=en",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h3 className="font-semibold text-slate-800 mb-2">Nguồn trích dẫn</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Tổng hợp tài liệu tham khảo, truy cập vào tháng 3 24, 2026.
        </p>
      </div>

      <div className="space-y-3">
        {references.map((item, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-xl p-4"
          >
            <p className="text-sm text-slate-800 font-semibold mb-1">
              {item.title}
            </p>
            <p className="text-xs text-slate-500 mb-2">
              {item.source} · Truy cập {item.accessed}
            </p>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
            >
              {item.url}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
