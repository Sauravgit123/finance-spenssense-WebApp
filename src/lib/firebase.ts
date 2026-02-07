import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "studio-163857673-d7a9f",
  appId: "1:819351559125:web:c2a963e94d715d551fbb5c",
  apiKey: "AIzaSyB2fQUTz-UiV8AXxxlUcqgurtKO9504qBU",
  authDomain: "studio-163857673-d7a9f.firebaseapp.com",
  storageBucket: "studio-163857673-d7a9f.appspot.com",
  messagingSenderId: "819351559125",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
