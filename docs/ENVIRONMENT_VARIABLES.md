# Variables de Entorno Requeridas

## Para Vercel (Producción)

Necesitas configurar las siguientes variables de entorno en tu proyecto de Vercel:

### Firebase Configuration (Cliente)
```
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

### Firebase Admin SDK (Servidor - Para APIs)
```
FIREBASE_PROJECT_ID=tu_project_id
FIREBASE_CLIENT_EMAIL=tu_service_account_email@tu_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ntu_private_key_aqui\n-----END PRIVATE KEY-----\n"
```

## Cómo obtener las credenciales de Firebase Admin

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a Configuración del proyecto > Cuentas de servicio
4. Haz clic en "Generar nueva clave privada"
5. Descarga el archivo JSON
6. Extrae los valores necesarios del archivo JSON:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

## Configurar en Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Ve a Settings > Environment Variables
3. Agrega cada variable con su valor correspondiente
4. Asegúrate de que estén marcadas para "Production", "Preview" y "Development"

## Nota Importante

- Las variables que empiezan con `NEXT_PUBLIC_` son accesibles en el cliente
- Las variables sin `NEXT_PUBLIC_` solo son accesibles en el servidor
- El `FIREBASE_PRIVATE_KEY` debe incluir las comillas y los caracteres `\n` para los saltos de línea 