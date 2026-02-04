import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MyRoute from './pages/MyRoute';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/my-route" 
          element={isAuthenticated ? <MyRoute /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? "/my-route" : "/login"} />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
