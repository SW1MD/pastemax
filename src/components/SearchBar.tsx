import React, { useState } from "react";
import { Search, X } from "lucide-react";
import { SearchBarProps } from "../types/FileTypes";

const SearchBar = ({
  value,
  onChange,
  placeholder = "Search...",
}: SearchBarProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`search-bar ${isFocused ? "focused" : ""}`}>
      <div className="search-icon">
        <Search size={16} />
      </div>
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {value && (
        <button
          className="search-clear-btn"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
