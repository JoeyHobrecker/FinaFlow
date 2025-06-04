# Task Manager

FinaFlow is an in-browser task and project manager. Data is stored locally using IndexedDB through Dexie.js and also synced to Firebase Firestore so your tasks follow you across devices.

Open `index.html` to access the main menu and launch the task manager interface in `finaflow.html`.

## Development

All functionality lives in the two HTML files and the bundled Dexie library. Simply open the files in a modern browser. Data is saved locally and synced to Firestore whenever you hit a Save or Update button.

## Firebase Storage

To enable uploads in Cloud Storage, paste the following rule in your Firebase Storage rules and upgrade the project to the Blaze plan (free up to 5&nbsp;GiB stored and 1&nbsp;GiB per-day download):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /projects/{projectId}/{allPaths=**} {
      allow read, write: if true;   // single-user demo
    }
  }
}
```
