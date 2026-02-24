// ABOUTME: React application entry point. Mounts the root component.
// ABOUTME: Imports global styles including Tailwind CSS.

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import './styles/preview.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
