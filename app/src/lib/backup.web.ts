// Browser-preview version of backup.ts: downloads the file and reads a picked one.
import * as DocumentPicker from 'expo-document-picker';
import { localDate, parseBackup, toBackup, type Progress } from './progress';

export async function shareBackup(p: Progress): Promise<void> {
  const url = URL.createObjectURL(new Blob([toBackup(p)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `grappling-dex-backup-${localDate()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function pickBackup(): Promise<Progress | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
  if (res.canceled) return null;
  const f = res.assets[0].file;
  return parseBackup(f ? await f.text() : await (await fetch(res.assets[0].uri)).text());
}
