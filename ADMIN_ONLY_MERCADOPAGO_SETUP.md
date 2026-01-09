# Guía de Configuración MercadoPago Connect (Marketplace)

Para que cada médico pueda conectar su cuenta de MercadoPago con un solo clic, SUMA necesita actuar como un "Marketplace". Esto requiere que registres tu aplicación en MercadoPago.

## ¿Por qué necesito estas variables si el médico usa SU cuenta?

Imagina que SUMA es una "terminal de punto de venta". Para que MercadoPago permita que esa terminal cobre dinero en nombre del médico, la terminal (SUMA) debe estar registrada y autorizada.

*   **MP_APP_ID y SECRET**: Son la "identidad" de SUMA. Le dicen a MercadoPago: *"Hola, soy la App SUMA y quiero pedir permiso al Dr. Juan para cobrar por él"*.
*   **Token del Médico**: Es lo que obtenemos DESPUÉS de que el médico da permiso.

---

## PASO 1: Crear Aplicación en MercadoPago

1.  Ve a [MercadoPago Developers - Mis Aplicaciones](https://www.mercadopago.com.ar/developers/panel/app).
2.  Inicia sesión con TU cuenta de MercadoPago (la cuenta "dueña" de SUMA).
3.  Haz clic en **"Crear aplicación"**.
4.  Nombre: `SUMA Salud` (o similar).
5.  Tipo de integración: Selecciona **"MercadoPago Connect"** o "Marketplace".
6.  ¿Usarás Checkout Pro?: Sí.

## PASO 2: Obtener Credenciales

Una vez creada la app, en el panel izquierdo busca **"Credenciales de producción"** (o Pruebas para empezar).

Necesitas copiar dos valores:
1.  **App ID**: (Ej: `1234567890123456`) -> Esto va en `MP_APP_ID`.
2.  **Client Secret**: (Ej: `vK1...`) -> Esto va en `MP_CLIENT_SECRET`.

## PASO 3: Configurar Redirect URI (Importante)

En la configuración de tu aplicación en MercadoPago, busca la sección **"URLs de redireccionamiento"** (Redirect URIs).

Debes agregar la URL exacta donde MercadoPago devolverá al médico después de que acepte:

*   **Para Localhost:**
    `http://localhost:3000/api/integrations/mercadopago/callback`
    
*   **Para Producción (cuando subas la app):**
    `https://tu-dominio.com/api/integrations/mercadopago/callback`

> **Nota:** Si no configuras esto, MercadoPago mostrará un error "redirect_uri_mismatch".

## PASO 4: Configurar `.env.local`

Abre tu archivo `.env.local` en tu proyecto y agrega estas líneas al final:

```env
# MERCADOPAGO CONNECT (Credenciales de la App SUMA)
# Obtenidas en: https://www.mercadopago.com.ar/developers/panel/app
MP_APP_ID=tu_app_id_aqui
MP_CLIENT_SECRET=tu_client_secret_aqui

# URL de redirección (debe coincidir con la configurada en MP)
MP_REDIRECT_URI=http://localhost:3000/api/integrations/mercadopago/callback

# Token de acceso de SUMA (opcional, para cobros directos sin médico)
MP_ACCESS_TOKEN=tu_access_token_global_aqui

# Variable pública para frontend (si se usa, aunque en Connect usamos backend)
NEXT_PUBLIC_MP_PUBLIC_KEY=tu_public_key_aqui
```

## Resumen del Flujo

1.  Médico hace clic en "Conectar" en su Dashboard.
2.  SUMA lo envía a MercadoPago usando `MP_APP_ID`.
3.  Médico acepta dar permisos.
4.  MercadoPago lo devuelve a `MP_REDIRECT_URI` con un código.
5.  SUMA usa `MP_CLIENT_SECRET` para canjear ese código por el `Access Token` del médico.
6.  SUMA guarda ese token en la base de datos y lo usa para cobrar sus citas futuras.
