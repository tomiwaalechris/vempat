import React from 'react';
import { Fish, Printer } from 'lucide-react';
import { APP_THEME } from '../constants';

const CURRENCY = APP_THEME.currency;

const ReceiptModal = ({ sale, onClose }: { sale: any, onClose: () => void }) => (
  <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
    <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">
      <div className="p-8 flex flex-col items-center border-b border-dashed border-slate-200">
        <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mb-4">
          <Fish className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-black text-slate-900">VEMPAT FISH FEED</h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Transaction Receipt</p>
      </div>
      
      <div className="p-8 space-y-4">
        <div className="flex justify-between text-xs font-medium text-slate-500">
          <span>Date: {new Date().toLocaleDateString()}</span>
          <span>Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        <div className="space-y-3 py-4">
          {sale.items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-start text-sm">
              <div className="pr-4">
                <p className="font-bold text-slate-800">{item.brand} {item.particleSize}</p>
                <p className="text-[10px] text-slate-400">{item.quantity} x {CURRENCY}{item.price.toLocaleString()}</p>
              </div>
              <span className="font-bold text-slate-900 shrink-0">{CURRENCY}{(item.quantity * item.price).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-slate-200 pt-4 space-y-2">
          <div className="flex justify-between items-center text-slate-500 text-sm">
            <span>Subtotal</span>
            <span>{CURRENCY}{sale.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-lg font-black text-slate-900">
            <span>Total Paid</span>
            <span>{CURRENCY}{sale.total.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 text-[10px] text-slate-400 text-center italic">
          Thank you for choosing Vempat. We wish your fish a healthy growth!
        </div>
      </div>

      <div className="p-6 bg-slate-50 flex gap-3">
        <button 
          onClick={() => window.print()}
          className="flex-1 bg-white border border-slate-200 py-3 rounded-xl font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
        >
          <Printer className="w-4 h-4" /> Print
        </button>
        <button 
          onClick={onClose}
          className="flex-1 bg-sky-600 py-3 rounded-xl font-bold text-white shadow-lg shadow-sky-600/20 hover:bg-sky-700 transition-all"
        >
          Done
        </button>
      </div>
    </div>
  </div>
);

export default ReceiptModal;
