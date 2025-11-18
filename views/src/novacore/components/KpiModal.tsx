import { nc } from "../theme";
import React from "react";

type KpiModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function KpiModal({ open, title, onClose, children }: KpiModalProps) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <style>{`
        @keyframes nc-modal-fade {
          0% { opacity: 0; transform: translateY(8px) scale(.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,.55)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      <div
        className="relative w-[92%] md:w-[720px] rounded-2xl p-6 md:p-8"
        style={{
          backgroundColor: nc.card,
          border: `1px solid ${nc.border}`,
          boxShadow: "0 20px 60px rgba(0,0,0,.45)",
          animation: "nc-modal-fade .22s ease forwards",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg md:text-xl font-semibold" style={{ color: nc.textPrimary }}>
            {title}
          </h3>
          <button
            aria-label="Cerrar"
            onClick={onClose}
            className="w-8 h-8 rounded-md"
            style={{ border: `1px solid ${nc.border}`, color: nc.textPrimary }}
          >
            ×
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}


