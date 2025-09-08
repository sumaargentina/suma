// Sistema de validación y sanitización para prevenir XSS

export const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/[<>]/g, '') // Eliminar < y >
    .replace(/javascript:/gi, '') // Eliminar javascript:
    .replace(/on\w+=/gi, '') // Eliminar event handlers
    .replace(/data:/gi, '') // Eliminar data URLs
    .trim();
};

export const validateEmail = (email: string): { isValid: boolean; sanitized: string } => {
  const sanitized = sanitizeText(email).toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return {
    isValid: emailRegex.test(sanitized),
    sanitized
  };
};

export const validatePhone = (phone: string): { isValid: boolean; sanitized: string } => {
  const sanitized = sanitizeText(phone).replace(/\D/g, '');
  // Permitir números internacionales de 7 a 15 dígitos
  const phoneRegex = /^[0-9]{7,15}$/;
  return {
    isValid: phoneRegex.test(sanitized),
    sanitized
  };
};

export const validateCedula = (cedula: string): { isValid: boolean; sanitized: string } => {
  const originalCedula = cedula.trim();
  const cedulaRegex = /^[VE]-\d{7,8}$/;
  
  return {
    isValid: cedulaRegex.test(originalCedula),
    sanitized: originalCedula
  };
};

export const validateName = (name: string): { isValid: boolean; sanitized: string } => {
  const sanitized = sanitizeText(name);
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-'0-9.]{2,50}$/;
  
  return {
    isValid: nameRegex.test(sanitized) && sanitized.length >= 2,
    sanitized
  };
};

export const validateCity = (city: string): { isValid: boolean; sanitized: string } => {
  const sanitized = sanitizeText(city);
  const cityRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-]{2,30}$/;
  
  return {
    isValid: cityRegex.test(sanitized) && sanitized.length >= 2,
    sanitized
  };
};

export const validateAddress = (address: string): { isValid: boolean; sanitized: string } => {
  const sanitized = sanitizeText(address);
  const addressRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-.,#]{5,100}$/;
  
  return {
    isValid: addressRegex.test(sanitized) && sanitized.length >= 5,
    sanitized
  };
};

export const validateSpecialty = (specialty: string): { isValid: boolean; sanitized: string } => {
  const sanitized = sanitizeText(specialty);
  const specialtyRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\-0-9.]{2,50}$/;
  
  return {
    isValid: specialtyRegex.test(sanitized) && sanitized.length >= 2,
    sanitized
  };
};

export const validateDescription = (description: string): { isValid: boolean; sanitized: string } => {
  const sanitized = sanitizeText(description);
  const descriptionRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-.,!?()]{10,50}$/;
  
  return {
    isValid: descriptionRegex.test(sanitized) && sanitized.length >= 10,
    sanitized
  };
};

export const validatePrice = (price: string | number): { isValid: boolean; sanitized: number } => {
  const priceStr = String(price).replace(/[^\d.]/g, '');
  const priceNum = parseFloat(priceStr);
  
  return {
    isValid: !isNaN(priceNum) && priceNum >= 0 && priceNum <= 10000,
    sanitized: priceNum
  };
};

export const validateAge = (age: string | number): { isValid: boolean; sanitized: number } => {
  const ageStr = String(age).replace(/\D/g, '');
  const ageNum = parseInt(ageStr);
  
  return {
    isValid: !isNaN(ageNum) && ageNum >= 0 && ageNum <= 120,
    sanitized: ageNum
  };
};

export const validateGender = (gender: string): { isValid: boolean; sanitized: string } => {
  const sanitized = sanitizeText(gender).toLowerCase();
  
  return {
    isValid: ['masculino', 'femenino', 'otro'].includes(sanitized),
    sanitized
  };
};

export const validatePassword = (password: string): { isValid: boolean; sanitized: string } => {
  if (!password || password.length < 8) {
    return { isValid: false, sanitized: '' };
  }
  if (password.length > 128) {
    return { isValid: false, sanitized: '' };
  }
  const dangerousChars = /[<>"];/;
  if (dangerousChars.test(password)) {
    return { isValid: false, sanitized: '' };
  }
  return { isValid: true, sanitized: password };
};

export const sanitizeUserData = (userData: unknown): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  
  if (userData && typeof userData === 'object' && 'name' in userData && userData.name) {
    if (typeof userData === 'object' && userData !== null) {
      const nameValidation = validateName(String(userData.name ?? ''));
      if (nameValidation.isValid) sanitized.name = nameValidation.sanitized;
    }
  }
  
  if (userData && typeof userData === 'object' && 'email' in userData && userData.email) {
    if (typeof userData === 'object' && userData !== null) {
      const emailValidation = validateEmail(String(userData.email ?? ''));
      if (emailValidation.isValid) sanitized.email = emailValidation.sanitized;
    }
  }
  
  if (userData && typeof userData === 'object' && 'phone' in userData && userData.phone) {
    if (typeof userData === 'object' && userData !== null) {
      const phoneValidation = validatePhone(String(userData.phone ?? ''));
      if (phoneValidation.isValid) sanitized.phone = phoneValidation.sanitized;
    }
  }
  
  if (userData && typeof userData === 'object' && 'cedula' in userData && userData.cedula) {
    if (typeof userData === 'object' && userData !== null) {
      const cedulaValidation = validateCedula(String(userData.cedula ?? ''));
      if (cedulaValidation.isValid) sanitized.cedula = cedulaValidation.sanitized;
    }
  }
  
  if (userData && typeof userData === 'object' && 'city' in userData && userData.city) {
    if (typeof userData === 'object' && userData !== null) {
      const cityValidation = validateCity(String(userData.city ?? ''));
      if (cityValidation.isValid) sanitized.city = cityValidation.sanitized;
    }
  }
  
  if (userData && typeof userData === 'object' && 'address' in userData && userData.address) {
    if (typeof userData === 'object' && userData !== null) {
      const addressValidation = validateAddress(String(userData.address ?? ''));
      if (addressValidation.isValid) sanitized.address = addressValidation.sanitized;
    }
  }
  
  if (userData && typeof userData === 'object' && 'specialty' in userData && userData.specialty) {
    if (typeof userData === 'object' && userData !== null) {
      const specialtyValidation = validateSpecialty(String(userData.specialty ?? ''));
      if (specialtyValidation.isValid)
        sanitized.specialty = specialtyValidation.sanitized;
    }
  }
  
  if (userData && typeof userData === 'object' && 'description' in userData && userData.description) {
    if (typeof userData === 'object' && userData !== null) {
      const descriptionValidation = validateDescription(String(userData.description ?? ''));
      if (descriptionValidation.isValid) {
        sanitized.description = descriptionValidation.sanitized;
      }
    }
  }
  
  if (userData && typeof userData === 'object' && 'age' in userData && userData.age) {
    if (typeof userData === 'object' && userData !== null) {
      const ageValidation = validateAge(String(userData.age ?? ''));
      if (ageValidation.isValid) sanitized.age = ageValidation.sanitized;
    }
  }
  
  if (userData && typeof userData === 'object' && 'gender' in userData && userData.gender) {
    if (typeof userData === 'object' && userData !== null) {
      const genderValidation = validateGender(String(userData.gender ?? ''));
      if (genderValidation.isValid)
        sanitized.gender = genderValidation.sanitized;
    }
  }
  
  if (userData && typeof userData === 'object' && 'consultationFee' in userData && userData.consultationFee) {
    if (typeof userData === 'object' && userData !== null) {
      const priceValidation = validatePrice(String(userData.consultationFee ?? ''));
      if (priceValidation.isValid) sanitized.consultationFee = priceValidation.sanitized;
    }
  }
  
  // Mantener campos que no necesitan sanitización
  if (userData && typeof userData === 'object' && 'password' in userData && userData.password) sanitized.password = userData.password;
  if (userData && typeof userData === 'object' && 'role' in userData && userData.role) sanitized.role = userData.role;
  if (userData && typeof userData === 'object' && 'profileImage' in userData && userData.profileImage) sanitized.profileImage = userData.profileImage;
  if (userData && typeof userData === 'object' && 'id' in userData && userData.id) sanitized.id = userData.id;
  
  return sanitized;
};

export const validateRequiredFields = (data: unknown, requiredFields: string[]): { isValid: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!data || typeof data !== 'object' || !(field in data)) {
      missingFields.push(field);
      continue;
    }
    const value = (data as Record<string, unknown>)[field];
    if (typeof value === 'string' && value.trim() === '') {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}; 