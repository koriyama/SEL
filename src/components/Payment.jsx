// src/components/Payment.jsx
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

let stripePromise;

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

const Payment = ({ amount = 1000 }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Create PaymentIntent via our API
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'jpy' }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      // 2. Load Stripe and confirm payment (redirect to Stripe hosted page)
      const stripe = await getStripe();
      const { error: confirmError } = await stripe.confirmPayment({
        clientSecret: data.clientSecret,
        confirmParams: {
          return_url: window.location.origin + '/payment-success',
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      // If no error, Stripe will redirect, but we can set a success state just in case
      // We'll handle success on the return page.
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img src="/sel.png" alt="SEL Logo" className="h-16 w-auto mx-auto mb-4" />
          <h2 className="text-3xl font-extrabold text-warm-900">
            Complete Your Payment
          </h2>
          <p className="mt-2 text-sm text-warm-600">
            Secure checkout powered by Stripe
          </p>
        </div>

        <div className="card p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-warm-200 pb-3">
            <span className="text-sm font-medium text-warm-700">Total</span>
            <span className="text-2xl font-bold text-warm-900">
              ¥{amount.toLocaleString()}
            </span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-card p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full btn-primary py-3 text-base"
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </button>

          <p className="text-xs text-warm-500 text-center">
            You will be redirected to Stripe to complete your payment securely.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Payment;