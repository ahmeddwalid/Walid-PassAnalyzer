import React, { useState, useEffect, useRef } from 'react';

export type TabType = 'analyzer' | 'generator' | 'comparison' | 'dictionaries';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

interface TabConfig {
  id: TabType;
  label: string;
  icon: string;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: 'analyzer',
    label: 'Analyzer',
    icon: '🔍',
    description: 'Analyze password strength'
  },
  {
    id: 'generator',
    label: 'Generator',
    icon: '⚡',
    description: 'Generate secure passwords'
  },
  {
    id: 'comparison',
    label: 'Compare',
    icon: '⚖️',
    description: 'Compare multiple passwords'
  },
  {
    id: 'dictionaries',
    label: 'Dictionaries',
    icon: '📚',
    description: 'Manage custom dictionaries'
  }
];

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    
    if (isLeftSwipe && currentIndex < tabs.length - 1) {
      // Swipe left - go to next tab
      onTabChange(tabs[currentIndex + 1].id);
    }
    
    if (isRightSwipe && currentIndex > 0) {
      // Swipe right - go to previous tab
      onTabChange(tabs[currentIndex - 1].id);
    }
  };

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
        
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          e.preventDefault();
          onTabChange(tabs[currentIndex - 1].id);
        } else if (e.key === 'ArrowRight' && currentIndex < tabs.length - 1) {
          e.preventDefault();
          onTabChange(tabs[currentIndex + 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, onTabChange]);

  return (
    <nav 
      className="w-full mb-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      ref={tabsRef}
    >
      {/* Desktop/Tablet Tab Navigation */}
      <div className="hidden sm:flex bg-gray-700/50 rounded-lg p-1 backdrop-blur-sm border border-gray-600/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium
              transition-all duration-200 ease-in-out
              ${activeTab === tab.id
                ? 'bg-gradient-to-r from-sky-500 to-purple-600 text-white shadow-lg transform scale-[1.02]'
                : 'text-gray-300 hover:text-white hover:bg-gray-600/50'
              }
            `}
            aria-label={`Switch to ${tab.label} tab - ${tab.description}`}
          >
            <span className="text-lg" role="img" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Mobile Tab Navigation */}
      <div className="sm:hidden">
        {/* Active Tab Display */}
        <div className="bg-gray-700/50 rounded-lg p-4 mb-3 backdrop-blur-sm border border-gray-600/30">
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl" role="img" aria-hidden="true">
              {tabs.find(tab => tab.id === activeTab)?.icon}
            </span>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-gray-400">
                {tabs.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-gray-700/30 rounded-lg p-1 backdrop-blur-sm border border-gray-600/20">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 flex items-center justify-center p-3 rounded-md
                transition-all duration-200 ease-in-out
                min-h-[44px] min-w-[44px]
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-sky-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-600/30'
                }
              `}
              aria-label={`Switch to ${tab.label} tab - ${tab.description}`}
            >
              <span className="text-xl" role="img" aria-hidden="true">
                {tab.icon}
              </span>
            </button>
          ))}
        </div>

        {/* Swipe Indicator */}
        <div className="flex justify-center mt-2">
          <p className="text-xs text-gray-500 text-center">
            Swipe left/right to switch tabs
          </p>
        </div>
      </div>

      {/* Tab Indicators */}
      <div className="flex justify-center mt-3 gap-2">
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            className={`
              w-2 h-2 rounded-full transition-all duration-200
              ${activeTab === tab.id
                ? 'bg-gradient-to-r from-sky-400 to-purple-500 w-6'
                : 'bg-gray-600'
              }
            `}
            aria-hidden="true"
          />
        ))}
      </div>
    </nav>
  );
};