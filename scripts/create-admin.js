// Script para crear el admin en Firestore
require('dotenv').config();

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, query, where, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error('❌ Error: NEXT_PUBLIC_FIREBASE_API_KEY no encontrada');
  process.exit(1);
}
if (!firebaseConfig.storageBucket) {
  console.error('❌ Error: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET no encontrada');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findAdminByEmail(email) {
  const q = query(collection(db, 'admins'), where('email', '==', email.toLowerCase()));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docData = snapshot.docs[0].data();
    return { ...docData, id: snapshot.docs[0].id, role: 'admin' };
  }
  return null;
}

async function createAdminUser() {
  const email = 'perozzi0112@gmail.com';
  const existingAdmin = await findAdminByEmail(email);
  if (existingAdmin) {
    console.log('✅ Admin ya existe en Firestore');
    return existingAdmin;
  }
  const adminData = {
    email,
    name: 'Administrador Suma',
    password: '..Suma..01', // Se encriptará en el primer login
    role: 'admin',
    profileImage: 'https://placehold.co/400x400.png',
    createdAt: new Date().toISOString(),
    lastLogin: null,
    isActive: true,
    permissions: ['all'],
  };
  const adminRef = await addDoc(collection(db, 'admins'), adminData);
  console.log('✅ Admin creado exitosamente con ID:', adminRef.id);
  return { ...adminData, id: adminRef.id };
}

createAdminUser()
  .then(() => {
    console.log('🎉 Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }); 