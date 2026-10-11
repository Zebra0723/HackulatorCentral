"use client";

export function PrintButton() {
  return (
    <button type="button" className="a-btn a-btn--primary" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
