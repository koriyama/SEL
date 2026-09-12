// src/components/PaymentSuccess.jsx
import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const paymentIntentId = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img src="/sel.png" alt="SEL Logo" className="h-16 w-auto mx-auto mb-4" />
        </div>

        <div className="card p-8 text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-bold text-warm-900">
            Payment Successful!
          </h1>
          <p className="text-warm-600">
            Your payment has been processed. Thank you for your support.
          </p>

          {redirectStatus && (
            <p className="text-xs text-warm-400">
              Status: {redirectStatus}
            </p>
          )}

          {paymentIntentId && (
            <p className="text-xs text-warm-400 font-mono break-all">
              Payment ID: {paymentIntentId}
            </p>
          )}

          <div className="pt-4">
            <Link to="/" className="btn-primary inline-block">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;