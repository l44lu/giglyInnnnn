import api from "./api";

export interface ForgotPasswordResponse {
  message: string;
}

export interface VerifyResetOtpResponse {
  resetToken: string;
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

/**
 * Initiates password reset flow by sending a 6-digit OTP to the user's email.
 */
export const forgotPassword = async (
  email: string,
): Promise<ForgotPasswordResponse> => {
  const response = await api.post<ForgotPasswordResponse>(
    "/auth/forgot-password",
    {
      email: email.trim().toLowerCase(),
    },
  );
  return response.data;
};

/**
 * Verifies the 6-digit OTP and exchanges it for a short-lived reset authorization token.
 */
export const verifyResetOtp = async (
  email: string,
  otp: string,
): Promise<VerifyResetOtpResponse> => {
  const response = await api.post<VerifyResetOtpResponse>(
    "/auth/verify-reset-otp",
    {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
    },
  );
  return response.data;
};

/**
 * Updates the user's password using the single-use reset authorization token.
 */
export const resetPassword = async (
  resetToken: string,
  newPassword: string,
  confirmPassword: string,
): Promise<ResetPasswordResponse> => {
  const response = await api.post<ResetPasswordResponse>(
    "/auth/reset-password",
    {
      resetToken: resetToken.trim(),
      newPassword,
      confirmPassword,
    },
  );
  return response.data;
};

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

/**
 * Changes the authenticated user's password.
 * Dispatches POST /auth/change-password with HttpOnly cookie credentials.
 */
export const changePassword = async (payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>(
    "/auth/change-password",
    payload,
  );
  return response.data;
};

export interface PasswordValidationErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

/**
 * Validates the change password form fields client-side.
 * Returns an object with field-level error messages, or an empty object if valid.
 */
export const validateChangePasswordForm = (values: {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}): PasswordValidationErrors => {
  const errors: PasswordValidationErrors = {};
  const current = values.currentPassword ?? "";
  const newPwd = values.newPassword ?? "";
  const confirmPwd = values.confirmPassword ?? "";

  if (!current.trim()) {
    errors.currentPassword = "Current password is required";
  }

  if (!newPwd) {
    errors.newPassword = "New password is required";
  } else if (newPwd.length < 8) {
    errors.newPassword = "Password must be at least 8 characters long";
  }

  if (!confirmPwd) {
    errors.confirmPassword = "Confirm password is required";
  } else if (confirmPwd !== newPwd) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
};
