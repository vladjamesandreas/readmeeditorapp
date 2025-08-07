import { FC, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';

interface Props {
  onUpload: (url: string) => void;
}

const ImageUploader: FC<Props> = ({ onUpload }) => {
  const supabase = useSupabaseClient();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data, error } = await supabase.storage
        .from('images')
        .upload(`public/${Date.now()}-${file.name}`, file, {
          contentType: file.type,
        });

      if (error) {
        throw error;
      }

      const publicUrl = supabase.storage.from('images').getPublicUrl(data.path).data.publicUrl;
      onUpload(publicUrl);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <label
        htmlFor="image-upload"
        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded cursor-pointer"
      >
        {isUploading ? 'Uploading...' : 'Upload Image'}
      </label>
      <input
        id="image-upload"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />
    </div>
  );
};

export default ImageUploader;
