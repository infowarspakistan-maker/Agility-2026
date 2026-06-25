import { getGoogleAccessToken, authorizeGoogleSheets } from './googleSheetsService';

export const getOrCreateFolder = async (token: string, folderName: string, parentId?: string): Promise<string> => {
  let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!searchRes.ok) throw new Error(`Failed to search folder ${folderName}`);
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create it
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!createRes.ok) throw new Error(`Failed to create folder ${folderName}`);
  const createData = await createRes.json();
  return createData.id;
};

export const uploadFileToDrive = async (token: string, folderId: string, file: File): Promise<string> => {
  const metadata = {
    name: file.name,
    parents: [folderId]
  };

  const res1 = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata)
  });

  if (!res1.ok) throw new Error('Failed to init resumable upload');
  
  const location = res1.headers.get('Location');
  if (!location) throw new Error('No location header returned');

  const res2 = await fetch(location, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file
  });

  if (!res2.ok) throw new Error('Failed to upload file content');
  
  const data = await res2.json();
  return data.id; // Could return webViewLink if we fetched it, but ID is enough to build link or we can query it
};

export const uploadBookingDocuments = async (
  category: string,
  date: string,
  clientName: string,
  files: File[],
  onProgress?: (progress: number, statusText: string) => void
): Promise<string[]> => {
  let token = getGoogleAccessToken();
  if (!token) {
    if (onProgress) onProgress(10, 'Requesting Google Drive Access...');
    token = await authorizeGoogleSheets();
  }

  if (onProgress) onProgress(20, 'Preparing Folders...');

  // 1. Root folder
  const rootId = await getOrCreateFolder(token, 'agilitytravels');
  
  // 2. Category folder
  const categoryId = await getOrCreateFolder(token, category, rootId);

  // 3. Client Date Folder
  const clientFolderName = `${date} - ${clientName}`;
  const clientId = await getOrCreateFolder(token, clientFolderName, categoryId);

  // 4. Upload files
  const fileIds = [];
  let completedFiles = 0;
  
  for (const file of files) {
    if (onProgress) onProgress(20 + Math.floor((completedFiles / files.length) * 80), `Uploading ${file.name}...`);
    const id = await uploadFileToDrive(token, clientId, file);
    fileIds.push(id);
    completedFiles++;
  }
  
  if (onProgress) onProgress(100, 'Upload Complete');

  return fileIds;
};
