// Script para arreglar los campos 'url' y 'thumbnailUrl' en marketingMaterials
// Ejecuta: node fix-marketing-materials.js

const admin = require('firebase-admin');
const path = require('path');

// Cambia la ruta al archivo de credenciales si es necesario
const serviceAccount = require('./medagenda-4hxll-firebase-adminsdk-fbsvc-54e45e489b.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixMarketingMaterials() {
  const snapshot = await db.collection('marketingMaterials').get();
  const updates = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    let needsUpdate = false;
    let newUrl = data.url;
    let newThumb = data.thumbnailUrl;
    // Si url es vacío, #, null o no es string, asigna una URL de ejemplo
    if (!newUrl || typeof newUrl !== 'string' || newUrl.trim() === '' || newUrl === '#') {
      newUrl = 'https://placehold.co/600x400.png?text=Recurso+Marketing';
      needsUpdate = true;
    }
    // Si thumbnailUrl es vacío, #, null o no es string, asigna una miniatura de ejemplo
    if (!newThumb || typeof newThumb !== 'string' || newThumb.trim() === '' || newThumb === '#') {
      newThumb = 'https://placehold.co/300x200.png?text=Miniatura';
      needsUpdate = true;
    }
    if (needsUpdate) {
      updates.push(doc.ref.update({ url: newUrl, thumbnailUrl: newThumb }));
      console.log(`Actualizando material ${doc.id}: url=${newUrl}, thumbnailUrl=${newThumb}`);
    }
  });
  await Promise.all(updates);
  console.log('Actualización completada.');
  process.exit(0);
}

fixMarketingMaterials().catch(err => {
  console.error('Error actualizando materiales de marketing:', err);
  process.exit(1);
}); 