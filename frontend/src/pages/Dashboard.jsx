import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  Button,
} from '@carbon/react';
import { Logout } from '@carbon/icons-react';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/auth';

export default function Dashboard() {
  const { dbUser } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div>
      {/* Top navigation bar */}
      <Header aria-label="CanonVault">
        <HeaderName prefix="">CanonVault</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label="Sign out"
            tooltipAlignment="end"
            onClick={handleLogout}
          >
            <Logout size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      {/* Main content */}
      <div style={styles.content}>
        <h2 style={styles.heading}>
          Welcome back{dbUser?.display_name ? `, ${dbUser.display_name.split(' ')[0]}` : ''}!
        </h2>
        <p style={styles.sub}>
          Your stories will appear here. Start by creating your first project.
        </p>
        <Button onClick={() => alert('Story creation coming in Sub-Task 4!')}>
          + New Story
        </Button>
      </div>
    </div>
  );
}

const styles = {
  content: {
    padding: '6rem 2rem 2rem',
    maxWidth: '960px',
    margin: '0 auto',
  },
  heading: {
    fontSize: '1.75rem',
    fontWeight: '600',
    color: '#161616',
    marginBottom: '0.5rem',
  },
  sub: {
    color: '#525252',
    marginBottom: '2rem',
  },
};
