export interface TwoFactorStatus {
  sharedKey: string;
  authenticatorUri: string;
  recoveryCodesLeft: number;
  recoveryCodes: string[] | null;
  isTwoFactorEnabled: boolean;
  isMachineRemembered: boolean;
}
