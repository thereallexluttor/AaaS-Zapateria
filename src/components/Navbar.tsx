import React, { useState } from 'react';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-brand">Zapateria SaaS</div>
        
        <div className="navbar-links">
          <a href="#">Dashboard</a>
          <a href="#">Features</a>
          <a href="#">Pricing</a>
          <a href="#">Support</a>
        </div>
        
        <div>
          <button className="btn btn-primary">Sign in</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 