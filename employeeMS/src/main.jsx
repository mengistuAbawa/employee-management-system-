import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import axios from 'axios'

const apiUrl = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
axios.interceptors.request.use((config) => {
  config.url = config.url?.replace('http://localhost:3000', apiUrl)
  return config
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
