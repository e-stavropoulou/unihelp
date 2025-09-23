// src/ignore-push-sw.js

self.addEventListener('push', (event) => {
    console.log('🔕 Push αγνοήθηκε από Angular SW');
    event.stopImmediatePropagation(); // σταματάει να περάσει σε άλλους listeners
  });
  