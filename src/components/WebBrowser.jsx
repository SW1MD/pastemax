import React, { useState, useRef, useEffect, useCallback } from "react";
import { RefreshCw, Home, ArrowLeft, ArrowRight, X, Star, Search, Menu, Plus, Copy, ExternalLink } from "lucide-react";
import ContextMenu from "./ContextMenu";

// Default to our custom home page
const DEFAULT_HOME_URL = window.electron 
  ? "file://" + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + "/browser-home.html"
  : "/browser-home.html";

const WebBrowser = ({ initialUrl, onClose, onUrlChange }) => {
  // Use our custom home page if no initial URL is provided
  const homeUrl = initialUrl || DEFAULT_HOME_URL;
  const [url, setUrl] = useState(homeUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([homeUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [pageTitle, setPageTitle] = useState("");
  const [favicon, setFavicon] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  
  const webviewRef = useRef(null);
  
  // Context menu handlers
  const handleContextMenu = useCallback((e) => {
    // Only show context menu for the webview container, not including the controls
    if (e.target.closest('.browser-controls')) return;
    
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  // Open URL in default browser
  const openInDefaultBrowser = useCallback(() => {
    if (window.electron) {
      window.electron.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
    closeContextMenu();
  }, [url]);

  // Copy current URL
  const copyCurrentUrl = useCallback(() => {
    navigator.clipboard.writeText(url);
    closeContextMenu();
  }, [url]);

  // Menu items for the context menu
  const menuItems = [
    {
      icon: <RefreshCw size={16} />,
      label: "Refresh page",
      onClick: () => {
        if (webviewRef.current) {
          webviewRef.current.reload();
        }
        closeContextMenu();
      }
    },
    {
      icon: <Copy size={16} />,
      label: "Copy URL",
      onClick: copyCurrentUrl
    },
    { divider: true },
    {
      icon: <ExternalLink size={16} />,
      label: "Open in default browser",
      onClick: openInDefaultBrowser
    }
  ];
  
  const handleUrlChange = (e) => {
    setUrl(e.target.value);
  };
  
  const navigateTo = (newUrl) => {
    let processedUrl = newUrl;
    
    // Add https:// if URL doesn't have a protocol
    if (!/^https?:\/\//i.test(processedUrl)) {
      processedUrl = `https://${processedUrl}`;
    }
    
    setUrl(processedUrl);
    
    // If webview is available, use it to navigate
    if (webviewRef.current) {
      webviewRef.current.src = processedUrl;
    }
    
    // Update history
    const newHistory = [...history.slice(0, historyIndex + 1), processedUrl];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    setIsLoading(true);
    
    // Notify parent component of URL change
    if (onUrlChange) {
      onUrlChange(processedUrl);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    navigateTo(url);
  };
  
  const handleWebviewLoad = () => {
    setIsLoading(false);
    
    // Try to update page title and favicon if webview is available
    if (webviewRef.current) {
      try {
        const title = webviewRef.current.getTitle();
        setPageTitle(title || extractDomainFromUrl(url));
      } catch (err) {
        setPageTitle(extractDomainFromUrl(url));
      }
    }
  };
  
  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setUrl(history[historyIndex - 1]);
      
      if (webviewRef.current) {
        webviewRef.current.goBack();
      }
    }
  };
  
  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setUrl(history[historyIndex + 1]);
      
      if (webviewRef.current) {
        webviewRef.current.goForward();
      }
    }
  };
  
  const goHome = () => {
    navigateTo(homeUrl);
  };
  
  const refresh = () => {
    setIsLoading(true);
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  const extractDomainFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return url;
    }
  };
  
  // Set up webview event listeners
  useEffect(() => {
    const setupWebview = () => {
      if (webviewRef.current) {
        // Try to set additional attributes if needed
        webviewRef.current.setAttribute('allowpopups', '');
        webviewRef.current.setAttribute('nodeintegration', 'on');
      }
    };
    
    // Set a small delay to ensure the ref is available
    const timer = setTimeout(setupWebview, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`web-browser-container ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Browser chrome/UI */}
      <div className="web-browser-chrome">
        {/* Tab bar */}
        <div className="web-browser-tabs">
          <div className="web-browser-tab active">
            <img src={favicon || "/favicon.ico"} className="tab-favicon" alt="" />
            <span className="tab-title">{pageTitle || "New Tab"}</span>
            <button className="tab-close">×</button>
          </div>
          <button className="tab-new">
            <Plus size={14} />
          </button>
        </div>
        
        {/* Control bar */}
        <div className="web-browser-controls">
          <div className="web-browser-nav-buttons">
            <button 
              onClick={goBack} 
              disabled={historyIndex === 0}
              className="web-browser-nav-btn"
              title="Go back"
            >
              <ArrowLeft size={16} />
            </button>
            <button 
              onClick={goForward} 
              disabled={historyIndex >= history.length - 1}
              className="web-browser-nav-btn"
              title="Go forward"
            >
              <ArrowRight size={16} />
            </button>
            <button 
              onClick={refresh} 
              className="web-browser-nav-btn"
              title="Refresh"
            >
              <RefreshCw size={16} className={isLoading ? "spin" : ""} />
            </button>
            <button 
              onClick={goHome} 
              className="web-browser-nav-btn"
              title="Home"
            >
              <Home size={16} />
            </button>
          </div>
          
          {/* URL bar with security indicator */}
          <div className="web-browser-urlbar-container">
            <div className="url-security-indicator">
              <Search size={14} />
            </div>
            <form onSubmit={handleSubmit} className="web-browser-url-bar">
              <input
                type="text"
                value={url}
                onChange={handleUrlChange}
                placeholder="Search or enter website name"
                className="web-browser-url-input"
              />
            </form>
            <button className="bookmark-button" title="Bookmark this page">
              <Star size={16} />
            </button>
          </div>
          
          <div className="web-browser-actions">
            <button className="web-browser-action-btn" title="Extensions">
              <Menu size={16} />
            </button>
            {onClose && (
              <button 
                onClick={onClose}
                className="web-browser-close-btn"
                title="Close browser"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Browser content */}
      <div className="web-browser-content">
        {window.electron ? (
          // If we're in Electron, use webview (this will work)
          <webview
            ref={webviewRef}
            src={homeUrl}
            className="web-browser-webview"
            onLoad={handleWebviewLoad}
            allowpopups="true"
            preload="./preload.js"
          />
        ) : (
          // If we're in a regular browser, fall back to iframe (with limitations)
          <iframe
            ref={webviewRef}
            src={homeUrl}
            className="web-browser-iframe"
            onLoad={handleWebviewLoad}
            title="Web Browser"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        )}
        
        {isLoading && (
          <div className="browser-loading-indicator">
            <div className="browser-loading-bar"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebBrowser; 