import React, { useEffect } from 'react';

export const InstagramFeedWidget: React.FC = () => {
  useEffect(() => {
    const SCRIPT_ID = 'ti-instagram-feed-script';

    // If script already loaded, just re-trigger window.__ti__init if available
    if (document.getElementById(SCRIPT_ID)) {
      try { (window as any).__tiInit?.(); } catch (_) {}
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://cdn.trustindex.io/loader-feed.js?1039774780ec320d47866d93b06';
    script.async = true;
    // Append to body — Trustindex scans the full DOM when script loads
    document.body.appendChild(script);

    return () => {
      // Do NOT remove on unmount — Trustindex needs to stay alive across page navigations
    };
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-6 md:px-8 mt-24 mb-24 select-none">
      {/* Heading */}
      <div className="text-center max-w-xl mx-auto mb-12">
        <span className="text-xs uppercase tracking-widest text-[#c9a96e] font-bold flex items-center justify-center gap-2">
          <svg className="w-4 h-4 text-[#c9a96e]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          @heelsup.jodhpur
        </span>
        <h2 className="text-3xl font-light text-gray-900 mt-2 font-display italic">Follow Us On Instagram</h2>
        <div className="h-[1.5px] w-12 bg-[#c9a96e] mx-auto mt-4" />
      </div>

      {/* 
        Trustindex Instagram Feed Widget placeholder.
        The script (appended to body above) scans DOM for this element and renders the feed here.
      */}
      <div
        className="w-full overflow-hidden rounded-2xl"
        data-ti-widget="1039774780ec320d47866d93b06"
      >
        {/* Loading skeleton while Trustindex loads */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-[#f0ebe0]" />
          ))}
        </div>
      </div>
    </section>
  );
};
