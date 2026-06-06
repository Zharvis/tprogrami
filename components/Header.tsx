'use client'

import { logout } from '@/app/login/actions'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface HeaderProps {
  user: {
    email: string
    role: string | null
    status: string
  } | null
}

export default function Header({ user }: HeaderProps) {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  if (!user) return null

  const isUnverified = user.status === 'UNVERIFIED'
  const isAdmin = user.role === 'ADMIN'

  const userInitial = user.email.charAt(0).toUpperCase()

  const navLinks = [
    { name: 'Schedule', href: '/schedule', show: !isUnverified },
    { name: 'Admin Dashboard', href: '/admin', show: isAdmin },
  ]

  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Desktop Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">
              ONBOARDING
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.filter(l => l.show).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* User Profile & Logout (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end mr-2">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">
                {user.email}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold">
                {user.role || 'User'}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {userInitial}
            </div>

            <button
              onClick={() => logout()}
              className="ml-2 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer"
            >
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {userInitial}
            </div>
            
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu (Overlay) */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-2 animate-in slide-in-from-top duration-200">
          <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-2">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">{user.email}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{user.role || 'User'}</p>
          </div>
          
          {navLinks.filter(l => l.show).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-base font-medium ${
                pathname === link.href
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {link.name}
            </Link>
          ))}
          
          <button
            onClick={() => logout()}
            className="mt-2 w-full text-left px-3 py-2 text-red-600 font-semibold border-t border-zinc-100 dark:border-zinc-800 pt-4"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  )
}
