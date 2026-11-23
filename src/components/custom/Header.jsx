import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Menu, X, LogOut } from 'lucide-react';

function Header() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => setUser(JSON.parse(localStorage.getItem('user') || 'null'));
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const logout = () => { localStorage.removeItem('user'); setUser(null); navigate('/'); };

  return <header className="app-header">
    <Link className="brand" to="/"><span className="brand-mark"><Compass size={20}/></span><span>Trip<span>Sphere</span></span></Link>
    <button className="mobile-menu" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
    <nav className={open ? 'nav open' : 'nav'}>
      <Link to="/" onClick={() => setOpen(false)}>Home</Link>
      <Link to="/my-trips" onClick={() => setOpen(false)}>My Trips</Link>
      {user ? <button className="nav-user" onClick={logout}><span>{user.name?.[0] || 'U'}</span> Sign out <LogOut size={14}/></button> :
        <button className="nav-cta" onClick={() => navigate('/create-trip')}>Start planning</button>}
    </nav>
  </header>;
}
export default Header;
