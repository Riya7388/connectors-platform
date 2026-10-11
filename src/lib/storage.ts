import { supabase } from '../supabase';

export const uploadFile = async (
  file: File,
  bucket: string,
  path: string
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `${path}/${fileName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const getSignedUrl = async (
  bucket: string,
  fullUrlOrPath: string,
  expiresInSeconds: number = 3600
): Promise<string> => {
  if (!fullUrlOrPath) return '';
  const bucketPrefix = `/${bucket}/`;
  let path = fullUrlOrPath;
  if (fullUrlOrPath.includes(bucketPrefix)) {
    path = fullUrlOrPath.split(bucketPrefix)[1];
  } else if (fullUrlOrPath.startsWith('http://') || fullUrlOrPath.startsWith('https://')) {
    try {
      const parsed = new URL(fullUrlOrPath);
      const pathname = parsed.pathname;
      if (pathname.includes(bucketPrefix)) {
        path = pathname.split(bucketPrefix)[1];
      }
    } catch {
      // ignore
    }
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    console.warn(`Failed to generate signed URL for ${path} in ${bucket}:`, error);
    return fullUrlOrPath;
  }
  return data.signedUrl;
};
