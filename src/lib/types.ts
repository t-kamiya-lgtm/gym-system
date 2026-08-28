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
  corpNo: number;
  name: string;
  invoiceRegistered: boolean;
  invoiceRegistrationNumber: string | null;
  createdAt: string;
}

export interface Store {
  id: string;
  corporationId: string;
  storeNo: number;
  name: string;
  createdAt: string;
}

/** 表示用の管理番号(例: 001-001)。 */
export function managementCode(corpNo: number, storeNo?: number | null): string {
  const corpPart = String(corpNo).padStart(3, "0");
  if (storeNo === undefined || storeNo === null) return corpPart;
  return `${corpPart}-${String(storeNo).padStart(3, "0")}`;
}

export interface RewardTier {
  minPoints: number;
  maxPoints: number | null;
  unitPrice: number;
}
