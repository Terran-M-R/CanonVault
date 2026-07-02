import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Pages (will be built in subsequent sub-tasks)
// import Login from './pages/Login';
// import Dashboard from './pages/Dashboard';
// import Editor from './pages/Editor';
// import Browse from './pages/Browse';
// import BookProfile from './pages/BookProfile';

function App() {
  return (
    <div className="app">
      <Routes>
        {/* Placeholder route — pages will be added in Sub-Task 3 onwards */}
        <Route
          path="/"
          element={
            <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
              <h1>CanonVault</h1>
              <p>Project scaffold is ready. Pages will be wired up in the next sub-tasks.</p>
            </div>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
