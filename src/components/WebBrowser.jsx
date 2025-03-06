import React, { useState, useRef, useEffect, useCallback } from "react";
import { RefreshCw, Home, ArrowLeft, ArrowRight, X, Star, Search, Menu, Plus, Copy, ExternalLink, MoreVertical, Download, Share2, Settings, Info, Lock, Clipboard } from "lucide-react";
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
  const [showPopover, setShowPopover] = useState(false);
  
  const webviewRef = useRef(null);
  const popoverButtonRef = useRef(null);
  
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
  
  // Popover menu handlers
  const togglePopover = useCallback(() => {
    setShowPopover(prev => !prev);
  }, []);

  const closePopover = useCallback(() => {
    setShowPopover(false);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverButtonRef.current && !popoverButtonRef.current.contains(event.target) && 
          !event.target.closest('.browser-popover-menu')) {
        closePopover();
      }
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopover, closePopover]);

  // Popover menu items
  const popoverMenuItems = [
    {
      icon: <Download size={16} />,
      label: "Download page",
      onClick: () => {
        if (webviewRef.current && window.electron) {
          // This would need to be implemented in the Electron main process
          window.electron.downloadPage(url);
        }
        closePopover();
      }
    },
    {
      icon: <Share2 size={16} />,
      label: "Share page",
      onClick: () => {
        if (navigator.share) {
          navigator.share({
            title: pageTitle,
            url: url
          });
        } else {
          copyCurrentUrl();
          alert("URL copied to clipboard");
        }
        closePopover();
      }
    },
    { divider: true },
    {
      icon: <ExternalLink size={16} />,
      label: "Open in default browser",
      onClick: () => {
        openInDefaultBrowser();
        closePopover();
      }
    },
    {
      icon: <Copy size={16} />,
      label: "Copy URL",
      onClick: () => {
        copyCurrentUrl();
        closePopover();
      }
    },
    { divider: true },
    {
      icon: <Settings size={16} />,
      label: "Browser settings",
      onClick: () => {
        // Implement browser settings
        closePopover();
      }
    },
    {
      icon: <Info size={16} />,
      label: "About this browser",
      onClick: () => {
        // Show browser info
        closePopover();
      }
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
    
    try {
      const webview = webviewRef.current;
      
      if (!webview) return;
      
      // Try to update the title and URL
      // This will work for same-origin content or if using electron webview
      if (window.electron && webview.getTitle) {
        // For electron webview
        setPageTitle(webview.getTitle());
        const currentUrl = webview.getURL();
        setUrl(currentUrl);
        
        // Get the favicon if available
        try {
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${extractDomainFromUrl(currentUrl)}`;
          setFavicon(faviconUrl);
        } catch (e) {
          console.error("Error setting favicon", e);
        }
        
        // Update history if needed
        if (history[historyIndex] !== currentUrl) {
          const newHistory = [...history.slice(0, historyIndex + 1), currentUrl];
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        }
      } else {
        // For iframe in browser
        try {
          // Try to access the iframe content if same-origin
          if (webview.contentWindow && webview.contentWindow.document) {
            setPageTitle(webview.contentWindow.document.title);
            const iframeUrl = webview.contentWindow.location.href;
            setUrl(iframeUrl);
            
            // Apply our custom scrollbar styles to the iframe
            const injectScrollbarStyles = () => {
              try {
                const doc = webview.contentWindow.document;
                
                // Check if we've already injected styles
                if (!doc.getElementById('custom-scrollbar-styles')) {
                  // Create style element
                  const style = doc.createElement('style');
                  style.id = 'custom-scrollbar-styles';
                  
                  // Get computed style values from document
                  const computedStyle = window.getComputedStyle(document.documentElement);
                  const thumbColor = computedStyle.getPropertyValue('--scrollbar-thumb-color') || 'rgba(128, 128, 128, 0)';
                  const trackColor = computedStyle.getPropertyValue('--scrollbar-track-color') || 'transparent';
                  const thumbHoverColor = computedStyle.getPropertyValue('--scrollbar-thumb-hover-color') || 'rgba(128, 128, 128, 0.7)';
                  const thumbActiveColor = computedStyle.getPropertyValue('--scrollbar-thumb-active-color') || 'rgba(128, 128, 128, 0.5)';

                  style.textContent = `
                    /* Custom Scrollbar Styles for iframe content */
                    ::-webkit-scrollbar {
                      width: 8px;
                      height: 8px;
                      background-color: transparent;
                    }
                    
                    ::-webkit-scrollbar-track {
                      background-color: ${trackColor};
                    }
                    
                    ::-webkit-scrollbar-thumb {
                      background-color: ${thumbColor};
                      border-radius: 4px;
                      transition: background-color 0.3s ease;
                    }
                    
                    :hover::-webkit-scrollbar-thumb,
                    :focus::-webkit-scrollbar-thumb,
                    :active::-webkit-scrollbar-thumb {
                      background-color: ${thumbActiveColor};
                    }
                    
                    ::-webkit-scrollbar-thumb:hover {
                      background-color: ${thumbHoverColor};
                    }
                    
                    * {
                      scrollbar-width: thin;
                      scrollbar-color: ${thumbColor} ${trackColor};
                    }
                    
                    *:hover,
                    *:focus,
                    *:active {
                      scrollbar-color: ${thumbActiveColor} ${trackColor};
                    }
                  `;
                  
                  // Add to head
                  doc.head.appendChild(style);
                }
              } catch (e) {
                // Silently fail for cross-origin content
                console.log("Cannot inject scrollbar styles - cross-origin restriction");
              }
            };
            
            // Try to inject our styles
            injectScrollbarStyles();
            
            // Update history if needed
            if (history[historyIndex] !== iframeUrl) {
              const newHistory = [...history.slice(0, historyIndex + 1), iframeUrl];
              setHistory(newHistory);
              setHistoryIndex(newHistory.length - 1);
            }
          }
        } catch (e) {
          // Handle cross-origin restrictions gracefully
          console.log("Could not access iframe content due to cross-origin restrictions");
          
          // For cross-origin content, at least update the URL from the iframe's src
          const currentSrc = webview.src;
          if (currentSrc && history[historyIndex] !== currentSrc) {
            setUrl(currentSrc);
            const newHistory = [...history.slice(0, historyIndex + 1), currentSrc];
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
          }
        }
      }
      
      // Notify parent component of URL change
      if (onUrlChange) {
        onUrlChange(url);
      }
    } catch (error) {
      console.error("Error in handleWebviewLoad", error);
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
    if (webviewRef.current) {
      try {
        // The loading state will be handled by the event listeners
        webviewRef.current.reload();
      } catch (error) {
        console.error("Error reloading page:", error);
        // If reload fails, reset loading state
        setIsLoading(false);
      }
    } else {
      // If webview ref is not available, just navigate to the current URL again
      navigateTo(url);
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
        
        // Add event listeners for loading state
        if (window.electron) {
          // For Electron webview
          webviewRef.current.addEventListener('did-start-loading', () => {
            setIsLoading(true);
          });
          
          webviewRef.current.addEventListener('did-stop-loading', () => {
            setIsLoading(false);
          });
          
          webviewRef.current.addEventListener('did-finish-load', handleWebviewLoad);
          
          // Add event listener for URL changes
          webviewRef.current.addEventListener('did-navigate', (e) => {
            setUrl(e.url);
            // Update history if needed
            if (history[historyIndex] !== e.url) {
              const newHistory = [...history.slice(0, historyIndex + 1), e.url];
              setHistory(newHistory);
              setHistoryIndex(newHistory.length - 1);
            }
          });
          
          // For navigation within the same page (hash changes, etc.)
          webviewRef.current.addEventListener('did-navigate-in-page', (e) => {
            setUrl(e.url);
          });
        } else {
          // For iframe fallback
          webviewRef.current.onloadstart = () => setIsLoading(true);
          webviewRef.current.onloadend = () => setIsLoading(false);
          
          // For iframe, we need to use the load event to check URL changes
          webviewRef.current.onload = () => {
            handleWebviewLoad();
            try {
              // Try to get the current URL from the iframe
              // Note: This might be restricted by same-origin policy
              const currentUrl = webviewRef.current.contentWindow.location.href;
              if (currentUrl && url !== currentUrl) {
                setUrl(currentUrl);
                // Update history if needed
                if (history[historyIndex] !== currentUrl) {
                  const newHistory = [...history.slice(0, historyIndex + 1), currentUrl];
                  setHistory(newHistory);
                  setHistoryIndex(newHistory.length - 1);
                }
              }
            } catch (err) {
              console.error("Error accessing iframe URL:", err);
            }
          };
        }
      }
    };
    
    // Set a small delay to ensure the ref is available
    const timer = setTimeout(setupWebview, 100);
    
    return () => {
      clearTimeout(timer);
      // Clean up event listeners
      if (webviewRef.current) {
        if (window.electron) {
          webviewRef.current.removeEventListener('did-start-loading', () => {});
          webviewRef.current.removeEventListener('did-stop-loading', () => {});
          webviewRef.current.removeEventListener('did-finish-load', handleWebviewLoad);
          webviewRef.current.removeEventListener('did-navigate', () => {});
          webviewRef.current.removeEventListener('did-navigate-in-page', () => {});
        }
      }
    };
  }, [history, historyIndex]);

  const handleHomeClick = () => {
    setUrl('browser-home.html');
    if (webviewRef.current) {
      webviewRef.current.src = 'browser-home.html';
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
      }
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  };

  return (
    <div className={`web-browser-container ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Tab bar */}
      <div className="web-browser-tabs">
        <div className="web-browser-tab active">
          <img src={favicon || "/favicon.ico"} className="tab-favicon" alt="" />
          <span className="tab-title">{pageTitle || "New Tab"}</span>
        </div>
        <button className="tab-new">
          <Plus size={14} />
        </button>
      </div>
      
      {/* Control bar */}
      <div className="web-browser-controls">
        <div className="web-browser-nav">
          <button
            className="web-browser-nav-btn"
            onClick={goBack}
            disabled={historyIndex === 0}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            className="web-browser-nav-btn"
            onClick={goForward}
            disabled={historyIndex >= history.length - 1}
          >
            <ArrowRight size={16} />
          </button>
          <button
            className="web-browser-nav-btn"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? "spin" : ""} />
          </button>
          <button
            className="web-browser-nav-btn"
            onClick={handleHomeClick}
          >
            <Home size={16} />
          </button>
        </div>
        
        {/* URL bar */}
        <div className="url-bar">
          <div className="url-bar-left">
            <Lock size={14} className="url-icon" />
          </div>
          <input
            type="text"
            className="url-input"
            value={url}
            onChange={handleUrlChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Enter URL or search..."
          />
          <div className="url-bar-actions">
            <button
              className="url-action-btn"
              onClick={() => {
                // Implement bookmark functionality
              }}
              title="Bookmark this page"
            >
              <Star size={16} />
            </button>
            <button
              className="url-action-btn"
              onClick={togglePopover}
              title="Browser menu"
              ref={popoverButtonRef}
            >
              <MoreVertical size={16} />
            </button>
          </div>
          
          {/* Popover Menu */}
          {showPopover && (
            <div className="browser-popover-menu">
              {popoverMenuItems.map((item, index) => (
                item.divider ? (
                  <div key={`divider-${index}`} className="browser-popover-divider" />
                ) : (
                  <button 
                    key={`menu-item-${index}`} 
                    className="browser-popover-item"
                    onClick={item.onClick}
                  >
                    <span className="browser-popover-item-icon">{item.icon}</span>
                    <span className="browser-popover-item-label">{item.label}</span>
                  </button>
                )
              ))}
            </div>
          )}
        </div>
        
        <div className="web-browser-actions">
          {/* Close button removed */}
        </div>
      </div>
      
      {/* Browser content */}
      <div className="web-browser-content">
        {window.electron ? (
          <webview
            ref={webviewRef}
            src={homeUrl}
            className="web-browser-webview"
            onLoad={handleWebviewLoad}
            allowpopups="true"
            preload="./preload.js"
          />
        ) : (
          <iframe
            ref={webviewRef}
            src={homeUrl}
            className="web-browser-iframe"
            onLoad={handleWebviewLoad}
            title="Web Browser"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        )}
        
        {/* Loading indicator */}
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