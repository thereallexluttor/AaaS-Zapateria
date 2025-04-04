import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Dashboard</h1>
        <div>
          <button className="btn btn-secondary" style={{ marginRight: '0.5rem' }}>Export</button>
          <button className="btn btn-primary">Create New</button>
        </div>
      </div>

      {/* Stats */}
      <div className="features">
        <div className="feature-card">
          <h3>Total Subscribers</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>71,897</p>
        </div>

        <div className="feature-card">
          <h3>Avg. Revenue</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>$35.4k</p>
        </div>

        <div className="feature-card">
          <h3>Growth Rate</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>+ 24.5%</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ marginTop: '2rem' }}>
        <h2>Recent Activity</h2>
        <p style={{ color: '#888', marginBottom: '1rem' }}>Latest customer activities and updates.</p>

        <div style={{ backgroundColor: '#1a1a1a', borderRadius: '0.5rem', overflow: 'hidden' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[1, 2, 3, 4, 5].map((item) => (
              <li key={item} style={{ borderBottom: '1px solid #333', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#646cff' }}>New customer signup</span>
                  <span style={{ 
                    backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                    color: 'rgb(16, 185, 129)', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '9999px', 
                    fontSize: '0.75rem' 
                  }}>
                    Active
                  </span>
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', color: '#888' }}>
                  <div>Customer {item}</div>
                  <div>{item} minute{item !== 1 ? 's' : ''} ago</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 