// RootStackParams.tsx
import type { ReceiptData } from "../screens/Split"; 


export type RootStackParamList = {
  Home: undefined;
  MainTabs: { screen: "Home" | "Split" | "Chat" } | undefined;
  Split: {
    importedReceipt?: ReceiptData;
  };
  Snake: undefined;
  Receipts: undefined;
  ImportReceipts: undefined;
  Settings: { itemId: number; otherParams: string };
  Chat: undefined;
};
