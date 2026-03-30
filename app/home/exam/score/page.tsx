"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Award, BarChart3, ChevronRight, Home, Share2 } from "lucide-react";

function ScoreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const testTitle = searchParams.get("title") || "TOEIC Test";
  const testId = searchParams.get("testId") || "";
  const listeningScore = parseInt(searchParams.get("listeningScore") || "5");
  const readingScore = parseInt(searchParams.get("readingScore") || "5");
  const totalCorrect = parseInt(searchParams.get("totalCorrect") || "0");
  const totalQuestions = parseInt(searchParams.get("totalQuestions") || "200");
  const totalScore = listeningScore + readingScore;
  const placementMode = searchParams.get("mode") === "placement";
  const returnTo =
    searchParams.get("returnTo") || "/home/roadmap/create?step=1";
  const [showPlacementModal, setShowPlacementModal] = useState(false);

  const getLevel = (score: number) => {
    if (score >= 905) return { label: "Expert", color: "text-amber-600" };
    if (score >= 785) return { label: "Advanced", color: "text-primary" };
    if (score >= 605) return { label: "Intermediate", color: "text-blue-600" };
    if (score >= 405)
      return { label: "Pre-Intermediate", color: "text-indigo-600" };
    return { label: "Beginner", color: "text-slate-600" };
  };

  const level = getLevel(totalScore);

  useEffect(() => {
    if (!placementMode) return;
    setShowPlacementModal(true);
    const timer = setTimeout(() => {
      router.push(returnTo);
    }, 2000);
    return () => clearTimeout(timer);
  }, [placementMode, returnTo, router]);

  return (
    <div className="pb-20 lg:pb-8">
      {showPlacementModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
            <p className="text-sm text-slate-500 mb-2">Chúc mừng!</p>
            <p className="text-3xl font-bold text-teal-600 mb-2">
              {totalScore} điểm
            </p>
            <p className="text-sm text-slate-600">
              Đang cập nhật trình độ của bạn...
            </p>
          </div>
        </div>
      )}
      <div className="max-w-lg mx-auto">
        {/* Certificate Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary to-teal-500 px-8 pt-8 pb-4 text-center text-white relative">
            <div className="absolute top-4 right-4">
              <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
            <Award className="w-16 h-16 mx-auto mb-3 text-amber-300" />
            <h2 className="text-2xl font-bold mb-1">Kết quả thi</h2>
            <p className="text-teal-100 text-sm">{testTitle}</p>
          </div>

          {/* Score */}
          <div className="-mt-8 px-8">
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 text-center mt-10">
              <p className="text-5xl font-bold text-slate-900 mb-1">
                {totalScore}
              </p>
              <p className="text-sm text-slate-500">/ 990</p>
              <p className={`text-sm font-semibold mt-2 ${level.color}`}>
                {level.label}
              </p>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="px-8 py-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Listening */}
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-600 font-medium mb-1">
                  Listening
                </p>
                <p className="text-3xl font-bold text-blue-700">
                  {listeningScore}
                </p>
                <div className="w-full bg-blue-100 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-500 rounded-full h-2 transition-all"
                    style={{ width: `${(listeningScore / 495) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-blue-500 mt-1">/ 495</p>
              </div>
              {/* Reading */}
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-xs text-green-600 font-medium mb-1">
                  Reading
                </p>
                <p className="text-3xl font-bold text-green-700">
                  {readingScore}
                </p>
                <div className="w-full bg-green-100 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-500 rounded-full h-2 transition-all"
                    style={{ width: `${(readingScore / 495) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-green-500 mt-1">/ 495</p>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Số câu đúng</span>
                <span className="font-semibold text-slate-800">
                  {totalCorrect}/{totalQuestions} (
                  {Math.round((totalCorrect / totalQuestions) * 100)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 pb-8 space-y-3">
            <button
              onClick={() => {
                const params = new URLSearchParams({
                  testId,
                  title: testTitle,
                });
                router.push(`/home/exam/result?${params.toString()}`);
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              Xem chi tiết kết quả
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push("/home")}
              className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Home className="w-5 h-5" />
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScoreCertificatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <ScoreContent />
    </Suspense>
  );
}
