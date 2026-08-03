import React from 'react';

export const InstagramFeedWidget: React.FC = () => {
  // Pure native HTML container for Trustindex widget
  // Isolate third-party script inside iframe to guarantee native browser execution,
  // document.currentScript binding, and DOMContentLoaded lifecycle.
  const iframeContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      background: transparent;
      overflow-x: hidden;
      font-family: system-ui, -apple-system, sans-serif;
    }
  </style>
</head>
<body>
  <script defer async src="https://cdn.trustindex.io/loader-feed.js?1039774780ec320d47866d93b06"></script>
</body>
</html>`;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mt-12 md:mt-20 mb-16 md:mb-24 select-none">
      <div className="w-full min-h-[450px] md:min-h-[520px] rounded-2xl overflow-hidden bg-transparent">
        <iframe
          srcDoc={iframeContent}
          title="Trustindex Instagram Feed"
          className="w-full h-full min-h-[450px] md:min-h-[520px] border-0 overflow-hidden"
          scrolling="no"
          loading="lazy"
        />
      </div>
    </section>
  );
};
