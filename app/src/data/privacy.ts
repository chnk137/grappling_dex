// The privacy policy, shown in the app and mirrored in docs/privacy.html for the store listings.
export const PRIVACY_UPDATED = 'November 20, 2026';
export const PRIVACY_CONTACT = 'https://github.com/chnk137/grappling_dex/issues';

export const PRIVACY: { heading: string; body: string }[] = [
  { heading: 'The short version', body: 'Grappling Dex does not collect, send or sell any information about you. There is no account, no analytics, no advertising and no tracking.' },
  { heading: 'What the app stores', body: 'The sessions you log, the moves in them and any starting stages you set are saved in a database on your phone. They never leave the phone unless you make a backup.' },
  { heading: 'Backups', body: 'When you tap Back up, the app creates a file and opens your phone\'s share sheet. The file goes only where you choose to send it, such as Files, a cloud drive or an email, and that service\'s own privacy terms apply. Restoring reads a file you pick and replaces the progress on the phone.' },
  { heading: 'Deleting your data', body: 'Remove a session from the Progress tab, or delete the app to erase everything it stored. Backup files you saved elsewhere stay where you put them until you delete them.' },
  { heading: 'Children', body: 'The app collects no personal information from anyone, including children.' },
  { heading: 'Changes', body: 'If a later version adds accounts or syncing, this policy will be updated before that version ships, and the change will be described in the app.' },
];
