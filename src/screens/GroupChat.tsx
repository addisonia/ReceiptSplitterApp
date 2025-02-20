// screens/GroupChat.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import colors from "../../constants/colors";
import { ref, onValue } from "firebase/database";
import { auth, database } from "../firebase";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface Friend {
  uid: string;
  username: string;
}

const GroupChat = () => {
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  const navigation = useNavigation();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const friendsRef = ref(database, `users/${currentUser.uid}/friends`);
    const unsubscribe = onValue(friendsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const friendList: Friend[] = Object.entries(data).map(
          ([friendUid, friendName]) => ({
            uid: friendUid,
            username: typeof friendName === "string" ? friendName : "Unknown",
          })
        );
        setFriends(friendList);
      } else {
        setFriends([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleFriend = (friendUid: string) => {
    if (selectedFriends.includes(friendUid)) {
      setSelectedFriends(selectedFriends.filter((id) => id !== friendUid));
    } else {
      setSelectedFriends([...selectedFriends, friendUid]);
    }
  };

  const createGroupChat = () => {
    console.log("Creating group:", groupName);
    console.log("Selected friends:", selectedFriends);
    // your group creation logic
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome5
            name="arrow-left"
            size={24}
            color={colors.yellow}
            style={{ marginRight: 10 }}
          />
        </TouchableOpacity>
        <Text style={styles.header}>Create Group Chat</Text>
        <View style={{ width: 24, marginLeft: 10 }} />
      </View>
      <View style={styles.bodyContainer}>
        <TextInput
          style={styles.groupInput}
          placeholder="Group name..."
          placeholderTextColor="#ccc"
          value={groupName}
          onChangeText={setGroupName}
        />

        {friends.length === 0 ? (
          <Text style={styles.noFriendsText}>You have no friends yet.</Text>
        ) : (
          <>
            <Text style={styles.subtitle}>Select friends:</Text>
            <ScrollView>
              {friends.map((friend) => (
                <TouchableOpacity
                  key={friend.uid}
                  style={[
                    styles.friendRow,
                    selectedFriends.includes(friend.uid) &&
                      styles.selectedFriendRow,
                  ]}
                  onPress={() => toggleFriend(friend.uid)}
                >
                  <Text style={styles.friendName}>{friend.username}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.createButton}
              onPress={createGroupChat}
            >
              <Text style={styles.createButtonText}>Create Group</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

export default GroupChat;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yuck,
  },
  bodyContainer: {
    padding: 20,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 15,
    backgroundColor: colors.yuck,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4, // same shadow as global chat
  },
  header: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  groupInput: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: "#fff",
    marginBottom: 20,
  },
  noFriendsText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 10,
  },
  friendRow: {
    backgroundColor: "#114b68",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedFriendRow: {
    backgroundColor: "#d4a017",
  },
  friendName: {
    color: "#fff",
  },
  createButton: {
    backgroundColor: "#d4a017",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  createButtonText: {
    textAlign: "center",
    color: "#000",
    fontWeight: "bold",
  },
});
