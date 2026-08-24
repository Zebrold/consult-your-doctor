'use client'

import { useState } from 'react'
import { X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { uploadHospitalImage } from '@/app/actions/admin'

export function UploadHospitalImageModal({
  hospitalId,
  hospitalName,
  isOpen,
  onClose
}: {
  hospitalId: string
  hospitalName: string
  isOpen: boolean
  onClose: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setIsUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('image', file)

    const res = await uploadHospitalImage(hospitalId, formData)
    
    setIsUploading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Upload Image</h2>
            <p className="text-xs text-gray-500 font-medium">{hospitalName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hospital Image</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG or WEBP (Max 5MB)</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/webp"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFile(e.target.files[0])
                      }
                    }}
                  />
                </label>
              </div>
              {file && (
                <div className="mt-3 text-sm text-gray-600 flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <span className="truncate max-w-[250px]">{file.name}</span>
                  <button type="button" onClick={() => setFile(null)} className="text-red-500 hover:text-red-700 font-medium text-xs">Remove</button>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                disabled={isUploading || !file}
                type="submit"
                className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Upload Image'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
