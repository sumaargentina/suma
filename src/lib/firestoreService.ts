
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  Timestamp,
  arrayUnion,
  FieldValue,
} from 'firebase/firestore';
import type { Doctor, Seller, Patient, Appointment, AdminSupportTicket, SellerPayment, DoctorPayment, AppSettings, MarketingMaterial, ChatMessage } from './types';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, StorageReference } from 'firebase/storage';
import { hashPassword } from './password-utils';


// Helper to convert Firestore Timestamps to strings
const convertTimestamps = (data: Record<string, unknown>) => {
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        } else if (typeof data[key] === 'object' && data[key] !== null) {
            convertTimestamps(data[key] as Record<string, unknown>);
        }
    }
    return data;
};


// Generic Fetch Function
export async function getCollectionData<T>(collectionName: string): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        convertTimestamps(data);
        // Ensure ID is always a string and overwrites any 'id' field from data
        return { ...data, id: doc.id } as T;
    });
  } catch (error) {
    console.error(`Error fetching ${collectionName}: `, error);
    return [];
  }
}

// Generic Get Document Function
async function getDocumentData<T>(collectionName: string, id: string): Promise<T | null> {
    // The check for string ID is important.
    if (!id || typeof id !== 'string') {
        console.error(`Invalid ID provided to getDocumentData for collection ${collectionName}:`, id);
        return null;
    }
    try {
        console.log(`🔍 getDocumentData: fetching ${collectionName}/${id}`);
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        console.log(`📋 getDocumentData: document exists for ${collectionName}/${id}:`, docSnap.exists());
        if (docSnap.exists()) {
            const data = docSnap.data();
            convertTimestamps(data);
            // Ensure ID is always a string and overwrite any 'id' field from data
            const result = { ...data, id: docSnap.id } as T;
            console.log(`✅ getDocumentData: returning data for ${collectionName}/${id}:`, result);
            return result;
        }
        console.log(`❌ getDocumentData: document does not exist for ${collectionName}/${id}`);
        return null;
    } catch (error) {
        console.error(`❌ Error fetching document ${id} from ${collectionName}: `, error);
        return null;
    }
}

// --- Data Fetching Functions ---
export const getDoctors = () => getCollectionData<Doctor>('doctors');
export const getDoctor = (id: string) => getDocumentData<Doctor>('doctors', id);
export const getSellers = () => getCollectionData<Seller>('sellers');
export const getSeller = (id: string) => getDocumentData<Seller>('sellers', id);
export const getPatients = () => getCollectionData<Patient>('patients');
export const getPatient = (id: string) => getDocumentData<Patient>('patients', id);
export const getAppointments = () => getCollectionData<Appointment>('appointments');
export const getDoctorAppointments = async (doctorId: string) => {
  const snapshot = await getDocs(
    query(collection(db, "appointments"), where("doctorId", "==", doctorId))
  );
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      discountAmount: typeof data.discountAmount === "number" ? data.discountAmount : 0,
      appliedCoupon: typeof data.appliedCoupon === "string" ? data.appliedCoupon : undefined,
      totalPrice: typeof data.totalPrice === "number" ? data.totalPrice : 0,
      doctorAddress: typeof data.doctorAddress === "string" ? data.doctorAddress : "",
    } as Appointment;
  });
};

export const getPatientAppointments = async (patientId: string) => {
  const snapshot = await getDocs(
    query(collection(db, "appointments"), where("patientId", "==", patientId))
  );
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      discountAmount: typeof data.discountAmount === "number" ? data.discountAmount : 0,
      appliedCoupon: typeof data.appliedCoupon === "string" ? data.appliedCoupon : undefined,
      totalPrice: typeof data.totalPrice === "number" ? data.totalPrice : 0,
      doctorAddress: typeof data.doctorAddress === "string" ? data.doctorAddress : "",
    } as Appointment;
  });
};
export const getDoctorPayments = () => getCollectionData<DoctorPayment>('doctorPayments');
export const getSellerPayments = () => getCollectionData<SellerPayment>('sellerPayments');
export const getMarketingMaterials = () => getCollectionData<MarketingMaterial>('marketingMaterials');
export const getSupportTickets = () => getCollectionData<AdminSupportTicket>('supportTickets');
export const getSettings = () => {
    console.log('🔍 getSettings called');
    return getDocumentData<AppSettings>('settings', 'main');
};

// --- NUEVO: Notificaciones de administrador ---
export const getAdminNotifications = () => getCollectionData<import('./types').AdminNotification>('adminNotifications');

export const findUserByEmail = async (email: string): Promise<(Doctor | Seller | Patient) & { role: 'doctor' | 'seller' | 'patient' } | null> => {
    const lowerEmail = email.toLowerCase();
    
    const collections: { name: 'doctors' | 'sellers' | 'patients'; role: 'doctor' | 'seller' | 'patient' }[] = [
        { name: 'doctors', role: 'doctor' },
        { name: 'sellers', role: 'seller' },
        { name: 'patients', role: 'patient' },
    ];

    for (const { name, role } of collections) {
        const q = query(collection(db, name), where("email", "==", lowerEmail));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const docData = snapshot.docs[0].data();
            return {
                ...docData,
                id: snapshot.docs[0].id,
                role,
            } as (Doctor | Seller | Patient) & { role: 'doctor' | 'seller' | 'patient' };
        }
    }
    
    return null;
};


// --- Data Mutation Functions ---

// Doctor
export const addDoctor = async (doctorData: Omit<Doctor, 'id'>): Promise<string> => {
    const dataWithDefaults = { 
        ...doctorData, 
        readByAdmin: false,
        readBySeller: false,
    };
    const docRef = await addDoc(collection(db, 'doctors'), dataWithDefaults);
    return docRef.id;
};

// Función para optimizar el documento del doctor antes de actualizarlo
const optimizeDoctorData = (data: Partial<Doctor>): Partial<Doctor> => {
    const optimized = { ...data };
    
    // Limitar el tamaño de las imágenes si son base64
    if (optimized.profileImage && optimized.profileImage.startsWith('data:image')) {
        // Si la imagen es muy grande, usar una URL de placeholder
        if (optimized.profileImage.length > 100000) { // ~100KB
            optimized.profileImage = 'https://placehold.co/400x400.png';
        }
    }
    
    if (optimized.bannerImage && optimized.bannerImage.startsWith('data:image')) {
        if (optimized.bannerImage.length > 200000) { // ~200KB
            optimized.bannerImage = 'https://placehold.co/1200x400.png';
        }
    }
    
    // Limitar arrays grandes
    if (optimized.expenses && optimized.expenses.length > 50) {
        optimized.expenses = optimized.expenses.slice(-50); // Mantener solo los últimos 50
    }
    
    if (optimized.coupons && optimized.coupons.length > 20) {
        optimized.coupons = optimized.coupons.slice(-20); // Mantener solo los últimos 20
    }
    
    if (optimized.services && optimized.services.length > 30) {
        optimized.services = optimized.services.slice(-30); // Mantener solo los últimos 30
    }
    
    if (optimized.bankDetails && optimized.bankDetails.length > 10) {
        optimized.bankDetails = optimized.bankDetails.slice(-10); // Mantener solo los últimos 10
    }
    
    return optimized;
};

export const updateDoctor = async (id: string, data: Partial<Doctor>) => {
    try {
        const optimizedData = optimizeDoctorData(data);
        return await updateDoc(doc(db, 'doctors', id), optimizedData);
    } catch (error: unknown) {
        // Si el error es por tamaño del documento, intentar limpiar datos antiguos
        const code = typeof error === 'object' && error && 'code' in error ? (error as { code?: string }).code : '';
        const message = typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : '';
        if (code === 'resource-exhausted' || (typeof message === 'string' && message.includes('size'))) {
            console.warn('Documento del doctor demasiado grande, limpiando datos antiguos...');
            
            // Obtener el documento actual
            const currentDoc = await getDoc(doc(db, 'doctors', id));
            if (currentDoc.exists()) {
                const currentData = currentDoc.data() as Doctor;
                
                // Limpiar datos antiguos
                const cleanedData = {
                    ...currentData,
                    ...optimizeDoctorData(data),
                    expenses: currentData.expenses?.slice(-20) || [], // Solo últimos 20
                    coupons: currentData.coupons?.slice(-10) || [], // Solo últimos 10
                    services: currentData.services?.slice(-15) || [], // Solo últimos 15
                    bankDetails: currentData.bankDetails?.slice(-5) || [], // Solo últimos 5
                };
                
                // Si las imágenes son base64 y muy grandes, usar placeholders
                if (cleanedData.profileImage?.startsWith('data:image') && cleanedData.profileImage.length > 50000) {
                    cleanedData.profileImage = 'https://placehold.co/400x400.png';
                }
                if (cleanedData.bannerImage?.startsWith('data:image') && cleanedData.bannerImage.length > 100000) {
                    cleanedData.bannerImage = 'https://placehold.co/1200x400.png';
                }
                
                return await setDoc(doc(db, 'doctors', id), cleanedData);
            }
        }
        throw error;
    }
};
export const deleteDoctor = async (id: string) => deleteDoc(doc(db, 'doctors', id));
export const updateDoctorStatus = async (id: string, status: 'active' | 'inactive') => updateDoc(doc(db, 'doctors', id), { status });

// Función para limpiar datos antiguos del doctor y reducir el tamaño del documento
export const cleanupDoctorData = async (id: string): Promise<void> => {
    try {
        const doctorDoc = await getDoc(doc(db, 'doctors', id));
        if (!doctorDoc.exists()) {
            throw new Error('Doctor no encontrado');
        }
        
        const doctorData = doctorDoc.data() as Doctor;
        
        // Limpiar datos antiguos manteniendo solo los más recientes
        const cleanedData = {
            ...doctorData,
            expenses: doctorData.expenses?.slice(-20) || [], // Solo últimos 20 gastos
            coupons: doctorData.coupons?.slice(-10) || [], // Solo últimos 10 cupones
            services: doctorData.services?.slice(-15) || [], // Solo últimos 15 servicios
            bankDetails: doctorData.bankDetails?.slice(-5) || [], // Solo últimos 5 detalles bancarios
        };
        
        // Reemplazar imágenes base64 grandes con placeholders
        if (cleanedData.profileImage?.startsWith('data:image') && cleanedData.profileImage.length > 50000) {
            cleanedData.profileImage = 'https://placehold.co/400x400.png';
        }
        if (cleanedData.bannerImage?.startsWith('data:image') && cleanedData.bannerImage.length > 100000) {
            cleanedData.bannerImage = 'https://placehold.co/1200x400.png';
        }
        
        await setDoc(doc(db, 'doctors', id), cleanedData);
        console.log('Datos del doctor limpiados exitosamente');
    } catch (error) {
        console.error('Error limpiando datos del doctor:', error);
        throw error;
    }
};

// Seller
export const addSeller = async (sellerData: Omit<Seller, 'id'>) => addDoc(collection(db, 'sellers'), sellerData);
export const updateSeller = async (id: string, data: Partial<Seller>) => updateDoc(doc(db, 'sellers', id), data);
export const deleteSeller = async (id: string) => deleteDoc(doc(db, 'sellers', id));

// Patient
export const addPatient = async (patientData: Omit<Patient, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'patients'), patientData);
    return docRef.id;
};
export const updatePatient = async (id: string, data: Partial<Patient>) => updateDoc(doc(db, 'patients', id), data);
export const deletePatient = async (id: string) => deleteDoc(doc(db, 'patients', id));

// Appointment
export const addAppointment = async (appointmentData: Omit<Appointment, 'id'>) => {
    console.log('🔍 Creating appointment with data:', {
        doctorId: appointmentData.doctorId,
        doctorName: appointmentData.doctorName,
        date: appointmentData.date,
        time: appointmentData.time,
        patientName: appointmentData.patientName,
        paymentMethod: appointmentData.paymentMethod,
        totalPrice: appointmentData.totalPrice
    });

    // Validar que no exista una cita duplicada para el mismo doctor en la misma fecha y hora
    const existingAppointmentsQuery = query(
        collection(db, "appointments"),
        where("doctorId", "==", appointmentData.doctorId),
        where("date", "==", appointmentData.date),
        where("time", "==", appointmentData.time)
    );
    
    const existingAppointmentsSnapshot = await getDocs(existingAppointmentsQuery);
    
    if (!existingAppointmentsSnapshot.empty) {
        console.log('❌ Duplicate appointment found:', existingAppointmentsSnapshot.docs.map(doc => doc.data()));
        throw new Error(`Ya existe una cita agendada para el Dr. ${appointmentData.doctorName} el ${appointmentData.date} a las ${appointmentData.time}. Por favor, selecciona otro horario.`);
    }

    const dataWithFlags = {
        ...appointmentData,
        readByDoctor: false, // New appointment, doctor needs to be notified
        readByPatient: true,  // Patient created it, so they have "read" it.
    };

    console.log('✅ Adding appointment to database with flags:', {
        readByDoctor: dataWithFlags.readByDoctor,
        readByPatient: dataWithFlags.readByPatient
    });

    const docRef = await addDoc(collection(db, 'appointments'), dataWithFlags);
    console.log('✅ Appointment created successfully with ID:', docRef.id);
    
    return docRef;
};
export const updateAppointment = async (id: string, data: Partial<Appointment>) => {
    const dataWithFlags = { ...data };
    // If attendance is being marked, the patient needs to be notified.
    if ('attendance' in data) {
        dataWithFlags.readByPatient = false;
    }
    return updateDoc(doc(db, 'appointments', id), dataWithFlags);
};
export const addMessageToAppointment = async (appointmentId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const appointmentRef = doc(db, "appointments", appointmentId);
    const newMessage: ChatMessage = {
        ...message,
        id: `msg-${Date.now()}`,
        timestamp: new Date().toISOString()
    };
    
    await updateDoc(appointmentRef, {
        messages: arrayUnion(newMessage)
    });
};

// Marketing Material
export const addMarketingMaterial = async (materialData: Omit<MarketingMaterial, 'id'>) => addDoc(collection(db, 'marketingMaterials'), materialData);
export const updateMarketingMaterial = async (id: string, data: Partial<MarketingMaterial>) => updateDoc(doc(db, 'marketingMaterials', id), data);
export const deleteMarketingMaterial = async (id: string) => deleteDoc(doc(db, 'marketingMaterials', id));

// Support Ticket
export const addSupportTicket = async (ticketData: Omit<AdminSupportTicket, 'id' | 'messages'>) => {
    const initialMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: ticketData.description,
        timestamp: new Date().toISOString(),
    };

    const newTicketData: Omit<AdminSupportTicket, 'id'> & { messages: ChatMessage[]; readByAdmin: boolean; readBySeller?: boolean; readByDoctor?: boolean } = {
        ...ticketData,
        messages: [initialMessage],
        readByAdmin: false,
        readBySeller: false,
        readByDoctor: false
    };
    
    if (ticketData.userRole === 'seller') {
        newTicketData.readBySeller = true;
    } else if (ticketData.userRole === 'doctor') {
        newTicketData.readByDoctor = true;
    }

    return addDoc(collection(db, 'supportTickets'), newTicketData);
}

export const addMessageToSupportTicket = async (ticketId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const ticketRef = doc(db, "supportTickets", ticketId);
    const newMessage: ChatMessage = {
        ...message,
        id: `msg-${Date.now()}`,
        timestamp: new Date().toISOString()
    };
    
    const updateData: { messages: FieldValue; readByAdmin?: boolean; status?: string; readBySeller?: boolean; [key: string]: unknown } = {
        messages: arrayUnion(newMessage)
    };

    if (message.sender === 'user') {
        updateData.readByAdmin = false;
        updateData.status = 'abierto';
    }
     if (message.sender === 'admin') {
        updateData.status = 'abierto';
        const ticketDoc = await getDoc(ticketRef);
        const ticketData = ticketDoc.data() as AdminSupportTicket;
        if (ticketData.userRole === 'seller') {
            updateData.readBySeller = false;
        } else if (ticketData.userRole === 'doctor') {
            updateData.readByDoctor = false;
        }
    }
    
    await updateDoc(ticketRef, updateData);
};

export const updateSupportTicket = async (id: string, data: Partial<AdminSupportTicket>) => updateDoc(doc(db, 'supportTickets', id), data);


// Settings
export const updateSettings = async (data: Partial<AppSettings>) => {
  try {
    const result = await updateDoc(doc(db, 'settings', 'main'), data);
    return result;
  } catch (error: unknown) {
    // Si el documento no existe, crearlo
    if (error && typeof error === 'object' && 'code' in error && error.code === 'not-found' ||
        error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('not found')) {
      const result = await setDoc(doc(db, 'settings', 'main'), data);
      return result;
    }
    console.error('Error al actualizar configuración:', error);
    throw error;
  }
};

// Payments
export const addSellerPayment = async (paymentData: Omit<SellerPayment, 'id'>) => {
    const dataWithDefaults = { ...paymentData, status: 'pending', readBySeller: false };
    return addDoc(collection(db, 'sellerPayments'), dataWithDefaults);
};
export const updateSellerPayment = async (id: string, data: Partial<SellerPayment>) => updateDoc(doc(db, 'sellerPayments', id), data);
export const addDoctorPayment = async (paymentData: Omit<DoctorPayment, 'id'>) => {
    const dataWithDefaults = { ...paymentData, readByAdmin: false, readByDoctor: false };
    return addDoc(collection(db, 'doctorPayments'), dataWithDefaults);
};
export const updateDoctorPaymentStatus = async (id: string, status: DoctorPayment['status']) => updateDoc(doc(db, 'doctorPayments', id), { status, readByDoctor: false });

// Notifications
export const batchUpdateNotificationsAsRead = async (ticketIds: string[], paymentIds: string[], doctorIds: string[]) => {
    const batch = writeBatch(db);
    ticketIds.forEach(id => {
        const docRef = doc(db, "supportTickets", id);
        batch.update(docRef, { readByAdmin: true });
    });
    paymentIds.forEach(id => {
        const docRef = doc(db, "doctorPayments", id);
        batch.update(docRef, { readByAdmin: true });
    });
    doctorIds.forEach(id => {
        const docRef = doc(db, "doctors", id);
        batch.update(docRef, { readByAdmin: true });
    });
    if (ticketIds.length > 0 || paymentIds.length > 0 || doctorIds.length > 0) {
        await batch.commit();
    }
}

export const batchUpdateDoctorNotificationsAsRead = async (paymentIds: string[], ticketIds: string[]) => {
    const batch = writeBatch(db);
    paymentIds.forEach(id => {
        batch.update(doc(db, "doctorPayments", id), { readByDoctor: true });
    });
    ticketIds.forEach(id => {
        batch.update(doc(db, "supportTickets", id), { readByDoctor: true });
    });
     if (paymentIds.length > 0 || ticketIds.length > 0) {
        await batch.commit();
    }
}

export const batchUpdateDoctorAppointmentsAsRead = async (appointmentIds: string[]) => {
    if (appointmentIds.length === 0) return;
    const batch = writeBatch(db);
    appointmentIds.forEach(id => {
        batch.update(doc(db, "appointments", id), { readByDoctor: true });
    });
    await batch.commit();
}

export const batchUpdatePatientAppointmentsAsRead = async (appointmentIds: string[]) => {
    if (appointmentIds.length === 0) return;
    const batch = writeBatch(db);
    appointmentIds.forEach(id => {
        batch.update(doc(db, "appointments", id), { readByPatient: true });
    });
    await batch.commit();
}

export async function uploadImage(file: File, path: string, maxSizeMB: number = 5): Promise<string> {
  try {
    console.log('🚀 Iniciando subida de imagen:', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type, 
      path,
      maxSizeMB,
      timestamp: new Date().toISOString()
    });
    
    // Validar que el archivo existe
    if (!file) {
      throw new Error('No se proporcionó ningún archivo');
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      throw new Error(`El archivo debe ser una imagen. Tipo recibido: ${file.type}`);
    }

    // Validar tamaño (máximo configurable)
    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new Error(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo permitido: ${maxSizeMB}MB`);
    }

    console.log('✅ Validaciones pasadas, creando referencia de storage...');
    const storageRef = ref(storage, path);
    console.log('📁 Referencia creada:', storageRef.fullPath);
    
    console.log('📤 Subiendo archivo a Firebase Storage...');
    const startTime = Date.now();
    
    // Timeout más largo para archivos grandes
    const timeoutMs = file.size > 5 * 1024 * 1024 ? 60000 : 30000; // 60s para archivos >5MB, 30s para otros
    
    const uploadPromise = uploadBytes(storageRef, file);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout: Subida tardó más de ${timeoutMs/1000} segundos`)), timeoutMs);
    });
    
    const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as { ref: StorageReference };
    const uploadTime = Date.now() - startTime;
    console.log('✅ Archivo subido exitosamente en', uploadTime, 'ms');
    
    console.log('🔗 Obteniendo URL de descarga...');
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('✅ URL de descarga obtenida:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('❌ Error detallado al subir imagen:', error);
    
    if (error instanceof Error) {
      // Errores específicos de Firebase Storage
      if (error.message.includes('storage/unauthorized')) {
        throw new Error('No tienes permisos para subir archivos. Verifica las reglas de Firebase Storage.');
      }
      if (error.message.includes('storage/quota-exceeded')) {
        throw new Error('Se ha excedido la cuota de almacenamiento.');
      }
      if (error.message.includes('storage/unauthenticated')) {
        throw new Error('Debes estar autenticado para subir archivos.');
      }
      if (error.message.includes('storage/retry-limit-exceeded')) {
        throw new Error('Error de conexión. Intenta de nuevo.');
      }
      if (error.message.includes('CORS')) {
        throw new Error('Error de CORS. Intenta de nuevo o contacta al administrador.');
      }
      if (error.message.includes('Timeout')) {
        throw new Error('La subida tardó demasiado. Intenta de nuevo.');
      }
      
      throw new Error(`Error al subir la imagen: ${error.message}`);
    }
    throw new Error('No se pudo subir la imagen. Error desconocido.');
  }
}

export async function uploadPaymentProof(file: File, path: string): Promise<string> {
  console.log('=== NUEVA ESTRATEGIA DE SUBIDA ===');
  
  try {
    // Validaciones básicas
    if (!file) throw new Error('No se proporcionó ningún archivo');
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Tipo de archivo no permitido: ${file.type}`);
    }
    
    console.log('✅ Validaciones pasadas');
    console.log('📁 Archivo:', file.name, `${(file.size / 1024 / 1024).toFixed(2)}MB`, file.type);
    
    // ESTRATEGIA: Para archivos menores a 1MB, usar base64 en Firestore
    if (file.size <= 1 * 1024 * 1024) {
      console.log('🔄 Archivo pequeño (<1MB), convirtiendo a base64...');
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          console.log('✅ Conversión a base64 completada');
          console.log('📊 Tamaño base64:', (base64.length / 1024).toFixed(2) + 'KB');
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Error al convertir archivo a base64'));
        reader.readAsDataURL(file);
      });
    }
    
    // Para archivos grandes, intentar Storage con manejo de errores mejorado
    console.log('🔄 Archivo grande (>1MB), intentando Storage...');
    console.log('🛣️ Ruta:', path);
    
    // Crear referencia
    const storageRef = ref(storage, path);
    console.log('🔗 Referencia creada:', storageRef.fullPath);
    
    // Subir archivo con timeout más corto
    console.log('🚀 Iniciando subida...');
    const startTime = Date.now();
    
    const uploadPromise = uploadBytes(storageRef, file);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: Subida tardó más de 15 segundos')), 15000);
    });
    
    const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as { ref: StorageReference };
    const uploadTime = Date.now() - startTime;
    
    console.log('✅ Subida completada en', uploadTime, 'ms');
    
    // Obtener URL con timeout más corto
    console.log('🔗 Obteniendo URL...');
    const urlPromise = getDownloadURL(snapshot.ref);
    const urlTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: No se pudo obtener URL en 5 segundos')), 5000);
    });
    
    const downloadURL = await Promise.race([urlPromise, urlTimeoutPromise]) as string;
    console.log('✅ URL obtenida:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('❌ Error en nueva estrategia de subida:', error);
    
    if (error instanceof Error) {
      // Errores específicos de Firebase Storage
      if (error.message.includes('storage/unauthorized')) {
        throw new Error('No tienes permisos para subir archivos. Verifica las reglas de Firebase Storage.');
      }
      if (error.message.includes('storage/quota-exceeded')) {
        throw new Error('Se ha excedido la cuota de almacenamiento.');
      }
      if (error.message.includes('storage/unauthenticated')) {
        throw new Error('Debes estar autenticado para subir archivos.');
      }
      if (error.message.includes('storage/retry-limit-exceeded')) {
        throw new Error('Error de conexión con Firebase Storage. Intenta con un archivo más pequeño (<1MB).');
      }
      if (error.message.includes('Timeout')) {
        throw new Error('La subida tardó demasiado. Intenta con un archivo más pequeño (<1MB).');
      }
      if (error.message.includes('CORS')) {
        throw new Error('Error de CORS. Intenta con un archivo más pequeño (<1MB) que se guardará directamente en la base de datos.');
      }
      
      throw new Error(`Error al subir el comprobante de pago: ${error.message}`);
    }
    throw new Error('No se pudo subir el comprobante de pago. Error desconocido.');
  }
}

export async function uploadSettingsImage(file: File, type: 'logo' | 'hero'): Promise<string> {
  try {
    console.log('🎨 Iniciando subida de imagen de configuración:', { 
      type, 
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    });
    
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    // Validar extensión de archivo
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      throw new Error(`Formato de archivo no soportado: ${fileExtension}. Formatos permitidos: ${allowedExtensions.join(', ')}`);
    }
    
    const fileName = `${type}-${timestamp}.${fileExtension}`;
    const path = `settings/${fileName}`;
    
    console.log('📁 Ruta de archivo generada:', path);
    console.log('🔄 Llamando a uploadImage...');
    
    // Usar la función uploadImage con límite de 5MB para imágenes de configuración
    const result = await uploadImage(file, path, 5);
    console.log('✅ uploadSettingsImage completado exitosamente:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error en uploadSettingsImage:', error);
    throw error;
  }
}

// Nueva función para guardar imágenes localmente
export async function saveImageLocally(file: File, type: 'logo' | 'hero'): Promise<string> {
  try {
    console.log('💾 Guardando imagen localmente:', { 
      type, 
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    });
    
    // Validar extensión de archivo
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      throw new Error(`Formato de archivo no soportado: ${fileExtension}. Formatos permitidos: ${allowedExtensions.join(', ')}`);
    }
    
    // Validar tamaño (máximo 10MB para hero, 5MB para logo)
    const maxSize = type === 'hero' ? 10 : 5;
    if (file.size > maxSize * 1024 * 1024) {
      throw new Error(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo permitido: ${maxSize}MB`);
    }
    
    // Crear FormData para enviar a la API
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    // Enviar archivo a la API route
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al subir imagen');
    }
    
    const result = await response.json();
    
    console.log('✅ Imagen guardada localmente:', {
      imagePath: result.imagePath,
      fileName: result.fileName,
      size: file.size,
      timestamp: new Date().toISOString()
    });
    
    // Retornar la ruta pública
    return result.imagePath;
    
  } catch (error) {
    console.error('❌ Error al guardar imagen localmente:', error);
    throw error;
  }
}

export async function uploadMainPageImage(file: File, type: 'logo' | 'hero'): Promise<string> {
  try {
    console.log('🎨 Iniciando subida de imagen de página principal (ALTA CALIDAD):', { 
      type, 
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    });
    
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    // Validar extensión de archivo
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      throw new Error(`Formato de archivo no soportado: ${fileExtension}. Formatos permitidos: ${allowedExtensions.join(', ')}`);
    }
    
    // Validar tamaño (máximo 10MB para imágenes de página principal)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo permitido: 10MB`);
    }
    
    const fileName = `${type}-${timestamp}.${fileExtension}`;
    const path = `main-page/${fileName}`;
    
    console.log('📁 Ruta de archivo generada:', path);
    console.log('🔄 Subiendo con máxima calidad...');
    
    // Usar la función uploadImage con límite de 10MB para imágenes de página principal
    const result = await uploadImage(file, path, 10);
    console.log('✅ uploadMainPageImage completado exitosamente:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error en uploadMainPageImage:', error);
    throw error;
  }
}

// --- Data Initialization for Testing ---
export const initializeTestData = async () => {
  try {
    console.log('🔧 Inicializando datos de prueba...');
    
    // Verificar si ya existen datos
    const existingDoctors = await getDoctors();
    const existingPayments = await getDoctorPayments();
    
    console.log('📊 Datos existentes:', {
      doctors: existingDoctors.length,
      payments: existingPayments.length,
      paymentStatuses: existingPayments.map(p => ({ id: p.id, status: p.status, doctorName: p.doctorName }))
    });
    
    let doctorId = '';
    
    if (existingDoctors.length === 0) {
      console.log('📝 Creando médicos de prueba...');
      
      // Crear un médico de prueba
      const testDoctor: Omit<Doctor, 'id'> = {
        name: "Dr. Sofia Gomez",
        cedula: "V-15.555.555",
        specialty: "Dermatología",
        city: "Valencia",
        address: "Av. Bolívar Norte, Centro Comercial Galerías",
        sector: "San Diego",
        rating: 4.8,
        reviewCount: 85,
        profileImage: "https://placehold.co/400x400.png",
        bannerImage: "https://placehold.co/1200x400.png",
        aiHint: "woman doctor",
        description: "Dermatóloga especializada en tratamientos estéticos y cirugía dermatológica.",
        services: [
          { id: 's301', name: "Consulta Dermatológica", price: 45 },
          { id: 's302', name: "Crioterapia (verrugas)", price: 60 },
          { id: 's303', name: "Botox", price: 200 },
        ],
        bankDetails: [
          { id: 'bd3001', bank: "Banesco", accountNumber: "0134-0003-0003-0003-0003", accountHolder: "Sofia Gomez", idNumber: "V-15.555.555", description: "Personal" }
        ],
        expenses: [],
        coupons: [],
        slotDuration: 30,
        consultationFee: 45,
        schedule: {
          monday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
          tuesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
          wednesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
          thursday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
          friday: { active: true, slots: [{ start: "09:00", end: "13:00" }] },
          saturday: { active: false, slots: [] },
          sunday: { active: false, slots: [] },
        },
        sellerId: '1', // Asignado a la Vendedora Principal
        status: 'active',
        lastPaymentDate: '2024-05-01',
        email: 'sofia.gomez@example.com',
        password: '1234',
        whatsapp: '0414-5556677',
        lat: 10.1579,
        lng: -67.9972,
        joinDate: '2024-03-01',
        subscriptionStatus: 'pending_payment',
        nextPaymentDate: '2024-06-01',
      };
      
      doctorId = await addDoctor(testDoctor);
      console.log('✅ Médico de prueba creado con ID:', doctorId);
    } else {
      doctorId = existingDoctors[0].id;
      console.log('📋 Usando médico existente con ID:', doctorId);
    }
    
    // Verificar si ya existe un pago pendiente para este médico
    const pendingPaymentForDoctor = existingPayments.find(p => p.doctorId === doctorId && p.status === 'Pending');
    
    if (!pendingPaymentForDoctor) {
      console.log('💰 Creando pago pendiente de prueba...');
      
      // Crear un pago pendiente
      const testPayment: Omit<DoctorPayment, 'id'> = {
        doctorId: doctorId,
        doctorName: "Dr. Sofia Gomez",
        date: new Date().toISOString().split('T')[0],
        amount: 45,
        status: 'Pending',
        paymentProofUrl: 'https://placehold.co/400x300.png',
        transactionId: `TXN-TEST-${Date.now()}`,
        readByAdmin: false,
        readByDoctor: false,
      };
      
      const paymentRef = await addDoctorPayment(testPayment);
      console.log('✅ Pago pendiente de prueba creado para médico ID:', doctorId);
      console.log('📄 Referencia del pago:', paymentRef);
    } else {
      console.log('💰 Ya existe un pago pendiente para este médico:', pendingPaymentForDoctor.id);
    }
    
    // Verificar datos finales
    const finalDoctors = await getDoctors();
    const finalPayments = await getDoctorPayments();
    
    console.log('📊 Datos finales:', {
      doctors: finalDoctors.length,
      payments: finalPayments.length,
      pendingPayments: finalPayments.filter(p => p.status === 'Pending').length,
      paymentDetails: finalPayments.filter(p => p.status === 'Pending').map(p => ({
        id: p.id,
        doctorName: p.doctorName,
        amount: p.amount,
        date: p.date
      }))
    });
    
    console.log('🎉 Datos de prueba inicializados correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar datos de prueba:', error);
    throw error; // Re-lanzar el error para que se muestre en la UI
  }
};

// --- Función de prueba forzada ---
export const forceCreatePendingPayment = async () => {
  try {
    console.log('🚀 Forzando creación de pago pendiente...');
    
    // Obtener el primer médico disponible o crear uno
    const doctors = await getCollectionData<Doctor>('doctors');
    let doctorId = '';
    
    if (doctors.length === 0) {
      console.log('📝 No hay médicos, creando uno...');
      const testDoctor: Omit<Doctor, 'id'> = {
        name: "Dr. Test Forzado",
        cedula: "V-99.999.999",
        specialty: "Medicina General",
        city: "Caracas",
        address: "Dirección de prueba",
        sector: "Test",
        rating: 5.0,
        reviewCount: 1,
        profileImage: "https://placehold.co/400x400.png",
        bannerImage: "https://placehold.co/1200x400.png",
        aiHint: "doctor portrait",
        description: "Médico de prueba",
        services: [],
        bankDetails: [],
        expenses: [],
        coupons: [],
        slotDuration: 30,
        consultationFee: 50,
        schedule: {
          monday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
          tuesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
          wednesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
          thursday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
          friday: { active: true, slots: [{ start: "09:00", end: "13:00" }] },
          saturday: { active: false, slots: [] },
          sunday: { active: false, slots: [] },
        },
        sellerId: '1',
        status: 'active',
        lastPaymentDate: '2024-05-01',
        email: 'test@example.com',
        password: '1234',
        whatsapp: '0414-9999999',
        lat: 10.4996,
        lng: -66.8528,
        joinDate: '2024-01-01',
        subscriptionStatus: 'pending_payment',
        nextPaymentDate: '2024-06-01',
      };
      
      doctorId = await addDoctor(testDoctor);
    } else {
      doctorId = doctors[0].id;
    }
    
    // Crear pago pendiente
    const paymentData: Omit<SellerPayment, 'id'> = {
      sellerId: '1',
      paymentDate: new Date().toISOString().split('T')[0],
      amount: 150.00,
      period: 'Diciembre 2024',
      includedDoctors: [
        {
          id: doctorId,
          name: doctors.length > 0 ? doctors[0].name : "Dr. Test Forzado",
          commissionAmount: 150.00
        }
      ],
      paymentProofUrl: 'https://example.com/proof.jpg',
      transactionId: 'TXN-TEST-' + Date.now(),
      status: 'pending',
      readBySeller: false
    };
    
    await addSellerPayment(paymentData);
    console.log('✅ Pago pendiente creado exitosamente');
    
  } catch (error) {
    console.error('❌ Error creando pago pendiente:', error);
  }
};

// --- Función para crear tickets de soporte de prueba ---
export const createTestSupportTickets = async () => {
  try {
    console.log('🚀 Creando tickets de soporte de prueba...');
    
    const testTickets: Omit<AdminSupportTicket, 'id' | 'messages'>[] = [
      {
        userId: 'test@example.com',
        userName: 'Dr. Test',
        userRole: 'doctor',
        subject: 'Problema con el sistema de pagos',
        description: 'No puedo ver mis pagos pendientes en el dashboard. El sistema muestra un error cuando intento acceder a la sección de finanzas.',
        status: 'abierto',
        date: new Date().toISOString().split('T')[0],
        readByAdmin: false,
        readBySeller: false,
        readByDoctor: true
      },
      {
        userId: 'test@example.com',
        userName: 'Dr. Test',
        userRole: 'doctor',
        subject: 'Consulta sobre cupones de descuento',
        description: '¿Cómo puedo crear cupones personalizados para mis pacientes? Quiero ofrecer descuentos especiales para consultas de seguimiento.',
        status: 'abierto',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Ayer
        readByAdmin: false,
        readBySeller: false,
        readByDoctor: true
      },
      {
        userId: 'test@example.com',
        userName: 'Dr. Test',
        userRole: 'doctor',
        subject: 'Error al subir foto de perfil',
        description: 'Cuando intento cambiar mi foto de perfil, el sistema me da un error. He intentado con diferentes formatos de imagen pero no funciona.',
        status: 'cerrado',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 3 días
        readByAdmin: true,
        readBySeller: false,
        readByDoctor: true
      },
      {
        userId: 'test@example.com',
        userName: 'Dr. Test',
        userRole: 'doctor',
        subject: 'Solicitud de cambio de horario',
        description: 'Necesito cambiar mi horario de atención para los martes y jueves. Actualmente tengo configurado de 9:00 AM a 5:00 PM, pero quiero cambiarlo a 10:00 AM a 6:00 PM.',
        status: 'abierto',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Hace 5 días
        readByAdmin: false,
        readBySeller: false,
        readByDoctor: true
      }
    ];
    
    for (const ticket of testTickets) {
      await addSupportTicket(ticket);
    }
    
    console.log('✅ Tickets de soporte de prueba creados exitosamente');
    
  } catch (error) {
    console.error('❌ Error creando tickets de soporte de prueba:', error);
  }
};

// --- Función para crear vendedoras de prueba ---
export const createTestSellers = async () => {
  try {
    console.log('👥 Creando vendedoras de prueba...');
    
    // Verificar si ya existen vendedoras
    const existingSellers = await getSellers();
    console.log('📊 Vendedoras existentes:', existingSellers.length);
    
    if (existingSellers.length === 0) {
      console.log('🆕 No hay vendedoras, creando vendedoras de prueba...');
      
      // Encriptar contraseñas de prueba
      const hashedPassword = await hashPassword("1234");
      
      // Crear vendedora principal
      const mainSeller: Omit<Seller, 'id'> = {
        name: "Vendedora Principal",
        email: "vendedora@venta.com",
        password: hashedPassword,
        phone: "0412-9876543",
        profileImage: "https://placehold.co/400x400.png",
        referralCode: "VENDE123",
        commissionRate: 0.20,
        bankDetails: [
          {
            id: 'sbank1',
            bank: "Bancamiga",
            accountNumber: "0172-0009-0009-0009-0009",
            accountHolder: "Vendedora Principal",
            idNumber: "V-99.888.777",
            description: "Cuenta en Dólares",
          }
        ],
        expenses: [
          { id: 'sexp1', date: '2024-05-10', description: 'Transporte a reuniones', amount: 20 },
          { id: 'sexp2', date: '2024-05-22', description: 'Impresión de material', amount: 15 },
        ]
      };
      
      const mainSellerId = await addSeller(mainSeller);
      console.log('✅ Vendedora principal creada con ID:', mainSellerId);
      
      // Crear vendedora adicional
      const secondSeller: Omit<Seller, 'id'> = {
        name: "Maria Garcia",
        email: "maria.g@venta.com",
        password: hashedPassword,
        phone: "0414-1112233",
        profileImage: "https://placehold.co/400x400.png",
        referralCode: "MARIA456",
        commissionRate: 0.18,
        bankDetails: [],
        expenses: []
      };
      
      const secondSellerId = await addSeller(secondSeller);
      console.log('✅ Segunda vendedora creada con ID:', secondSellerId);
      
      console.log('🎉 Vendedoras de prueba creadas correctamente');
      return { mainSellerId, secondSellerId };
    } else {
      console.log('📋 Ya existen vendedoras:', existingSellers.map(s => ({ id: s.id, name: s.name })));
      return { mainSellerId: existingSellers[0].id, secondSellerId: existingSellers[1]?.id };
    }
  } catch (error) {
    console.error('❌ Error al crear vendedoras de prueba:', error);
    throw error;
  }
};

// --- Función para limpiar pagos de vendedoras ---
export const clearSellerPayments = async () => {
  try {
    console.log('🧹 Limpiando pagos de vendedoras...');
    
    const existingPayments = await getSellerPayments();
    console.log('📊 Pagos existentes a eliminar:', existingPayments.length);
    
    if (existingPayments.length > 0) {
      // Eliminar todos los pagos existentes
      const deletePromises = existingPayments.map(payment => 
        deleteDoc(doc(db, 'sellerPayments', payment.id))
      );
      
      await Promise.all(deletePromises);
      console.log('✅ Pagos de vendedoras eliminados correctamente');
    } else {
      console.log('📋 No hay pagos de vendedoras para eliminar');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error al limpiar pagos de vendedoras:', error);
    throw error;
  }
};

// --- Función para eliminar todos los médicos y vendedoras de prueba ---
export const clearTestUsers = async () => {
    try {
        const batch = writeBatch(db);
        
        // Limpiar doctores de prueba
        const doctorsSnapshot = await getDocs(collection(db, 'doctors'));
        doctorsSnapshot.docs.forEach(doc => {
            if (doc.data().email.includes('test')) {
                batch.delete(doc.ref);
            }
        });
        
        // Limpiar vendedores de prueba
        const sellersSnapshot = await getDocs(collection(db, 'sellers'));
        sellersSnapshot.docs.forEach(doc => {
            if (doc.data().email.includes('test')) {
                batch.delete(doc.ref);
            }
        });
        
        // Limpiar pacientes de prueba
        const patientsSnapshot = await getDocs(collection(db, 'patients'));
        patientsSnapshot.docs.forEach(doc => {
            if (doc.data().email.includes('test')) {
                batch.delete(doc.ref);
            }
        });
        
        await batch.commit();
        console.log('✅ Usuarios de prueba eliminados');
    } catch (error) {
        console.error('❌ Error eliminando usuarios de prueba:', error);
        throw error;
    }
};

// --- SISTEMA DE VALORACIONES DE MÉDICOS ---

import type { DoctorReview } from './types';

// Obtener todas las valoraciones de un médico
export const getDoctorReviews = async (doctorId: string): Promise<DoctorReview[]> => {
    try {
        const q = query(collection(db, "doctorReviews"), where("doctorId", "==", doctorId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DoctorReview));
    } catch (error) {
        console.error('Error fetching doctor reviews:', error);
        return [];
    }
};

// Obtener valoraciones de un paciente específico
export const getPatientReviews = async (patientId: string): Promise<DoctorReview[]> => {
    try {
        const q = query(collection(db, "doctorReviews"), where("patientId", "==", patientId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DoctorReview));
    } catch (error) {
        console.error('Error fetching patient reviews:', error);
        return [];
    }
};

// Agregar una nueva valoración
export const addDoctorReview = async (reviewData: Omit<DoctorReview, 'id'>): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, 'doctorReviews'), reviewData);
        
        // Actualizar el rating promedio del médico
        await updateDoctorRating(reviewData.doctorId);
        
        return docRef.id;
    } catch (error) {
        console.error('Error adding doctor review:', error);
        throw error;
    }
};

// Actualizar una valoración existente
export const updateDoctorReview = async (reviewId: string, data: Partial<DoctorReview>): Promise<void> => {
    try {
        await updateDoc(doc(db, 'doctorReviews', reviewId), data);
        
        // Si se actualizó el rating, recalcular el promedio del médico
        if (data.rating !== undefined) {
            const review = await getDocumentData<DoctorReview>('doctorReviews', reviewId);
            if (review) {
                await updateDoctorRating(review.doctorId);
            }
        }
    } catch (error) {
        console.error('Error updating doctor review:', error);
        throw error;
    }
};

// Eliminar una valoración
export const deleteDoctorReview = async (reviewId: string): Promise<void> => {
    try {
        const review = await getDocumentData<DoctorReview>('doctorReviews', reviewId);
        if (review) {
            await deleteDoc(doc(db, 'doctorReviews', reviewId));
            // Recalcular el rating del médico
            await updateDoctorRating(review.doctorId);
        }
    } catch (error) {
        console.error('Error deleting doctor review:', error);
        throw error;
    }
};

// Verificar si un paciente ya valoró a un médico
export const checkPatientReviewExists = async (doctorId: string, patientId: string): Promise<DoctorReview | null> => {
    try {
        const q = query(
            collection(db, "doctorReviews"), 
            where("doctorId", "==", doctorId),
            where("patientId", "==", patientId)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { ...doc.data(), id: doc.id } as DoctorReview;
        }
        return null;
    } catch (error) {
        console.error('Error checking patient review:', error);
        return null;
    }
};

// Actualizar el rating promedio y conteo de reseñas del médico
export const updateDoctorRating = async (doctorId: string): Promise<void> => {
    try {
        const reviews = await getDoctorReviews(doctorId);
        
        if (reviews.length === 0) {
            // Si no hay reseñas, establecer rating en 0
            await updateDoc(doc(db, 'doctors', doctorId), {
                rating: 0,
                reviewCount: 0
            });
            return;
        }
        
        // Calcular rating promedio
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = Math.round((totalRating / reviews.length) * 10) / 10; // Redondear a 1 decimal
        
        // Actualizar el médico
        await updateDoc(doc(db, 'doctors', doctorId), {
            rating: averageRating,
            reviewCount: reviews.length
        });
        
        console.log(`✅ Rating actualizado para doctor ${doctorId}: ${averageRating} (${reviews.length} reseñas)`);
    } catch (error) {
        console.error('Error updating doctor rating:', error);
        throw error;
    }
};

// Obtener estadísticas de valoraciones para un médico
export const getDoctorReviewStats = async (doctorId: string) => {
    try {
        const reviews = await getDoctorReviews(doctorId);
        
        if (reviews.length === 0) {
            return {
                totalReviews: 0,
                averageRating: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                verifiedReviews: 0
            };
        }
        
        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let verifiedReviews = 0;
        
        reviews.forEach(review => {
            ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
            if (review.isVerified) verifiedReviews++;
        });
        
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;
        
        return {
            totalReviews: reviews.length,
            averageRating,
            ratingDistribution,
            verifiedReviews
        };
    } catch (error) {
        console.error('Error getting doctor review stats:', error);
        return null;
    }
};

// Obtener historial de inactivaciones de un médico
export const getDoctorInactivationLogs = async (doctorId: string) => {
  try {
    const q = query(collection(db, "inactivationLogs"), where("doctorId", "==", doctorId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al obtener historial de inactivaciones:", error);
    return [];
  }
};

// --- Función para crear admin en Firestore ---
export const createAdminUser = async () => {
  try {
    console.log('🔐 Creando usuario administrador en Firestore...');
    
    // Verificar si ya existe el admin
    const existingAdmin = await findAdminByEmail('perozzi0112@gmail.com');
    if (existingAdmin) {
      console.log('✅ Admin ya existe en Firestore');
      return existingAdmin;
    }
    
    // Crear admin en colección separada para mayor seguridad
    const adminData = {
      email: 'perozzi0112@gmail.com',
      name: 'Administrador Suma',
      password: '..Suma..01', // Se encriptará en el primer login
      role: 'admin',
      profileImage: 'https://placehold.co/400x400.png',
      createdAt: new Date().toISOString(),
      lastLogin: null,
      isActive: true,
      permissions: ['all'], // Permisos completos
    };
    
    const adminRef = await addDoc(collection(db, 'admins'), adminData);
    console.log('✅ Admin creado exitosamente con ID:', adminRef.id);
    
    return {
      ...adminData,
      id: adminRef.id,
    };
  } catch (error) {
    console.error('❌ Error creando admin:', error);
    throw error;
  }
};

// --- Función para buscar admin en Firestore ---
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  password: string;
  profileImage?: string;
  role: 'admin';
  createdAt?: string;
  lastLogin?: string | null;
  isActive?: boolean;
  permissions?: string[];
}

export const findAdminByEmail = async (email: string): Promise<AdminUser | null> => {
  try {
    const q = query(collection(db, 'admins'), where("email", "==", email.toLowerCase()));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docData = snapshot.docs[0].data();
      return {
        ...docData,
        id: snapshot.docs[0].id,
        role: 'admin',
      } as AdminUser;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error buscando admin:', error);
    return null;
  }
};




