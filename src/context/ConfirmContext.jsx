// src/context/ConfirmContext.jsx
import React, { createContext, useContext, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

const ConfirmContext = createContext()

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Yes',
    cancelText: 'Cancel',
    type: 'danger',
    onConfirm: () => {},
    onCancel: () => {}
  })

  const confirm = ({ title, message, confirmText = 'Yes', cancelText = 'Cancel', type = 'danger' }) => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      })
    })
  }

  const close = () => {
    setDialog(prev => ({ ...prev, isOpen: false }))
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        isOpen={dialog.isOpen}
        onClose={() => { dialog.onCancel(); close() }}
        onConfirm={() => { dialog.onConfirm(); close() }}
        title={dialog.title}
        message={dialog.message}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        type={dialog.type}
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}