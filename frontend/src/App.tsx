import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { FlagshipDemo } from './pages/FlagshipDemo';
import { PersonInvestigation } from './pages/PersonInvestigation';
import { CaseInvestigation } from './pages/CaseInvestigation';
import { FindingsPage } from './pages/FindingsPage';
import { CrossCaseView } from './pages/CrossCaseView';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedId, setSelectedId] = useState<string>('PERSON_1476');

  const handleNavigate = (
    type: 'dashboard' | 'flagship' | 'person' | 'case' | 'network' | 'findings' | 'cross-case' | string,
    id?: string
  ) => {
    if (type === 'person') {
      setCurrentTab('person');
      if (id) setSelectedId(id);
    } else if (type === 'case') {
      setCurrentTab('case');
      if (id) setSelectedId(id);
    } else if (type === 'network') {
      setCurrentTab('cross-case');
    } else {
      setCurrentTab(type);
      if (id) setSelectedId(id);
    }
  };

  return (
    <div className="app-container">
      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
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
            personId={selectedId || 'PERSON_1476'}
            onNavigate={(type, id) => handleNavigate(type, id)}
          />
        )}

        {(currentTab === 'case' || currentTab === 'cases') && (
          <CaseInvestigation
            caseId={selectedId || 'CASE_0001'}
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
