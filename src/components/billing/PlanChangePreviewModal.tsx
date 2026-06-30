import React, { useState } from 'react';

interface PreviewData {
  currentPlan: string;
  newPlan: string;
  currentPrice: number;
  newPrice: number;
  usedDays: number;
  remainingDays: number;
  creditGenerated: number;
  walletBalanceBefore: number;
  walletUsed: number;
  walletBalanceAfter: number;
  amountToPay: number;
  paymentRequired: boolean;
}

interface PlanChangePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  previewData: PreviewData | null;
  isLoading: boolean;
}

export const PlanChangePreviewModal: React.FC<PlanChangePreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  previewData,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Review Plan Change</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : previewData ? (
            <div className="space-y-6">
              {/* Plan Comparison */}
              <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-lg">
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-500 font-medium">Current Plan</p>
                  <p className="text-lg font-bold text-gray-800">{previewData.currentPlan || 'Current'}</p>
                  <p className="text-sm text-gray-600">₹{previewData.currentPrice}</p>
                </div>
                <div className="text-indigo-400 font-bold px-2">→</div>
                <div className="text-center flex-1">
                  <p className="text-sm text-gray-500 font-medium">New Plan</p>
                  <p className="text-lg font-bold text-indigo-700">{previewData.newPlan}</p>
                  <p className="text-sm text-gray-600">₹{previewData.newPrice}</p>
                </div>
              </div>

              {/* Usage Summary */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Used Days</span>
                  <span className="font-medium">{previewData.usedDays} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Remaining Days</span>
                  <span className="font-medium">{previewData.remainingDays} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Unused Credit</span>
                  <span className="font-medium text-green-600">+₹{previewData.creditGenerated}</span>
                </div>
              </div>

              <div className="border-t border-gray-100"></div>

              {/* Wallet Summary */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Wallet Used</span>
                  <span className="font-medium text-red-500">-₹{previewData.walletUsed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Wallet Balance After Change</span>
                  <span className="font-medium">₹{previewData.walletBalanceAfter}</span>
                </div>
              </div>

              <div className="border-t border-gray-100"></div>

              {/* Final Amount */}
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span className="font-bold text-gray-800 text-lg">Amount To Pay Today</span>
                <span className="font-bold text-indigo-700 text-xl">₹{previewData.amountToPay}</span>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">Failed to load preview data.</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50"
            disabled={isLoading || !previewData}
          >
            {previewData?.paymentRequired ? 'Proceed To Payment' : 'Confirm Change'}
          </button>
        </div>
      </div>
    </div>
  );
};
