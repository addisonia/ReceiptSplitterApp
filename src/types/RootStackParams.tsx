import type { ReceiptData } from "../screens/Split"; // or correct path


export type RootStackParamList = {
  Home: undefined;
  MainTabs: undefined;
  Split: {
    importedReceipt?: ReceiptData;
  };
  Snake: undefined;
  Receipts: undefined;
  ImportReceipts: undefined;
  Settings: { itemId: number; otherParams: string };
};
