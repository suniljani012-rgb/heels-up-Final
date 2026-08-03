import React, { useEffect, useRef } from 'react';

export const InstagramFeedWidget: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    // Create script synchronously so document.currentScript points directly to this element
    const script = document.createElement('script');
    script.src = 'https://cdn.trustindex.io/loader-feed.js?1039774780ec320d47866d93b06';
    // Do NOT set async/defer on dynamic script so execution binds to currentScript
    containerRef.current.appendChild(script);
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mt-12 md:mt-20 mb-16 md:mb-24 select-none">
      {/* Native Trustindex Feed Container */}
      <div
        ref={containerRef}
        className="w-full min-h-[350px] flex justify-center items-center overflow-hidden"
      />
    </section>
  );
};
