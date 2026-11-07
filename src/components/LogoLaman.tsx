import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logoBo from '../assets/logo-bo.png'
import { ConfirmModal } from './ConfirmModal'

type LogoLamanProps = {
  className?: string // size of the image, e.g. "h-10 w-10"
  onNavigate?: () => void // e.g. close the mobile drawer
  amaran?: string // set = unsaved work on this page: confirm before leaving
}

// The BO logo as a link to the Laman Utama
export function LogoLaman({ className = 'h-10 w-10', onNavigate, amaran }: LogoLamanProps) {
  const navigate = useNavigate()
  const [sahkan, setSahkan] = useState(false)

  return (
    <>
      <Link
        to="/"
        title="Laman Utama"
        aria-label="Laman Utama"
        onClick={(e) => {
          if (amaran) {
            e.preventDefault()
            setSahkan(true)
            return
          }
          onNavigate?.()
        }}
        className="inline-flex shrink-0 rounded-xl transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <img src={logoBo} alt="Logo BO" className={`object-contain ${className}`} />
      </Link>

      <ConfirmModal
        open={sahkan}
        title="Tinggalkan halaman ini?"
        message={amaran ?? ''}
        confirmLabel="Tinggalkan"
        danger
        onConfirm={() => {
          setSahkan(false)
          onNavigate?.()
          navigate('/')
        }}
        onCancel={() => setSahkan(false)}
      />
    </>
  )
}