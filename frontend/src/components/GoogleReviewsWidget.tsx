import React, { useEffect, useRef } from 'react';

export const GoogleReviewsWidget: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up existing script if already injected
    const existingScript = document.getElementById('trustindex-google-reviews-script');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'trustindex-google-reviews-script';
    script.src = 'https://cdn.trustindex.io/loader.js?c6c76d07838a321eff0651997f4';
    script.defer = true;
    script.async = true;

    containerRef.current.appendChild(script);
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-6 md:px-8 mt-24 mb-24 select-none">
      <div className="text-center max-w-xl mx-auto mb-12">
        <span className="text-xs uppercase tracking-widest text-[#c9a96e] font-bold flex items-center justify-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Google Verified Reviews
        </span>
        <h2 className="text-3xl font-light text-gray-900 mt-2 font-display italic">What Our Customers Say</h2>
        <div className="h-[1.5px] w-12 bg-[#c9a96e] mx-auto mt-4" />
      </div>

      <div ref={containerRef} className="w-full flex justify-center min-h-[250px] overflow-hidden rounded-2xl">
        {/* Trustindex Live Google Reviews automatically embeds here */}
      </div>
    </section>
  );
};
