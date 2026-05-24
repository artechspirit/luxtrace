"use client";

import { useEffect } from "react";

export default function PaymentUnfinishPage() {
  useEffect(() => {
    // Attempt to redirect to the mobile app
    window.location.href = "luxtracemobile://";
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6">
      <div className="bg-[#0D1110] border border-[#C9A84C]/20 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[#C9A84C]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4 tracking-widest">PAYMENT UNFINISHED</h1>
        <p className="text-[#a0aec0] mb-8">
          You haven't completed the payment. You can return to the Luxtrace app and try again when you are ready.
        </p>
        <a 
          href="luxtracemobile://"
          className="inline-block bg-[#C9A84C] text-[#0A0A0A] font-bold px-8 py-4 rounded-xl tracking-widest hover:bg-[#b08f3a] transition-colors"
        >
          RETURN TO APP
        </a>
      </div>
    </div>
  );
}
