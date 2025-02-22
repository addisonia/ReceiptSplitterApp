// RootStackParams.tsx
import type { NavigatorScreenParams } from "@react-navigation/native";
import type { ReceiptData } from "../screens/Split";

// Define params for Split screen
type SplitScreenParams = {
  importedReceipt?: ReceiptData;
};

// Define the tab navigator's param list
type MainTabsParamList = {
  Home: undefined;
  Split: SplitScreenParams;
  Chat: undefined;
};

export type RootStackParamList = {
  Home: undefined;
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
  Split: SplitScreenParams; // Kept for direct navigation if needed
  Snake: undefined;
  Receipts: undefined;
  ImportReceipts: undefined;
  Settings: { itemId: number; otherParams: string };
  Chat: undefined;
  Profile: undefined;
  GroupChat: undefined;
  DM: { friendUid: string; friendUsername: string };
  UploadReceipt: { groupId: string };
};