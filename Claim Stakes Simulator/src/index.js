import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { AppProvider } from './AppProvider';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Wrap everything in a try-catch for error handling
try {
  root.render(
    <React.StrictMode>
      <AppProvider>
        <App />
      </AppProvider>
    </React.StrictMode>
  );
} catch (error) {
  root.render(
    <div>
      <h1>Failed to start application</h1>
      <pre>{error.message}</pre>
      <button onClick={() => window.location.reload()}>
        Reload Application
      </button>
    </div>
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
