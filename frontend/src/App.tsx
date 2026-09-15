import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { FlagshipDemo } from './pages/FlagshipDemo';
import { PersonInvestigation } from './pages/PersonInvestigation';
import { CaseInvestigation } from './pages/CaseInvestigation';
import { FindingsPage } from './pages/FindingsPage';
import { CrossCaseView } from './pages/CrossCaseView';

import { saveRecentInvestigation } from './utils/storage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const handleNavigate = (
    type: 'dashboard' | 'flagship' | 'person' | 'case' | 'network' | 'findings' | 'cross-case' | string,
    id?: string
  ) => {
    if (type === 'person' || type === 'persons') {
      setCurrentTab('person');
      if (id) {
        setSelectedPersonId(id);
        saveRecentInvestigation(id, 'person');
      } else {
        setSelectedPersonId(null);
      }
    } else if (type === 'case' || type === 'cases') {
      setCurrentTab('case');
      if (id) {
        setSelectedCaseId(id);
        saveRecentInvestigation(id, 'case');
      } else {
        setSelectedCaseId(null);
      }
    } else if (type === 'flagship') {
      setCurrentTab('flagship');
      saveRecentInvestigation('CASE_0001', 'case', 'CASE_0001');
    } else if (type === 'network') {
      setCurrentTab('cross-case');
      if (id) saveRecentInvestigation(id, 'network');
    } else {
      setCurrentTab(type);
      if (id) {
        if (id.startsWith('PERSON_')) {
          setSelectedPersonId(id);
          saveRecentInvestigation(id, 'person');
        } else if (id.startsWith('CASE_')) {
          setSelectedCaseId(id);
          saveRecentInvestigation(id, 'case');
        } else if (id.startsWith('NET_')) {
          saveRecentInvestigation(id, 'network');
        }
      }
    }
  };

  return (
    <div className="app-container">
      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        selectedPersonId={selectedPersonId}
        selectedCaseId={selectedCaseId}
        onSelectTab={(tab, id) => handleNavigate(tab, id)}
      />

      {/* Main Workspace */}
      <div className="main-content">
        <Navbar
          onNavigate={(type, id) => handleNavigate(type, id)}
        />

        {currentTab === 'dashboard' && (
          <Dashboard onNavigate={(type, id) => handleNavigate(type, id)} />
        )}

        {currentTab === 'flagship' && (
          <FlagshipDemo onNavigate={(type, id) => handleNavigate(type, id)} />
        )}

        {(currentTab === 'person' || currentTab === 'persons') && (
          <PersonInvestigation
            personId={selectedPersonId}
            onNavigate={(type, id) => handleNavigate(type, id)}
          />
        )}

        {(currentTab === 'case' || currentTab === 'cases') && (
          <CaseInvestigation
            caseId={selectedCaseId}
            onNavigate={(type, id) => handleNavigate(type, id)}
          />
        )}

        {currentTab === 'findings' && (
          <FindingsPage onNavigate={(type, id) => handleNavigate(type, id)} />
        )}

        {currentTab === 'cross-case' && (
          <CrossCaseView onNavigate={(type, id) => handleNavigate(type, id)} />
        )}
      </div>
    </div>
  );
};

export default App;

