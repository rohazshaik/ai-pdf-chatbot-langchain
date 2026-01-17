/**
 * FileUpload Component
 * 
 * Handles PDF file upload with drag-and-drop support.
 * Shows loading state while the backend processes the PDF.
 */

import React from 'react';

export default function FileUpload({ onUploadSuccess, isUploading, setIsUploading }) {
    const [dragActive, setDragActive] = React.useState(false);
    const [error, setError] = React.useState('');
    const fileInputRef = React.useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (file) => {
        // Validate file type
        if (!file.name.endsWith('.pdf')) {
            setError('Please upload a PDF file');
            return;
        }

        setError('');
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Upload failed');
            }

            const data = await response.json();
            onUploadSuccess(data.filename);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto">
            <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleChange}
                    className="hidden"
                    disabled={isUploading}
                />

                <div className="space-y-4">
                    <div className="text-6xl">📄</div>

                    {isUploading ? (
                        <div>
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Processing PDF...</p>
                            <p className="text-sm text-gray-500">This may take 10-30 seconds</p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <p className="text-lg font-medium text-gray-700">
                                    Drop your PDF here or click to browse
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Upload a PDF document to start asking questions
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}
        </div>
    );
}
