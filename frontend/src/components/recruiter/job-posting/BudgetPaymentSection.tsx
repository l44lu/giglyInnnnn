import React from "react";
import { DollarSign } from "lucide-react";
import { PaymentStructure } from "@/types/job";

export interface BudgetPaymentSectionProps {
  paymentStructure: PaymentStructure;
  onChangePaymentStructure: (val: PaymentStructure) => void;
  budgetAmount: number | "";
  onChangeBudgetAmount: (val: number | "") => void;
  hourlyRate: number | "";
  onChangeHourlyRate: (val: number | "") => void;
  disabled?: boolean;
}

export const BudgetPaymentSection: React.FC<BudgetPaymentSectionProps> = ({
  paymentStructure,
  onChangePaymentStructure,
  budgetAmount,
  onChangeBudgetAmount,
  hourlyRate,
  onChangeHourlyRate,
  disabled = false,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#1877f2]">
          <DollarSign className="w-4 h-4 stroke-[2.2]" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          4. Budget &amp; Payment
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: Payment Structure Selection */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-800 mb-2">
            Payment Structure <span className="text-rose-500">*</span>
          </label>
          <div className="space-y-2.5">
            {/* Fixed Price Option */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChangePaymentStructure(PaymentStructure.FIXED)}
              className={`w-full h-12 px-4 rounded-xl border flex items-center gap-3 text-sm font-medium transition-all ${
                disabled ? "cursor-not-allowed opacity-75" : "cursor-pointer"
              } ${
                paymentStructure === PaymentStructure.FIXED
                  ? "border-[#1877f2] bg-blue-50/60 text-[#1877f2] shadow-2xs ring-1 ring-[#1877f2]/20"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  paymentStructure === PaymentStructure.FIXED
                    ? "border-[#1877f2] bg-[#1877f2]"
                    : "border-slate-300 bg-white"
                }`}
              >
                {paymentStructure === PaymentStructure.FIXED && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </span>
              <span>Fixed Price</span>
            </button>

            {/* Hourly Rate Option */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChangePaymentStructure(PaymentStructure.HOURLY)}
              className={`w-full h-12 px-4 rounded-xl border flex items-center gap-3 text-sm font-medium transition-all ${
                disabled ? "cursor-not-allowed opacity-75" : "cursor-pointer"
              } ${
                paymentStructure === PaymentStructure.HOURLY
                  ? "border-[#1877f2] bg-blue-50/60 text-[#1877f2] shadow-2xs ring-1 ring-[#1877f2]/20"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  paymentStructure === PaymentStructure.HOURLY
                    ? "border-[#1877f2] bg-[#1877f2]"
                    : "border-slate-300 bg-white"
                }`}
              >
                {paymentStructure === PaymentStructure.HOURLY && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </span>
              <span>Hourly Rate</span>
            </button>
          </div>
        </div>

        {/* Right: Amounts based on selected structure */}
        <div>
          {paymentStructure === PaymentStructure.FIXED ? (
            <div>
              <label
                htmlFor="budget-amount"
                className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5"
              >
                Budget Amount ($) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <span className="text-sm font-semibold">$</span>
                </div>
                <input
                  id="budget-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={disabled}
                  value={budgetAmount === "" ? "" : budgetAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChangeBudgetAmount(val === "" ? "" : parseFloat(val));
                  }}
                  placeholder="500.00"
                  className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Total fixed payment for the entire gig duration.
              </p>
            </div>
          ) : (
            <div>
              <label
                htmlFor="hourly-rate"
                className="block text-xs sm:text-sm font-semibold text-slate-800 mb-1.5"
              >
                Hourly Rate ($/hr) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <span className="text-sm font-semibold">$</span>
                </div>
                <input
                  id="hourly-rate"
                  type="number"
                  min={0.01}
                  step="0.01"
                  disabled={disabled}
                  value={hourlyRate === "" ? "" : hourlyRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChangeHourlyRate(val === "" ? "" : parseFloat(val));
                  }}
                  placeholder="25.00"
                  className="w-full h-11 pl-8 pr-12 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                  <span className="text-xs font-medium text-slate-500">
                    /hr
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Hourly rate offered for this position.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetPaymentSection;
