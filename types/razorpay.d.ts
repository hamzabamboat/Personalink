// Shared Razorpay Checkout modal types for client components

interface RazorpayCheckoutResponse {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}

interface RazorpayCheckoutOptions {
  key: string
  subscription_id: string
  name: string
  description: string
  image?: string
  prefill?: { name?: string; email?: string; contact?: string }
  notes?: Record<string, string>
  theme?: { color?: string }
  handler: (response: RazorpayCheckoutResponse) => void
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => { open(): void }
  }
}

export {}
