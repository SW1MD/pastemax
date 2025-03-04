// preload.js
// This script loads in the webview and enables some permissions safely

window.addEventListener('DOMContentLoaded', () => {
  // You can expose APIs to the webview content here if needed
  // For example, you could provide a way for the webview content
  // to communicate with the main application

  // Set content security policy
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = "default-src * 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;";
  document.head.appendChild(meta);
});

// Optional: Clean up any event listeners when the window is closed
window.addEventListener('unload', () => {
  // Clean up any resources
}); 