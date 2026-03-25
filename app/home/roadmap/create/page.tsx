"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Target,
  TrendingUp,
  Timer,
  Rocket,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";
import type { AssessmentResult, RoadmapWarning } from "@/lib/types";
import { RoadmapCertificationButton } from "@/components/roadmap/RoadmapCertificationModal";

const SCORE_TARGETS = [
  {
    score: 350,
    label: "350+",
    desc: "Cơ bản",
    color: "from-gray-400 to-gray-500",
  },
  {
    score: 450,
    label: "450+",
    desc: "Sơ cấp",
    color: "from-blue-400 to-blue-500",
  },
  {
    score: 550,
    label: "550+",
    desc: "Trung cấp",
    color: "from-green-400 to-green-500",
  },
  {
    score: 750,
    label: "750+",
    desc: "Trung cao cấp",
    color: "from-amber-400 to-amber-500",
  },
  {
    score: 900,
    label: "900+",
    desc: "Nâng cao",
    color: "from-orange-400 to-orange-500",
  },
  {
    score: 990,
    label: "990",
    desc: "Điểm tối đa",
    color: "from-red-400 to-red-500",
  },
];

const DURATION_OPTIONS = [
  { days: 7, label: "7 ngày", desc: "Sprint", icon: "⚡" },
  { days: 14, label: "14 ngày", desc: "Ngắn hạn", icon: "🏃" },
  { days: 30, label: "30 ngày", desc: "1 tháng", icon: "📅" },
  { days: 60, label: "60 ngày", desc: "2 tháng", icon: "🎯" },
  { days: 90, label: "90 ngày", desc: "3 tháng", icon: "💪" },
  { days: 180, label: "180 ngày", desc: "6 tháng", icon: "🏆" },
];

const SELF_ASSESS_SCORES = [0, 200, 350, 550, 750, 900];

const STEPS = [
  { label: "Mục tiêu", icon: Target },
  { label: "Trình độ", icon: TrendingUp },
  { label: "Thời gian", icon: Timer },
  { label: "Xác nhận", icon: Rocket },
];

type LinePoint = { date: string; value: number };

function CreateRoadmapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);

  // Step 1
  const [targetScore, setTargetScore] = useState<number | null>(null);
  const [targetScoreInput, setTargetScoreInput] = useState("");

  // Step 2
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [assessLoading, setAssessLoading] = useState(false);
  const [selfScore, setSelfScore] = useState<number | null>(null);
  const [selfScoreInput, setSelfScoreInput] = useState("");
  const [useSelfAssess, setUseSelfAssess] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [attemptSeries, setAttemptSeries] = useState<LinePoint[]>([]);
  const [practiceSeries, setPracticeSeries] = useState<LinePoint[]>([]);
  const [placementLoading, setPlacementLoading] = useState(false);
  const [placementError, setPlacementError] = useState<string | null>(null);

  // Step 3
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState("");

  // Step 4
  const [creating, setCreating] = useState(false);
  const [warning, setWarning] = useState<RoadmapWarning | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const currentScore = useSelfAssess
    ? (selfScore ?? 0)
    : (assessment?.current_score ?? 0);

  const actualDuration =
    durationDays || (customDays ? parseInt(customDays) : 0);

  const placementButtonLabel =
    (assessment?.current_score ?? 0) === 0
      ? "Làm bài Test đầu vào"
      : "Thi lại để cập nhật trình độ";

  // Auto-assess when reaching step 2
  useEffect(() => {
    if (step === 0) {
      const requestedStep = Number(searchParams.get("step") || "0");
      if (requestedStep > 0) {
        setStep(Math.min(requestedStep, 3));
      }
    }
    if (step === 1) {
      if (!assessment && !assessLoading) {
        loadAssessment();
      }
      if (!historyLoading && !attemptSeries.length && !practiceSeries.length) {
        loadHistory();
      }
    }
  }, [step]);

  async function startPlacementTest() {
    setPlacementError(null);
    setPlacementLoading(true);
    try {
      const res = await fetch("/api/roadmap/placement-test");
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Không thể lấy đề thi");
      }
      const data = (await res.json()) as {
        test: {
          id: string;
          title: string;
          duration: number;
          total_questions: number;
          is_premium: boolean;
        };
      };
      const test = data.test;
      const params = new URLSearchParams({
        testId: test.id,
        title: test.title,
        duration: String(test.duration ?? 120),
        total: String(test.total_questions ?? 200),
        isPremium: test.is_premium ? "1" : "0",
        mode: "placement",
        returnTo: "/home/roadmap/create?step=1",
      });
      router.push(`/home/exam/test-start?${params.toString()}`);
    } catch (err) {
      setPlacementError(
        err instanceof Error ? err.message : "Không thể bắt đầu bài thi",
      );
    } finally {
      setPlacementLoading(false);
    }
  }

  async function loadAssessment() {
    setAssessLoading(true);
    try {
      const res = await fetch("/api/roadmap/assess");
      if (res.ok) {
        const data = (await res.json()) as AssessmentResult;
        setAssessment(data);
        if (data.method === "self_assessed" && data.current_score === 0) {
          setUseSelfAssess(true);
        }
      }
    } catch {
      setUseSelfAssess(true);
    } finally {
      setAssessLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/roadmap/assess-history");
      if (res.ok) {
        const data = (await res.json()) as {
          attempts: LinePoint[];
          practice: LinePoint[];
        };
        setAttemptSeries(data.attempts || []);
        setPracticeSeries(data.practice || []);
      }
    } catch {
      // silently handle
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleSelfScoreInputChange(value: string) {
    setSelfScoreInput(value);
    if (!value.trim()) {
      setSelfScore(null);
      return;
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      setSelfScore(null);
      return;
    }
    const clamped = Math.min(990, Math.max(0, Math.round(numeric)));
    setSelfScore(clamped);
  }

  function normalizeSelfScoreInput() {
    if (selfScore === null) return;
    setSelfScoreInput(String(selfScore));
  }

  async function handleCreate() {
    if (!targetScore || !actualDuration) {
      setError("Vui lòng chọn mục tiêu và thời gian trước khi tạo lộ trình.");
      return;
    }
    setCreating(true);
    setError(null);
    setWarning(null);

    try {
      const res = await fetch("/api/roadmap/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_score: targetScore,
          duration_days: actualDuration,
          current_score: currentScore,
          assessment_method: useSelfAssess
            ? "self_assessed"
            : (assessment?.method ?? "self_assessed"),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError(
            "Bạn đã có một lộ trình đang hoạt động. Hãy hủy lộ trình cũ trước.",
          );
        } else {
          setError(data.error || "Không thể tạo lộ trình");
        }
        return;
      }

      if (data.warning) {
        setWarning(data.warning);
        if (data.warning.type === "score_already_achieved") {
          return;
        }
      }

      if (data.success) {
        setCreated(true);
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setCreating(false);
    }
  }

  function handleCreateWithWarning() {
    setWarning(null);
    handleCreate();
  }

  const canNext = () => {
    switch (step) {
      case 0:
        return targetScore !== null;
      case 1:
        if (useSelfAssess) {
          return selfScore !== null;
        }
        return assessment !== null; // Cho phép tiếp tục dù hệ thống ước tính 0 điểm
      case 2:
        return actualDuration > 0;
      default:
        return false;
    }
  };

  function handleTargetScoreInputChange(value: string) {
    setTargetScoreInput(value);
    if (!value.trim()) {
      setTargetScore(null);
      return;
    }
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      setTargetScore(null);
      return;
    }
    const clamped = Math.min(990, Math.max(0, Math.round(numeric)));
    setTargetScore(clamped);
  }

  function normalizeTargetScoreInput() {
    if (targetScore === null) return;
    setTargetScoreInput(String(targetScore));
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8 px-2">
        {STEPS.map((s, i) => {
          const StepIcon = s.icon;
          const isActive = i === step;
          const isCompleted = i < step;
          return (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? "bg-teal-500 text-white"
                      : isActive
                        ? "bg-teal-100 text-teal-600 ring-2 ring-teal-500"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-1 font-medium ${
                    isActive ? "text-teal-600" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-16px] ${
                    isCompleted ? "bg-teal-500" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        {/* Step 1: Chọn mục tiêu */}
        {step === 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Target className="w-6 h-6 text-teal-500" />
              Chọn mục tiêu
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Bạn muốn đạt bao nhiêu điểm TOEIC?
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SCORE_TARGETS.map((st) => (
                <button
                  key={st.score}
                  onClick={() => {
                    setTargetScore(st.score);
                    setTargetScoreInput(String(st.score));
                  }}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    targetScore === st.score
                      ? "border-teal-500 bg-teal-50 shadow-md"
                      : "border-slate-100 hover:border-slate-200 bg-white"
                  }`}
                >
                  <p className="text-2xl font-bold text-slate-800">
                    {st.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{st.desc}</p>
                  {targetScore === st.score && (
                    <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-teal-500" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-slate-600">
                Nhập điểm mục tiêu (0 - 990)
              </label>
              <input
                type="number"
                min={0}
                max={990}
                step={1}
                inputMode="numeric"
                value={targetScoreInput}
                onChange={(event) =>
                  handleTargetScoreInputChange(event.target.value)
                }
                onBlur={normalizeTargetScoreInput}
                placeholder="Ví dụ: 650"
                className="mt-2 w-full rounded-xl border-2 border-slate-100 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-teal-400"
              />
            </div>

            <div className="mt-4 text-center">
              <RoadmapCertificationButton variant="subtle" />
            </div>
          </div>
        )}

        {/* Step 2: Đánh giá trình độ */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-teal-500" />
              Trình độ hiện tại
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Hệ thống sẽ phân tích điểm xuất phát của bạn
            </p>

            {assessLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  Đang phân tích dữ liệu...
                </p>
              </div>
            ) : assessment && !useSelfAssess ? (
              <div>
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-5 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-600" />
                    <span className="font-semibold text-teal-700">
                      {assessment.method === "exam_history"
                        ? "Phát hiện lịch sử thi thử"
                        : "Phát hiện lịch sử luyện tập"}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-teal-700 mb-1">
                    {assessment.current_score} điểm
                  </p>
                  <p className="text-sm text-teal-600">
                    {assessment.method === "exam_history"
                      ? `Dựa trên ${assessment.details.exam_count} bài thi gần nhất`
                      : `Dựa trên tỷ lệ đúng ${assessment.details.correct_rate}%`}
                  </p>
                  {assessment.confidence !== "high" && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                      <Info className="w-3 h-3" />
                      Độ tin cậy:{" "}
                      {assessment.confidence === "medium"
                        ? "Trung bình"
                        : "Thấp"}
                    </div>
                  )}
                </div>

                {targetScore && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-600">
                      Khoảng cách: <strong>{assessment.current_score}</strong> →{" "}
                      <strong>{targetScore}</strong> ={" "}
                      <strong>{targetScore - assessment.current_score}</strong>{" "}
                      điểm
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setUseSelfAssess(true)}
                  className="mt-4 text-sm text-slate-500 hover:text-teal-600 underline"
                >
                  Tôi muốn tự đánh giá trình độ
                </button>
              </div>
            ) : (
              <div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-5 h-5 text-amber-600" />
                    <span className="font-medium text-amber-700 text-sm">
                      Chưa có dữ liệu trình độ
                    </span>
                  </div>
                  <p className="text-sm text-amber-600">
                    Hãy chọn mức điểm bạn nghĩ mình đang ở:
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {SELF_ASSESS_SCORES.map((sc) => (
                    <button
                      key={sc}
                      onClick={() => {
                        setSelfScore(sc);
                        setSelfScoreInput(String(sc));
                      }}
                      className={`py-3 px-4 rounded-xl border-2 text-center font-bold transition-all ${
                        selfScore === sc
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-slate-100 text-slate-600 hover:border-slate-200"
                      }`}
                    >
                      {sc}
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  <label className="text-xs font-medium text-slate-600">
                    Nhập điểm bất kỳ (0 - 990)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={990}
                    step={1}
                    inputMode="numeric"
                    value={selfScoreInput}
                    onChange={(event) =>
                      handleSelfScoreInputChange(event.target.value)
                    }
                    onBlur={normalizeSelfScoreInput}
                    placeholder="Ví dụ: 420"
                    className="mt-2 w-full rounded-xl border-2 border-slate-100 px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-teal-400"
                  />
                </div>

                {assessment && assessment.method !== "self_assessed" && (
                  <button
                    onClick={() => setUseSelfAssess(false)}
                    className="mt-4 text-sm text-slate-500 hover:text-teal-600 underline"
                  >
                    ← Dùng kết quả tự động
                  </button>
                )}
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Biểu đồ tiến bộ
              </h3>
              {historyLoading ? (
                <div className="text-center py-6">
                  <Loader2 className="w-5 h-5 text-teal-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Đang tải biểu đồ...</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  <LineChartCard
                    title="Điểm bài thi (attempts)"
                    subtitle="Theo ngày"
                    data={attemptSeries}
                    color="#0ea5e9"
                    valueSuffix=" điểm"
                    emptyText="Chưa có dữ liệu bài thi"
                  />
                  <LineChartCard
                    title="Luyện tập (tỷ lệ đúng)"
                    subtitle="Theo ngày"
                    data={practiceSeries}
                    color="#14b8a6"
                    valueSuffix="%"
                    emptyText="Chưa có dữ liệu luyện tập"
                  />
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={startPlacementTest}
                disabled={placementLoading}
                className="w-full py-3 bg-teal-500 text-white rounded-xl font-semibold text-sm hover:bg-teal-600 transition-colors disabled:opacity-50"
              >
                {placementLoading
                  ? "Đang chuẩn bị đề..."
                  : placementButtonLabel}
              </button>
              {placementError && (
                <p className="text-xs text-red-500 mt-2">{placementError}</p>
              )}
              {(assessment?.current_score ?? 0) > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  Nếu thấy điểm chưa đúng, hãy làm bài test mới để cập nhật.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Chọn thời gian */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Timer className="w-6 h-6 text-teal-500" />
              Thời gian cam kết
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Bạn muốn hoàn thành lộ trình trong bao lâu?
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => {
                    setDurationDays(opt.days);
                    setCustomDays("");
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    durationDays === opt.days && !customDays
                      ? "border-teal-500 bg-teal-50 shadow-md"
                      : "border-slate-100 hover:border-slate-200 bg-white"
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <p className="text-lg font-bold text-slate-800 mt-1">
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">hoặc</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                type="number"
                min="3"
                max="365"
                placeholder="Nhập số ngày"
                value={customDays}
                onChange={(e) => {
                  setCustomDays(e.target.value);
                  setDurationDays(null);
                }}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-slate-700"
              />
              <span className="text-sm text-slate-500">ngày</span>
            </div>
          </div>
        )}

        {/* Step 4: Xác nhận */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Rocket className="w-6 h-6 text-teal-500" />
              Xác nhận lộ trình
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Kiểm tra lại thông tin và bắt đầu!
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-sm text-slate-600">Điểm hiện tại</span>
                <span className="font-bold text-slate-800">{currentScore}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-sm text-slate-600">Điểm mục tiêu</span>
                <span className="font-bold text-teal-600">{targetScore}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-sm text-slate-600">Khoảng cách</span>
                <span className="font-bold text-amber-600">
                  +{(targetScore ?? 0) - currentScore} điểm
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-sm text-slate-600">Thời gian</span>
                <span className="font-bold text-slate-800">
                  {actualDuration} ngày
                </span>
              </div>
            </div>

            {/* Warning */}
            {warning && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">
                      {warning.message}
                    </p>
                    <p className="text-sm text-amber-600 mt-1">
                      {warning.suggestion}
                    </p>
                    {warning.recommended_days && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            setDurationDays(warning.recommended_days!);
                            setCustomDays("");
                            setWarning(null);
                            setStep(2);
                          }}
                          className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                        >
                          Tăng lên {warning.recommended_days} ngày ✅
                        </button>
                        <button
                          onClick={handleCreateWithWarning}
                          className="px-4 py-2 bg-white text-amber-700 border border-amber-300 rounded-lg text-sm font-medium hover:bg-amber-50"
                        >
                          Giữ {actualDuration} ngày 💪
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {created ? (
              <button
                onClick={() => router.push("/home/roadmap")}
                className="w-full py-4 bg-teal-600 text-white rounded-xl font-bold text-lg hover:bg-teal-700 transition-all"
              >
                Xem lộ trình đã tạo
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-teal-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    Tạo lộ trình cho tôi! 🚀
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : router.back())}
          className="flex items-center gap-1 px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Quay lại
        </button>

        {step < 3 && (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="flex items-center gap-1 px-6 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Tiếp tục <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function CreateRoadmapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <CreateRoadmapContent />
    </Suspense>
  );
}

function LineChartCard({
  title,
  subtitle,
  data,
  color,
  valueSuffix,
  emptyText,
}: {
  title: string;
  subtitle: string;
  data: LinePoint[];
  color: string;
  valueSuffix: string;
  emptyText: string;
}) {
  if (!data.length) {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        <div className="flex items-center justify-center h-32 mt-2">
          <p className="text-xs text-slate-400">{emptyText}</p>
        </div>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  // Add 10% padding to range for breathing room
  const rangePad = Math.max((rawMax - rawMin) * 0.1, 1);
  const min = Math.max(0, rawMin - rangePad);
  const max = rawMax + rangePad;
  const span = max - min;

  const width = 400;
  const height = 160;
  const padLeft = 40;
  const padRight = 16;
  const padTop = 12;
  const padBot = 28;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBot;

  const points = data.map((d, i) => ({
    x: padLeft + (i / Math.max(1, data.length - 1)) * chartW,
    y: padTop + chartH - ((d.value - min) / span) * chartH,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  // Area fill path
  const areaPath = `${linePath} L${points[points.length - 1].x},${padTop + chartH} L${points[0].x},${padTop + chartH} Z`;

  // Y-axis grid lines (4 lines)
  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount }, (_, i) => {
    const frac = i / (gridCount - 1);
    const val = Math.round(min + frac * span);
    const y = padTop + chartH - frac * chartH;
    return { val, y };
  });

  // X-axis labels (first & last date)
  const dateStart = data[0].date.slice(5); // MM-DD
  const dateEnd = data[data.length - 1].date.slice(5);

  const latest = data[data.length - 1];
  const prev = data.length >= 2 ? data[data.length - 2] : null;
  const trend = prev ? latest.value - prev.value : 0;
  const chartId = title.replace(/\s+/g, "_");

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-slate-700">{title}</p>
          <p className="text-[11px] text-slate-400">{subtitle}</p>
        </div>
        <div className="text-right flex items-center gap-2">
          <span className="text-lg font-bold" style={{ color }}>
            {latest.value}
            <span className="text-xs font-normal text-slate-500">
              {valueSuffix}
            </span>
          </span>
          {trend !== 0 && (
            <span
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                trend > 0
                  ? "text-green-700 bg-green-50"
                  : "text-red-600 bg-red-50"
              }`}
            >
              {trend > 0 ? "↑" : "↓"}
              {Math.abs(trend)}
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: 160 }}
        role="img"
        aria-label={title}
      >
        <defs>
          <linearGradient id={`grad_${chartId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines + Y-axis labels */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padLeft}
              y1={g.y}
              x2={width - padRight}
              y2={g.y}
              stroke="#e2e8f0"
              strokeWidth="0.7"
              strokeDasharray="4 3"
            />
            <text
              x={padLeft - 6}
              y={g.y + 3.5}
              textAnchor="end"
              fontSize="9"
              fill="#94a3b8"
            >
              {g.val}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#grad_${chartId})`} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="3"
              fill="white"
              stroke={color}
              strokeWidth="1.5"
            />
            {i === points.length - 1 && (
              <circle cx={p.x} cy={p.y} r="5" fill={color} opacity="0.3">
                <animate
                  attributeName="r"
                  from="5"
                  to="10"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.3"
                  to="0"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
          </g>
        ))}

        {/* X-axis labels */}
        <text
          x={padLeft}
          y={height - 6}
          textAnchor="start"
          fontSize="9"
          fill="#94a3b8"
        >
          {dateStart}
        </text>
        <text
          x={width - padRight}
          y={height - 6}
          textAnchor="end"
          fontSize="9"
          fill="#94a3b8"
        >
          {dateEnd}
        </text>
      </svg>
    </div>
  );
}
