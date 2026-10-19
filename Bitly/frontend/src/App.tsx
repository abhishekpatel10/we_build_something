import React, { useState, useEffect, useCallback } from 'react';
import type { HealthStatus, CounterStatus, UrlItem, ToastMessage, ShortenResponse } from './types';
import { apiService } from './services/api';
import { Header } from './components/Header';
import { UrlShortener } from './components/UrlShortener';
import { CounterVisualizer } from './components/CounterVisualizer';
import { RecentLinksTable } from './components/RecentLinksTable';
import { ArchitectureVisualizer } from './components/ArchitectureVisualizer';
import { ApiPlayground } from './components/ApiPlayground';
import { StatsModal } from './components/StatsModal';
import { QrModal } from './components/QrModal';
import { ToastContainer } from './components/Toast';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('shortener');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [counter, setCounter] = useState<CounterStatus | null>(null);
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState<boolean>(false);
  const [loadingUrls, setLoadingUrls] = useState<boolean>(false);

  // Modals
  const [statsShortCode, setStatsShortCode] = useState<string | null>(null);
  const [qrModalData, setQrModalData] = useState<{ url: string; shortCode: string } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch telemetry
  const loadTelemetry = useCallback(async () => {
    setLoadingTelemetry(true);
    try {
      const [h, c] = await Promise.allSettled([
        apiService.getHealth(),
        apiService.getCounterStatus(),
      ]);

      if (h.status === 'fulfilled') setHealth(h.value);
      if (c.status === 'fulfilled') setCounter(c.value);
    } catch {
      // ignore
    } finally {
      setLoadingTelemetry(false);
    }
  }, []);

  // Fetch recent URLs
  const loadRecentUrls = useCallback(async () => {
    setLoadingUrls(true);
    try {
      const list = await apiService.getRecentUrls(25);
      setUrls(list);
    } catch {
      // ignore
    } finally {
      setLoadingUrls(false);
    }
  }, []);

  // Initial boot and background polling
  useEffect(() => {
    loadTelemetry();
    loadRecentUrls();

    const interval = setInterval(() => {
      loadTelemetry();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadTelemetry, loadRecentUrls]);

  const handleShortenSuccess = (_result: ShortenResponse) => {
    loadTelemetry();
    loadRecentUrls();
  };

  return (
    <>
      <div className="background-mesh" />

      <Header
        health={health}
        counter={counter}
        loadingTelemetry={loadingTelemetry}
        onRefreshTelemetry={loadTelemetry}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="main-content">
        {activeTab === 'shortener' && (
          <UrlShortener
            onSuccess={handleShortenSuccess}
            onShowToast={addToast}
            onOpenStats={(code) => setStatsShortCode(code)}
            onOpenQr={(url, code) => setQrModalData({ url, shortCode: code })}
          />
        )}

        {activeTab === 'counter' && (
          <CounterVisualizer
            counter={counter}
            loading={loadingTelemetry}
            onRefresh={loadTelemetry}
          />
        )}

        {activeTab === 'history' && (
          <RecentLinksTable
            urls={urls}
            loading={loadingUrls}
            onRefresh={loadRecentUrls}
            onOpenStats={(code) => setStatsShortCode(code)}
            onOpenQr={(url, code) => setQrModalData({ url, shortCode: code })}
            onShowToast={addToast}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureVisualizer />}

        {activeTab === 'playground' && <ApiPlayground />}
      </main>

      {/* Global Modals */}
      <StatsModal
        shortCode={statsShortCode}
        onClose={() => setStatsShortCode(null)}
        onShowToast={addToast}
      />

      <QrModal
        url={qrModalData?.url || null}
        shortCode={qrModalData?.shortCode || null}
        onClose={() => setQrModalData(null)}
        onCopy={(text) => {
          navigator.clipboard.writeText(text);
          addToast('Link copied to clipboard!', 'success');
        }}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export default App;
