// frontend/src/components/TrustStrip.tsx
import React from 'react';
import { Truck, CreditCard, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';

export default function TrustStrip() {
  return (
    <div className="w-full bg-[#fbf9f5] border-y border-[#ead2ae]/60 py-3.5 px-4 select-none">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 items-center justify-between text-xs text-gray-700">
        <div className="flex items-center gap-2.5 justify-center md:justify-start">
          <div className="h-7 w-7 rounded-full bg-[#ead2ae]/40 flex items-center justify-center text-[#b38d4f] flex-shrink-0">
            <Truck className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-[11px] leading-tight">Free Delivery</p>
            <p className="text-[10px] text-gray-500">On all orders above ₹1599</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 justify-center md:justify-start">
          <div className="h-7 w-7 rounded-full bg-[#ead2ae]/40 flex items-center justify-center text-[#b38d4f] flex-shrink-0">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-[11px] leading-tight">Cash on Delivery</p>
            <p className="text-[10px] text-gray-500">Pay at your doorstep</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 justify-center md:justify-start">
          <div className="h-7 w-7 rounded-full bg-[#ead2ae]/40 flex items-center justify-center text-[#b38d4f] flex-shrink-0">
            <RotateCcw className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-[11px] leading-tight">7-Day Easy Exchange</p>
            <p className="text-[10px] text-gray-500">Hassle-free doorstep swap</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 justify-center md:justify-start">
          <div className="h-7 w-7 rounded-full bg-[#ead2ae]/40 flex items-center justify-center text-[#b38d4f] flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-[11px] leading-tight">India's #1 Heels Store</p>
            <p className="text-[10px] text-gray-500">Handcrafted in Jodhpur</p>
          </div>
        </div>
      </div>
    </div>
  );
}
