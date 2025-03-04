import React, { useState, useRef, useEffect } from "react";
import { RefreshCw, Home, ArrowLeft, ArrowRight, X } from "lucide-react";

interface WebBrowserProps {
  initialUrl?: string;
  onClose?: () => void;
}

const WebBrowser: React.FC<WebBrowserProps> = ({ 
  initialUrl = "https://www.google.com", 
  onClose 
}) => {
  const [url, setUrl] = useState<string>(initialUrl);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };
  
  const navigateTo = (newUrl: string) => {
    let processedUrl = newUrl;
    
    // Add https:// if URL doesn't have a protocol
    if (!/^https?:\/\//i.test(processedUrl)) {
      processedUrl = `https://${processedUrl}`;
    }
    
    setUrl(processedUrl);
    
    // Update history
    const newHistory = [...history.slice(0, historyIndex + 1), processedUrl];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    setIsLoading(true);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(url);
  };
  
  const handleIframeLoad = () => {
    setIsLoading(false);
  };
  
  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setUrl(history[historyIndex - 1]);
    }
  };
  
  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setUrl(history[historyIndex + 1]);
    }
  };
  
  const goHome = () => {
    navigateTo(initialUrl);
  };
  
  const refresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = url;
    }
  };
  
  useEffect(() => {
    // When history index changes, update the iframe src
    if (iframeRef.current && history[historyIndex]) {
      iframeRef.current.src = history[historyIndex];
    }
  }, [historyIndex, history]);

  return (
    <div className="web-browser-container">
      <div className="web-browser-header">
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
        
        <form onSubmit={handleSubmit} className="web-browser-url-bar">
          <input
            type="text"
            value={url}
            onChange={handleUrlChange}
            placeholder="Enter URL"
            className="web-browser-url-input"
          />
        </form>
        
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
      
      <div className="web-browser-content">
        <iframe
          ref={iframeRef}
          src={initialUrl}
          className="web-browser-iframe"
          onLoad={handleIframeLoad}
          title="Web Browser"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );
};

export default WebBrowser; 