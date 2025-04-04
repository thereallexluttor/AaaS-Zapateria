import React, { useState } from 'react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { email, password });
    // Implement authentication logic here
  };

  return (
    <div className="container" style={{ 
      display: 'flex', 
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 64px)'
    }}>
      <div style={{ 
        maxWidth: '400px', 
        width: '100%', 
        padding: '2rem',
        backgroundColor: '#1a1a1a',
        borderRadius: '0.5rem',
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Sign in to your account</h2>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: '2rem' }}>
          Or <a href="#" style={{ color: '#646cff' }}>start your 14-day free trial</a>
        </p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '0.25rem',
                backgroundColor: '#333',
                border: '1px solid #444',
                color: 'white'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '0.25rem',
                backgroundColor: '#333',
                border: '1px solid #444',
                color: 'white'
              }}
            />
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                style={{ marginRight: '0.5rem' }}
              />
              <label htmlFor="remember-me">
                Remember me
              </label>
            </div>
            
            <a href="#" style={{ color: '#646cff', fontSize: '0.875rem' }}>
              Forgot password?
            </a>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login; 