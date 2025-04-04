import { useState, useEffect, useRef } from 'react';

interface SidebarItem {
  id: string;
  icon: JSX.Element;
  label: string;
}

// Definir CSS como objeto para animaciones y estilos
const styles = {
  '@keyframes slideInLeft': {
    from: { transform: 'translateX(-100%)' },
    to: { transform: 'translateX(0)' }
  },
  sidebarHover: {
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
  },
  itemHover: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)'
  },
  activeItemHover: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)'
  }
};

function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const [activeItem, setActiveItem] = useState('home');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  
  // Set a timer to handle hover delay
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Define el estilo de animación para el indicador
  useEffect(() => {
    // Crear un elemento de estilo para las animaciones
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes slideInLeft {
        from { transform: translateX(-100%); }
        to { transform: translateX(0); }
      }
    `;
    document.head.appendChild(styleElement);

    // Limpieza al desmontar
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const handleMouseEnter = () => {
    // Clear any existing timer
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    
    // Expand immediately on hover
    if (!isMobile && !expanded) {
      setExpanded(true);
    }
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    
    // Add a small delay before collapsing to avoid flickering
    if (!isMobile) {
      hoverTimerRef.current = setTimeout(() => {
        setExpanded(false);
      }, 300);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Auto-collapse on mobile
      if (mobile && expanded) {
        setExpanded(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      // Clear any pending timers
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, [expanded]);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const handleItemClick = (id: string) => {
    setActiveItem(id);
    // On mobile, clicking an item collapses the sidebar
    if (isMobile && expanded) {
      setExpanded(false);
    }
  };

  const sidebarItems: SidebarItem[] = [
    {
      id: 'home',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      label: 'Resumen'
    },
    {
      id: 'inventory',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
          <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"></path>
        </svg>
      ),
      label: 'Inventario'
    },
    {
      id: 'production',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"></path>
        </svg>
      ),
      label: 'Producción'
    },
    {
      id: 'employees',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
          <path d="M16 3.13a4 4 0 010 7.75"></path>
        </svg>
      ),
      label: 'Trabajadores'
    },
    {
      id: 'clients',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
      label: 'Clientes'
    },
    {
      id: 'equipment',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"></path>
        </svg>
      ),
      label: 'A equipar'
    },
    {
      id: 'settings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
        </svg>
      ),
      label: 'Ajustes'
    }
  ];

  return (
    <div 
      ref={sidebarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`sidebar ${expanded ? 'expanded' : 'collapsed'} ${isHovering ? 'hovering' : ''}`}
      style={{
        width: expanded ? '220px' : '60px',
        height: '100vh',
        backgroundColor: '#fff',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        boxShadow: expanded ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
        borderRight: '1px solid rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        zIndex: 1000,
        ...(isHovering ? styles.sidebarHover : {})
      }}
    >
      {/* Header */}
      <div style={{ 
        padding: '20px 0', 
        display: 'flex', 
        justifyContent: 'center',
        marginBottom: '40px',
        transition: 'transform 0.3s ease'
      }}>
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{
            transition: 'transform 0.3s ease',
            transform: expanded ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 9H9.01" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M15 9H15.01" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Nav Items */}
      <nav style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '0',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none' // IE/Edge
      }}>
        <ul style={{ 
          listStyle: 'none', 
          padding: 0, 
          margin: 0,
          overflowY: 'auto',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none' // IE/Edge
        }}>
          {/* Estilo para ocultar scrollbar en todos los navegadores */}
          <style>
            {`
              nav::-webkit-scrollbar, 
              ul::-webkit-scrollbar {
                display: none;
              }
              
              nav, ul {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}
          </style>
          
          {sidebarItems.map((item) => (
            <li 
              key={item.id}
              className={activeItem === item.id ? 'active' : ''}
              onClick={() => handleItemClick(item.id)}
              onMouseOver={(e) => {
                if (activeItem === item.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                } else {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                }
              }}
              onMouseOut={(e) => {
                if (activeItem === item.id) {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
                } else {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              style={{ 
                margin: '8px 0',
                padding: expanded ? '10px 16px' : '10px 0',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                borderLeft: activeItem === item.id ? '3px solid #000' : '3px solid transparent',
                backgroundColor: activeItem === item.id ? 'rgba(0, 0, 0, 0.03)' : 'transparent',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: '0 4px 4px 0',
                transform: activeItem === item.id ? 'translateX(2px)' : 'translateX(0)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {activeItem === item.id && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: '3px',
                    backgroundColor: '#000',
                    animation: 'slideInLeft 0.3s ease-out forwards',
                  }}
                />
              )}
              <div style={{ 
                width: '22px', 
                height: '22px', 
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: expanded ? '0' : '18px',
                marginRight: expanded ? '12px' : '0',
                color: activeItem === item.id ? '#000' : '#9E9E9E',
                transition: 'all 0.25s ease',
                transform: activeItem === item.id ? 'scale(1.1)' : 'scale(1)',
              }}>
                {item.icon}
              </div>
              <span style={{ 
                whiteSpace: 'nowrap',
                opacity: expanded ? 1 : 0,
                transform: expanded ? 'translateX(0)' : 'translateX(-10px)',
                transition: 'opacity 0.25s ease, transform 0.25s ease',
                fontSize: '14px',
                fontWeight: activeItem === item.id ? '500' : '400',
                color: activeItem === item.id ? '#000' : '#9E9E9E',
              }}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </nav>

      {/* Toggle button */}
      <div 
        onClick={handleToggle}
        style={{
          padding: '20px 0',
          display: 'flex',
          justifyContent: 'center',
          cursor: 'pointer',
          marginTop: '40px',
        }}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#888" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{
            transition: 'transform 0.3s ease',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0)'
          }}
        >
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </div>
    </div>
  );
}

export default Sidebar; 