// Backup and restore on phones: the backup is a JSON file the user saves with
// the share sheet (Files, Drive, email) and picks again to restore.
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { localDate, parseBackup, toBackup, type Progress } from './progress';

export async function shareBackup(p: Progress): Promise<void> {
  const file = new File(Paths.cache, `grappling-dex-backup-${localDate()}.json`);
  file.create({ overwrite: true });
  await file.write(toBackup(p));
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing isn't available on this device.");
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your Grappling Dex backup' });
}

/** Lets the user pick a backup file. Resolves null if they cancel. */
export async function pickBackup(): Promise<Progress | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (res.canceled) return null;
  return parseBackup(await new File(res.assets[0].uri).text());
}
