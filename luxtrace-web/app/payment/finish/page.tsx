"use client";

import { useEffect } from "react";

export default function PaymentFinishPage() {
  useEffect(() => {
    // Attempt to redirect to the mobile app
    window.location.href = "luxtracemobile://";
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6">
      <div className="bg-[#0D1110] border border-[#00FFB2]/20 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[#00FFB2]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#00FFB2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4 tracking-widest">PAYMENT SUCCESSFUL</h1>
        <p className="text-[#a0aec0] mb-8">
          Your payment has been processed. You can now return to the Luxtrace app to continue.
        </p>
        <a 
          href="luxtracemobile://"
          className="inline-block bg-[#00FFB2] text-[#0A0A0A] font-bold px-8 py-4 rounded-xl tracking-widest hover:bg-[#00cc8e] transition-colors"
        >
          OPEN MOBILE APP
        </a>
      </div>
    </div>
  );
}
