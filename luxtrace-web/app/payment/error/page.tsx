"use client";

import { useEffect } from "react";

export default function PaymentErrorPage() {
  useEffect(() => {
    // Attempt to redirect to the mobile app
    window.location.href = "luxtracemobile://";
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6">
      <div className="bg-[#0D1110] border border-[#ef4444]/20 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[#ef4444]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#ef4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4 tracking-widest">PAYMENT FAILED</h1>
        <p className="text-[#a0aec0] mb-8">
          There was an error processing your payment. Please return to the Luxtrace app and try a different payment method.
        </p>
        <a 
          href="luxtracemobile://"
          className="inline-block bg-[#ef4444] text-white font-bold px-8 py-4 rounded-xl tracking-widest hover:bg-[#dc2626] transition-colors"
        >
          RETURN TO APP
        </a>
      </div>
    </div>
  );
}
