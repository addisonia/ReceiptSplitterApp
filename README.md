# Receipt Splitter

The revolutionary app designed off the [receiptsplitter.org](https://receiptsplitter.org) website that allows users to create/edit/share receipts with friends.

[Available on the Google Play Store](https://play.google.com/store/apps/details?id=org.receiptsplitter.app&hl=en_US)

<img src="https://raw.githubusercontent.com/addisonia/ReceiptSplitterApp/main/App%20Screenshots/play%20store%20page.png" alt="Receipt Splitter Play Store Page" style="width:100%;">

## Features

* **Receipt Splitting:** Create receipts, add items, buyers, and tax. The app calculates who owes what.
* **Firebase Backend:** Syncs all your receipts and account data using Firebase Realtime Database and Auth.
* **Friend System:** Add friends, send/receive requests, and manage your friend list.
* **Group Chats & DMs:** A full chat system for individuals and groups.
* **Share Receipts:** Share any of your saved receipts directly into a chat.
* **Import Receipts:** Friends in the chat can tap to import your shared receipt directly into their app.
* **5 Color Themes:** Customize the look of the app.
* **Snake Game:** Includes a snake game with different game modes and difficulties.

## How to Use

### 1. Splitting a Bill

This is the main screen, which you can get to by tapping "Start Splitting."

1.  **Name Your Receipt:** Tap the "My receipt" title to name your receipt.
2.  **Add Buyers & Tax:** Use the input boxes to add the names of people splitting the bill and the total tax.
3.  **Add Items:** Add each item's name and price.
4.  **Assign Items:** As you add items, they appear in the table at the bottom. Here you can assign items to buyers using the checkboxes. The "Cost per Buyer" section updates automatically.

<img src="https://raw.githubusercontent.com/addisonia/ReceiptSplitterApp/main/App%20Screenshots/split%20page.jpg" alt="Split Page" style="width:49%;"> <img src="https://raw.githubusercontent.com/addisonia/ReceiptSplitterApp/main/App%20Screenshots/split%20grid.jpg" alt="Item Grid" style="width:49%;">

You can also tap the **Settings** gear ⚙️ to change themes or to toggle the "Split Tax Evenly" option (which divides tax based on each person's subtotal instead of evenly).

<img src="https://raw.githubusercontent.com/addisonia/ReceiptSplitterApp/main/App%20Screenshots/settings.jpg" alt="Settings Modal" style="width:50%;">

### 2. Saving & Managing Receipts

You must be signed in to save and import receipts.

* Tap the **"Save"** button on the Split screen to save a receipt to your account.
* Access all your past receipts from the **"Receipts"** tab (the receipt icon in the top navigation bar).
* On the Receipts page, you can see all your saved bills, sorted by date. Tap the trash can icon 🗑️ to delete old receipts, or tap the arrow ▼ to see a detailed breakdown.

<img src="https://raw.githubusercontent.com/addisonia/ReceiptSplitterApp/main/App%20Screenshots/receipts.jpg" alt="Saved Receipts List" style="width:50%;">

### 3. Friends & Chat

The app includes a social system for easy sharing.

* **Add Friends:** Go to the Profile/Friends screen (the user icon in the top navigation bar, then the "users" icon on the chat screen) to search for other users by username and manage friend requests.
* **Create Group Chats:** You can create group chats with two or more of your friends.
* **Chat:** You can DM your friends or talk in group chats.

| Add Friends | Create Group | Chat View |
| :---: | :---: | :---: |
| <img src="https://raw.githubusercontent.com/addisonia/ReceiptSplitterApp/main/App%20Screenshots/add%20friends.jpg" alt="Add Friends Screen" style="width:100%;"> | <img src="https://raw.githubusercontent.com/addisonia/ReceiptSplitterApp/main/App%20Screenshots/create%20group%20chat.jpg" alt="Create Group Screen" style="width:100%;"> | <img src="https://raw.githubusercontent.com/addisonia/ReceiptSplitterApp/main/App%20Screenshots/chat.jpg" alt="Chat Screen" style="width:100%;"> |

### 4. Share & Import Receipts

This is the key feature for groups.

1.  While in a group chat or DM, tap the receipt icon (📄) in the text input area.
2.  This will open your list of saved receipts. Tap one to upload share it.
3.  The receipt will be sent as a message in the chat.
4.  Anyone else in the chat can **long-press that message and tap "Import Receipt."**
5.  The app will automatically load that *entire receipt* (items, prices, and all) onto their main "Split" screen, which they can then save to their own account.

<img src="https://raw.githubusercontent.com/addisonia/ReceiptSplitterApp/main/App%20Screenshots/import%20receipt.jpg" alt="Import Receipt Message" style="width:50%;">

## Tech Stack

* **Core:** React Native
* **Framework:** Expo
* **Backend:** Firebase (Realtime Database & Authentication)
* **Navigation:** React Navigation
* **Local Storage:** AsyncStorage
