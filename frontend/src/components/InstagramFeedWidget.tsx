import React, { useEffect, useRef } from 'react';

export const InstagramFeedWidget: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Reset container for clean widget mount
    containerRef.current.innerHTML = '';

    // Direct Trustindex Loader script injection — loads feed & layout natively from Trustindex
    const script = document.createElement('script');
    script.src = 'https://cdn.trustindex.io/loader-feed.js?1039774780ec320d47866d93b06';
    script.defer = true;
    script.async = true;

    containerRef.current.appendChild(script);
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mt-12 md:mt-20 mb-16 md:mb-24 select-none">
      {/* Pure Trustindex Widget Container — Trustindex renders its native Instagram feed, headers & posts here */}
      <div ref={containerRef} className="w-full min-h-[350px] flex justify-center items-center" />
    </section>
  );
};
