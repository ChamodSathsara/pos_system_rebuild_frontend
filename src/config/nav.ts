import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Truck,
  Wallet,
  BarChart3,
  Settings,
  Building2,
  Users,
  Tags,
  Percent,
  ReceiptText,
  ClipboardList,
  Warehouse,
  AlertTriangle,
  FileStack,
  PackagePlus,
  Landmark,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: Role[]; // omitted = all roles
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Sell",
    items: [
      { label: "POS Terminal", href: "/pos", icon: ShoppingCart },
      { label: "Sales", href: "/sales", icon: ReceiptText },
      { label: "Sale Returns", href: "/sales/returns", icon: FileStack },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/catalog/products", icon: Package, roles: ["Admin", "Manager", "Branch_Manager"] },
      { label: "Categories & Brands", href: "/catalog/taxonomy", icon: Tags, roles: ["Admin", "Manager"] },
      { label: "Discounts", href: "/catalog/discounts", icon: Percent, roles: ["Admin", "Manager"] },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Stock Levels", href: "/inventory/stock", icon: Boxes, roles: ["Admin", "Manager"] },
      { label: "Branch Stock", href: "/inventory/stock", icon: Boxes, roles: ["Branch_Manager"] },
      { label: "Main Warehouse Dashboard", href: "/inventory/main-warehouse", icon: LayoutDashboard, roles: ["Admin", "Manager", "InventoryClerk"] },
      { label: "Main Warehouse Batch Stock", href: "/inventory/stock", icon: Boxes, roles: ["InventoryClerk"] },
      { label: "Stock Requests", href: "/inventory/stock-requests", icon: ClipboardList, roles: ["Admin", "Manager", "Branch_Manager"] },
      { label: "Incoming Deliveries", href: "/inventory/incoming-deliveries", icon: Truck, roles: ["Admin", "Manager", "Branch_Manager"] },
      { label: "Request Queue", href: "/inventory/transfer-queue", icon: ClipboardList, roles: ["Admin", "Manager", "InventoryClerk"] },
      { label: "Dispatches", href: "/inventory/dispatches", icon: Truck, roles: ["Admin", "Manager", "InventoryClerk"] },
      { label: "Opening Stock", href: "/inventory/opening-stock", icon: PackagePlus, roles: ["Admin", "Manager", "Branch_Manager"] },
      { label: "Damage Items", href: "/inventory/damage", icon: AlertTriangle },
    ],
  },
  {
    label: "Purchasing",
    items: [
      { label: "Purchase Orders", href: "/purchasing/orders", icon: ClipboardList, roles: ["Admin", "Manager", "Branch_Manager"] },
      { label: "Goods Received (GRN)", href: "/purchasing/grn", icon: Truck, roles: ["Admin", "Manager", "Branch_Manager"] },
      { label: "Vendors", href: "/purchasing/vendors", icon: Landmark, roles: ["Admin", "Manager", "Branch_Manager"] },
    ],
  },
  {
    label: "Cash Management",
    items: [
      { label: "Cashier Shifts", href: "/cash/shifts", icon: Wallet },
      { label: "Payments", href: "/cash/payments", icon: ReceiptText },
      { label: "Expenses", href: "/cash/expenses", icon: Wallet },
    ],
  },
  {
    label: "Reports",
    items: [{ label: "Sales Reports", href: "/reports", icon: BarChart3, roles: ["Admin", "Manager", "Branch_Manager"] }],
  },
  {
    label: "Settings",
    items: [{ label: "Receipt Printer", href: "/settings/printer", icon: Settings }],
  },
  {
    label: "Administration",
    items: [
      { label: "Organization", href: "/admin/organization", icon: Building2, roles: ["Admin"] },
      { label: "Users", href: "/admin/users", icon: Users, roles: ["Admin"] },
      { label: "Roles & Permissions", href: "/admin/roles", icon: ShieldCheck, roles: ["Admin"] },
      { label: "Warehouses", href: "/admin/warehouses", icon: Warehouse, roles: ["Admin"] },
    ],
  },
];

export function isNavItemVisible(item: NavItem, role?: Role | string | null): boolean {
  if (!item.roles) return true;
  return item.roles.includes(role as Role);
}
