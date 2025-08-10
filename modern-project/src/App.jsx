import React, { useState } from 'react';
import D3Tree from './components/D3Tree';
import './App.css';

function App() {
  const [action, setAction] = useState(null);

  return (
    <div className="App">
      <div className="buttons">
        <button onClick={() => setAction('expand')}>Expand</button>
        <button onClick={() => setAction('collapse')}>Collapse</button>
      </div>
      <D3Tree action={action} onActionComplete={() => setAction(null)} />
    </div>
  );
}

export default App;
