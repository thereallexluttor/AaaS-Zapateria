import { useState } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import Login from './components/Login'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const handleLoginClick = () => {
    setShowLogin(true)
  }

  const handleDashboardDemo = () => {
    setIsLoggedIn(true)
    setShowLogin(false)
  }

  return (
    <div>
      <Navbar />
      
      {isLoggedIn ? (
        <Dashboard />
      ) : showLogin ? (
        <Login />
      ) : (
        <div className="container">
          <div className="hero">
            <h1 className="hero-title">Zapateria SaaS</h1>
            <p className="hero-subtitle">A better way to manage your business</p>
            <p style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
              Our platform provides all the tools you need to run your business efficiently.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={handleLoginClick} className="btn btn-primary">
                Log in
              </button>
              <button onClick={handleDashboardDemo} className="btn btn-secondary">
                View Demo
              </button>
            </div>
          </div>
          
          <div className="features">
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="feature-title">Analytics</h3>
              <p>
                Get detailed insights about your business performance with our powerful analytics tools.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="feature-title">Payments</h3>
              <p>
                Accept payments from anywhere in the world with our secure payment processing system.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="feature-title">Automation</h3>
              <p>
                Save time and reduce errors with our powerful automation tools for your business processes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
