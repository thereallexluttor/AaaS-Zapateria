import { useState, useEffect, useRef } from 'react';

interface SidebarItem {
  id: string;
  iconSrc: string;
  iconAlt: string;
  label: string;
}

// Definir CSS como objeto para animaciones y estilos
const styles = {
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
  const [prevActiveItem, setPrevActiveItem] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({
    position: 'absolute',
    left: '0',
    top: '0',
    width: '5px',
    height: '26px',
    backgroundColor: '#000000',
    borderRadius: '0 4px 4px 0',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    opacity: 0,
    transform: 'translateY(0)',
  });
  
  // Referencias para cada elemento de la lista
  const itemRefs = useRef<{ [key: string]: HTMLLIElement | null }>({});
  
  // Set a timer to handle hover delay
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    // Guardar el ítem activo anterior
    setPrevActiveItem(activeItem);
    setActiveItem(id);
    // On mobile, clicking an item collapses the sidebar
    if (isMobile && expanded) {
      setExpanded(false);
    }
  };

  // Actualizar la posición del indicador cuando cambia el ítem activo
  useEffect(() => {
    const activeRef = itemRefs.current[activeItem];
    if (activeRef) {
      const rect = activeRef.getBoundingClientRect();
      const top = rect.top;
      const parentRect = sidebarRef.current?.getBoundingClientRect();
      const parentTop = parentRect?.top || 0;
      const relativeTop = top - parentTop;
      
      setIndicatorStyle(prev => ({
        ...prev,
        top: `${relativeTop + (rect.height / 2) - (26 / 2)}px`,
        opacity: 1,
        transform: prevActiveItem ? 'translateY(0) scale(1)' : 'translateY(0) scale(1)',
      }));
    }
  }, [activeItem, expanded]);

  // Efecto para animar la entrada inicial del indicador
  useEffect(() => {
    setIndicatorStyle(prev => ({
      ...prev,
      opacity: 0,
      transform: 'translateY(-20px) scale(0.8)',
    }));
    
    setTimeout(() => {
      const activeRef = itemRefs.current[activeItem];
      if (activeRef) {
        const rect = activeRef.getBoundingClientRect();
        const top = rect.top;
        const parentRect = sidebarRef.current?.getBoundingClientRect();
        const parentTop = parentRect?.top || 0;
        const relativeTop = top - parentTop;
        
        setIndicatorStyle(prev => ({
          ...prev,
          top: `${relativeTop + (rect.height / 2) - (26 / 2)}px`,
          opacity: 1,
          transform: 'translateY(0) scale(1)',
        }));
      }
    }, 100);
  }, []);

  // Función para obtener la ruta del icono según el estado activo
  const getIconPath = (iconPath: string, isActive: boolean) => {
    // Para todos los iconos, usamos la versión _black cuando está activo
    return isActive ? iconPath.replace('.svg', '_black.svg') : iconPath;
  };

  const sidebarItems: SidebarItem[] = [
    {
      id: 'home',
      iconSrc: '/icons/home.svg',
      iconAlt: 'Home icon',
      label: 'Dashboard'
    },
    {
      id: 'inventory',
      iconSrc: '/icons/inventario.svg',
      iconAlt: 'Inventory icon',
      label: 'Inventario'
    },
    {
      id: 'production',
      iconSrc: '/icons/produccion.svg',
      iconAlt: 'Production icon',
      label: 'Producción'
    },
    {
      id: 'employees',
      iconSrc: '/icons/trabajadores.svg',
      iconAlt: 'Employees icon',
      label: 'Trabajadores'
    },
    {
      id: 'clients',
      iconSrc: '/icons/clientes.svg',
      iconAlt: 'Clients icon',
      label: 'Clientes'
    },
    {
      id: 'equipment',
      iconSrc: '/icons/AI.svg',
      iconAlt: 'Equipment icon',
      label: 'AI Team'
    },
    {
      id: 'settings',
      iconSrc: '/icons/Settings.svg',
      iconAlt: 'Settings icon',
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
        height: 'calc(100vh - 32px)',
        marginTop: '32px',
        backgroundColor: '#fff',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        boxShadow: expanded ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
        borderRight: '1px solid rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        zIndex: 990,
        fontFamily: '"Poppins", sans-serif',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility',
        ...(isHovering ? styles.sidebarHover : {})
      }}
    >
      {/* Indicador flotante que se mueve entre elementos */}
      <div style={indicatorStyle}></div>

      {/* Header */}
      <div style={{ 
        padding: '20px 0', 
        display: 'flex', 
        justifyContent: 'center',
        marginBottom: '40px',
        transition: 'transform 0.3s ease'
      }}>
        <img 
          src="/icons/cat.png" 
          alt="Cat icon"
          width="44" 
          height="44"
          style={{
            transition: 'transform 0.3s ease',
            transform: expanded ? 'scale(1.1)' : 'scale(1)'
          }}
        />
      </div>

      {/* Nav Items */}
      <nav style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE/Edge
        position: 'relative',
      }}>
        <ul style={{ 
          listStyle: 'none', 
          padding: 0, 
          margin: 0,
          width: '100%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
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

              /* Animaciones para los ítems */
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              
              @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
              }
            `}
          </style>
          
          {sidebarItems.map((item) => (
            <li 
              key={item.id}
              ref={el => itemRefs.current[item.id] = el}
              className={activeItem === item.id ? 'active' : ''}
              onClick={() => handleItemClick(item.id)}
              style={{ 
                width: '100%',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                animation: activeItem === item.id ? 'pulse 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              }}
            >
              <div 
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: expanded ? 'flex-start' : 'left',
                  paddingLeft: expanded ? '16px' : '18px',
                  transition: 'all 0.25s ease',
                }}
              >
                <span style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <img 
                    src={getIconPath(item.iconSrc, activeItem === item.id)}
                    alt={item.iconAlt} 
                    width="20" 
                    height="20"
                    style={{
                      transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transform: activeItem === item.id ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                </span>
                <span style={{ 
                  marginLeft: '12px',
                  whiteSpace: 'nowrap',
                  opacity: expanded ? 1 : 0,
                  transform: expanded ? 'translateX(0)' : 'translateX(-10px)',
                  transition: 'opacity 0.25s ease, transform 0.25s ease, color 0.3s ease, font-weight 0.3s ease',
                  fontSize: '14px',
                  fontWeight: activeItem === item.id ? '600' : '400',
                  color: activeItem === item.id ? '#000000' : '#666666',
                  fontFamily: '"Poppins", sans-serif',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  letterSpacing: '0.011em',
                  textShadow: '0 0 0 rgba(0,0,0,.01)',
                }}>
                  {item.label}
                </span>
              </div>
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