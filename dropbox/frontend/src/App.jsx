import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import StorageOverview from './components/StorageOverview.jsx';
import FileList from './components/FileList.jsx';
import ChunkingLab from './components/ChunkingLab.jsx';
import ArchitectureMap from './components/ArchitectureMap.jsx';
import PresignedConsole from './components/PresignedConsole.jsx';
import ChunksModal from './components/ChunksModal.jsx';
import { fetchHealth, fetchWorkspaces, fetchFiles, createWorkspace } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('files');
  const [health, setHealth] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inspectingFile, setInspectingFile] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hData, wData] = await Promise.all([
        fetchHealth(),
        fetchWorkspaces()
      ]);
      setHealth(hData);

      let currentWorkspaces = wData;
      if (!currentWorkspaces || currentWorkspaces.length === 0) {
        // Fallback default workspace for immediate presentation if none exists
        try {
          const newW = await createWorkspace({
            name: 'Personal Vault',
            slug: 'personal-vault',
            owner_id: 'alex_founder',
            storage_quota_gb: 50
          });
          currentWorkspaces = [newW];
        } catch (e) {
          currentWorkspaces = [{
            id: 'default-vault-uuid',
            name: 'Personal Cloud Vault',
            slug: 'personal-vault',
            storage_quota_bytes: 53687091200,
            used_storage_bytes: 15728640,
            available_quota_bytes: 53671362560
          }];
        }
      }

      setWorkspaces(currentWorkspaces);
      const selected = activeWorkspace || currentWorkspaces[0];
      setActiveWorkspace(selected);

      // Load files for selected workspace
      const fData = await fetchFiles(selected?.id);
      setFiles(fData);
    } catch (err) {
      console.error('Error loading dashboard state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeWorkspace) {
      fetchFiles(activeWorkspace.id).then(setFiles);
    }
  }, [activeWorkspace]);

  return (
    <div className="app-container">
      {/* Background ambient lighting */}
      <div className="ambient-bg">
        <div className="ambient-blob blob-1" />
        <div className="ambient-blob blob-2" />
      </div>

      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        workspace={activeWorkspace}
      />

      {/* Main Content Pane */}
      <div className="main-content">
        <Header
          health={health}
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onSelectWorkspace={setActiveWorkspace}
          onOpenUpload={() => setActiveTab('chunking')}
          onRefresh={loadData}
          loading={loading}
        />

        <main style={{ padding: '28px 32px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          {activeTab === 'files' && (
            <>
              <StorageOverview workspace={activeWorkspace} files={files} />
              <FileList files={files} onInspectChunks={setInspectingFile} />
            </>
          )}

          {activeTab === 'chunking' && (
            <ChunkingLab
              workspace={activeWorkspace}
              onUploadCompleted={() => {
                loadData();
              }}
            />
          )}

          {activeTab === 'architecture' && (
            <ArchitectureMap />
          )}

          {activeTab === 'api_test' && (
            <PresignedConsole />
          )}
        </main>
      </div>

      {/* Chunks Inspector Modal */}
      {inspectingFile && (
        <ChunksModal
          file={inspectingFile}
          onClose={() => setInspectingFile(null)}
        />
      )}
    </div>
  );
}
