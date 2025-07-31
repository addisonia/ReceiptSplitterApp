// src/utils/pushNotifications.ts
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { ref, set } from "firebase/database";
import { database } from "../firebase";

export async function registerForPushNotificationsAsync(uid: string) {
  // Must be a real device, not a web emulator
  if (!Constants.isDevice) {
    console.warn("Must use physical device for Push Notifications");
    return;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If not granted, ask for permission
  if (finalStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // If still not granted, bail out
  if (finalStatus !== "granted") {
    console.warn("Push notification permission was not granted!");
    return;
  }

  // Get the token from Expo
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const expoPushToken = tokenData.data;

  console.log("Successfully got token:", expoPushToken);

  // Store token in Realtime Database under: users/{uid}/expoPushToken
  await set(ref(database, `users/${uid}/expoPushToken`), expoPushToken);

  console.log(`Stored push token for user ${uid} in the DB`);
}
