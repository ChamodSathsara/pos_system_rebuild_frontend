export * from "./enums";
export * from "./auth";
export * from "./security";
export * from "./organization";
export * from "./product";
export * from "./party";
export * from "./stock";
export * from "./purchase";
export * from "./sale";
export * from "./misc";
export * from "./operational-report";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: string[] | null;
  timestamp: string;
}
