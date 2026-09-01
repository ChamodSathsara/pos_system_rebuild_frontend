// Mirrors PosApi/Models/Enums/Enums.cs exactly. Serialized as strings over the wire.

export const CustomerType = ["Regular", "Credit", "Wholesale", "VIP", "Employee"] as const;
export type CustomerType = (typeof CustomerType)[number];

export const BranchStatus = ["Active", "Inactive"] as const;
export type BranchStatus = (typeof BranchStatus)[number];

export const UnitOfMeasure = ["PCS", "KG", "LTR", "L", "ML", "M", "CM", "PACK", "BOX", "DOZEN"] as const;
export type UnitOfMeasure = (typeof UnitOfMeasure)[number];

export const ItemGroup = ["Machinery", "Consumables", "Stationery", "SpareParts", "Services"] as const;
export type ItemGroup = (typeof ItemGroup)[number];

export const DiscountType = ["Item", "Item_Quantity", "Seasonal", "Total_Bill", "Special"] as const;
export type DiscountType = (typeof DiscountType)[number];

export const DiscountMethod = ["Percentage", "Fixed_Amount"] as const;
export type DiscountMethod = (typeof DiscountMethod)[number];

export const DiscountApplicableTo = ["Entire_Bill", "Selected_Items"] as const;
export type DiscountApplicableTo = (typeof DiscountApplicableTo)[number];

export const PurchaseOrderStatus = ["Open", "PartiallyReceived", "FullyReceived", "Cancelled"] as const;
export type PurchaseOrderStatus = (typeof PurchaseOrderStatus)[number];

export const PurchaseOrderHistoryAction = [
  "Created",
  "Modified",
  "Approved",
  "Rejected",
  "Cancelled",
  "StatusChanged",
] as const;
export type PurchaseOrderHistoryAction = (typeof PurchaseOrderHistoryAction)[number];

export const PurchaseOrderChangeField = [
  "Vendor",
  "ExpectedDate",
  "Remarks",
  "Quantity",
  "UnitCost",
  "TotalCost",
  "Status",
  "ItemStatus",
] as const;
export type PurchaseOrderChangeField = (typeof PurchaseOrderChangeField)[number];

export const GrnReturnStatus = ["Pending", "Approved", "Completed", "Rejected"] as const;
export type GrnReturnStatus = (typeof GrnReturnStatus)[number];

export const StockMovementType = ["In", "Out", "Adjustment", "CostCorrection"] as const;
export type StockMovementType = (typeof StockMovementType)[number];

export const StockReferenceType = [
  "OpeningStock",
  "Grn",
  "Sale",
  "SaleReturn",
  "GrnReturn",
  "StockTransfer",
  "StockAdjustment",
  "Damage",
  "StockReceive",
  "CostCorrection",
] as const;
export type StockReferenceType = (typeof StockReferenceType)[number];

export const BatchStatus = ["Available", "Completed", "Expired", "Damaged", "Blocked"] as const;
export type BatchStatus = (typeof BatchStatus)[number];

export const DamageItemStatus = ["Reported", "Reviewed", "Approved", "Disposed", "Rejected"] as const;
export type DamageItemStatus = (typeof DamageItemStatus)[number];

export const SaleStatus = ["Pending", "Completed", "Cancelled", "Refunded"] as const;
export type SaleStatus = (typeof SaleStatus)[number];

export const PaymentMethod = ["Cash", "Card", "BankTransfer", "Cheque", "Online", "LoyaltyPoints"] as const;
export type PaymentMethod = (typeof PaymentMethod)[number];

export const PaymentStatus = ["Pending", "Completed", "Failed", "Refunded", "Cancelled"] as const;
export type PaymentStatus = (typeof PaymentStatus)[number];

export const CashierShiftStatus = ["Open", "Closed"] as const;
export type CashierShiftStatus = (typeof CashierShiftStatus)[number];

export const ShiftDifferenceReasonType = [
  "MissingInvoice",
  "MissingExpenditure",
  "CashHandlingError",
  "Other",
] as const;
export type ShiftDifferenceReasonType = (typeof ShiftDifferenceReasonType)[number];

export const CashierShiftHistoryAction = ["Opened", "Recalculated", "ClosedBalanced", "ClosedWithDifference"] as const;
export type CashierShiftHistoryAction = (typeof CashierShiftHistoryAction)[number];

// Roles as seeded / referenced by name in the backend
export const ROLES = ["Admin", "Manager", "Branch_Manager", "Cashier"] as const;
export type Role = (typeof ROLES)[number];
