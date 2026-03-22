import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image } from 'lucide-react';

export default function ImageUpload({
  files = [],
  onChange,
  maxFiles = 1,
  maxSizeMB = 5,
  label,
  error,
}) {
  const maxBytes = maxSizeMB * 1024 * 1024;

  const onDrop = useCallback(
    (accepted) => {
      const valid = accepted.slice(0, maxFiles - files.length);
      onChange([...files, ...valid]);
    },
    [files, maxFiles, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxSize: maxBytes,
    maxFiles: maxFiles - files.length,
    disabled: files.length >= maxFiles,
  });

  const remove = (index) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium text-[#1C1C1C]">{label}</label>}

      {files.length < maxFiles && (
        <div
          {...getRootProps()}
          className={[
            'border-2 border-dashed rounded-[8px] p-6 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-[#E23744] bg-[#fff0f1]'
              : 'border-[#E0E0E0] hover:border-[#E23744] hover:bg-gray-50',
          ].join(' ')}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2 text-[#7E808C]">
            <Upload size={24} />
            <p className="text-sm">
              {isDragActive ? 'Drop here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs">Max {maxSizeMB}MB per file</p>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {files.map((file, i) => {
            const url = typeof file === 'string' ? file : URL.createObjectURL(file);
            return (
              <div key={i} className="relative w-20 h-20 rounded-[6px] overflow-hidden border border-[#E0E0E0]">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
