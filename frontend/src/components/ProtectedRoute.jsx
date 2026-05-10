import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isLoggedIn, isAdmin } from '../utils/auth'

export function ProtectedRoute({ children }) {
  const location = useLocation()
  if (!isLoggedIn()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

export function AdminRoute({ children }) {
  const location = useLocation()
  if (!isLoggedIn()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export function PublicRoute({ children }) {
  // Redirect already-logged-in users away from login/register pages
  if (isLoggedIn()) {
    return <Navigate to={isAdmin() ? '/admin' : '/dashboard'} replace />
  }
  return children
}
