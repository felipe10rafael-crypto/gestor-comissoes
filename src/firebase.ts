import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCpgKs63MunfYaWfSwhk2Pxdm2Hq_-kgEQ",
  authDomain: "gestor-comissoes-9d147.firebaseapp.com",
  projectId: "gestor-comissoes-9d147",
  storageBucket: "gestor-comissoes-9d147.firebasestorage.app",
  messagingSenderId: "50466118384 3",
  appId: "1:50466118343:web:89381e99db6cf0f783d756"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);