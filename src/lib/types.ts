/** 運営側(社内)ユーザー。pm-chat-bot側の既存usersテーブル(Google Workspace認証)を共有する。 */
export interface OperatorUser {
  id: string;
  authUserId: string | null;
  email: string;
  role: "admin" | "staff" | "unassigned";
}

/** 法人側(パートナー)ユーザー。 */
export interface PartnerUser {
  id: string;
  corporationId: string;
  authUserId: string | null;
  email: string;
  isActive: boolean;
}

export interface Corporation {
  id: string;
  name: string;
  invoiceRegistered: boolean;
  invoiceRegistrationNumber: string | null;
  createdAt: string;
}

export interface Store {
  id: string;
  corporationId: string;
  name: string;
  createdAt: string;
}

export interface RewardTier {
  minPoints: number;
  maxPoints: number | null;
  unitPrice: number;
}
