// frontend/src/utils/loadRazorpay.ts
// Loads Razorpay SDK dynamically only when the user reaches checkout/payment

let razorpayPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (razorpayPromise) return razorpayPromise;

  razorpayPromise = new Promise<boolean>((resolve) => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      razorpayPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return razorpayPromise;
}
