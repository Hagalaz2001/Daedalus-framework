const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail = (v: string) => (EMAIL.test(v.trim()) ? undefined : "Enter a valid email address.");
export const validatePassword = (v: string) => (v.length >= 8 ? undefined : "Use at least 8 characters.");
export const validateName = (v: string) => (v.trim().length > 0 ? undefined : "Enter your name.");
