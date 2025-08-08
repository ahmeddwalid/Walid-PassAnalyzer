import React, { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { CryptoServiceImpl } from '../services/CryptoService';
import { ClipboardServiceImpl } from '../services/ClipboardService';
import { ExportServiceImpl } from '../services/ExportService';
import { DictionaryServiceImpl } from '../services/DictionaryService';
import { PasswordAnalysisServiceImpl } from '../services/PasswordAnalysisService';
import { CryptoService, ClipboardService, ExportService, DictionaryService, Dictionary } from '../services/interfaces';
import { PasswordAnalysisService } from '../services/PasswordAnalysisService';

interface AppContextType {
  cryptoService: CryptoService;
  clipboardService: ClipboardService;
  exportService: ExportService;
  dictionaryService: DictionaryService;
  passwordAnalysisService: PasswordAnalysisService;
  customDictionaries: Dictionary[];
  refreshDictionaries: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Initialize services as singletons
  const cryptoService = CryptoServiceImpl.getInstance();
  const clipboardService = ClipboardServiceImpl.getInstance();
  const exportService = ExportServiceImpl.getInstance();
  const dictionaryService = DictionaryServiceImpl.getInstance();
  const passwordAnalysisService = PasswordAnalysisServiceImpl.getInstance();

  // State for reactive custom dictionaries
  const [customDictionaries, setCustomDictionaries] = useState<Dictionary[]>([]);

  // Function to refresh dictionaries
  const refreshDictionaries = useCallback(() => {
    const dictionaries = dictionaryService.getDictionaries();
    setCustomDictionaries(dictionaries);
  }, [dictionaryService]);

  // Load dictionaries on mount
  useEffect(() => {
    refreshDictionaries();
  }, [refreshDictionaries]);

  const contextValue: AppContextType = {
    cryptoService,
    clipboardService,
    exportService,
    dictionaryService,
    passwordAnalysisService,
    customDictionaries,
    refreshDictionaries
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Individual service hooks for convenience
export const useCryptoService = (): CryptoService => {
  const { cryptoService } = useAppContext();
  return cryptoService;
};

export const useClipboardService = (): ClipboardService => {
  const { clipboardService } = useAppContext();
  return clipboardService;
};

export const useExportService = (): ExportService => {
  const { exportService } = useAppContext();
  return exportService;
};

export const useDictionaryService = (): DictionaryService => {
  const { dictionaryService } = useAppContext();
  return dictionaryService;
};

export const usePasswordAnalysisService = (): PasswordAnalysisService => {
  const { passwordAnalysisService } = useAppContext();
  return passwordAnalysisService;
};

export const useCustomDictionaries = (): Dictionary[] => {
  const { customDictionaries } = useAppContext();
  return customDictionaries;
};

export const useRefreshDictionaries = (): (() => void) => {
  const { refreshDictionaries } = useAppContext();
  return refreshDictionaries;
};