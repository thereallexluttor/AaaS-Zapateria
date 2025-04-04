import React from 'react';
import '../titlebar.css';

const titleBarStyle: React.CSSProperties = {
  height: '32px',
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(5px)',
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  padding: '0 10px',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 9999,
  borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
};

const buttonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  fontSize: '16px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  color: '#555'
};

const TitleBar: React.FC = () => {
  const handleMinimize = () => {
    window.ipcRenderer.send('window-minimize');
  };

  const handleMaximize = () => {
    window.ipcRenderer.send('window-maximize');
  };

  const handleClose = () => {
    window.ipcRenderer.send('window-close');
  };

  return (
    <div 
      style={titleBarStyle}
      className="draggable"
    >
      <div className="non-draggable" style={{ display: 'flex' }}>
        <button
          onClick={handleMinimize}
          style={buttonStyle}
        >
          <svg width="10" height="1" viewBox="0 0 10 1">
            <rect width="10" height="1" fill="#555"></rect>
          </svg>
        </button>
        
        <button
          onClick={handleMaximize}
          style={buttonStyle}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect width="10" height="10" fill="transparent" stroke="#555" strokeWidth="1"></rect>
          </svg>
        </button>
        
        <button
          onClick={handleClose}
          style={buttonStyle}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="#555" strokeWidth="1"></line>
            <line x1="10" y1="0" x2="0" y2="10" stroke="#555" strokeWidth="1"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar; 