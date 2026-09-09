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
